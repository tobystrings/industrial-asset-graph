import { facilityRegistry } from '../../facilities/registry';
import type { FacilityPackage } from './types';

export const liebFacilityPackage = facilityRegistry.load('lieb-foods');
export function selectFacilityPackage(id: string | undefined): FacilityPackage { return facilityRegistry.load(id); }

function deploymentFacilityId(): string | undefined {
  const meta = import.meta as ImportMeta & { env?: { VITE_FACILITY?: string } };
  return meta.env?.VITE_FACILITY;
}

export const activeFacilityPackage = selectFacilityPackage(deploymentFacilityId());

export default activeFacilityPackage;
