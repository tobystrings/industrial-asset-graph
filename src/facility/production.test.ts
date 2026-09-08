import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { documentationTasks, emptyAssetProduction, memberships, potentialImpact, reliabilityPriority } from './production';
import { validateFacilityPackage } from './schema';
import { applyReviewedChange } from './FacilityProvider';
import { applyCanonicalEntities } from './syncClient';
import { ensurePlantSeed, exportPlantArchive, importPlantArchive, loadPlant, portablePlantPackage, putAttachment, resetPlant, savePlant, listAttachments } from './runtimeDb';

function sharedFixture() {
  const pkg = structuredClone(buildLiebFoodsPackage());
  const asset = pkg.assets[0];
  asset.production = {...emptyAssetProduction(),memberships:['line-2','line-4'].map(lineId => ({lineId,verificationStatus:'VERIFIED',evidenceIds:[pkg.evidence.find(e => e.access === 'PUBLIC_APP')!.id],source:'Synthetic field test fixture',verifiedAt:'2026-09-08'}))};
  return pkg;
}
describe('production documentation', () => {
  it('seeds only lines 1, 2 and 4, with equal high priority on 2 and 4 and separate survey candidates', () => {
    const pkg = structuredClone(buildLiebFoodsPackage());
    expect(pkg.facility.production!.lines.map(l => l.name)).toEqual(['Line 1','Line 2','Line 4']);
    expect(pkg.facility.production!.lines.map(l => l.importance)).toEqual([1,2,2]);
    expect(pkg.assets.map(a => a.id)).toEqual(['FG-L4-MTN-001','L2-CC-001','LIEB-WULFTEC-A6882','LIEB-KOSME-TOPIIAD-L05358']);
    expect(memberships(pkg,pkg.assets[1])[0].verificationStatus).toBe('FIELD_VERIFY');
    expect(pkg.facility.production!.survey).toHaveLength(2);
    expect(demoFacilityPackage.facility.production).toBeUndefined();
  });
  it('keeps a shared asset canonical and rejects duplicate or unsupported memberships', () => {
    const pkg=sharedFixture(); validateFacilityPackage(pkg);
    expect(pkg.assets.filter(a => a.id===pkg.assets[0].id)).toHaveLength(1);
    expect(potentialImpact(pkg,pkg.assets[0].id).lines.map(l => l.name)).toEqual(['Line 2','Line 4']);
    pkg.assets[0].production!.memberships.push(pkg.assets[0].production!.memberships[0]);
    expect(() => validateFacilityPackage(pkg)).toThrow(/membership/);
    pkg.assets[0].production!.memberships.pop(); pkg.assets[0].production!.memberships[0].evidenceIds=[];
    expect(() => validateFacilityPackage(pkg)).toThrow(/evidence/);
  });
  it('traverses only evidenced verified dependencies and preserves bypass information without asserting shutdown', () => {
    const pkg=sharedFixture(); const [machine,feed]=pkg.assets;
    pkg.relationships.push({id:'test-feed',source:feed.id,target:machine.id,type:'SUPPLIES',verificationStatus:'FIELD_VERIFY',evidenceIds:[pkg.evidence.find(e => e.access === 'PUBLIC_APP')!.id],route:'BYPASS',note:'Synthetic conditional bypass'});
    expect(potentialImpact(pkg,feed.id).lines).toEqual([]);
    pkg.relationships.at(-1)!.verificationStatus='VERIFIED';
    expect(potentialImpact(pkg,feed.id).lines).toHaveLength(2);
    expect(potentialImpact(pkg,feed.id).paths.find(p => p.id===machine.id)?.via).toEqual(['test-feed']);
    pkg.relationships.at(-1)!.type='LOCATED_IN';
    expect(potentialImpact(pkg,feed.id).lines).toHaveLength(0);
  });
  it('scores known facts transparently without manufacturing failures and makes gaps actionable', () => {
    const pkg=sharedFixture(); const asset=pkg.assets[0];
    const priority=reliabilityPriority(pkg,asset);
    expect(priority.factors.shared).toBe(1); expect(priority.factors.failures).toBe(0); expect(priority.factors.redundancy).toBe(0);
    expect(documentationTasks(pkg,asset)).toContain('Identify electrical feed and trace utility connections');
    pkg.facility.production!.weights.shared=50;
    expect(reliabilityPriority(pkg,asset).score).toBe(priority.score+45);
  });
  it('migrates saved facility config once and round-trips edits, service history and attachments in isolation', async () => {
    const seed=buildLiebFoodsPackage(); const old=structuredClone(seed); delete old.facility.production;
    await resetPlant(old); const upgraded=await ensurePlantSeed(seed);
    expect(upgraded.facility.production!.lines).toHaveLength(3);
    const pkg=sharedFixture(); pkg.facility.production!.lines[1].importance=7;
    pkg.assets[0].production!.service.push({id:'service-test',date:'2026-09-08',symptom:'Synthetic symptom',observation:'Test observation',action:'Test action',spareParts:'Test part',task:'Test maintenance',evidenceIds:[]});
    await savePlant(pkg);
    await putAttachment({id:'production-attachment',assetId:pkg.assets[0].id,name:'test.txt',mimeType:'text/plain',size:5,blob:new Blob(['proof']),category:'OTHER',access:'PUBLIC_APP',verificationStatus:'FIELD_VERIFY',createdAt:'2026-09-08'},pkg.facility.id);
    expect((await ensurePlantSeed(seed)).facility.production!.lines[1].importance).toBe(7);
    const archive=await exportPlantArchive(pkg.facility.id);
    await resetPlant(seed); await importPlantArchive(archive,'replace',pkg.facility.id);
    const restored=(await loadPlant(pkg.facility.id))!;
    expect(restored.assets[0].production).toEqual(pkg.assets[0].production);
    expect((await listAttachments(pkg.assets[0].id,pkg.facility.id))[0].name).toBe('test.txt');
    await resetPlant(demoFacilityPackage);
    expect((await loadPlant(demoFacilityPackage.facility.id))!.facility.production).toBeUndefined();
    expect(await listAttachments(undefined,demoFacilityPackage.facility.id)).toEqual([]);
  });
  it('removes inaccessible evidence references from portable memberships and service records', () => {
    const pkg=sharedFixture(); pkg.evidence.find(e => e.id === pkg.assets[0].production!.memberships[0].evidenceIds[0])!.access='LOCAL_ONLY';
    const portable=portablePlantPackage(pkg);
    expect(portable.assets[0].production!.memberships[0].verificationStatus).toBe('FIELD_VERIFY');
    expect(portable.assets[0].production!.memberships[0].evidenceIds).toEqual([]);
    validateFacilityPackage(portable);
  });
  it('keeps component ownership and production metadata consistent through review and a second client pull', () => {
    const pkg=sharedFixture(); const parent=pkg.assets[0];
    const component={id:'synthetic-assembly',label:'Synthetic assembly',type:'Assembly',parentId:parent.id,verificationStatus:'FIELD_VERIFY' as const,evidenceIds:[]};
    const proposed={...pkg,components:[...pkg.components,component]};
    const reviewed=applyReviewedChange(pkg,proposed,component.id,{entityType:'component',operation:'UPSERT',value:component});
    const pulled=applyCanonicalEntities(pkg,[{entityId:component.id,entityType:'component',version:1,value:component,deleted:false,updatedAt:'2026-09-08',updatedBy:'tester'}]);
    for (const result of [reviewed,pulled]) {
      validateFacilityPackage(result);
      expect(result.assets[0].componentIds).toContain(component.id);
      expect(result.assets[0].production).toEqual(parent.production);
    }
  });
});
