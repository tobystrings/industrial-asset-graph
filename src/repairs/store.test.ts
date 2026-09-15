import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { draftSummary, editedWork, newWork, assertWork } from './model';
import { getWorkFile, putWorkFile, readWork, updateWork } from './store';

beforeEach(()=>{globalThis.indexedDB=new IDBFactory();globalThis.dispatchEvent=()=>true;});
describe('repair persistence',()=>{
 it('retains rapid notes and ignores an old upload acknowledgement for receipt status',async()=>{
  const initial=newWork('plant-test','operator','Operator');await updateWork(initial.facilityId,initial.id,()=>initial);
  const first=updateWork(initial.facilityId,initial.id,old=>editedWork(old!,{note:'first'}));
  const second=updateWork(initial.facilityId,initial.id,old=>editedWork(old!,{note:'second'}));
  await Promise.all([first,second]);const [saved]=await readWork(initial.facilityId);expect(saved.note).toBe('second');expect(saved.version).toBe(3);expect(saved.transport).toBe('local');
  const other=await readWork('different-plant');expect(other).toEqual([]);
 });
 it('retains original attachments across interrupted upload and record edits',async()=>{
  const w=newWork('plant-test','operator','Operator');const blob=new Blob(['original photo bytes']);await putWorkFile(w.facilityId,'photo',blob);await updateWork(w.facilityId,w.id,()=>w);
  await updateWork(w.facilityId,w.id,old=>({...old!,transport:'pending',error:'offline'}));
  expect(await (await getWorkFile(w.facilityId,'photo'))!.text()).toBe('original photo bytes');
  expect(await getWorkFile('different-plant','photo')).toBeUndefined();
 });
 it('drafts a summary only from supplied observations and preserves edited summary fields',()=>{
  const w=newWork('plant-test','operator','Operator');w.entries=[{id:'1',at:'2026-09-15',kind:'measurement',text:'Technician measurement'},{id:'2',at:'2026-09-15',kind:'change',text:'Technician work'}];w.summary.problem='Edited problem';
  expect(draftSummary(w)).toEqual({problem:'Edited problem',findings:'Technician measurement',work:'Technician work',outcome:'',remaining:''});
 });
 it('rejects cross-facility imports and duplicate original entries',()=>{
  const w=newWork('one','operator','Operator');expect(()=>assertWork(w,'two')).toThrow('cross-facility');w.entries=[{id:'same',at:'now',kind:'note',text:'a'},{id:'same',at:'now',kind:'note',text:'b'}];expect(()=>assertWork(w,'one')).toThrow('Duplicate');
 });
});
