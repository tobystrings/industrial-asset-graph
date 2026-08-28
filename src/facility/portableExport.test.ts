import { describe, expect, it } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { portablePlantPackage } from './runtimeDb';

describe('portable package access boundary', () => {
  it('excludes LOCAL_ONLY evidence and dependent records', () => {
    const plant = structuredClone(demoFacilityPackage);
    plant.evidence.push({ id: 'LOCAL-EVIDENCE', type: 'PHOTO', title: 'Synthetic local test', pathOrUrl: 'indexeddb://attachment/test', access: 'LOCAL_ONLY' });
    plant.documents.push({ id: 'LOCAL-DOC', assetId: plant.assets[0].id, category: 'Photo', title: 'Synthetic local test', path: 'indexeddb://attachment/test', state: 'DRAFT', required: false, verificationStatus: 'FIELD_VERIFY', evidenceIds: ['LOCAL-EVIDENCE'] });
    plant.relationships.push({ id: 'LOCAL-REL', source: plant.assets[0].id, target: 'LOCAL-EVIDENCE', type: 'SUPPORTED_BY_EVIDENCE', verificationStatus: 'FIELD_VERIFY', evidenceIds: ['LOCAL-EVIDENCE'] });
    const portable = portablePlantPackage(plant);
    expect(portable.evidence.some((item) => item.id === 'LOCAL-EVIDENCE')).toBe(false);
    expect(portable.documents.some((item) => item.id === 'LOCAL-DOC')).toBe(false);
    expect(portable.relationships.some((item) => item.id === 'LOCAL-REL')).toBe(false);
  });
});
