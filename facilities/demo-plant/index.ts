import type { FacilityPackage } from '../../src/facility/types';

export const demoFacilityPackage: FacilityPackage = {
  facility: {
    id: 'facility-demo',
    name: 'Demo Plant',
    status: 'Normal',
    location: 'Demo facility',
  },
  featureConfig: {
    defaultAreaId: 'area-demo-floor',
    featuredCabinetAssetId: 'DEMO-CAB-001',
    featuredMachineAssetId: 'DEMO-MCH-001',
    brandMark: 'DP',
  },
  areas: [
    {
      id: 'area-demo-floor',
      name: 'Demo Floor',
      shortName: 'Demo',
      status: 'IN_PROGRESS',
      overlay: { x: 10, y: 10, width: 40, height: 30 },
      assetIds: ['DEMO-MCH-001', 'DEMO-CAB-001'],
    },
  ],
  assets: [
    {
      id: 'DEMO-MCH-001',
      name: 'Demo Machine',
      description: 'Minimal machine used to prove facility-package portability',
      type: 'Machine',
      facilityId: 'facility-demo',
      areaId: 'area-demo-floor',
      line: 'Demo Line',
      verificationStatus: 'FIELD_VERIFY',
      manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      facts: [],
      componentIds: [],
      unknowns: ['Capture machine identity'],
    },
    {
      id: 'DEMO-CAB-001',
      name: 'Demo Control Cabinet',
      description: 'Minimal cabinet used to prove facility-package portability',
      type: 'Control Cabinet',
      facilityId: 'facility-demo',
      areaId: 'area-demo-floor',
      line: 'Demo Line',
      verificationStatus: 'FIELD_VERIFY',
      manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
      facts: [],
      componentIds: [],
      unknowns: ['Capture cabinet identity'],
    },
  ],
  components: [],
  relationships: [],
  documents: [],
  evidence: [],
  revisions: [],
};

export default demoFacilityPackage;
