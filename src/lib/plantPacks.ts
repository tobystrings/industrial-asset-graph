import { areas, machines } from '../facilityData';
import activeFacilityPackage from '../facility/activeFacility';
import type { FacilityCabinetPackage, FacilityFeatureConfig } from '../facility/types';
import { captureKitForArea } from './areaKit';
import { exportReviewPack, type ReviewPack } from './reviewPack';
import { loadWalkdownCaptures } from './walkdown';

export type AreaWalkPack = ReviewPack & {
  kind: 'area-walk-pack';
  areaId: string;
  createsMachine: false;
};

export function exportAreaWalkPack(areaId: string, now = new Date().toISOString()): AreaWalkPack | null {
  const kit = captureKitForArea(areaId);
  if (!kit || kit.kind !== 'empty') return null;
  const captures = loadWalkdownCaptures().filter((item) => item.targetId === areaId || item.targetId.startsWith(`${areaId}:`));
  return {
    kind: 'area-walk-pack',
    areaId,
    createsMachine: false,
    exportedAt: now,
    inGraph: false,
    captures,
  };
}

export function areaWalkPackMachineIds(pack: AreaWalkPack): string[] {
  const known = new Set(machines.map((item) => item.id));
  return pack.captures.map((item) => item.targetId).filter((id) => known.has(id));
}

export type CabinetPackage = FacilityCabinetPackage;

export function cabinetPackageFor(assetId: string, config: FacilityFeatureConfig = activeFacilityPackage.featureConfig): CabinetPackage | null {
  const packageConfig = config.cabinetPackage;
  if (!packageConfig || assetId !== packageConfig.assetId) return null;
  return packageConfig;
}

export function emptyAreaIds(): string[] {
  return areas.filter((area) => area.assetIds.length === 0).map((area) => area.id);
}
