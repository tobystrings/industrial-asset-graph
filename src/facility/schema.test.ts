import { describe, expect, it } from 'vitest';
import { liebFacilityPackage } from './activeFacility';
import { loadFacilityPackage, migrateFacilityPackage, validateFacilityPackage, type LegacyFacilityPackage } from './schema';
import { unusedRelationshipCounts } from '../lib/relationshipHonesty';

describe('facility schema migration', () => {
  it('migrates the legacy package without changing plant truth', () => {
    const { schemaVersion: _schema, packageRevision: _revision, entityVersions: _versions, ...legacy } = structuredClone(liebFacilityPackage);
    const migrated = migrateFacilityPackage(legacy as LegacyFacilityPackage);
    validateFacilityPackage(migrated);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.assets).toEqual(liebFacilityPackage.assets);
    expect(migrated.relationships).toEqual(liebFacilityPackage.relationships);
    expect(unusedRelationshipCounts()).toEqual({ FEEDS: 0, CONTROLS: 0, SENSES: 0, INTERLOCKS_WITH: 0, SUPPLIES: 0, UPSTREAM_OF: 0 });
  });

  it('rejects imported data with unresolved relationship endpoints', () => {
    const invalid = structuredClone(liebFacilityPackage);
    invalid.relationships.push({ id: 'bad', source: 'missing', target: 'also-missing', type: 'FEEDS', verificationStatus: 'FIELD_VERIFY', evidenceIds: [] });
    expect(() => loadFacilityPackage(invalid)).toThrow(/unresolved endpoint/);
  });

  it('rejects duplicate IDs and broken facility references', () => {
    const duplicate = structuredClone(liebFacilityPackage);
    duplicate.assets.push(structuredClone(duplicate.assets[0]));
    expect(() => loadFacilityPackage(duplicate)).toThrow(/duplicate entity ID/);

    const wrongFacility = structuredClone(liebFacilityPackage);
    wrongFacility.assets[0].facilityId = 'facility-other';
    expect(() => loadFacilityPackage(wrongFacility)).toThrow(/belongs to facility-other/);

    const brokenMarker = structuredClone(liebFacilityPackage);
    brokenMarker.mapConfig = { ...(brokenMarker.mapConfig ?? {}), markers: [{ id: 'bad-marker', assetId: 'missing-asset' }] };
    expect(() => loadFacilityPackage(brokenMarker)).toThrow(/Map marker bad-marker references missing asset/);
  });
});
