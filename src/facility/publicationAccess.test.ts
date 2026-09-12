import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { buildTestFacilityPackage } from '../../facilities/test-facility';
import { applyPublication, capturePublication, emptyPublication } from './publication';
import { listAttachments, putAttachment, openPlantDb, type AttachmentRecord } from './runtimeDb';
import { sha256 } from './additivePackage';
import { historyFileId, listHistory, type HistoryRecord } from './historicalEvidence';
import { validatePublication } from './publicationModel';
vi.mock('./supabaseAuth', () => ({ supabase: null }));
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const values = new Map<string,string>();
  vi.stubGlobal('localStorage', { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => values.set(key,value) });
});
afterEach(() => vi.unstubAllGlobals());
describe('publication attachment access boundary', () => {
  const file = (id: string, access: AttachmentRecord['access']): AttachmentRecord => ({
    id, access, assetId:'asset-test', name:'field-note.txt', mimeType:'text/plain', size:6,
    blob:new Blob(['secret']), category:'OTHER', verificationStatus:'FIELD_VERIFY', createdAt:'2026-09-11T00:00:00Z',
  });
  it('does not upload private bytes or replay a cached public URL', async () => {
    const pkg = buildTestFacilityPackage();
    await putAttachment(file('local','LOCAL_ONLY'), pkg.facility.id);
    await putAttachment(file('restricted','RESTRICTED'), pkg.facility.id);
    // No Supabase transport is available: reaching the upload branch would throw.
    const { blob, ...metadata } = file('local','LOCAL_ONLY');
    const digest = await sha256(blob);
    const publication = await capturePublication(pkg, new Map([['local:' + digest, { ...metadata, url:'https://example.test/already-uploaded', sha256:digest }]]));
    expect(publication.attachments).toEqual([]);
    expect((await listAttachments(undefined,pkg.facility.id)).map(a=>a.access).sort()).toEqual(['LOCAL_ONLY','RESTRICTED']);
    await putAttachment(file('public','PUBLIC_APP'),pkg.facility.id);
    await expect(capturePublication(pkg)).rejects.toThrow('Shared publication is not configured.');
  });
  it('retains private files when applying an otherwise empty shared snapshot', async () => {
    const pkg = buildTestFacilityPackage();
    await putAttachment(file('local','LOCAL_ONLY'),pkg.facility.id);
    await putAttachment(file('public','PUBLIC_APP'),pkg.facility.id);
    await applyPublication(emptyPublication(pkg));
    const remaining = await listAttachments(undefined,pkg.facility.id);
    expect(remaining.map(a=>a.id)).toEqual(['local']);
    expect(await remaining[0].blob.text()).toBe('secret');
  });
  it('keeps private historical bundles local without breaking snapshot validation or erasing sources', async () => {
    const pkg = buildTestFacilityPackage(); const digest = await sha256(new Blob(['secret']));
    const source = { path:'source.txt',sha256:digest,size:6,mimeType:'text/plain',incomplete:false };
    const record: HistoryRecord = {id:'private-history',facilityId:pkg.facility.id,digest,importedAt:'2026-09-11',importedBy:'test',reviews:[],manifest:{format:'industrial-asset-graph-history',version:1,id:'private-history',facilityId:pkg.facility.id,title:'Private source',access:'LOCAL_ONLY',subjects:[],sources:[{id:'source',name:'Source',paths:['source.txt'],coverage:'Test source'}],files:[source],assertions:[],tasks:[]}};
    const db = await openPlantDb(pkg.facility.id);
    // Seed the immutable stores together, as the historical import transaction does.
    await new Promise<void>((resolve,reject) => {const tx=db.transaction(['historical-evidence','attachments'],'readwrite');tx.objectStore('historical-evidence').put(record);tx.objectStore('attachments').put({...file(historyFileId(record.id,source),'LOCAL_ONLY'),assetId:'history:' + record.id});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);}); db.close();
    const snapshot = await capturePublication(pkg);
    expect(snapshot.history).toEqual([]); expect(()=>validatePublication(snapshot,pkg.facility.id)).not.toThrow();
    await applyPublication(snapshot);
    expect((await listHistory(pkg.facility.id,{id:'test',name:'Test',role:'admin'})).map(h=>h.id)).toEqual([record.id]);
    expect(await (await listAttachments(undefined,pkg.facility.id))[0].blob.text()).toBe('secret');
  });
});
