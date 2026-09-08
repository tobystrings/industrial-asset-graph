import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import { importHistory, listHistory, readHistoryBundle, reviewHistory, type HistoryManifest } from './historicalEvidence';
import { createStoredZip, readStoredZip } from './iagArchive';
import { sha256, exportPrivateRecovery, restorePrivateRecovery } from './additivePackage';
import { resetPlant, loadPlant, listAttachments, putAttachment, deleteAttachment, exportPlantArchive, importPlantArchive, listQueuedMutations } from './runtimeDb';
const admin = {id:'synthetic-admin',name:'Test',role:'admin' as const};
const technician = {...admin,id:'synthetic-tech',role:'technician' as const};
async function fixture() {
  const plant = structuredClone(demoFacilityPackage); await resetPlant(plant);
  const bytes = new Blob(['synthetic original']);
  const manifest: HistoryManifest = {format:'industrial-asset-graph-history',version:1,id:'test-history',facilityId:plant.facility.id,title:'Synthetic history',access:'LOCAL_ONLY',subjects:[{id:'subject',name:'Candidate',candidateAssetId:plant.assets[0].id,priority:1,lineContext:'Unknown'}],sources:[{id:'source',name:'Original',paths:['source.txt'],coverage:'Synthetic'}],files:[{path:'source.txt',sha256:await sha256(bytes),size:bytes.size,mimeType:'text/plain',incomplete:false}],assertions:[{id:'assertion',subject:'subject',kind:'HISTORICAL_SNAPSHOT',text:'Unknown date; raw display 00001',values:{raw:'00001'},verification:'FIELD_VERIFY',citations:[{sourceId:'source',locator:'row 1'}]}],tasks:[{id:'task',subject:'subject',priority:1,action:'Verify source',assertionIds:['assertion']}]};
  const bundle = (m=manifest,b=bytes) => createStoredZip([{name:'history.json',data:JSON.stringify(m)},{name:'source.txt',data:b}]);
  return {plant,manifest,bundle};
}
describe('local historical evidence ingestion', () => {
  it('persists source bytes and review history once, preserving canonical records and attachments', async () => {
    const {plant,bundle} = await fixture();
    await putAttachment({id:'existing',assetId:plant.assets[0].id,name:'existing.txt',size:3,blob:new Blob(['old']),mimeType:'text/plain',category:'OTHER',verificationStatus:'FIELD_VERIFY',access:'LOCAL_ONLY',createdAt:'earlier'},plant.facility.id);
    const blob=await bundle(); expect(await importHistory(blob,plant.facility.id,technician)).toBe('ADDED');
    await reviewHistory(plant.facility.id,'test-history',{assertionId:'assertion',state:'REVIEWED',note:'Source checked, installation still unverified'},admin);
    expect(await importHistory(blob,plant.facility.id,admin)).toBe('UNCHANGED');
    expect(await loadPlant(plant.facility.id)).toEqual(plant);
    const rows=await listAttachments(undefined,plant.facility.id); expect(rows).toHaveLength(2); expect(await rows.find(r=>r.id==='existing')!.blob.text()).toBe('old');
    expect(await rows.find(r=>r.id!=='existing')!.blob.text()).toBe('synthetic original');
    expect((await listHistory(plant.facility.id,admin))[0].reviews).toHaveLength(1);
    expect(await listQueuedMutations(plant.facility.id)).toEqual([]);
    const recovery=await exportPrivateRecovery(plant.facility.id); await resetPlant(plant); await restorePrivateRecovery(recovery,plant.facility.id);
    expect((await listHistory(plant.facility.id,admin))[0].reviews[0].state).toBe('REVIEWED');
    expect((await listAttachments(undefined,plant.facility.id))).toHaveLength(2);
    const portable=await exportPlantArchive(plant.facility.id); const files=await readStoredZip(portable);
    expect([...files.keys()].some(p=>p.includes('history'))).toBe(false);
    expect((await Promise.all([...files.values()].map(f=>f.text()))).join('')).not.toContain('00001');
    await importPlantArchive(portable,'replace',plant.facility.id);
    expect((await listHistory(plant.facility.id,admin))).toHaveLength(1);
    const remaining=await listAttachments(undefined,plant.facility.id); expect(remaining).toHaveLength(1);
    await expect(deleteAttachment(remaining[0].id,plant.facility.id)).rejects.toThrow(/immutable/);
  });
  it('rejects bad hashes, foreign facilities, invalid provenance and batch revisions without partial writes', async () => {
    const {plant,manifest,bundle}=await fixture();
    await expect(importHistory(await bundle(manifest,new Blob(['corrupt'])),plant.facility.id,admin)).rejects.toThrow(/integrity/);
    await expect(importHistory(await bundle({...manifest,facilityId:'foreign'}),plant.facility.id,admin)).rejects.toThrow(/mismatch/);
    await expect(readHistoryBundle(await bundle({...manifest,assertions:[{...manifest.assertions[0],citations:[]}]}),plant.facility.id)).rejects.toThrow(/unsourced/);
    expect(await listHistory(plant.facility.id,admin)).toEqual([]); expect(await listAttachments(undefined,plant.facility.id)).toEqual([]);
    await importHistory(await bundle(),plant.facility.id,admin);
    await expect(importHistory(await bundle({...manifest,title:'changed'}),plant.facility.id,admin)).rejects.toThrow(/Batch ID conflict/);
    expect((await listHistory(plant.facility.id,admin))[0].manifest.title).toBe(manifest.title);
    expect(await loadPlant(plant.facility.id)).toEqual(plant);
  });
  it('enforces authenticated staging and administrator review, and isolates facility stores', async () => {
    const {plant,bundle}=await fixture(); const blob=await bundle();
    await expect(importHistory(blob,plant.facility.id,null)).rejects.toThrow(/Sign in/);
    await importHistory(blob,plant.facility.id,technician);
    await expect(reviewHistory(plant.facility.id,'test-history',{assertionId:'assertion',state:'REVIEWED',note:'test'},technician)).rejects.toThrow(/administrator/);
    const other=structuredClone(buildLiebFoodsPackage()); await resetPlant(other);
    expect(await listHistory(other.facility.id,admin)).toEqual([]);
    expect(await listAttachments(undefined,other.facility.id)).toEqual([]);
    await expect(importHistory(blob,other.facility.id,admin)).rejects.toThrow(/mismatch/);
  });
  it.runIf(Boolean(process.env.IAG_HISTORY_BUNDLE))('validates the actual private package and idempotent ingestion against existing J. Lieb records', async () => {
    const plant=structuredClone(buildLiebFoodsPackage()); await resetPlant(plant);
    const blob=new Blob([readFileSync(process.env.IAG_HISTORY_BUNDLE!)]);
    const {manifest}=await readHistoryBundle(blob,plant.facility.id);
    expect(manifest.assertions.filter(a=>a.id.startsWith('C') && /^C\d\d$/.test(a.id))).toHaveLength(20);
    expect(manifest.assertions.filter(a=>a.id.startsWith('siemens_recorded_parameters-'))).toHaveLength(135);
    expect(manifest.assertions.find(a=>a.id==='kosme_card01_baseline-001')!.values!.raw_value).toBe('0144.2');
    expect(manifest.subjects.filter(s=>s.candidateAssetId && plant.assets.some(a=>a.id===s.candidateAssetId)).map(s=>s.candidateAssetId)).toEqual(['FG-L4-MTN-001','L2-CC-001']);
    await importHistory(blob,plant.facility.id,admin); expect(await importHistory(blob,plant.facility.id,admin)).toBe('UNCHANGED');
    expect(await loadPlant(plant.facility.id)).toEqual(plant); expect(await listQueuedMutations(plant.facility.id)).toEqual([]);
    const attachments=await listAttachments(undefined,plant.facility.id);
    expect(attachments.length).toBe(new Set(manifest.files.map(f=>f.sha256)).size);
    for(const a of attachments) expect(a.access).toBe('LOCAL_ONLY');
    const recovery=await exportPrivateRecovery(plant.facility.id); await resetPlant(plant); await restorePrivateRecovery(recovery,plant.facility.id);
    expect((await listHistory(plant.facility.id,admin))[0].manifest).toEqual(manifest);
  },30000);
});
