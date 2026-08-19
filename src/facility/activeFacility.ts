import {
  areas,
  assetSerialSources,
  components,
  documents,
  evidence,
  facility,
  machines,
  relationships,
  revisions,
} from '../../facilities/lieb-foods/data';
import { featureConfig } from '../../facilities/lieb-foods/config';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import type { FacilityPackage } from './types';

export const liebFacilityPackage: FacilityPackage = {
  facility,
  featureConfig,
  areas,
  assets: machines,
  components,
  relationships,
  documents,
  evidence,
  revisions,
  assetSerialSources,
};

export function selectFacilityPackage(id: string | undefined): FacilityPackage {
  if (id === 'demo-plant') return demoFacilityPackage;
  return liebFacilityPackage;
}

/**
 * Facility package selected for this deployment. Lieb remains the default so
 * current production behavior is unchanged; set VITE_FACILITY=demo-plant (or
 * add another selector entry) to boot the same framework with another dataset.
 */
export const activeFacilityPackage = selectFacilityPackage(import.meta.env.VITE_FACILITY);

export default activeFacilityPackage;
