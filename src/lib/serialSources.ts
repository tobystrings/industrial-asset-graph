import activeFacilityPackage from '../facility/activeFacility';
const { assetSerialSources } = activeFacilityPackage;
import type { SerialSource } from '../types/facility';

export function serialSourcesFor(assetId: string): SerialSource[] {
  return assetSerialSources.filter((item) => item.assetId === assetId);
}

export function serialSourcesDisagree(assetId: string): boolean {
  const sources = serialSourcesFor(assetId);
  if (sources.length < 2) return false;
  const values = new Set(sources.map((item) => item.value));
  return values.size > 1 && sources.every((item) => item.verificationStatus === 'DISPUTED');
}
