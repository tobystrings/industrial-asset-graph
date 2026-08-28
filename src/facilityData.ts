import activeFacilityPackage from './facility/activeFacility';
import type { FacilityPackage } from './facility/types';

/**
 * @deprecated Compatibility projection for legacy J. Lieb-era feature helpers.
 * New generic runtime code must consume FacilityPackage through FacilityProvider
 * or accept facility-derived inputs explicitly. This module owns no facility facts.
 */

export function facilityDataFor(pkg: FacilityPackage) {
  return {
    facility: pkg.facility,
    areas: pkg.areas,
    machines: pkg.assets,
    components: pkg.components,
    relationships: pkg.relationships,
    documents: pkg.documents,
    evidence: pkg.evidence,
    revisions: pkg.revisions,
    assetSerialSources: pkg.assetSerialSources,
  };
}

const active = facilityDataFor(activeFacilityPackage);

export let facility = active.facility;
export const areas = [...active.areas];
export const machines = [...active.machines];
export const components = [...active.components];
export const relationships = [...active.relationships];
export const documents = [...active.documents];
export const evidence = [...active.evidence];
export const revisions = [...active.revisions];
export const assetSerialSources = [...active.assetSerialSources];

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}

export function syncFacilityData(pkg: FacilityPackage) {
  facility = pkg.facility;
  activeFacilityPackage.facility = structuredClone(pkg.facility);
  activeFacilityPackage.featureConfig = structuredClone(pkg.featureConfig);
  activeFacilityPackage.mapConfig = pkg.mapConfig ? structuredClone(pkg.mapConfig) : undefined;
  replaceArray(areas, pkg.areas);
  replaceArray(machines, pkg.assets);
  replaceArray(components, pkg.components);
  replaceArray(relationships, pkg.relationships);
  replaceArray(documents, pkg.documents);
  replaceArray(evidence, pkg.evidence);
  replaceArray(revisions, pkg.revisions);
  replaceArray(assetSerialSources, pkg.assetSerialSources);
}

export const documentationPercent = (assetId: string) => {
  const required = documents.filter((item) => item.assetId === assetId && item.required);
  if (!required.length) return 0;
  const weights = { COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 } as const;
  return Math.round(required.reduce((sum, item) => sum + weights[item.state], 0) / required.length * 100);
};
