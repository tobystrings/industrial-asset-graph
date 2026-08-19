import {
  areas,
  components,
  documents,
  evidence,
  facility,
  machines,
  relationships,
  revisions,
} from '../../facilities/lieb-foods/data';
import type { FacilityPackage } from './types';

/**
 * Active facility package for the current deployment.
 *
 * The framework now reads Lieb data from the customer-specific package while
 * legacy imports continue to work through src/facilityData.ts until the next
 * migration step removes those direct dependencies.
 */
export const activeFacilityPackage: FacilityPackage = {
  facility,
  areas,
  assets: machines,
  components,
  relationships,
  documents,
  evidence,
  revisions,
};

export default activeFacilityPackage;
