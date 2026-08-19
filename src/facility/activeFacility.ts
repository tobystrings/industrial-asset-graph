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
import { mapConfig } from '../../facilities/lieb-foods/map';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import type { FacilityPackage } from './types';

export const liebFacilityPackage: FacilityPackage = {
  facility,
  featureConfig,
  mapConfig,
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

function deploymentFacilityId(): string | undefined {
  const meta = import.meta as ImportMeta & { env?: { VITE_FACILITY?: string } };
  return meta.env?.VITE_FACILITY;
}

export const activeFacilityPackage = selectFacilityPackage(deploymentFacilityId());

export default activeFacilityPackage;
