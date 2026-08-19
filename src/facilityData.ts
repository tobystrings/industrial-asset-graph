import { activeFacilityPackage } from './facility';
import type { FacilityPackage } from './facility/types';

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

export const facility = active.facility;
export const areas = active.areas;
export const machines = active.machines;
export const components = active.components;
export const relationships = active.relationships;
export const documents = active.documents;
export const evidence = active.evidence;
export const revisions = active.revisions;
export const assetSerialSources = active.assetSerialSources;

export const documentationPercent = (assetId: string) => {
  const required = documents.filter((item) => item.assetId === assetId && item.required);
  if (!required.length) return 0;
  const weights = { COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 } as const;
  return Math.round(required.reduce((sum, item) => sum + weights[item.state], 0) / required.length * 100);
};
