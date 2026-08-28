import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { createStoredZip, readStoredZip } from './iagArchive';
import { exportPlantArchive, importPlantArchive, resetPlant } from './runtimeDb';

describe('.iag archive compatibility', () => {
  it('exports archive v2 with schema-v2 plant data', async () => {
    await resetPlant(demoFacilityPackage);
    const archive = await exportPlantArchive();
    const files = await readStoredZip(archive);
    const manifest = JSON.parse(await files.get('manifest.json')!.text());
    const plant = JSON.parse(await files.get('data/plant.json')!.text());
    expect(manifest.archiveVersion).toBe(2);
    expect(plant.schemaVersion).toBe(2);
  });

  it('reads archive v1 and migrates an untagged legacy package', async () => {
    const { schemaVersion: _schema, packageRevision: _revision, entityVersions: _versions, ...legacy } = structuredClone(demoFacilityPackage);
    const archive = await createStoredZip([
      { name: 'manifest.json', data: JSON.stringify({ format: 'industrial-asset-graph', archiveVersion: 1, exportedAt: '2026-08-27T00:00:00Z', facilityId: legacy.facility.id, facilityName: legacy.facility.name, counts: { assets: legacy.assets.length, areas: legacy.areas.length, relationships: 0, documents: 0, evidence: 0, attachments: 0, observations: 0 } }) },
      { name: 'data/plant.json', data: JSON.stringify(legacy) },
      { name: 'data/observations.json', data: '[]' },
      { name: 'data/attachments.json', data: '[]' },
    ]);
    const imported = await importPlantArchive(archive, 'replace');
    expect(imported.schemaVersion).toBe(2);
    expect(imported.assets).toEqual(demoFacilityPackage.assets);
  });
});
