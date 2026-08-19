import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { areas } from '../facilityData';
import { mapModeFromQuery } from './MapStage';
import { allSchematicAreas, layoutCompleteness, rectToWorld, schematicFor, schematicLayout } from './layout';

describe('schematic layout', () => {
  it('places every facility area without inventing extra buildings', () => {
    const { placed, total } = layoutCompleteness();
    expect(total).toBe(areas.length);
    expect(placed).toBe(areas.length);
    expect(Object.keys(schematicLayout).sort()).toEqual(areas.map((area) => area.id).sort());
  });

  it('keeps schematic rectangles inside the 0–100 map and non-overlapping enough to click', () => {
    const placed = allSchematicAreas();
    for (const { area, rect } of placed) {
      expect(rect.x, area.id).toBeGreaterThanOrEqual(0);
      expect(rect.y, area.id).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width, area.id).toBeLessThanOrEqual(100);
      expect(rect.y + rect.height, area.id).toBeLessThanOrEqual(100);
      expect(rect.width, area.id).toBeGreaterThan(3);
      expect(rect.height, area.id).toBeGreaterThan(3);
    }
  });

  it('keeps the legacy world projection deterministic for existing layout helpers', () => {
    const world = rectToWorld(schematicFor('area-warehouse-f'));
    expect(world.x).toBeCloseTo(20);
    expect(world.z).toBeCloseTo(60);
    expect(world.width).toBe(30);
    expect(world.depth).toBe(36);
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
