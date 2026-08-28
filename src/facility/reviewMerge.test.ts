import { describe, expect, it } from 'vitest';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import { applyReviewedChange } from './FacilityProvider';
import type { FacilityAsset, RelationshipRecord } from '../types/facility';

describe('reviewed entity merge', () => {
  it('does not let a later stale proposal erase an earlier approved entity', () => {
    const baseline = structuredClone(demoFacilityPackage);
    const asset: FacilityAsset = { ...baseline.assets[0], id: 'SYNTHETIC-TEST-ASSET', name: 'Synthetic test asset' };
    const assetProposal = { ...structuredClone(baseline), assets: [...baseline.assets, asset] };
    const afterAsset = applyReviewedChange(baseline, assetProposal, asset.id, { entityType: 'asset', operation: 'UPSERT', value: asset as unknown as Record<string, unknown> });

    const relationship: RelationshipRecord = { id: 'SYNTHETIC-TEST-REL', source: baseline.assets[0].id, target: baseline.assets[1].id, type: 'CONTROLS', verificationStatus: 'FIELD_VERIFY', evidenceIds: [] };
    const staleRelationshipProposal = { ...structuredClone(baseline), relationships: [relationship] };
    const afterRelationship = applyReviewedChange(afterAsset, staleRelationshipProposal, relationship.id, { entityType: 'relationship', operation: 'UPSERT', value: relationship as unknown as Record<string, unknown> });

    expect(afterRelationship.assets.some((item) => item.id === asset.id)).toBe(true);
    expect(afterRelationship.relationships).toContainEqual(relationship);
  });
});
