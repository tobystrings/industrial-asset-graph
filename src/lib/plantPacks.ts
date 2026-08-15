import { areas, machines } from '../facilityData';
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

export type CabinetPackage = {
  id: string;
  assetId: string;
  drawing: string;
  raster: string;
  metadata: string;
  destUnknown: true;
};

export function cabinetPackageFor(assetId: string): CabinetPackage | null {
  if (assetId !== 'L2-CC-001') return null;
  return {
    id: 'pkg-l2-cc',
    assetId: 'L2-CC-001',
    drawing: 'assets/line2/control-cabinet/cabinet.svg',
    raster: 'assets/line2/control-cabinet/cabinet.png',
    metadata: 'assets/line2/control-cabinet/metadata.json',
    destUnknown: true,
  };
}

export function emptyAreaIds(): string[] {
  return areas.filter((area) => area.assetIds.length === 0).map((area) => area.id);
}
