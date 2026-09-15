import { describe,it,expect } from 'vitest';
import { initialPayload,currentAnswer,unresolvedCheck,canRestore,telemetryStatus,printable } from './model';
import { symptoms,checks,recoveryStatus,recoveryFields,restartFields,REVISION,evidence } from './catalog';
import { withClimax } from '../../facilities/lieb-foods/climax';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import { validateFacilityPackage } from '../facility/schema';
describe('guided troubleshooting',()=>{
 it('covers every symptom and routes all three answers with traceable evidence',()=>{
  expect(symptoms).toHaveLength(10);
  for(const symptom of symptoms)for(const id of symptom.path){const c=checks[id];expect(c).toBeDefined();for(const a of ['yes','no','unknown'] as const)expect(c[a].length).toBeGreaterThan(30);for(const record of c.records)expect(evidence.records.some(r=>r.record===record)).toBe(true);}
 });
 it('resumes first unresolved check and invalidates old observations after time or a handoff',()=>{
  const p=initialPayload('nothing',{}),now=Date.now();p.answers.safety={answer:'yes',note:'Simulated observation',at:new Date(now).toISOString(),author:'test',epoch:0};
  expect(unresolvedCheck(p,now)).toBe('master');expect(currentAnswer(p,'safety',now+16*60000)).toBeUndefined();p.epoch++;expect(unresolvedCheck(p,now)).toBe('safety');
 });
 it('does not turn completion into restoration or approve an unvalidated procedure',()=>{
  const p=initialPayload('nothing',{});expect(p.outcome).toBe('unresolved');expect(canRestore(p)).toBe(false);
  expect(recoveryStatus({})).toMatch('More observations');expect(recoveryStatus(Object.fromEntries(Object.keys(recoveryFields).map(k=>[k,'Simulated known observation'])))).toMatch('not validated');
  for(const k of Object.keys(restartFields))p.restart[k]='yes';expect(canRestore(p)).toBe(true);p.restart.load='unknown';expect(canRestore(p)).toBe(false);
 });
 it('distinguishes unavailable, stale, conflicting and current telemetry',()=>{
  const now=Date.now(),sample={value:'yes',quality:'good' as const,at:new Date(now).toISOString()};
  expect(telemetryStatus([])).toBe('missing');expect(telemetryStatus([sample],now)).toBe('current');expect(telemetryStatus([sample,{...sample,value:'no'}],now)).toBe('conflicting');expect(telemetryStatus([sample],now+61000)).toBe('stale or uncertain');
 });
 it('imports once, preserves edits and earlier evidence, isolates facilities',()=>{
  const p=buildLiebFoodsPackage();validateFacilityPackage(p);expect(withClimax(p)).toEqual(p);
  p.assets.find(a=>a.id==='LIEB-L2-CLIMAX-6759')!.description='Field-authored description';expect(withClimax(p).assets.find(a=>a.id==='LIEB-L2-CLIMAX-6759')!.description).toBe('Field-authored description');
  const other=structuredClone(p);other.facility.id='other';expect(withClimax(other)).toEqual(other);
  const old={id:'old-source',title:'Prior project revision',type:'OTHER' as const,pathOrUrl:'old',access:'LOCAL_ONLY' as const};p.evidence.push(old);expect(withClimax(p).evidence).toContainEqual(old);
 });
 it('reuses a previously authored Climax asset ID',()=>{
  const p=buildLiebFoodsPackage();p.assets=p.assets.filter(a=>a.id!=='LIEB-L2-CLIMAX-6759');const a=structuredClone(p.assets[0]);a.id='owner-climax';a.name='Climax packer';p.assets.push(a);const result=withClimax(p);expect(result.assets.filter(x=>/climax/i.test(x.name))).toHaveLength(1);expect(result.assets.find(x=>x.id==='owner-climax')!.componentIds).toContain('owner-climax-plc');
 });
 it('exports provenance, observations, outcome and audit without claiming live state',()=>{
  const p=initialPayload('nothing',{}),s={id:'test',asset_id:'machine',facility_id:'facility-j-lieb',created_by:'u',updated_at:new Date().toISOString(),version:1,payload:p};
  const text=printable(s,[{version:1,actor:'u',at:s.updated_at,action:'create',payload:p}]);expect(text).toContain(REVISION);expect(text).toContain('No PLC connection');expect(text).toContain('unresolved');expect(text).toContain('Audit history');
 });
});
