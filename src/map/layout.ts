import { areas } from '../facilityData';
import type { AreaOverlay } from '../types/facility';

/** Schematic 1e layout. UI positions only — not surveyed floor coordinates. */
export type SchematicRect = AreaOverlay & { height3d: number };

export const schematicLayout: Record<string, SchematicRect> = Object.fromEntries(
  areas.map((area) => [area.id, { ...area.overlay, height3d: 4 }]),
);

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
