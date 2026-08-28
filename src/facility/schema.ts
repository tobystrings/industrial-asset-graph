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
  const areaIds = new Set(pkg.areas!.map((area) => area.id));
  const assetIds = new Set(pkg.assets!.map((asset) => asset.id));
  const componentIds = new Set(pkg.components!.map((component) => component.id));
  const evidenceIds = new Set(pkg.evidence!.map((evidence) => evidence.id));
  if (!pkg.featureConfig || !areaIds.has(pkg.featureConfig.defaultAreaId)) throw new Error('Facility default area must reference an existing area.');
  for (const featured of [pkg.featureConfig.featuredCabinetAssetId, pkg.featureConfig.featuredMachineAssetId]) {
    if (featured && !assetIds.has(featured)) throw new Error(`Featured asset does not exist: ${featured}`);
  }
  for (const area of pkg.areas!) for (const assetId of area.assetIds) if (!assetIds.has(assetId)) throw new Error(`Area ${area.id} references missing asset ${assetId}.`);
  for (const asset of pkg.assets!) {
    if (asset.facilityId !== pkg.facility.id) throw new Error(`Asset ${asset.id} belongs to ${asset.facilityId}, not ${pkg.facility.id}.`);
    if (!areaIds.has(asset.areaId)) throw new Error(`Asset ${asset.id} references missing area ${asset.areaId}.`);
    for (const componentId of asset.componentIds) if (!componentIds.has(componentId)) throw new Error(`Asset ${asset.id} references missing component ${componentId}.`);
  }
  for (const component of pkg.components!) {
    if (!assetIds.has(component.parentId)) throw new Error(`Component ${component.id} references missing parent asset ${component.parentId}.`);
    for (const evidenceId of component.evidenceIds) if (!evidenceIds.has(evidenceId)) throw new Error(`Component ${component.id} references missing evidence ${evidenceId}.`);
  }
  for (const document of pkg.documents!) {
    if (!assetIds.has(document.assetId)) throw new Error(`Document ${document.id} references missing asset ${document.assetId}.`);
    for (const evidenceId of document.evidenceIds) if (!evidenceIds.has(evidenceId)) throw new Error(`Document ${document.id} references missing evidence ${evidenceId}.`);
  }
  for (const relationship of pkg.relationships!) for (const evidenceId of relationship.evidenceIds) if (!evidenceIds.has(evidenceId)) throw new Error(`Relationship ${relationship.id} references missing evidence ${evidenceId}.`);
  for (const marker of (pkg.mapConfig?.markers ?? []) as Array<{ id?: string; assetId?: string; areaId?: string }>) {
    if (marker.assetId && !assetIds.has(marker.assetId)) throw new Error(`Map marker ${marker.id ?? '(unnamed)'} references missing asset ${marker.assetId}.`);
    if (marker.areaId && !areaIds.has(marker.areaId)) throw new Error(`Map marker ${marker.id ?? '(unnamed)'} references missing area ${marker.areaId}.`);
  }
}

export function loadFacilityPackage(input: unknown): FacilityPackage {
  const migrated = migrateFacilityPackage(input as FacilityPackage | LegacyFacilityPackage);
  validateFacilityPackage(migrated);
  return migrated;
}
