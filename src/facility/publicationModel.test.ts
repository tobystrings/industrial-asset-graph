import { describe,it,expect } from 'vitest';
import { buildTestFacilityPackage } from '../../facilities/test-facility';
import { canonicalJson,emptyPublication,initialPublicationBase,mergePublication,validatePublication } from './publicationModel';

describe('public plant publication',()=>{
  it('merges independent room edits and retains both revision histories',()=>{
    const b=emptyPublication(buildTestFacilityPackage()),l=structuredClone(b),r=structuredClone(b);
    l.plant.areas[0].name='Receiving';r.plant.areas[0].notes='Walkdown needed';
    l.audit.push({id:'local',actor:'A',at:'today',action:'edit',detail:'name'});
    r.audit.push({id:'remote',actor:'B',at:'today',action:'edit',detail:'notes'});
    const result=mergePublication(b,l,r);
    expect(result.conflicts).toEqual([]);expect(result.payload.plant.areas[0]).toMatchObject({name:'Receiving',notes:'Walkdown needed'});
    expect(result.payload.audit.map(a=>a.id)).toEqual(['remote','local']);
  });
  it('reports conflicting renames without discarding either value',()=>{
    const b=emptyPublication(buildTestFacilityPackage()),l=structuredClone(b),r=structuredClone(b);
    l.plant.areas[0].name='Local';r.plant.areas[0].name='Shared';
    const result=mergePublication(b,l,r);
    expect(result.conflicts).toHaveLength(1);expect(result.conflicts[0]).toMatchObject({local:'Local',shared:'Shared'});
    expect(r.plant.areas[0].name).toBe('Shared');
  });
  it('preserves deletion and detects delete/edit conflicts',()=>{
    const b=emptyPublication(buildTestFacilityPackage()),l=structuredClone(b),r=structuredClone(b);
    const id=l.plant.areas[0].id;l.plant.areas.shift();
    expect(mergePublication(b,l,r).payload.plant.areas.some(a=>a.id===id)).toBe(false);
    r.plant.areas[0].name='Changed';expect(mergePublication(b,l,r).conflicts).toHaveLength(1);
  });
  it('rejects cross-facility publications',()=>{
    const b=emptyPublication(buildTestFacilityPackage()),r=structuredClone(b);r.facilityId='other';
    expect(()=>mergePublication(b,b,r)).toThrow('facility mismatch');expect(()=>validatePublication(r,b.facilityId)).toThrow('facility mismatch');
  });
  it('treats key order as equivalent and does not duplicate records on replay',()=>{
    expect(canonicalJson({a:1,b:2})).toBe(canonicalJson({b:2,a:1}));
    const b=emptyPublication(buildTestFacilityPackage());expect(mergePublication(b,b,b).payload).toEqual(b);
  });
  it('keeps newly published records when migrating an older browser seed',()=>{
    const local=emptyPublication(buildTestFacilityPackage()),seed=structuredClone(local);
    seed.plant.areas.push({...structuredClone(seed.plant.areas[0]),id:'new-area',name:'New shared area',assetIds:[]});
    local.plant.areas[0].notes='Existing device observation';
    const result=mergePublication(initialPublicationBase(seed,local),local,seed);
    expect(result.conflicts).toEqual([]);expect(result.payload.plant.areas.some(a=>a.id==='new-area')).toBe(true);
    expect(result.payload.plant.areas[0].notes).toBe('Existing device observation');
    const deleted=mergePublication(initialPublicationBase(seed,local,new Set(['new-area'])),local,seed);
    expect(deleted.payload.plant.areas.some(a=>a.id==='new-area')).toBe(false);
  });
});
