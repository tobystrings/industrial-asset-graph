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

export default activeFacilityPackage;
