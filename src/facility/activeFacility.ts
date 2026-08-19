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
import { featureConfig } from '../../facilities/lieb-foods/config';
import type { FacilityPackage } from './types';

/**
 * Active facility package for the current deployment.
 *
 * Framework consumers receive customer data and runtime defaults through one
 * package boundary. Legacy data imports remain available temporarily through
 * src/facilityData.ts while the remaining consumers are migrated.
 */
export const activeFacilityPackage: FacilityPackage = {
  facility,
  featureConfig,
  areas,
  assets: machines,
  components,
  relationships,
  documents,
  evidence,
  revisions,
};

export default activeFacilityPackage;
