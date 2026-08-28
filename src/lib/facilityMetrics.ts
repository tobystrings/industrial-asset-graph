import activeFacilityPackage from '../facility/activeFacility';
const { areas, components, documents, assets: machines } = activeFacilityPackage;
const documentationPercent = (assetId: string) => {
  const required = documents.filter((item) => item.assetId === assetId && item.required);
  if (!required.length) return 0;
  const weights = { COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 } as const;
  return Math.round(required.reduce((sum, item) => sum + weights[item.state], 0) / required.length * 100);
};
import type { FacilityAsset, VerificationState, VerifiedFact } from '../types/facility';
import { unknownQueueState } from './walkdown';

const VERIFICATION_STATES: VerificationState[] = ['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED'];

export function documentedAreaCount(): number {
  return areas.filter((area) => area.assetIds.length > 0).length;
}

export function documentationCoveragePercent(): number {
  return Math.round((documentedAreaCount() / areas.length) * 100);
}

export function graphFieldItemCount(asset: FacilityAsset | null = null): number {
  if (asset) return asset.unknowns.length;
  return machines.reduce((sum, item) => sum + item.unknowns.length, 0);
}

/** Graph unknowns still open on this browser. Local captures drop the count; they are not in the graph. */
export function openFieldItemCount(asset: FacilityAsset | null = null): number {
  const list = asset ? [asset] : machines;
  return list.reduce((sum, item) => (
    sum + item.unknowns.filter((unknown) => unknownQueueState(item.id, unknown) === 'open').length
  ), 0);
}

export function documentedAssetCount(): number {
  return machines.length;
}

export function assetDocumentationCompleteness(): Array<{ assetId: string; name: string; percent: number }> {
  return machines.map((asset) => ({
    assetId: asset.id,
    name: asset.name,
    percent: documentationPercent(asset.id),
  }));
}

export function recordCount(): number {
  return machines.length + components.length;
}

export function factSources(asset: FacilityAsset | null): Array<{ verificationStatus: VerificationState }> {
  if (asset) {
    return [asset.manufacturer, asset.model, asset.serialNumber, ...asset.facts.map((item) => item.value), ...components.filter((item) => item.parentId === asset.id)];
  }
  const facts: Array<{ verificationStatus: VerificationState }> = [];
  for (const machine of machines) {
    facts.push(machine.manufacturer, machine.model, machine.serialNumber, ...machine.facts.map((item) => item.value));
  }
  facts.push(...components);
  return facts;
}

export function verificationCounts(asset: FacilityAsset | null = null): Record<VerificationState, number> {
  const items = factSources(asset);
  return Object.fromEntries(VERIFICATION_STATES.map((state) => [state, items.filter((item) => item.verificationStatus === state).length])) as Record<VerificationState, number>;
}

export function totalTrackedFacts(asset: FacilityAsset | null = null): number {
  return factSources(asset).length;
}

export function isDimmed(status: VerificationState, filters: Set<VerificationState>): boolean {
  return !filters.has(status);
}

export function filterAssets(filters: Set<VerificationState>, query = ''): FacilityAsset[] {
  const needle = query.trim().toLowerCase();
  return machines.filter((asset) => {
    if (!filters.has(asset.verificationStatus)) return false;
    if (!needle) return true;
    const hay = [asset.id, asset.name, asset.description, asset.type, asset.manufacturer.value, asset.model.value, ...documents.filter((doc) => doc.assetId === asset.id).map((doc) => doc.category)].join(' ').toLowerCase();
    return hay.includes(needle);
  });
}

export { VERIFICATION_STATES };
export type { VerifiedFact };
