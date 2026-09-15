"""UI transport fixture. Database permissions/transactions are tested separately in SQL."""
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

PATHS=('iag_work','iag_reviews','iag_app_requests','iag_work_save','iag_work_submit','iag_review_action','iag_request_update')
def handle_work(path,query,body,cloud,state,user,reply):
    works=cloud.setdefault('works',{}); reviews=cloud.setdefault('reviews',{}); requests=cloud.setdefault('work_requests',{})
    uid=user()['id']; admin=state['role']=='admin'; now=datetime.now(timezone.utc).isoformat()
    if path.endswith('/iag_work'):
        rows=[w for w in works.values() if w['author_id']==uid or admin]
        if 'id' in query: return reply(next((w for w in rows if w['id']==query['id'][0][3:]),None))
        if 'author_id' in query: rows=[w for w in rows if w['author_id']==query['author_id'][0][3:]]
        return reply(rows)
    if path.endswith('/iag_reviews'): return reply([r for r in reviews.values() if r['author_id']==uid or admin])
    if path.endswith('/iag_app_requests'): return reply(list(cloud.setdefault('app_requests',{}).values()) if admin else [])
    if path.endswith('/iag_work_save'):
        if cloud.get('fail_work_upload'): return reply({'message':'Simulated interrupted upload'},503)
        p=body['p_payload']; old=works.get(body['p_id']); key=body['p_request']
        if p['authorId']!=uid or old and old['author_id']!=uid:return reply({'message':'Author required'},403)
        if key in requests:return reply({'status':'duplicate','version':requests[key]})
        if body['p_base']!=(old or {}).get('version',0):return reply({'status':'conflict','version':old['version']})
        version=(old or {}).get('version',0)+1
        works[p['id']]={'id':p['id'],'author_id':uid,'facility_id':p['facilityId'],'version':version,'payload':deepcopy(p)};requests[key]=version
        return reply({'status':'saved','version':version})
    if path.endswith('/iag_work_submit'):
        w=works[body['p_id']]
        if w['author_id']!=uid:return reply({'message':'Author required'},403)
        old=next((r for r in reviews.values() if r['work_id']==w['id'] and r['work_version']==body['p_version']),None)
        if old:return reply(old)
        r={'id':str(uuid4()),'work_id':w['id'],'work_version':w['version'],'facility_id':w['facility_id'],'author_id':uid,'original':deepcopy(w['payload']),'proposal':None,'state':'received','version':1,'created_at':now,'approved_by':None,'approved_at':None,'applied_by':None,'applied_at':None,'events':[{'at':now,'actor':uid,'action':'received','text':'Original submission received.'}]}
        reviews[r['id']]=r;return reply(r)
    if path.endswith('/iag_review_action'):
        r=reviews[body['p_id']]; action=body['p_action']
        if not admin and (action!='reply' or r['author_id']!=uid):return reply({'message':'Administrator required'},403)
        if action=='apply' and r['state']=='applied':return reply(r)
        if body['p_version']!=r['version']:return reply({'message':'Submission changed during review. Reload and compare.'},409)
        if action=='propose':r.update(proposal=deepcopy(body['p_proposal']),state='received',approved_by=None,approved_at=None)
        elif action=='approve':r.update(state='approved',approved_by=uid,approved_at=now)
        elif action=='clarify':r.update(state='clarification',approved_by=None,approved_at=None)
        elif action=='reply':r.update(state='received',approved_by=None,approved_at=None)
        elif action=='reject':r['state']='rejected'
        elif action=='apply':
            if r['state']!='approved':return reply({'message':'Approve this proposal revision first.'},409)
            p=r['proposal']; pub=cloud['publication']; plant=pub['payload']['plant']
            if p['destination']=='app-change':cloud.setdefault('app_requests',{})[r['id']]={'id':r['id'],'source_id':r['id'],'title':p['text'],'state':'approved','reference':'','updated_at':now}
            else:
                rows=plant['assets'] if p['destination'] in ('asset','repair') else plant['documents'] if p['destination']=='document' else plant['facility']['inventory']['parts']
                target=next(row for row in rows if row['id']==p['targetId'])
                if target!=p['base']:return reply({'message':'Destination changed during review. Compare the current record and save a revised proposal.'},409)
                if p['destination']=='repair':
                    summary=p['summary']; eid='review-source-'+r['id']
                    target.setdefault('production',{'memberships':[],'stage':'','electrical':{},'redundancy':'UNKNOWN','spares':'UNKNOWN','safetySignificance':'','service':[]})['service'].append({'id':'repair-'+r['id'],'date':now,'symptom':summary['problem'],'observation':summary['findings'],'action':summary['work'],'spareParts':'','task':summary['outcome'],'evidenceIds':[eid]})
                    plant['evidence'].append({'id':eid,'type':'CMMS_RECORD','title':'Reviewed submission','pathOrUrl':'?page=submission&submission='+r['id'],'access':'RESTRICTED'})
                else:target[{'asset':'description','document':'title','inventory':'notes'}[p['destination']]]=p['text']
                pub['revision']+=1;plant['packageRevision']+=1;r['application_revision']=pub['revision']
            r.update(state='applied',applied_by=uid,applied_at=now)
        r['version']+=1;r['events'].append({'at':now,'actor':uid,'action':action,'text':body.get('p_text','')});return reply(r)
    return reply({})
