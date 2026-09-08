import { describe, it, expect } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { mapMachineRegister } from './machineRegisters';
import { mergeAssetPackage, type AssetPackagePatch } from './additivePackage';
import { validateFacilityPackage } from './schema';
import { portablePlantPackage } from './runtimeDb';

function fixture() {
  const plant = structuredClone(demoFacilityPackage); const asset = plant.assets[0];
  const evidence = { id: 'private-register-source', type: 'OTHER' as const, title: 'Recovered register', pathOrUrl: 'private://source', access: 'LOCAL_ONLY' as const };
  const source = { id: 'private-register-doc', assetId: asset.id, category: 'Source', title: 'parameters-all.json', path: 'private://source', state: 'REVIEW' as const, required: false, verificationStatus: 'FIELD_VERIFY' as const, evidenceIds: [evidence.id] };
  const patch: AssetPackagePatch = { facilityId: plant.facility.id, entityVersions: {}, areas: [], assets: [asset], components: [], relationships: [], evidence: [evidence], documents: [source], revisions: [], assetSerialSources: [] };
  return { plant, patch, source, asset };
}
describe('native machine registers', () => {
  it('retains distinct snapshots, string identifiers, inherited review and intentional nulls', () => {
    const { patch, source, asset } = fixture();
    const rows = [{ snapshotId: 'first', code: 'P001', rawValue: '0', unit: null, sourceId: 'missing-original', locator: 'page 1' }, { snapshotId: 'second', code: 'P001', rawValue: '0', unit: null }, { code: 'A102', rawValue: '0400', state: 'HISTORICAL' }];
    const doc = mapMachineRegister(patch, asset.id, 'parameters-all', rows, source, '6');
    expect(doc.register!.entries.map(e => e.values)).toEqual(rows);
    expect(new Set(doc.register!.entries.map(e => e.id)).size).toBe(3);
    expect(mapMachineRegister(patch, asset.id, 'parameters-all', [...rows].reverse(), source, '6').register!.entries.map(e => e.id)).toEqual(doc.register!.entries.map(e => e.id).reverse());
    expect(doc.register!.entries[0].provenance).toEqual({ filename: 'parameters-all.json', section: '6', review: 'INHERITED', sourceId: 'missing-original', locator: 'page 1' });
    expect(doc.register!.entries.every(e => e.verificationStatus === 'FIELD_VERIFY')).toBe(true);
  });
  it('preserves user edits as conflicts, is idempotent, and excludes private rows from portable exports', () => {
    const { plant, patch, source, asset } = fixture();
    const doc = mapMachineRegister(patch, asset.id, 'wiring-all', [{ wireId: '6', sourceTerminal: '04', destinationEquipment: null, state: 'PROPOSED' }], source, '5');
    patch.documents.push(doc);
    const first = mergeAssetPackage(plant, patch);
    expect(mergeAssetPackage(first.plant, patch).added).toEqual([]);
    expect(portablePlantPackage(first.plant).documents.some(d => d.register)).toBe(false);
    first.plant.documents.find(d => d.id === doc.id)!.register!.entries[0].values.reviewNote = 'Local correction';
    const second = mergeAssetPackage(first.plant, patch);
    expect(second.conflicts).toHaveLength(1);
    expect(second.plant.documents.find(d => d.id === doc.id)!.register!.entries[0].values.reviewNote).toBe('Local correction');
  });
  it('rejects unrelated equipment references and public register sources', () => {
    const { plant, patch, source, asset } = fixture();
    patch.documents.push(mapMachineRegister(patch, asset.id, 'service', [{ title: 'Observation' }], source, '8'));
    const merged = mergeAssetPackage(plant, patch).plant;
    merged.documents.find(d => d.register)!.register!.entries[0].entityIds.push('foreign-equipment');
    expect(() => validateFacilityPackage(merged)).toThrow(/unrelated/);
    merged.documents.find(d => d.register)!.register!.entries[0].entityIds.pop();
    merged.evidence.find(e => e.id === source.evidenceIds[0])!.access = 'PUBLIC_APP';
    expect(() => validateFacilityPackage(merged)).toThrow(/controlled/);
  });
});
