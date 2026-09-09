import type { FacilityMapAnnotation, FacilityMapConfig, FacilityMapWall, FacilityPackage } from '../facility/types';
import type { FacilityArea } from '../types/facility';

export type MapEditorTool = 'select' | 'multi-select' | 'pan' | 'add-area' | 'add-rectangle' | 'add-polygon' | 'edit-shape' | 'move' | 'resize' | 'wall' | 'erase' | 'merge' | 'split' | 'text' | 'note' | 'pen' | 'line' | 'arrow' | 'highlight' | 'annotation-eraser';
export type MapObjectRef = { kind: 'area' | 'wall' | 'annotation'; id: string };
export type MapPoint = { x: number; y: number };

export interface MapEditorDraft {
  areas: FacilityArea[];
  mapConfig: FacilityMapConfig;
}

export interface MapEditorHistory {
  past: MapEditorDraft[];
  present: MapEditorDraft;
  future: MapEditorDraft[];
}

const clone = <T,>(value: T): T => structuredClone(value);
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

export function draftFromPackage(pkg: FacilityPackage): MapEditorDraft {
  return { areas: clone(pkg.areas), mapConfig: clone(pkg.mapConfig ?? {}) };
}

export function createHistory(draft: MapEditorDraft): MapEditorHistory {
  return { past: [], present: clone(draft), future: [] };
}

export function pushHistory(history: MapEditorHistory, next: MapEditorDraft): MapEditorHistory {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return { past: [...history.past, clone(history.present)], present: clone(next), future: [] };
}

export function undoHistory(history: MapEditorHistory): MapEditorHistory {
  const previous = history.past.at(-1);
  return previous ? { past: history.past.slice(0, -1), present: clone(previous), future: [clone(history.present), ...history.future] } : history;
}

export function redoHistory(history: MapEditorHistory): MapEditorHistory {
  const next = history.future[0];
  return next ? { past: [...history.past, clone(history.present)], present: clone(next), future: history.future.slice(1) } : history;
}

export function areaBounds(points: MapPoint[]): FacilityArea['overlay'] {
  const xs = points.map((point) => clamp(point.x));
  const ys = points.map((point) => clamp(point.y));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y, polygon: points.map((point) => ({ x: clamp(point.x), y: clamp(point.y) })) };
}

export function validOverlay(overlay: FacilityArea['overlay']): boolean {
  if (![overlay.x, overlay.y, overlay.width, overlay.height].every(Number.isFinite)) return false;
  if (overlay.x < 0 || overlay.y < 0 || overlay.width <= 0.4 || overlay.height <= 0.4 || overlay.x + overlay.width > 100 || overlay.y + overlay.height > 100) return false;
  if (!overlay.polygon) return true;
  if (overlay.polygon.length < 3 || overlay.polygon.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)) return false;
  let signedArea = 0;
  overlay.polygon.forEach((point, index) => { const next = overlay.polygon![(index + 1) % overlay.polygon!.length]; signedArea += point.x * next.y - next.x * point.y; });
  return Math.abs(signedArea / 2) > 0.2;
}

export function validateMapDraft(pkg: FacilityPackage, draft: MapEditorDraft): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const area of draft.areas) {
    if (!area.id.trim()) errors.push('Every area requires a stable ID.');
    else if (ids.has(area.id)) errors.push(`Duplicate area ID: ${area.id}.`);
    ids.add(area.id);
    if (!area.name.trim()) errors.push(`Area ${area.id || '(new)'} requires a name.`);
    if (!validOverlay(area.overlay)) errors.push(`Area ${area.id || '(new)'} has invalid or empty geometry.`);
  }
  for (const asset of pkg.assets) if (!ids.has(asset.areaId)) errors.push(`Asset ${asset.id} would be orphaned from area ${asset.areaId}.`);
  if (!ids.has(pkg.featureConfig.defaultAreaId)) errors.push('The facility default area cannot be deleted.');
  const objectIds = new Set<string>();
  for (const item of [...(draft.mapConfig.walls ?? []), ...(draft.mapConfig.annotations ?? [])]) {
    if (!item.id || objectIds.has(item.id)) errors.push(`Duplicate or missing map object ID: ${item.id || '(empty)'}.`);
    objectIds.add(item.id);
  }
  for (const wall of draft.mapConfig.walls ?? []) if (wall.points.length < 2 || wall.points.some((point) => point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)) errors.push(`Wall ${wall.id} has invalid geometry.`);
  return [...new Set(errors)];
}

export function addArea(draft: MapEditorDraft, area: FacilityArea): MapEditorDraft {
  if (draft.areas.some((item) => item.id === area.id)) throw new Error(`Area ID ${area.id} already exists.`);
  if (!validOverlay(area.overlay)) throw new Error('Area geometry is invalid.');
  return { ...draft, areas: [...draft.areas, clone(area)] };
}

export function updateArea(draft: MapEditorDraft, areaId: string, update: Partial<Omit<FacilityArea, 'id' | 'assetIds'>>): MapEditorDraft {
  const current = draft.areas.find((area) => area.id === areaId);
  if (!current) throw new Error(`Unknown area: ${areaId}`);
  const next = { ...current, ...clone(update), ...(update.name !== undefined && update.shortName === undefined ? { shortName: update.name } : {}), id: current.id, assetIds: current.assetIds };
  if (!validOverlay(next.overlay)) throw new Error('Area geometry is invalid.');
  return { ...draft, areas: draft.areas.map((area) => area.id === areaId ? next : area) };
}

export function deleteArea(draft: MapEditorDraft, pkg: FacilityPackage, areaId: string): MapEditorDraft {
  const assets = pkg.assets.filter((asset) => asset.areaId === areaId);
  if (assets.length) throw new Error(`Area contains ${assets.length} asset${assets.length === 1 ? '' : 's'} (${assets.map((asset) => asset.id).join(', ')}). Reassign or merge them before deleting.`);
  if (pkg.featureConfig.defaultAreaId === areaId) throw new Error('The facility default area cannot be deleted.');
  const markers = (draft.mapConfig.markers ?? []).filter((marker) => (marker as typeof marker & { areaId?: string }).areaId !== areaId);
  return { areas: draft.areas.filter((area) => area.id !== areaId), mapConfig: { ...draft.mapConfig, markers } };
}

export function mergeAreas(draft: MapEditorDraft, pkg: FacilityPackage, areaIds: string[], survivorId: string, name: string): { draft: MapEditorDraft; assets: FacilityPackage['assets'] } {
  const chosen = draft.areas.filter((area) => areaIds.includes(area.id));
  if (chosen.length < 2 || !chosen.some((area) => area.id === survivorId)) throw new Error('Choose at least two areas and a valid surviving area.');
  const x = Math.min(...chosen.map((area) => area.overlay.x));
  const y = Math.min(...chosen.map((area) => area.overlay.y));
  const right = Math.max(...chosen.map((area) => area.overlay.x + area.overlay.width));
  const bottom = Math.max(...chosen.map((area) => area.overlay.y + area.overlay.height));
  if (chosen.some((area) => area.overlay.polygon)) throw new Error('Polygon areas cannot be safely auto-combined. Reshape them into a valid shared outline before merging.');
  const sourceArea = chosen.reduce((sum, area) => sum + area.overlay.width * area.overlay.height, 0);
  const combinedArea = (right - x) * (bottom - y);
  if (Math.abs(sourceArea - combinedArea) > 2.1) throw new Error('These areas do not form one clean rectangle. Use Edit Shape to create a defensible shared outline before merging.');
  const assetIds = [...new Set(chosen.flatMap((area) => area.assetIds))];
  const survivor = { ...chosen.find((area) => area.id === survivorId)!, name: name.trim(), shortName: name.trim(), overlay: { x, y, width: right - x, height: bottom - y }, assetIds };
  const areas = draft.areas.filter((area) => !areaIds.includes(area.id) || area.id === survivorId).map((area) => area.id === survivorId ? survivor : area);
  const assets = pkg.assets.map((asset) => areaIds.includes(asset.areaId) ? { ...asset, areaId: survivorId } : asset);
  return { draft: { ...draft, areas }, assets };
}

export function splitArea(draft: MapEditorDraft, pkg: FacilityPackage, areaId: string, newId: string, newName: string, direction: 'vertical' | 'horizontal', assignments: Record<string, string>): { draft: MapEditorDraft; assets: FacilityPackage['assets'] } {
  const area = draft.areas.find((item) => item.id === areaId);
  if (!area) throw new Error(`Unknown area: ${areaId}`);
  if (draft.areas.some((item) => item.id === newId)) throw new Error(`Area ID ${newId} already exists.`);
  const affected = pkg.assets.filter((asset) => asset.areaId === areaId);
  if (affected.some((asset) => ![areaId, newId].includes(assignments[asset.id]))) throw new Error('Every affected asset requires an explicit destination after the split.');
  const firstOverlay = { ...area.overlay, polygon: undefined };
  const secondOverlay = { ...area.overlay, polygon: undefined };
  if (direction === 'vertical') { firstOverlay.width /= 2; secondOverlay.x += secondOverlay.width / 2; secondOverlay.width /= 2; }
  else { firstOverlay.height /= 2; secondOverlay.y += secondOverlay.height / 2; secondOverlay.height /= 2; }
  const firstIds = affected.filter((asset) => assignments[asset.id] === areaId).map((asset) => asset.id);
  const secondIds = affected.filter((asset) => assignments[asset.id] === newId).map((asset) => asset.id);
  const first = { ...area, overlay: firstOverlay, assetIds: firstIds };
  const second: FacilityArea = { ...area, id: newId, name: newName.trim(), shortName: newName.trim(), overlay: secondOverlay, assetIds: secondIds };
  const areas = draft.areas.map((item) => item.id === areaId ? first : item).concat(second);
  const assets = pkg.assets.map((asset) => assignments[asset.id] ? { ...asset, areaId: assignments[asset.id] } : asset);
  return { draft: { ...draft, areas }, assets };
}

export function setWalls(draft: MapEditorDraft, walls: FacilityMapWall[]): MapEditorDraft { return { ...draft, mapConfig: { ...draft.mapConfig, walls: clone(walls) } }; }
export function setAnnotations(draft: MapEditorDraft, annotations: FacilityMapAnnotation[]): MapEditorDraft { return { ...draft, mapConfig: { ...draft.mapConfig, annotations: clone(annotations) } }; }

export function mapChangeSummary(before: MapEditorDraft, after: MapEditorDraft): string[] {
  const summary: string[] = [];
  const prior = new Map(before.areas.map((area) => [area.id, area]));
  const next = new Map(after.areas.map((area) => [area.id, area]));
  for (const area of after.areas) {
    const old = prior.get(area.id);
    if (!old) summary.push(`Added area ${area.name}`);
    else if (old.name !== area.name) summary.push(`Renamed ${old.name} → ${area.name}`);
    else if (old.shortName !== area.shortName) summary.push(`Changed map label for ${area.name}`);
    else if (old.visible !== area.visible) summary.push(`Changed visibility for ${area.name}`);
    else if (old.notes !== area.notes) summary.push(`Changed notes for ${area.name}`);
    else if (JSON.stringify(old.overlay) !== JSON.stringify(area.overlay)) summary.push(`Changed geometry for ${area.name}`);
  }
  for (const area of before.areas) if (!next.has(area.id)) summary.push(`Removed or merged area ${area.name}`);
  const wallDelta = (after.mapConfig.walls?.length ?? 0) - (before.mapConfig.walls?.length ?? 0);
  const annotationDelta = (after.mapConfig.annotations?.length ?? 0) - (before.mapConfig.annotations?.length ?? 0);
  if (wallDelta) summary.push(`${wallDelta > 0 ? 'Added' : 'Removed'} ${Math.abs(wallDelta)} wall${Math.abs(wallDelta) === 1 ? '' : 's'}`);
  if (annotationDelta) summary.push(`${annotationDelta > 0 ? 'Added' : 'Removed'} ${Math.abs(annotationDelta)} annotation${Math.abs(annotationDelta) === 1 ? '' : 's'}`);
  return summary;
}
