export * from './data';
import type { FacilityPackage } from '../../src/facility/types';
import { areas, assetSerialSources, components, documents, evidence, facility, machines, relationships, revisions } from './data';
import { featureConfig } from './config';
import { mapConfig } from './map';

export function buildLiebFoodsPackage(): FacilityPackage {
  return { schemaVersion: 2, packageRevision: 1, entityVersions: {}, facility, featureConfig, mapConfig, areas, assets: machines, components, relationships, documents, evidence, revisions, assetSerialSources };
}

export default buildLiebFoodsPackage;
