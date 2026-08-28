import type { FacilityPackage } from './types';
import type { VerificationState } from '../types/facility';

export const FACILITY_SCHEMA_VERSION = 2 as const;
export type LegacyFacilityPackage = Omit<FacilityPackage, 'schemaVersion' | 'packageRevision' | 'entityVersions'> & {
  schemaVersion?: 1;
  packageRevision?: never;
  entityVersions?: never;
};

const verificationStates = new Set<VerificationState>(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED']);

export function migrateFacilityPackage(input: FacilityPackage | LegacyFacilityPackage): FacilityPackage {
  if ((input as FacilityPackage).schemaVersion === FACILITY_SCHEMA_VERSION) {
    return structuredClone(input as FacilityPackage);
  }
  const legacy = structuredClone(input as LegacyFacilityPackage);
  return {
    ...legacy,
    schemaVersion: FACILITY_SCHEMA_VERSION,
    packageRevision: 1,
    entityVersions: {},
  };
}

export function validateFacilityPackage(input: unknown): asserts input is FacilityPackage {
  if (!input || typeof input !== 'object') throw new Error('Facility package must be an object.');
  const pkg = input as Partial<FacilityPackage>;
  if (pkg.schemaVersion !== FACILITY_SCHEMA_VERSION) throw new Error(`Unsupported facility schema version: ${String(pkg.schemaVersion)}`);
  if (!Number.isInteger(pkg.packageRevision) || (pkg.packageRevision ?? 0) < 1) throw new Error('Facility package revision must be a positive integer.');
  if (!pkg.facility?.id || !pkg.facility.name) throw new Error('Facility identity is required.');
  for (const key of ['areas', 'assets', 'components', 'relationships', 'documents', 'evidence', 'revisions', 'assetSerialSources'] as const) {
    if (!Array.isArray(pkg[key])) throw new Error(`Facility package ${key} must be an array.`);
  }
  const ids = new Set<string>();
  for (const item of [...pkg.areas!, ...pkg.assets!, ...pkg.components!, ...pkg.documents!, ...pkg.evidence!]) {
    if (!item.id || ids.has(item.id)) throw new Error(`Missing or duplicate entity ID: ${item.id || '(empty)'}`);
    ids.add(item.id);
  }
  for (const relationship of pkg.relationships!) {
    if (!relationship.id || ids.has(relationship.id)) throw new Error(`Missing or duplicate relationship ID: ${relationship.id || '(empty)'}`);
    ids.add(relationship.id);
    if (!ids.has(relationship.source) || !ids.has(relationship.target)) throw new Error(`Relationship ${relationship.id} has an unresolved endpoint.`);
    if (!verificationStates.has(relationship.verificationStatus)) throw new Error(`Relationship ${relationship.id} has an invalid verification state.`);
  }
  for (const evidence of pkg.evidence!) {
    if (!['PUBLIC_APP', 'LOCAL_ONLY', 'RESTRICTED'].includes(evidence.access)) throw new Error(`Evidence ${evidence.id} has an invalid access state.`);
  }
}

export function loadFacilityPackage(input: unknown): FacilityPackage {
  const migrated = migrateFacilityPackage(input as FacilityPackage | LegacyFacilityPackage);
  validateFacilityPackage(migrated);
  return migrated;
}
