"""Synthetic transport only. Actual SQL authorization is tested with PGlite separately."""
from copy import deepcopy
from datetime import datetime, timezone

PATHS=('iag_troubleshooting','iag_troubleshooting_events','iag_troubleshooting_members','iag_troubleshooting_save','iag_troubleshooting_invite')

def handle_troubleshooting(path,query,body,cloud,state,user,reply):
    rows=cloud.setdefault('troubleshooting',{})
    history=cloud.setdefault('troubleshooting_events',{})
    members=cloud.setdefault('troubleshooting_members',{})
    uid=user()['id']; now=datetime.now(timezone.utc).isoformat()
    if path.endswith('/iag_troubleshooting'):
        return reply([r for r in rows.values() if r['asset_id']==query.get('asset_id',['eq.'])[0][3:] and (state['role']=='admin' or any(m['user_id']==uid for m in members[r['id']]))])
    sid=query.get('session_id',['eq.'])[0][3:]
    if path.endswith('/iag_troubleshooting_events'):return reply(history.get(sid,[]))
    if path.endswith('/iag_troubleshooting_members'):return reply(members.get(sid,[]))
    if path.endswith('/iag_troubleshooting_invite'):
        members[body['p_id']].append({'user_id':'00000000-0000-4000-8000-000000000043','invited_at':now,'accepted_at':None})
        return reply(None)
    sid=body['p_id']; old=rows.get(sid); p=deepcopy(body['p_payload']); action=body['p_action']
    if cloud.pop('troubleshooting_conflict',False):return reply({'status':'conflict','version':999})
    if body['p_base']!=(old or {}).get('version',0):return reply({'status':'conflict','version':old['version']})
    if action in ('state-change','accept'):p['epoch']+=1
    if action!='outcome':p['outcome']='unresolved';p['restart']={}
    if action=='answer':
        for key,value in p['answers'].items():
            if value!=old['payload']['answers'].get(key):value.update(author=uid,at=now,epoch=p['epoch'])
    row={'id':sid,'asset_id':body['p_asset'],'facility_id':body['p_facility'],'created_by':(old or {}).get('created_by',uid),'version':(old or {}).get('version',0)+1,'payload':p,'updated_at':now}
    rows[sid]=row
    if action=='create':members[sid]=[{'user_id':uid,'invited_at':now,'accepted_at':now}]
    if action=='accept':
        for m in members[sid]:
            if m['user_id']==uid:m['accepted_at']=now
    history.setdefault(sid,[]).append({'version':row['version'],'actor':uid,'at':now,'action':action,'payload':deepcopy(p)})
    return reply(row)

def exercise_troubleshooting(page,label,open_page,screenshot,geometry,state):
    route='machine&asset=LIEB-L2-CLIMAX-6759&section=troubleshooting'
    open_page(page,route)
    page.get_by_role('heading',name='Why won’t it run?',exact=True).wait_for()
    geometry(page);screenshot(page,label+'-troubleshooting-intake')
    page.get_by_label('Exact HMI message / fault code',exact=True).fill('SIMULATED: unknown fault')
    page.get_by_role('button',name='Start and save shared session',exact=True).click()
    page.get_by_role('heading',name='Can these observations be made from a normal operating position with guards closed?',exact=True).wait_for()
    session_url=page.url
    page.get_by_role('button',name='Not sure',exact=True).click()
    page.get_by_role('button',name='Prepare maintenance escalation',exact=True).wait_for()
    geometry(page);screenshot(page,label+'-troubleshooting-unknown')
    page.get_by_role('button',name='Prepare maintenance escalation',exact=True).click()
    page.get_by_role('button',name='Save observed outcome',exact=True).click()
    page.get_by_text('Shared version 3 received. Reconfirm time-sensitive conditions.',exact=True).wait_for()
    assert next(reversed(state['cloud']['troubleshooting'].values()))['payload']['outcome']=='escalated'
    page.get_by_role('button',name='Recovery assessment',exact=True).click()
    for value in ['home','jog','isolation','power','reset']:
        page.get_by_label('Action being considered',exact=True).select_option(value)
        assert 'More observations needed' in page.locator('.troubleshooting').inner_text()
    geometry(page);screenshot(page,label+'-troubleshooting-recovery')
    page.get_by_role('button',name='Shift handoff',exact=True).click()
    page.get_by_label('Actions already taken and whether they helped',exact=True).fill('SIMULATED: no movement or reset performed.')
    page.get_by_label('Responsible person',exact=True).fill('SIMULATED relief technician')
    page.get_by_role('button',name='Save handoff',exact=True).click()
    page.get_by_text('Shared version 4 received. Reconfirm time-sensitive conditions.',exact=True).wait_for()
    with page.expect_download() as download:
        page.get_by_role('button',name='Export saved checklist / handoff',exact=True).click()
    text=open(download.value.path(),encoding='utf-8').read()
    assert 'SIMULATED' in text and 'Audit history' in text and 'not a substitute' in text
    page.goto(session_url,wait_until='networkidle')
    page.get_by_role('button',name='Guided checks',exact=True).wait_for()
    page.get_by_role('button',name='Record outcome',exact=True).click()
    page.get_by_label('Outcome',exact=True).select_option('restored')
    assert page.get_by_role('button',name='Save observed outcome',exact=True).is_disabled()
    for key in ['Personnel clear and guarding restored','Load and mechanisms in verified condition','Position and reference valid','Correct mode and recipe','Fault and interlock status checked','Sequence ready under approved restart procedure','Operation restored and independently observed']:
        page.get_by_label(key,exact=True).select_option('yes')
    page.get_by_role('button',name='Save observed outcome',exact=True).click()
    page.get_by_text('Shared version 5 received. Reconfirm time-sensitive conditions.',exact=True).wait_for()
    assert next(reversed(state['cloud']['troubleshooting'].values()))['payload']['outcome']=='restored'
    geometry(page);screenshot(page,label+'-troubleshooting-outcome')
    if label not in ('laptop-1366x768','phone-390x844'):return
    page.get_by_role('button',name='Shift handoff',exact=True).click()
    page.get_by_label('Relief’s confirmed account email',exact=True).fill('relief@example.test')
    page.get_by_role('button',name='Grant this account session access',exact=True).click()
    page.get_by_role('status').filter(has_text='Participant access saved').wait_for()
    # Fresh browser context represents another authorized device and another user.
    from auth_test_fixture import install_auth_fixture, sign_in
    context=page.context.browser.new_context(viewport=page.viewport_size,service_workers='block')
    relief_page=context.new_page()
    relief_state=install_auth_fixture(relief_page,state['cloud'])
    relief_state.update(user_id='00000000-0000-4000-8000-000000000043',role='technician')
    try:
        relief_page.goto(session_url,wait_until='networkidle')
        sign_in(relief_page)
        relief_page.get_by_role('button',name='Accept handoff',exact=True).wait_for()
        assert relief_page.locator('.troubleshooting fieldset').is_disabled()
        relief_page.get_by_role('button',name='Accept handoff',exact=True).click()
        relief_page.get_by_text('Shared version 6 received. Reconfirm time-sensitive conditions.',exact=True).wait_for()
        relief_page.get_by_role('heading',name='Can these observations be made from a normal operating position with guards closed?',exact=True).wait_for()
        geometry(relief_page);screenshot(relief_page,label+'-troubleshooting-relief')
        assert not relief_page.get_by_role('button',name='Grant this account session access',exact=True).count()
        page.get_by_role('button',name='Save handoff',exact=True).click()
        page.get_by_role('alert').filter(has_text='Another device changed').wait_for()
        assert page.get_by_label('Responsible person',exact=True).input_value()=='SIMULATED relief technician'
    finally:context.close()
    count=len(state['cloud']['troubleshooting'])
    page.get_by_role('button',name='All sessions',exact=True).click()
    page.get_by_role('button',name='Start and save shared session',exact=True).click()
    page.get_by_role('heading',name='Can these observations be made from a normal operating position with guards closed?',exact=True).wait_for()
    assert len(state['cloud']['troubleshooting'])==count+1