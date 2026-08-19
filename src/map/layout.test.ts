import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { areas } from '../facilityData';
import { mapModeFromQuery } from './MapStage';
import { facilityWorldBounds, schematicRectForArea } from './layout';

describe('schematic layout', () => {
  it('places every facility area without inventing extra buildings', () => {
    const mapped = areas.map((area) => ({ id: area.id, rect: schematicRectForArea(area.id) }));
    expect(mapped).toHaveLength(areas.length);
    expect(mapped.every((entry) => entry.rect)).toBe(true);
    expect(new Set(mapped.map((entry) => entry.id))).toEqual(new Set(areas.map((area) => area.id)));
  });

  it('keeps schematic rectangles inside the 0–100 map and non-overlapping enough to click', () => {
    const rects = areas.map((area) => schematicRectForArea(area.id)!);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(100);
      expect(rect.y + rect.height).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the legacy world projection deterministic for existing layout helpers', () => {
    const world = facilityWorldBounds();
    expect(world.width).toBeGreaterThan(0);
    expect(world.height).toBeGreaterThan(0);
  });

  it('always opens the fixed bird-eye 2D stage, including from legacy map links', () => {
    expect(mapModeFromQuery('?map=3d')).toBe('2d');
    expect(mapModeFromQuery('map=3d')).toBe('2d');
    expect(mapModeFromQuery('')).toBe('2d');
    expect(mapModeFromQuery('?area=area-warehouse-f')).toBe('2d');
    expect(mapModeFromQuery('?map=2d')).toBe('2d');
    const stage = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'MapStage.tsx'), 'utf8');
    const dashboard = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../Dashboard.tsx'), 'utf8');
    expect(stage).toContain('DetailedBuildingLayout');
    expect(stage).not.toContain('FacilityMap3D');
    expect(stage).not.toContain('lazy(');
    expect(dashboard).not.toContain('className="map-mode"');
    expect(dashboard).toContain('aria-expanded={drawerOpen}');
    expect(dashboard).toContain('setDrawerOpen((value) => !value)');
    expect(dashboard).not.toContain('setNavOpen((value) => !value)');
  });
});
