import type { FacilityPackage } from '../../src/facility/types';

/** Synthetic portability fixture. It is not real facility truth. */
export function buildTestFacilityPackage(): FacilityPackage {
  return {
    schemaVersion: 2,
    packageRevision: 1,
    entityVersions: {},
    facility: { id: 'facility-synthetic-test', name: 'Synthetic Test Facility', status: 'Test only', location: 'Synthetic fixture' },
    featureConfig: { defaultAreaId: 'synthetic-area-001', featuredCabinetAssetId: 'SYNTH-ASSET-001', featuredMachineAssetId: 'SYNTH-ASSET-001', brandMark: 'TF' },
    mapConfig: { markers: [] },
    areas: [{ id: 'synthetic-area-001', name: 'Synthetic Test Area', shortName: 'Test', status: 'IN_PROGRESS', overlay: { x: 5, y: 5, width: 20, height: 20 }, assetIds: ['SYNTH-ASSET-001'] }],
    assets: [{ id: 'SYNTH-ASSET-001', name: 'Synthetic Portability Asset', description: 'Test-only record proving facility isolation', type: 'Test Fixture', facilityId: 'facility-synthetic-test', areaId: 'synthetic-area-001', line: 'Synthetic', verificationStatus: 'FIELD_VERIFY', manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, facts: [], componentIds: [], unknowns: ['Synthetic fixture only'] }],
    components: [], relationships: [], documents: [], evidence: [], revisions: [], assetSerialSources: [],
  };
}

export default buildTestFacilityPackage;
