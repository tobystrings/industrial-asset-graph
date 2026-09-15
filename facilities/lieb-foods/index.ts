export * from './data';
import type { FacilityPackage } from '../../src/facility/types';
import { areas, assetSerialSources, components, documents, evidence, facility, machines, relationships, revisions } from './data';
import { featureConfig } from './config';
import { mapConfig } from './map';
import { liebProduction } from './production';
import { withClimax } from './climax';

export function buildLiebFoodsPackage(): FacilityPackage {
  return withClimax({ schemaVersion: 2, packageRevision: 1, entityVersions: {}, facility: { ...facility, production: liebProduction() }, featureConfig, mapConfig, areas, assets: machines, components, relationships, documents, evidence, revisions, assetSerialSources });
}

export default buildLiebFoodsPackage;
