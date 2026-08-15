import { areas } from '../facilityData';
import type { AreaOverlay } from '../types/facility';

/** Schematic 1e layout. UI positions only — not surveyed floor coordinates. */
export type SchematicRect = AreaOverlay & { height3d: number };

export const schematicLayout: Record<string, SchematicRect> = {
  'area-b3': { x: 5, y: 6, width: 26, height: 20, height3d: 8 },
  'area-b2': { x: 33, y: 6, width: 22, height: 13, height3d: 6.2 },
  'area-b1': { x: 33, y: 20.5, width: 22, height: 11.5, height3d: 5.2 },
  'area-freezers': { x: 57, y: 6, width: 20, height: 38, height3d: 7.2 },
  'area-warehouse-f': { x: 5, y: 42, width: 30, height: 36, height3d: 4.6 },
  'area-boiler-room': { x: 37, y: 42, width: 18, height: 16, height3d: 3.2 },
  'area-warehouse-a': { x: 37, y: 60, width: 18, height: 18, height3d: 4.1 },
  'area-dock-1': { x: 57, y: 48, width: 8.6, height: 30, height3d: 1.8 },
  'area-dock-6': { x: 66.6, y: 48, width: 8.6, height: 30, height3d: 1.8 },
  'area-dock-7': { x: 76.2, y: 48, width: 8.6, height: 30, height3d: 1.8 },
  'area-dock-8': { x: 85.8, y: 48, width: 9.2, height: 30, height3d: 1.8 },
};

export const unmappedSchematic: SchematicRect = { x: 79, y: 6, width: 16, height: 26, height3d: 2 };

export function schematicFor(areaId: string): SchematicRect {
  return schematicLayout[areaId] ?? { x: 4, y: 4, width: 10, height: 10, height3d: 2 };
}

export function allSchematicAreas() {
  return areas.map((area) => ({ area, rect: schematicFor(area.id) }));
}

export function layoutCompleteness(): { placed: number; total: number } {
  return { placed: areas.filter((area) => Boolean(schematicLayout[area.id])).length, total: areas.length };
}

/** World units: 0–100 on X/Z, Y up. */
export function rectToWorld(rect: SchematicRect) {
  const width = rect.width;
  const depth = rect.height;
  return {
    x: rect.x + width / 2,
    z: rect.y + depth / 2,
    width,
    depth,
    height: rect.height3d,
  };
}
