import { validateStudio } from '../map/studioModel';
import type { FacilityPackage } from './types';
import type { VerificationState } from '../types/facility';
import type { FacilityMapAnnotation, FacilityMapWall } from './types';

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
    if (!['LOCATED_IN','CONTAINS','FEEDS','CONTROLS','SENSES','SUPPLIES','ISOLATES','INTERLOCKS_WITH','UPSTREAM_OF','DOWNSTREAM_OF','SENDS_DATA_TO','MECHANICALLY_DRIVES','HAS_DOCUMENT','SUPPORTED_BY_EVIDENCE'].includes(relationship.type)) throw new Error(`Relationship ${relationship.id} has an invalid type.`);
    if (relationship.route && !['NORMAL','BRANCH','BYPASS','REDUNDANT'].includes(relationship.route)) throw new Error(`Relationship ${relationship.id} has an invalid route.`);
  }
  for (const evidence of pkg.evidence!) {
    if (!['PUBLIC_APP', 'LOCAL_ONLY', 'RESTRICTED'].includes(evidence.access)) throw new Error(`Evidence ${evidence.id} has an invalid access state.`);
  }
  const areaIds = new Set(pkg.areas!.map((area) => area.id));
  const assetIds = new Set(pkg.assets!.map((asset) => asset.id));
  const componentIds = new Set(pkg.components!.map((component) => component.id));
  const evidenceIds = new Set(pkg.evidence!.map((evidence) => evidence.id));
  const production = pkg.facility.production;
  const lineIds = new Set<string>();
  if (production) {
    if (!Array.isArray(production.lines) || !Array.isArray(production.taxonomy) || !Array.isArray(production.survey)) throw new Error('Production lines, taxonomy and survey must be arrays.');
    const names = new Set<string>();
    for (const line of production.lines) {
      const name = line.name?.trim().toLowerCase();
      if (!line.id || !name || lineIds.has(line.id) || names.has(name) || !Number.isFinite(line.importance) || line.importance < 0) throw new Error('Invalid or duplicate production line.');
      lineIds.add(line.id); names.add(name);
    }
    if (!production.weights || ['line','shared','failures','redundancy','spares','gaps'].some(k => !Number.isFinite(production.weights[k as keyof typeof production.weights]) || production.weights[k as keyof typeof production.weights] < 0)) throw new Error('Priority weights must be nonnegative numbers.');
    if (production.taxonomy.some(t => typeof t !== 'string' || !t.trim())) throw new Error('Taxonomy categories require names.');
    const surveyIds = new Set<string>();
    for (const item of production.survey) {
      if (!item.id || surveyIds.has(item.id) || !item.action?.trim() || (item.lineId && !lineIds.has(item.lineId)) || !['OPEN','RECORDED','NOT_APPLICABLE'].includes(item.state)) throw new Error('Invalid survey record.');
      surveyIds.add(item.id);
    }
  }
  if (!pkg.featureConfig || !areaIds.has(pkg.featureConfig.defaultAreaId)) throw new Error('Facility default area must reference an existing area.');
  for (const featured of [pkg.featureConfig.featuredCabinetAssetId, pkg.featureConfig.featuredMachineAssetId]) {
    if (featured && !assetIds.has(featured)) throw new Error(`Featured asset does not exist: ${featured}`);
  }
  for (const area of pkg.areas!) for (const assetId of area.assetIds) if (!assetIds.has(assetId)) throw new Error(`Area ${area.id} references missing asset ${assetId}.`);
  for (const area of pkg.areas!) {
    const overlay = area.overlay;
    if (![overlay.x, overlay.y, overlay.width, overlay.height].every(Number.isFinite) || overlay.x < 0 || overlay.y < 0 || overlay.width <= 0 || overlay.height <= 0 || overlay.x + overlay.width > 100 || overlay.y + overlay.height > 100) throw new Error(`Area ${area.id} has invalid map geometry.`);
    if (overlay.polygon && (overlay.polygon.length < 3 || overlay.polygon.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100))) throw new Error(`Area ${area.id} has an invalid polygon.`);
  }
  for (const asset of pkg.assets!) {
    if (asset.production) {
      const p = asset.production;
      if (!Array.isArray(p.memberships) || !Array.isArray(p.service)) throw new Error('Invalid asset production record.');
      const memberIds = new Set<string>();
      for (const m of p.memberships) {
        if (!lineIds.has(m.lineId) || memberIds.has(m.lineId) || !verificationStates.has(m.verificationStatus) || !Array.isArray(m.evidenceIds) || m.evidenceIds.some(id => !evidenceIds.has(id))) throw new Error('Invalid or duplicate line membership.');
        if (m.verificationStatus === 'VERIFIED' && (!m.evidenceIds.length || !m.source?.trim() || !m.verifiedAt)) throw new Error('Verified line membership requires evidence, source and verification date.');
        memberIds.add(m.lineId);
      }
      for (const entry of p.service) if (!entry.id || !Array.isArray(entry.evidenceIds) || entry.evidenceIds.some(id => !evidenceIds.has(id))) throw new Error('Invalid service history evidence.');
      if (!['UNKNOWN','NONE','DOCUMENTED'].includes(p.redundancy) || !['UNKNOWN','UNAVAILABLE','AVAILABLE'].includes(p.spares)) throw new Error('Invalid reliability assessment.');
    }
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
    if (document.register) {
      if (!document.register.kind || !Array.isArray(document.register.entries)) throw new Error('Invalid machine register.');
      if (!document.evidenceIds.length || document.evidenceIds.some(id => pkg.evidence!.find(e => e.id === id)?.access === 'PUBLIC_APP')) throw new Error('Machine registers require controlled source evidence.');
      const entryIds = new Set<string>();
      for (const entry of document.register.entries) {
        if (!entry.id || entryIds.has(entry.id) || !entry.label || !verificationStates.has(entry.verificationStatus)) throw new Error('Invalid or duplicate register entry.');
        entryIds.add(entry.id);
        if (!entry.values || Array.isArray(entry.values) || typeof entry.values !== 'object' || entry.provenance?.review !== 'INHERITED') throw new Error('Register source values and provenance are required.');
        if (!Array.isArray(entry.entityIds) || !entry.entityIds.length || entry.entityIds.some(id => id !== document.assetId && !pkg.components!.some(c => c.id === id && c.parentId === document.assetId))) throw new Error('Register entry has an unrelated equipment reference.');
        if (!Array.isArray(entry.evidenceIds) || entry.evidenceIds.some(id => !evidenceIds.has(id))) throw new Error('Register entry references missing evidence.');
      }
    }
  }
  for (const relationship of pkg.relationships!) for (const evidenceId of relationship.evidenceIds) if (!evidenceIds.has(evidenceId)) throw new Error(`Relationship ${relationship.id} references missing evidence ${evidenceId}.`);
  for (const marker of (pkg.mapConfig?.markers ?? []) as Array<{ id?: string; assetId?: string; areaId?: string }>) {
    if (marker.assetId && !assetIds.has(marker.assetId)) throw new Error(`Map marker ${marker.id ?? '(unnamed)'} references missing asset ${marker.assetId}.`);
    if (marker.areaId && !areaIds.has(marker.areaId)) throw new Error(`Map marker ${marker.id ?? '(unnamed)'} references missing area ${marker.areaId}.`);
  }
  const studioErrors = validateStudio(pkg.mapConfig ?? {});
  if (studioErrors.length) throw new Error(studioErrors[0]);
  const mapIds = new Set<string>();
  for (const object of [...(pkg.mapConfig?.walls ?? []) as FacilityMapWall[], ...(pkg.mapConfig?.annotations ?? []) as FacilityMapAnnotation[]]) {
    if (!object.id || mapIds.has(object.id)) throw new Error(`Missing or duplicate map object ID: ${object.id || '(empty)'}.`);
    mapIds.add(object.id);
  }
  for (const wall of (pkg.mapConfig?.walls ?? []) as FacilityMapWall[]) if (wall.points.length < 2 || wall.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)) throw new Error(`Wall ${wall.id} has invalid geometry.`);
}

export function loadFacilityPackage(input: unknown): FacilityPackage {
  const migrated = migrateFacilityPackage(input as FacilityPackage | LegacyFacilityPackage);
  validateFacilityPackage(migrated);
  return migrated;
}
