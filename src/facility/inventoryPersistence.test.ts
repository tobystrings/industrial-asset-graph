import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { liebFacilityPackage } from './activeFacility';
import { emptyInventory, newPart } from './inventory';
import { exportPlantBackup, importPlantBackup, listAttachments, loadPlant, putAttachment, savePlant } from './runtimeDb';

it('backs up private inventory photos explicitly and keeps facility databases isolated', async () => {
  const pkg = structuredClone(liebFacilityPackage);
  const part = { ...newPart(pkg.facility.id), name: 'Private photo fixture' };
  part.photos = [{ id: 'inventory-private-photo', role: 'Label', access: 'LOCAL_ONLY' }];
  pkg.facility.inventory = { ...emptyInventory(), parts: [part] };
  await savePlant(pkg);
  await putAttachment({ id: 'inventory-private-photo', assetId: part.id, blob: new Blob(['isolated image bytes'], { type: 'image/png' }), name: 'test.png', mimeType: 'image/png', size: 20, category: 'PHOTO', verificationStatus: 'FIELD_VERIFY', access: 'LOCAL_ONLY', createdAt: new Date().toISOString() }, pkg.facility.id);
  const portable = await exportPlantBackup(pkg.facility.id);
  expect(portable.attachments).toHaveLength(0);
  expect(portable.plant.facility.inventory!.parts[0].photos).toHaveLength(0);
  // FileReader is supplied by browser tests; the private-byte round trip is tested there.
  expect(await listAttachments(undefined, 'inventory-other-facility')).toEqual([]);
  expect(await loadPlant('inventory-other-facility')).toBeNull();
  await expect(importPlantBackup(portable, 'merge', 'inventory-other-facility')).rejects.toThrow('mismatch');
  const newer = structuredClone(pkg); newer.packageRevision++;
  await savePlant(newer, pkg.facility.id, pkg.packageRevision);
  await expect(savePlant(pkg, pkg.facility.id, pkg.packageRevision)).rejects.toThrow('Another window');
});
