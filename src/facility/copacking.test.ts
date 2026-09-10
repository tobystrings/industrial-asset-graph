import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { copackingGraph, emptyClaim, mergeCopacking, snapshotRun, validateCopackingTransition, type Copacking, type ProductionRun } from './copacking';
import { validateFacilityPackage } from './schema';
import { ensurePlantSeed, exportPlantArchive, importPlantArchive, loadPlant, portablePlantPackage, resetPlant, savePlant } from './runtimeDb';
import { applyCanonicalEntities } from './syncClient';
import { applyReviewedChange } from './FacilityProvider';

function fixture() {
  const pkg = structuredClone(buildLiebFoodsPackage()); const c = pkg.facility.production!.copacking!;
  const base = {facilityId:pkg.facility.id,name:'SYNTHETIC TEST ONLY'};
  c.products.push({...base,id:'synthetic-product',sku:'TEST',claim:emptyClaim()});
  c.formats.push({...base,id:'synthetic-format-r1',revision:1,material:'Test material',size:10,unit:'mL',closure:'',decoration:'',caseQuantity:null,caseConfiguration:'',palletPattern:'',claim:emptyClaim()});
  c.recipes.push({...base,id:'synthetic-recipe-r1',revision:1,productId:c.products[0].id,formatId:c.formats[0].id,approval:'DRAFT',requirements:'Synthetic test documentation only',source:'',evidenceIds:[],approvedBy:'',approvedAt:''});
  return pkg;
}
function run(c: Copacking): ProductionRun {
  return snapshotRun(c,{id:'synthetic-run',facilityId:c.products[0].facilityId,name:'SYNTHETIC TEST RUN',lineId:'line-2',productId:c.products[0].id,formatId:c.formats[0].id,recipeId:c.recipes[0].id,assetIds:[],startedAt:'2026-09-10T10:00:00',endedAt:'2026-09-10T11:00:00',status:'COMPLETED',notes:'Fixture only',actualRate:null,rateUnit:'',downtimeMinutes:null,rejects:null,constraints:'Unmeasured manual handling',measurementSource:'',assumptions:''});
}
describe('co-packing records', () => {
  it('derives reference graph paths without adding physical dependencies and preserves assignment conflicts on merge', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!; c.runs.push(run(c));
    c.stages[0].assetId=pkg.assets[0].id;
    const graph=copackingGraph(pkg), ids=new Set(graph.nodes.map(n => n.id));
    expect(graph.edges.every(e => ids.has(e.source) && ids.has(e.target))).toBe(true);
    expect(graph.edges.some(e => e.source===c.runs[0].id && e.target===c.recipes[0].id)).toBe(true);
    expect(pkg.relationships.some(e => e.type==='UPSTREAM_OF')).toBe(false);
    const incoming=structuredClone(c); incoming.stages[0].assetId=pkg.assets[1].id;
    const merged=mergeCopacking(c,incoming)!;
    expect(merged.stages[0].assetId).toBe(pkg.assets[0].id); expect(merged.stages[0].assignment.status).toBe('DISPUTED');
    expect(merged.stages[0].assignment.conflicts).toContain(pkg.assets[1].id);
    incoming.formats[0].material='Conflicting revision'; expect(() => mergeCopacking(c,incoming)).toThrow(/immutable/);
  });
  it('seeds reported process stages, separate case support and alternatives without physical machines or production history', () => {
    const pkg=buildLiebFoodsPackage(), c=pkg.facility.production!.copacking!; validateFacilityPackage(pkg);
    expect(pkg.assets).toHaveLength(4); expect(c.runs).toEqual([]); expect(c.products).toEqual([]); expect(c.recipes).toEqual([]);
    expect(c.stages.every(s => s.assetId===null && s.claim.status==='USER_REPORTED')).toBe(true);
    expect(c.stages.filter(s => /Box/.test(s.name)).every(s => s.flow==='CASE_SUPPORT')).toBe(true);
    expect(c.stages.filter(s => s.optional)).toHaveLength(6);
    expect(c.stages.some(s => s.lineId==='line-1')).toBe(false);
    expect(demoFacilityPackage.facility.production).toBeUndefined();
  });
  it('rejects cross-facility records and references, duplicate IDs and unmeasured numeric claims', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!;
    c.products[0].facilityId=demoFacilityPackage.facility.id;
    expect(() => validateFacilityPackage(pkg)).toThrow(/cross-facility/); c.products[0].facilityId=pkg.facility.id;
    c.stages[0].assetId='other-facility-asset'; expect(() => validateFacilityPackage(pkg)).toThrow(/reference/); c.stages[0].assetId=null;
    c.formats[0].size=NaN; expect(() => validateFacilityPackage(pkg)).toThrow(/units/); c.formats[0].size=10;
    c.products.push(c.products[0]); expect(() => validateFacilityPackage(pkg)).toThrow(/duplicate/);
  });
  it('requires field-specific verification and separate process approval evidence', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!;
    c.formats[0].claim={...emptyClaim(),status:'VERIFIED'}; expect(() => validateFacilityPackage(pkg)).toThrow(/verified claims/);
    c.formats[0].claim={...emptyClaim(),value:'Synthetic confirmation',status:'VERIFIED',source:'Synthetic field source',evidenceIds:[pkg.evidence[0].id],verifiedAt:'2026-09-10',reviewer:'Test reviewer'};
    validateFacilityPackage(pkg); expect(c.recipes[0].approval).toBe('DRAFT');
    expect(c.formats[0].fieldClaims?.material).toBeUndefined();
    c.formats[0].fieldClaims={material:{...c.formats[0].claim,value:c.formats[0].material}};
    validateFacilityPackage(pkg);
    c.formats[0].material='Changed material'; expect(() => validateFacilityPackage(pkg)).toThrow(/exact packaging value/);
    c.formats[0].material='Test material';
    c.recipes[0].approval='APPROVED'; expect(() => validateFacilityPackage(pkg)).toThrow(/process approval/);
    c.recipes[0].approval='DRAFT'; c.stages[0].assignment={...emptyClaim(),status:'DISPUTED'}; expect(() => validateFacilityPackage(pkg)).toThrow(/conflicting claims/);
  });
  it('preserves completed run history after catalog edits and new revisions; rejects rewrites', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!; c.runs.push(run(c)); const before=structuredClone(pkg);
    c.products[0].name='Updated current product'; c.formats.push({...c.formats[0],id:'synthetic-format-r2',revision:2,material:'New material'});
    c.recipes.push({...c.recipes[0],id:'synthetic-recipe-r2',revision:2,formatId:'synthetic-format-r2'});
    c.runs[0].notes='Corrected observation'; validateFacilityPackage(pkg); validateCopackingTransition(before,pkg);
    expect(c.runs[0].snapshot.product.name).toBe('SYNTHETIC TEST ONLY'); expect(c.runs[0].snapshot.format.material).toBe('Test material');
    c.runs[0].snapshot.format.material='Rewritten'; expect(() => validateCopackingTransition(before,pkg)).toThrow(/historical snapshot/);
    c.runs[0]=before.facility.production!.copacking!.runs[0]; c.formats[0].material='Rewritten'; expect(() => validateCopackingTransition(before,pkg)).toThrow(/immutable/);
  });
  it('rejects mismatched recipe selection, invalid timestamps and unsourced rates', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!; c.runs.push(run(c));
    c.runs[0].actualRate=100; expect(() => validateFacilityPackage(pkg)).toThrow(/units and measurement source/);
    c.runs[0].rateUnit='containers/min'; c.runs[0].measurementSource='Synthetic counter / 60 seconds'; validateFacilityPackage(pkg);
    c.runs[0].endedAt='2026-09-09T00:00:00'; expect(() => validateFacilityPackage(pkg)).toThrow(/timestamps/);
    c.recipes[0].formatId='missing'; expect(() => run(c)).toThrow(/matching product/);
  });
  it('upgrades once, preserves line edits and round trips records through existing IndexedDB archives', async () => {
    const seed=buildLiebFoodsPackage(), old=structuredClone(seed); delete old.facility.production!.copacking; old.facility.production!.lines[0].importance=9;
    await resetPlant(old); let upgraded=await ensurePlantSeed(seed); expect(upgraded.facility.production!.lines[0].importance).toBe(9);
    upgraded=await ensurePlantSeed(seed); expect(upgraded.facility.production!.copacking!.stages).toHaveLength(36); expect(upgraded.assets).toHaveLength(4);
    const pkg=fixture(); pkg.facility.production!.copacking!.runs.push(run(pkg.facility.production!.copacking!)); await savePlant(pkg);
    const archive=await exportPlantArchive(pkg.facility.id); await resetPlant(seed); await importPlantArchive(archive,'replace',pkg.facility.id);
    expect((await loadPlant(pkg.facility.id))!.facility.production!.copacking).toEqual(pkg.facility.production!.copacking);
    await importPlantArchive(archive,'merge',pkg.facility.id); expect((await loadPlant(pkg.facility.id))!.assets).toHaveLength(4);
    await expect(importPlantArchive(archive,'replace',demoFacilityPackage.facility.id)).rejects.toThrow();
  });
  it('keeps controlled evidence and dependent historical snapshots out of portable exports', () => {
    const pkg=fixture(), c=pkg.facility.production!.copacking!;
    c.recipes[0].evidenceIds=[pkg.evidence[0].id]; c.runs.push(run(c)); pkg.evidence[0].access='LOCAL_ONLY';
    const portable=portablePlantPackage(pkg); expect(portable.facility.production!.copacking).toBeUndefined(); validateFacilityPackage(portable);
    expect(pkg.facility.production!.copacking!.runs[0].snapshot.recipe.evidenceIds).toHaveLength(1);
  });
  it('uses facility entity review and sync without losing nested production links', () => {
    const seed=buildLiebFoodsPackage(), pkg=fixture(); pkg.facility.production!.copacking!.stages[0].assetId=pkg.assets[0].id;
    const reviewed=applyReviewedChange(seed,pkg,pkg.facility.id,{entityType:'facility',operation:'UPSERT',value:pkg.facility as unknown as Record<string,unknown>});
    const pulled=applyCanonicalEntities(seed,[{entityId:pkg.facility.id,entityType:'facility',version:2,value:pkg.facility as unknown as Record<string,unknown>,deleted:false,updatedAt:'2026-09-10',updatedBy:'Synthetic tester'}]);
    for(const p of [reviewed,pulled]) { validateFacilityPackage(p); expect(p.facility.production!.copacking).toEqual(pkg.facility.production!.copacking); }
  });
});
