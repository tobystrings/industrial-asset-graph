import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { mergeAssetPackage, importPrivateAssetBundle, sha256, exportPrivateRecovery, restorePrivateRecovery, type AssetPackagePatch, type PrivateAssetBundle } from './additivePackage';
import { createStoredZip, readStoredZip } from './iagArchive';
import { resetPlant, loadPlant, listAttachments, savePlant, queueMutation, listQueuedMutations, portablePlantPackage } from './runtimeDb';
import { validateFacilityPackage } from './schema';
import type { SyncMutation } from './syncContract';

function fixture() {
  const plant = structuredClone(demoFacilityPackage);
  const asset = { ...structuredClone(plant.assets[0]), id: 'private-test-machine', componentIds: ['private-test-component'] };
  const patch: AssetPackagePatch = { facilityId: plant.facility.id, entityVersions: {}, areas: [], assets: [asset], components: [{ id: 'private-test-component', label: 'Documented component', type: 'VFD', parentId: asset.id, verificationStatus: 'FIELD_VERIFY', evidenceIds: ['private-test-evidence'] }], evidence: [{ id: 'private-test-evidence', title: 'Private test image', type: 'PHOTO', access: 'LOCAL_ONLY', pathOrUrl: 'indexeddb://attachment/private-test-file' }], documents: [{ id: 'private-test-doc', assetId: asset.id, category: 'Photos', title: 'Private test photo', path: 'indexeddb://attachment/private-test-file', state: 'REVIEW', required: false, verificationStatus: 'FIELD_VERIFY', evidenceIds: ['private-test-evidence'] }], relationships: [], revisions: [], assetSerialSources: [] };
  return { plant, patch };
}
async function bundle(patch: AssetPackagePatch, corrupt = false) {
  const blob = new Blob(['original bytes']);
  const manifest: PrivateAssetBundle = { format: 'industrial-asset-graph-private', version: 1, patch, observations: [], attachments: [{ id: 'private-test-file', assetId: patch.assets[0].id, name: 'photo.txt', mimeType: 'text/plain', size: blob.size, category: 'OTHER', verificationStatus: 'FIELD_VERIFY', access: 'LOCAL_ONLY', createdAt: '2026-09-07T00:00:00Z', filePath: 'files/photo.txt', sha256: corrupt ? 'bad' : await sha256(blob) }] };
  return createStoredZip([{ name: 'private-manifest.json', data: JSON.stringify(manifest) }, { name: 'files/photo.txt', data: blob }]);
}
describe('private additive asset packages', () => {
  it('preserves existing field edits and exposes conflicts without duplicate IDs', () => {
    const { plant, patch } = fixture(); const first = mergeAssetPackage(plant, patch);
    first.plant.assets.find(a => a.id === patch.assets[0].id)!.description = 'Technician correction';
    const second = mergeAssetPackage(first.plant, patch);
    expect(second.added).toHaveLength(0); expect(second.conflicts).toHaveLength(1);
    expect(second.plant.assets.find(a => a.id === patch.assets[0].id)!.description).toBe('Technician correction');
    expect(second.plant.assets[0]).toEqual(plant.assets[0]);
    expect(second.plant.entityVersions).toEqual(first.plant.entityVersions);
  });
  it('rejects foreign facilities and dangling graph endpoints before writes', () => {
    const { plant, patch } = fixture();
    expect(() => mergeAssetPackage(plant, { ...patch, facilityId: 'another-plant' })).toThrow(/different facility/);
    patch.relationships.push({ id: 'bad-link', source: 'missing', target: patch.assets[0].id, type: 'CONTAINS', evidenceIds: [], verificationStatus: 'FIELD_VERIFY' });
    expect(() => mergeAssetPackage(plant, patch)).toThrow(/unresolved endpoint/);
  });
  it('relinks original bytes once, backs up private data, and produces valid portable output', async () => {
    const { plant, patch } = fixture(); await resetPlant(plant);
    const zip = await bundle(patch); await importPrivateAssetBundle(zip, plant.facility.id);
    const again = await importPrivateAssetBundle(zip, plant.facility.id);
    expect(again.added).toHaveLength(0); expect(again.attachmentsAdded).toBe(0);
    expect(await (await listAttachments(undefined, plant.facility.id))[0].blob.text()).toBe('original bytes');
    const recovery = await readStoredZip(await exportPrivateRecovery(plant.facility.id));
    expect(await recovery.get('files/private-test-file')!.text()).toBe('original bytes');
    const portable = portablePlantPackage(again.plant); validateFacilityPackage(portable);
    expect(portable.assets.find(a => a.id === patch.assets[0].id)!.componentIds).toEqual([]);
    expect(portable.evidence.some(e => e.access !== 'PUBLIC_APP')).toBe(false);
  });
  it('rejects corrupted attachments without changing plant data', async () => {
    const { plant, patch } = fixture(); await resetPlant(plant);
    await expect(importPrivateAssetBundle(await bundle(patch, true), plant.facility.id)).rejects.toThrow(/integrity/);
    expect(await loadPlant(plant.facility.id)).toEqual(plant);
    expect(await listAttachments(undefined, plant.facility.id)).toEqual([]);
  });
  it('restores exact pre-insertion state and rejects a foreign recovery without writes', async () => {
    const { plant, patch } = fixture(); await resetPlant(plant);
    const pending: SyncMutation = { mutationId: 'preserved-draft', entityId: plant.assets[0].id, entityType: 'asset', actorId: 'technician', clientId: 'local', baseVersion: 1, operation: 'UPSERT', createdAt: '2026-09-07T00:00:00Z', reviewState: 'LOCAL_DRAFT', value: { name: 'Unsubmitted correction' } };
    await queueMutation(pending, plant.facility.id);
    const backup = await exportPrivateRecovery(plant.facility.id);
    await importPrivateAssetBundle(await bundle(patch), plant.facility.id);
    expect(await listQueuedMutations(plant.facility.id)).toEqual([pending]);
    await expect(restorePrivateRecovery(backup, 'wrong-facility')).rejects.toThrow(/mismatch/);
    expect((await listAttachments(undefined, plant.facility.id)).length).toBe(1);
    const withEvidence = await exportPrivateRecovery(plant.facility.id);
    await restorePrivateRecovery(backup, plant.facility.id);
    expect(await loadPlant(plant.facility.id)).toEqual(plant);
    expect(await listAttachments(undefined, plant.facility.id)).toEqual([]);
    expect(await listQueuedMutations(plant.facility.id)).toEqual([pending]);
    await restorePrivateRecovery(withEvidence, plant.facility.id);
    expect(await (await listAttachments(undefined, plant.facility.id))[0].blob.text()).toBe('original bytes');
  });
  it('aborts the whole rollback if a non-plant store has malformed keys', async () => {
    const { plant, patch } = fixture(); await resetPlant(plant);
    const entries = await readStoredZip(await exportPrivateRecovery(plant.facility.id));
    const recovery = JSON.parse(await entries.get('recovery.json')!.text());
    recovery.stores['mutation-outbox'] = { keys: ['invalid'], values: [{}] };
    const malformed = await createStoredZip([{ name: 'recovery.json', data: JSON.stringify(recovery) }]);
    await importPrivateAssetBundle(await bundle(patch), plant.facility.id);
    const before = await loadPlant(plant.facility.id);
    await expect(restorePrivateRecovery(malformed, plant.facility.id)).rejects.toThrow();
    expect(await loadPlant(plant.facility.id)).toEqual(before);
    expect(await (await listAttachments(undefined, plant.facility.id))[0].blob.text()).toBe('original bytes');
  });
});
