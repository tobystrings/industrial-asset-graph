import {
  areas,
  components,
  documents,
  evidence,
  facility,
  machines,
  relationships,
  revisions,
} from '../facilityData';
import type { FacilityPackage } from './types';

/**
 * Compatibility adapter for the current dataset.
 *
 * Commit 1 intentionally leaves facilityData.ts in place. Later migration
 * commits can move the customer records without changing framework consumers.
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
