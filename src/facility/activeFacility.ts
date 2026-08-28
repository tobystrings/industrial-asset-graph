import { facilityRegistry } from '../../facilities/registry';
import type { FacilityPackage } from './types';

export const liebFacilityPackage = facilityRegistry.load('lieb-foods');
export function selectFacilityPackage(id: string | undefined): FacilityPackage { return facilityRegistry.load(id); }

export function requestedFacilityId(search?: string, environmentId?: string): string | undefined {
  const query = new URLSearchParams(search ?? '');
  return query.get('facilityId') ?? query.get('facility') ?? environmentId;
}

function deploymentFacilityId(): string | undefined {
  const meta = import.meta as ImportMeta & { env?: { VITE_FACILITY?: string } };
  return requestedFacilityId(typeof window === 'undefined' ? '' : window.location.search, meta.env?.VITE_FACILITY);
}

export let activeFacilitySelectionError: Error | null = null;
export let activeFacilityPackage: FacilityPackage;
try {
  activeFacilityPackage = selectFacilityPackage(deploymentFacilityId());
} catch (error) {
  activeFacilitySelectionError = error instanceof Error ? error : new Error('Unable to select facility.');
  activeFacilityPackage = liebFacilityPackage;
}

function replaceArray<T>(target: T[], source: T[]) { target.splice(0, target.length, ...structuredClone(source)); }

/** Keeps the selected canonical package object stable for package-aware helpers. */
export function syncActiveFacilityPackage(pkg: FacilityPackage) {
  Object.assign(activeFacilityPackage.facility, structuredClone(pkg.facility));
  activeFacilityPackage.featureConfig = structuredClone(pkg.featureConfig);
  activeFacilityPackage.mapConfig = pkg.mapConfig ? structuredClone(pkg.mapConfig) : undefined;
  activeFacilityPackage.schemaVersion = pkg.schemaVersion;
  activeFacilityPackage.packageRevision = pkg.packageRevision;
  activeFacilityPackage.entityVersions = structuredClone(pkg.entityVersions);
  replaceArray(activeFacilityPackage.areas, pkg.areas);
  replaceArray(activeFacilityPackage.assets, pkg.assets);
  replaceArray(activeFacilityPackage.components, pkg.components);
  replaceArray(activeFacilityPackage.relationships, pkg.relationships);
  replaceArray(activeFacilityPackage.documents, pkg.documents);
  replaceArray(activeFacilityPackage.evidence, pkg.evidence);
  replaceArray(activeFacilityPackage.revisions, pkg.revisions);
  replaceArray(activeFacilityPackage.assetSerialSources, pkg.assetSerialSources);
}

export default activeFacilityPackage;
