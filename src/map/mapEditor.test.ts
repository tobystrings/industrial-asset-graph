import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { buildTestFacilityPackage } from '../../facilities/test-facility';
import { loadPlant, savePlant } from '../facility/runtimeDb';
import { validateFacilityPackage } from '../facility/schema';
import { applyCanonicalEntities } from '../facility/syncClient';
import type { FacilityArea } from '../types/facility';
import {
  addArea, createHistory, deleteArea, draftFromPackage, mapChangeSummary, mergeAreas, pushHistory,
  redoHistory, setAnnotations, setWalls, splitArea, undoHistory, updateArea, validateMapDraft,
} from './mapEditor';

const emptyArea = (id: string, name = id, x = 30): FacilityArea => ({ id, name, shortName: name, status: 'NOT_STARTED', overlay: { x, y: 5, width: 10, height: 10 }, assetIds: [] });

describe('facility map editor model', () => {
  beforeEach(() => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() }));

  it('renames an area without changing its stable ID or asset references', () => {
    const pkg = buildTestFacilityPackage();
    const next = updateArea(draftFromPackage(pkg), 'synthetic-area-001', { name: 'Renamed Test Area' });
    expect(next.areas[0]).toMatchObject({ id: 'synthetic-area-001', name: 'Renamed Test Area' });
    expect(pkg.assets[0].areaId).toBe('synthetic-area-001');
  });

  it('adds an empty rectangle or polygon area and rejects duplicate IDs', () => {
    const pkg = buildTestFacilityPackage();
    const area = { ...emptyArea('synthetic-area-002'), overlay: { x: 30, y: 5, width: 10, height: 10, polygon: [{ x: 30, y: 5 }, { x: 40, y: 5 }, { x: 35, y: 15 }] } };
    const next = addArea(draftFromPackage(pkg), area);
    expect(next.areas.at(-1)).toEqual(area);
    expect(() => addArea(next, area)).toThrow(/already exists/i);
  });

  it('deletes an empty area but protects referenced and default areas', () => {
    const pkg = buildTestFacilityPackage();
    const draft = addArea(draftFromPackage(pkg), emptyArea('empty-area'));
    expect(deleteArea(draft, pkg, 'empty-area').areas.some((area) => area.id === 'empty-area')).toBe(false);
    expect(() => deleteArea(draft, pkg, 'synthetic-area-001')).toThrow(/contains 1 asset/i);
    const noAsset = { ...pkg, assets: [], areas: pkg.areas.map((area) => ({ ...area, assetIds: [] })) };
    expect(() => deleteArea(draftFromPackage(noAsset), noAsset, 'synthetic-area-001')).toThrow(/default area/i);
  });

  it('merges areas and migrates every dependent asset to the surviving stable ID', () => {
    const pkg = buildTestFacilityPackage();
    const second = { ...emptyArea('synthetic-area-002', 'Second Area', 25), overlay: { x: 25, y: 5, width: 10, height: 20 } };
    const extraAsset = { ...pkg.assets[0], id: 'SYNTH-ASSET-002', name: 'Second Fixture', areaId: second.id };
    const source = { ...pkg, areas: [...pkg.areas, { ...second, assetIds: [extraAsset.id] }], assets: [...pkg.assets, extraAsset] };
    const result = mergeAreas(draftFromPackage(source), source, source.areas.map((area) => area.id), 'synthetic-area-001', 'Combined Test Area');
    expect(result.draft.areas).toHaveLength(1);
    expect(result.draft.areas[0].assetIds).toEqual(['SYNTH-ASSET-001', 'SYNTH-ASSET-002']);
    expect(result.assets.every((asset) => asset.areaId === 'synthetic-area-001')).toBe(true);
  });

  it('refuses to fake a merged outline when source geometry has gaps or polygons', () => {
    const pkg = buildTestFacilityPackage();
    const separated = { ...pkg, areas: [...pkg.areas, emptyArea('far-area', 'Far Area', 60)] };
    expect(() => mergeAreas(draftFromPackage(separated), separated, separated.areas.map((area) => area.id), 'synthetic-area-001', 'Unsafe Merge')).toThrow(/do not form one clean rectangle/i);
    const polygon = { ...emptyArea('polygon-area', 'Polygon Area', 25), overlay: { x: 25, y: 5, width: 10, height: 10, polygon: [{ x: 25, y: 5 }, { x: 35, y: 5 }, { x: 30, y: 15 }] } };
    const polygonSource = { ...pkg, areas: [...pkg.areas, polygon] };
    expect(() => mergeAreas(draftFromPackage(polygonSource), polygonSource, polygonSource.areas.map((area) => area.id), 'synthetic-area-001', 'Unsafe Polygon')).toThrow(/cannot be safely auto-combined/i);
  });

  it('splits an area only after every affected asset has an explicit assignment', () => {
    const pkg = buildTestFacilityPackage();
    const draft = draftFromPackage(pkg);
    expect(() => splitArea(draft, pkg, 'synthetic-area-001', 'synthetic-area-002', 'Second', 'vertical', {})).toThrow(/every affected asset/i);
    const result = splitArea(draft, pkg, 'synthetic-area-001', 'synthetic-area-002', 'Second', 'vertical', { 'SYNTH-ASSET-001': 'synthetic-area-002' });
    expect(result.draft.areas).toHaveLength(2);
    expect(result.assets[0].areaId).toBe('synthetic-area-002');
    expect(result.draft.areas.find((area) => area.id === 'synthetic-area-002')?.assetIds).toEqual(['SYNTH-ASSET-001']);
  });

  it('adds, moves, and removes explicit walls independently of area boundaries', () => {
    const pkg = buildTestFacilityPackage();
    const wall = { id: 'wall-1', kind: 'WALL' as const, points: [{ x: 10, y: 10 }, { x: 20, y: 10 }] };
    const added = setWalls(draftFromPackage(pkg), [wall]);
    const moved = setWalls(added, [{ ...wall, points: wall.points.map((point) => ({ ...point, y: point.y + 5 })) }]);
    expect(moved.mapConfig.walls?.[0].points[0].y).toBe(15);
    expect(setWalls(moved, []).mapConfig.walls).toEqual([]);
    expect(moved.areas).toEqual(pkg.areas);
  });

  it('moves, resizes, and reshapes an area while rejecting invalid geometry', () => {
    const pkg = buildTestFacilityPackage();
    const moved = updateArea(draftFromPackage(pkg), 'synthetic-area-001', { overlay: { x: 10, y: 10, width: 25, height: 15 } });
    const reshaped = updateArea(moved, 'synthetic-area-001', { overlay: { x: 10, y: 10, width: 25, height: 15, polygon: [{ x: 10, y: 10 }, { x: 35, y: 10 }, { x: 30, y: 25 }, { x: 10, y: 25 }] } });
    expect(reshaped.areas[0].overlay.polygon).toHaveLength(4);
    expect(() => updateArea(reshaped, 'synthetic-area-001', { overlay: { x: 0, y: 0, width: 0, height: 10 } })).toThrow(/invalid/i);
  });

  it('supports undo, redo, and discard-to-baseline draft behavior', () => {
    const pkg = buildTestFacilityPackage();
    const baseline = draftFromPackage(pkg);
    const changed = updateArea(baseline, 'synthetic-area-001', { name: 'Changed' });
    const history = pushHistory(createHistory(baseline), changed);
    expect(undoHistory(history).present).toEqual(baseline);
    expect(redoHistory(undoHistory(history)).present).toEqual(changed);
    expect(createHistory(baseline).present.areas[0].name).toBe('Synthetic Test Area');
  });

  it('keeps manual markup non-authoritative and independently erasable', () => {
    const pkg = buildTestFacilityPackage();
    const annotation = { id: 'note-1', kind: 'NOTE' as const, x: 20, y: 20, text: 'Synthetic note', color: '#f00' };
    const withNote = setAnnotations(draftFromPackage(pkg), [annotation]);
    expect(withNote.mapConfig.annotations).toEqual([annotation]);
    expect(withNote.areas).toEqual(pkg.areas);
    expect(pkg.assets).toHaveLength(1);
    expect(setAnnotations(withNote, []).mapConfig.annotations).toEqual([]);
  });

  it('validates duplicate IDs, malformed polygons, orphaned assets, and invalid walls', () => {
    const pkg = buildTestFacilityPackage();
    const duplicate = { ...draftFromPackage(pkg), areas: [...pkg.areas, { ...pkg.areas[0] }] };
    expect(validateMapDraft(pkg, duplicate)).toContain('Duplicate area ID: synthetic-area-001.');
    const malformed = updateArea(draftFromPackage(pkg), 'synthetic-area-001', { overlay: { x: 5, y: 5, width: 20, height: 20 } });
    malformed.areas[0].overlay.polygon = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(validateMapDraft(pkg, malformed).some((error) => /invalid/i.test(error))).toBe(true);
    const orphaned = { ...pkg, assets: [{ ...pkg.assets[0], areaId: 'missing-area' }] };
    expect(validateMapDraft(orphaned, draftFromPackage(pkg)).some((error) => /orphaned/i.test(error))).toBe(true);
    const badWall = setWalls(draftFromPackage(pkg), [{ id: 'bad', kind: 'WALL', points: [{ x: -1, y: 0 }] }]);
    expect(validateMapDraft(pkg, badWall).some((error) => /wall bad/i.test(error))).toBe(true);
  });

  it('persists map edits only in the selected facility database', async () => {
    const first = buildTestFacilityPackage();
    const second = { ...buildTestFacilityPackage(), facility: { ...buildTestFacilityPackage().facility, id: 'facility-synthetic-other', name: 'Other Synthetic Facility' }, assets: buildTestFacilityPackage().assets.map((asset) => ({ ...asset, facilityId: 'facility-synthetic-other' })) };
    const edited = { ...first, areas: first.areas.map((area) => ({ ...area, name: 'Persisted Test Area' })) };
    await savePlant(edited, first.facility.id); await savePlant(second, second.facility.id);
    expect((await loadPlant(first.facility.id))?.areas[0].name).toBe('Persisted Test Area');
    expect((await loadPlant(second.facility.id))?.areas[0].name).toBe('Synthetic Test Area');
  });

  it('applies an atomic map_config synchronization envelope', () => {
    const pkg = buildTestFacilityPackage();
    const area = { ...pkg.areas[0], name: 'Remote Rename' };
    const next = applyCanonicalEntities(pkg, [{ entityId: `map-config:${pkg.facility.id}`, entityType: 'map_config', version: 1, deleted: false, updatedAt: new Date().toISOString(), updatedBy: 'admin', value: { areas: [area], assets: pkg.assets, mapConfig: { ...pkg.mapConfig, walls: [] } } }]);
    expect(next.areas[0].name).toBe('Remote Rename');
    expect(next.assets).toEqual(pkg.assets);
  });

  it('produces an honest change summary without inventing facility facts', () => {
    const pkg = buildTestFacilityPackage();
    const before = draftFromPackage(pkg);
    const after = setAnnotations(updateArea(before, 'synthetic-area-001', { name: 'Test Area Renamed' }), [{ id: 'mark', kind: 'FREEHAND', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#f00' }]);
    expect(mapChangeSummary(before, after)).toEqual(['Renamed Synthetic Test Area → Test Area Renamed', 'Added 1 annotation']);
    expect(() => validateFacilityPackage({ ...pkg, ...after })).not.toThrow();
  });
});
