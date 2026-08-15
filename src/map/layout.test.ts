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

  it('maps schematic percent rects into world units used by the 3D stage', () => {
    const world = rectToWorld(schematicFor('area-warehouse-f'));
    expect(world.x).toBeCloseTo(20);
    expect(world.z).toBeCloseTo(60);
    expect(world.width).toBe(30);
    expect(world.depth).toBe(36);
    expect(world.height).toBeGreaterThan(0);
  });

  it('opens the existing 3D stage from map=3d and never a second Open 3D entry', () => {
    expect(mapModeFromQuery('?map=3d')).toBe('3d');
    expect(mapModeFromQuery('map=3d')).toBe('3d');
    expect(mapModeFromQuery('')).toBe('3d');
    expect(mapModeFromQuery('?area=area-warehouse-f')).toBe('3d');
    expect(mapModeFromQuery('?map=2d')).toBe('2d');
    const three = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'FacilityMap3D.tsx'), 'utf8');
    expect(three).toContain("fog attach=\"fog\" args={['#dce6f0', 180, 420]}");
    expect(three).toContain('position: [52, 36, 88]');
    const stage = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'MapStage.tsx'), 'utf8');
    const dashboard = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../Dashboard.tsx'), 'utf8');
    expect(three).toContain('portal={host}');
    expect(three).not.toContain('distanceFactor');
    expect(three).toContain('map3d-label');
    expect(stage).not.toContain('className="map-mode"');
    expect(dashboard).toContain('className="map-mode"');
    expect(dashboard).toContain('aria-expanded={drawerOpen}');
    expect(dashboard).toContain('setDrawerOpen((value) => !value)');
    expect(dashboard).not.toContain('setNavOpen((value) => !value)');
  });
});
