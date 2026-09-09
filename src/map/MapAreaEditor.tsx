import { useEffect, useMemo, useRef, useState } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import type { FacilityMapAnnotation, FacilityMapWall } from '../facility/types';
import type { FacilityArea } from '../types/facility';
import {
  addArea, areaBounds, createHistory, deleteArea, draftFromPackage, mapChangeSummary, mergeAreas,
  pushHistory, redoHistory, setAnnotations, setWalls, splitArea, undoHistory, updateArea,
  validateMapDraft, type MapEditorHistory, type MapEditorTool, type MapObjectRef, type MapPoint,
} from './mapEditor';
import './mapAreaEditor.css';

const tools: Array<[MapEditorTool, string]> = [
  ['select', 'Select'], ['multi-select', 'Multi-select'], ['pan', 'Pan'], ['add-area', 'Add Area'], ['add-rectangle', 'Add Rectangle'],
  ['add-polygon', 'Add Polygon'], ['edit-shape', 'Edit Shape'], ['move', 'Move'], ['resize', 'Resize'],
  ['wall', 'Wall / Line'], ['erase', 'Delete'], ['merge', 'Merge Areas'], ['split', 'Split Area'],
  ['text', 'Text / Label'], ['note', 'Note'], ['pen', 'Freehand'], ['line', 'Markup Line'],
  ['arrow', 'Arrow'], ['highlight', 'Highlight'], ['annotation-eraser', 'Freehand Eraser'],
];

const pointFromEvent = (event: React.PointerEvent<SVGElement>): MapPoint => {
  const surface = event.currentTarget.ownerSVGElement ?? event.currentTarget;
  const rect = surface.getBoundingClientRect();
  return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
};
const refKey = (ref: MapObjectRef) => `${ref.kind}:${ref.id}`;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export type MapEditorSession = ReturnType<typeof useMapEditorSession>;

export function useMapEditorSession(active: boolean, onExit: () => void) {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const baseline = useRef(draftFromPackage(facility));
  const [history, setHistory] = useState<MapEditorHistory>(() => createHistory(baseline.current));
  const [assets, setAssets] = useState(() => structuredClone(facility.assets));
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<MapEditorTool>('select');
  const [selection, setSelection] = useState<MapObjectRef[]>([]);
  const [message, setMessage] = useState('Select an editing tool. Structural geometry and manual markup are separate layers.');
  const [workingPoints, setWorkingPoints] = useState<MapPoint[]>([]);
  const [drag, setDrag] = useState<{ start: MapPoint; original: FacilityArea } | null>(null);

  useEffect(() => {
    if (!active) return;
    baseline.current = draftFromPackage(facility);
    setHistory(createHistory(baseline.current));
    setAssets(structuredClone(facility.assets));
    setSelection([]);
    setTool('select');
    setWorkingPoints([]);
  }, [active, facility.facility.id]);

  const commit = (next: MapEditorHistory['present'], text: string) => { setHistory((current) => pushHistory(current, next)); setMessage(text); };
  const choose = (ref: MapObjectRef, additive = tool === 'multi-select') => setSelection((current) => additive ? current.some((item) => refKey(item) === refKey(ref)) ? current.filter((item) => refKey(item) !== refKey(ref)) : [...current, ref] : [ref]);
  const selectedAreas = selection.filter((item) => item.kind === 'area').map((item) => history.present.areas.find((area) => area.id === item.id)).filter(Boolean) as FacilityArea[];
  const selectedArea = selectedAreas.length === 1 ? selectedAreas[0] : undefined;
  const dirty = JSON.stringify(history.present) !== JSON.stringify(baseline.current) || JSON.stringify(assets) !== JSON.stringify(facility.assets);
  const errors = useMemo(() => validateMapDraft({ ...facility, assets }, history.present), [assets, facility, history.present]);

  const selectTool = (next: MapEditorTool) => {
    setTool(next); setWorkingPoints([]);
    if (next === 'erase') removeSelected();
    if (next === 'annotation-eraser') {
      const ids = new Set(selection.filter((item) => item.kind === 'annotation').map((item) => item.id));
      if (!ids.size) setMessage('Select one or more manual annotations before using Markup Eraser.');
      else { commit(setAnnotations(history.present, (history.present.mapConfig.annotations ?? []).filter((item) => !ids.has(item.id))), `Erased ${ids.size} manual annotation${ids.size === 1 ? '' : 's'} without altering structural geometry.`); setSelection((current) => current.filter((item) => item.kind !== 'annotation')); }
    }
    if (next === 'merge') doMerge();
    if (next === 'split') doSplit();
  };

  const removeSelected = () => {
    if (!selection.length) { setMessage('Select an area, wall, or annotation first.'); return; }
    try {
      let next = structuredClone(history.present);
      for (const ref of selection) {
        if (ref.kind === 'area') next = deleteArea(next, { ...facility, assets }, ref.id);
        else if (ref.kind === 'wall') next = setWalls(next, (next.mapConfig.walls ?? []).filter((item) => item.id !== ref.id));
        else next = setAnnotations(next, (next.mapConfig.annotations ?? []).filter((item) => item.id !== ref.id));
      }
      commit(next, `Removed ${selection.length} selected map object${selection.length === 1 ? '' : 's'}.`); setSelection([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The selection could not be deleted.'); }
  };

  const doMerge = () => {
    if (selectedAreas.length < 2) { setMessage('Select two or more areas with Multi-select before merging.'); return; }
    const survivor = selectedAreas[0];
    const name = window.prompt('Name for the merged area', survivor.name)?.trim();
    if (!name) return;
    try {
      const result = mergeAreas(history.present, { ...facility, assets }, selectedAreas.map((area) => area.id), survivor.id, name);
      setAssets(result.assets); commit(result.draft, `Merged ${selectedAreas.length} areas into ${name}; ${result.assets.filter((asset, index) => asset.areaId !== assets[index]?.areaId).length} asset reference(s) migrated.`); setSelection([{ kind: 'area', id: survivor.id }]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Areas could not be merged.'); }
  };

  const doSplit = () => {
    if (!selectedArea) { setMessage('Select exactly one area before splitting.'); return; }
    const newId = window.prompt('Stable ID for the new area', `${selectedArea.id}-split`)?.trim();
    const newName = window.prompt('Name for the new area', `${selectedArea.name} 2`)?.trim();
    if (!newId || !newName) return;
    const direction = window.confirm('Split vertically? Choose Cancel for a horizontal split.') ? 'vertical' : 'horizontal';
    const assignments: Record<string, string> = {};
    const affected = assets.filter((asset) => asset.areaId === selectedArea.id);
    for (const asset of affected) assignments[asset.id] = window.confirm(`Move ${asset.id} to ${newName}? Choose Cancel to keep it in ${selectedArea.name}.`) ? newId : selectedArea.id;
    try {
      const result = splitArea(history.present, { ...facility, assets }, selectedArea.id, newId, newName, direction, assignments);
      setAssets(result.assets); commit(result.draft, `Split ${selectedArea.name}; explicitly assigned ${affected.length} affected asset${affected.length === 1 ? '' : 's'}.`); setSelection([{ kind: 'area', id: newId }]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Area could not be split.'); }
  };

  const updateSelectedArea = (update: Partial<Omit<FacilityArea, 'id' | 'assetIds'>>, text: string) => {
    if (!selectedArea) return;
    try { commit(updateArea(history.present, selectedArea.id, update), text); } catch (error) { setMessage(error instanceof Error ? error.message : 'Area update is invalid.'); }
  };

  const nudge = (dx: number, dy: number) => {
    if (!selectedArea) return;
    const x = Math.max(0, Math.min(100 - selectedArea.overlay.width, selectedArea.overlay.x + dx)); const y = Math.max(0, Math.min(100 - selectedArea.overlay.height, selectedArea.overlay.y + dy));
    const actualDx = x - selectedArea.overlay.x, actualDy = y - selectedArea.overlay.y;
    updateSelectedArea({ overlay: { ...selectedArea.overlay, x, y, polygon: selectedArea.overlay.polygon?.map((point) => ({ x: point.x + actualDx, y: point.y + actualDy })) } }, `Moved ${selectedArea.name}.`);
  };
  const resize = (dw: number, dh: number) => selectedArea && updateSelectedArea({ overlay: { ...selectedArea.overlay, width: Math.max(1, Math.min(100 - selectedArea.overlay.x, selectedArea.overlay.width + dw)), height: Math.max(1, Math.min(100 - selectedArea.overlay.y, selectedArea.overlay.height + dh)), polygon: undefined } }, `Resized ${selectedArea.name}.`);

  const moveSelection = (dx: number, dy: number) => {
    if (!selection.length) { setMessage('Select one or more map objects first.'); return; }
    let next = structuredClone(history.present);
    next.areas = next.areas.map((area) => selection.some((ref) => ref.kind === 'area' && ref.id === area.id) ? { ...area, overlay: { ...area.overlay, x: area.overlay.x + dx, y: area.overlay.y + dy, polygon: area.overlay.polygon?.map((point) => ({ x: point.x + dx, y: point.y + dy })) } } : area);
    next = setWalls(next, (next.mapConfig.walls ?? []).map((wall) => selection.some((ref) => ref.kind === 'wall' && ref.id === wall.id) ? { ...wall, points: wall.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) } : wall));
    next = setAnnotations(next, (next.mapConfig.annotations ?? []).map((annotation) => {
      if (!selection.some((ref) => ref.kind === 'annotation' && ref.id === annotation.id)) return annotation;
      if ('points' in annotation) return { ...annotation, points: annotation.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
      return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
    }));
    const moveErrors = validateMapDraft({ ...facility, assets }, next);
    if (moveErrors.length) { setMessage(moveErrors[0]); return; }
    commit(next, `Moved ${selection.length} selected object${selection.length === 1 ? '' : 's'}.`);
  };

  const editVertex = (index: number, point: MapPoint) => {
    if (!selectedArea?.overlay.polygon) return;
    const polygon = selectedArea.overlay.polygon.map((item, itemIndex) => itemIndex === index ? point : item);
    updateSelectedArea({ overlay: areaBounds(polygon) }, `Reshaped ${selectedArea.name}.`);
  };
  const addVertex = () => {
    if (!selectedArea) return;
    const polygon = selectedArea.overlay.polygon ?? [{ x: selectedArea.overlay.x, y: selectedArea.overlay.y }, { x: selectedArea.overlay.x + selectedArea.overlay.width, y: selectedArea.overlay.y }, { x: selectedArea.overlay.x + selectedArea.overlay.width, y: selectedArea.overlay.y + selectedArea.overlay.height }, { x: selectedArea.overlay.x, y: selectedArea.overlay.y + selectedArea.overlay.height }];
    const last = polygon.at(-1)!; const first = polygon[0];
    updateSelectedArea({ overlay: areaBounds([...polygon, { x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 }]) }, `Added a vertex to ${selectedArea.name}.`);
  };
  const removeVertex = (index: number) => {
    if (!selectedArea?.overlay.polygon || selectedArea.overlay.polygon.length <= 3) { setMessage('A valid polygon must retain at least three vertices.'); return; }
    updateSelectedArea({ overlay: areaBounds(selectedArea.overlay.polygon.filter((_, itemIndex) => itemIndex !== index)) }, `Removed a vertex from ${selectedArea.name}.`);
  };

  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (['add-area', 'add-rectangle', 'pen', 'highlight', 'line', 'arrow', 'wall'].includes(tool)) { event.currentTarget.setPointerCapture(event.pointerId); setWorkingPoints([point]); }
    else if (tool === 'add-polygon') setWorkingPoints((points) => [...points, point]);
    else if (tool === 'text' || tool === 'note') {
      const text = window.prompt(tool === 'text' ? 'Map label text' : 'Manual note text')?.trim();
      if (text) { const annotation: FacilityMapAnnotation = { id: makeId('annotation'), kind: tool === 'text' ? 'TEXT' : 'NOTE', x: point.x, y: point.y, text, color: tool === 'text' ? '#0f172a' : '#a16207' }; commit(setAnnotations(history.present, [...(history.present.mapConfig.annotations ?? []), annotation]), `Added manual ${tool}.`); }
    }
  };
  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (workingPoints.length && ['add-area', 'add-rectangle', 'pen', 'highlight', 'line', 'arrow', 'wall'].includes(tool)) setWorkingPoints((points) => tool === 'pen' || tool === 'highlight' ? [...points, point] : [points[0], point]);
    if (drag && selectedArea && ['move', 'select'].includes(tool)) {
      const dx = point.x - drag.start.x, dy = point.y - drag.start.y;
      const x = Math.max(0, Math.min(100 - drag.original.overlay.width, drag.original.overlay.x + dx)); const y = Math.max(0, Math.min(100 - drag.original.overlay.height, drag.original.overlay.y + dy));
      const actualDx = x - drag.original.overlay.x, actualDy = y - drag.original.overlay.y;
      const overlay = { ...drag.original.overlay, x, y, polygon: drag.original.overlay.polygon?.map((vertex) => ({ x: vertex.x + actualDx, y: vertex.y + actualDy })) };
      setHistory((current) => ({ ...current, present: { ...current.present, areas: current.present.areas.map((area) => area.id === drag.original.id ? { ...area, overlay } : area) } }));
    }
  };
  const pointerUp = () => {
    if (drag) { setHistory((current) => ({ past: [...current.past, { ...current.present, areas: current.present.areas.map((area) => area.id === drag.original.id ? drag.original : area) }], present: current.present, future: [] })); setDrag(null); setMessage(`Moved ${drag.original.name}.`); }
    if (workingPoints.length < 2) { setWorkingPoints([]); return; }
    const points = workingPoints;
    if (tool === 'add-area' || tool === 'add-rectangle') {
      const name = window.prompt('New area name')?.trim(); const id = window.prompt('Stable area ID', name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? '')?.trim();
      if (name && id) try { commit(addArea(history.present, { id, name, shortName: name, status: 'NOT_STARTED', overlay: { ...areaBounds(points), polygon: undefined }, assetIds: [] }), `Added empty area ${name}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Area could not be added.'); }
    } else if (tool === 'wall') { const wall: FacilityMapWall = { id: makeId('wall'), kind: 'WALL', points }; commit(setWalls(history.present, [...(history.present.mapConfig.walls ?? []), wall]), 'Added structural wall.'); }
    else { const annotation: FacilityMapAnnotation = { id: makeId('annotation'), kind: tool === 'arrow' ? 'ARROW' : tool === 'line' ? 'LINE' : tool === 'highlight' ? 'HIGHLIGHT' : 'FREEHAND', points, color: tool === 'highlight' ? '#facc15' : '#ef4444' }; commit(setAnnotations(history.present, [...(history.present.mapConfig.annotations ?? []), annotation]), `Added non-authoritative ${annotation.kind.toLowerCase()} markup.`); }
    setWorkingPoints([]);
  };
  const finishPolygon = () => {
    if (workingPoints.length < 3) { setMessage('A polygon needs at least three vertices.'); return; }
    const name = window.prompt('New polygon area name')?.trim(); const id = window.prompt('Stable area ID', name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? '')?.trim();
    if (name && id) try { commit(addArea(history.present, { id, name, shortName: name, status: 'NOT_STARTED', overlay: areaBounds(workingPoints), assetIds: [] }), `Added polygon area ${name}.`); setWorkingPoints([]); } catch (error) { setMessage(error instanceof Error ? error.message : 'Polygon could not be added.'); }
  };
  const save = async () => {
    if (saving) return false;
    if (errors.length) { setMessage(errors[0]); return false; }
    setSaving(true);
    const summary = mapChangeSummary(baseline.current, history.present);
    try { await editor.saveMapDraft({ ...history.present, assets }, summary); baseline.current = structuredClone(history.present); setHistory(createHistory(history.present)); setMessage(`Saved on this device: ${summary.length} structural or markup change${summary.length === 1 ? '' : 's'}.`); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Map changes could not be saved.'); return false; }
    finally { setSaving(false); }
  };
  const finish = async () => { if (saving) return; if (!dirty || await save()) onExit(); };
  const cancel = () => { setHistory(createHistory(baseline.current)); setAssets(structuredClone(facility.assets)); setSelection([]); setWorkingPoints([]); onExit(); };
  return { active, saving, finish, editor, history, assets, tool, selection, selectedArea, selectedAreas, dirty, errors, message, workingPoints, choose, selectTool, setSelection, updateSelectedArea, nudge, resize, moveSelection, editVertex, addVertex, removeVertex, pointerDown, pointerMove, pointerUp, finishPolygon, setDrag, save, cancel, undo: () => setHistory(undoHistory), redo: () => setHistory(redoHistory), canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

export function MapEditorToolbar({ session }: { session: MapEditorSession }) {
  if (!session.active) return null;
  const area = session.selectedArea;
  return <div className="map-editor-shell" aria-label="Map and area editor">
    <div className="map-editor-mode"><b>STRUCTURAL MAP</b><span>Areas, walls, labels</span><i/><b>MANUAL MARKUP</b><span>Non-authoritative notes and drawing</span></div>
    <div className="map-editor-tools" role="toolbar" aria-label="Map editing tools">{tools.map(([id, label]) => <button key={id} type="button" className={session.tool === id ? 'active' : ''} aria-pressed={session.tool === id} onClick={() => session.selectTool(id)}>{label}</button>)}<button type="button" onClick={session.finishPolygon} disabled={session.tool !== 'add-polygon' || session.workingPoints.length < 3}>Finish Polygon</button></div>
    <div className="map-editor-session"><button type="button" onClick={session.undo} disabled={!session.canUndo}>Undo</button><button type="button" onClick={session.redo} disabled={!session.canRedo}>Redo</button><span className={session.dirty ? 'dirty' : ''}>{session.dirty ? 'Unsaved changes' : 'Draft matches saved map'}</span><button type="button" onClick={session.cancel}>Cancel / Exit</button><button className="primary" type="button" disabled={session.saving || !session.dirty || session.errors.length > 0} onClick={() => void session.save()}>Save Changes</button><button type="button" disabled={session.saving} onClick={() => void session.finish()}>Done</button></div>
    <div className="map-editor-message" role="status">{session.errors[0] ?? session.message}</div>
    {session.selection.length > 0 && <div className="map-editor-selection-actions"><b>{session.selection.length} selected</b><span>Move selection:</span><button onClick={() => session.moveSelection(-1, 0)}>←</button><button onClick={() => session.moveSelection(0, -1)}>↑</button><button onClick={() => session.moveSelection(0, 1)}>↓</button><button onClick={() => session.moveSelection(1, 0)}>→</button></div>}
    {area && <aside className="map-area-properties" aria-label="Area Properties"><header><b>Area Properties</b><small>{area.id} · stable ID locked</small></header><label>Area name<input value={area.name} onChange={(event) => session.updateSelectedArea({ name: event.target.value }, `Renamed ${area.name}.`)}/></label><small>Area name updates the map label. You can shorten the display label afterward.</small><label>Display label<input value={area.shortName} onChange={(event) => session.updateSelectedArea({ shortName: event.target.value }, `Changed label for ${area.name}.`)}/></label><label>Notes<textarea rows={2} value={area.notes ?? ''} onChange={(event) => session.updateSelectedArea({ notes: event.target.value }, `Changed notes for ${area.name}.`)}/></label><label className="inline"><input type="checkbox" checked={area.visible !== false} onChange={(event) => session.updateSelectedArea({ visible: event.target.checked }, `Changed visibility for ${area.name}.`)}/>Visible</label><div className="map-area-nudges"><button onClick={() => session.nudge(-1, 0)}>←</button><button onClick={() => session.nudge(0, -1)}>↑</button><button onClick={() => session.nudge(0, 1)}>↓</button><button onClick={() => session.nudge(1, 0)}>→</button><button onClick={() => session.resize(-1, -1)}>Smaller</button><button onClick={() => session.resize(1, 1)}>Larger</button><button onClick={session.addVertex}>Add vertex</button></div>{area.overlay.polygon && <div className="map-vertex-list"><b>Shape vertices</b>{area.overlay.polygon.map((point, index) => <div key={index}><label>X<input type="number" min="0" max="100" step="0.1" value={point.x} onChange={(event) => session.editVertex(index, { ...point, x: Number(event.target.value) })}/></label><label>Y<input type="number" min="0" max="100" step="0.1" value={point.y} onChange={(event) => session.editVertex(index, { ...point, y: Number(event.target.value) })}/></label><button onClick={() => session.removeVertex(index)} aria-label={`Remove vertex ${index + 1}`}>×</button></div>)}</div>}<small>{area.assetIds.length} assigned asset{area.assetIds.length === 1 ? '' : 's'}; delete is blocked until dependencies are resolved.</small></aside>}
  </div>;
}

const pointsValue = (points: MapPoint[], width: number, height: number) => points.map((point) => `${point.x / 100 * width},${point.y / 100 * height}`).join(' ');
export function MapEditorSvgLayer({ session, width, height }: { session: MapEditorSession; width: number; height: number }) {
  if (!session.active) return null;
  const draft = session.history.present;
  return <svg className={`map-editor-svg tool-${session.tool}`} viewBox={`0 0 ${width} ${height}`} aria-label="Editable facility geometry" onPointerDown={session.pointerDown} onPointerMove={session.pointerMove} onPointerUp={session.pointerUp} onPointerCancel={session.pointerUp}>
    <g className="map-editor-areas">{draft.areas.filter((area) => area.visible !== false).map((area) => { const selected = session.selection.some((item) => item.kind === 'area' && item.id === area.id); const overlay = area.overlay; return <g key={area.id} className={selected ? 'selected' : ''} role="button" aria-label={`Edit area ${area.name}`} onPointerDown={(event) => { if (!['select', 'multi-select', 'move', 'resize', 'edit-shape', 'erase', 'merge', 'split'].includes(session.tool)) return; event.stopPropagation(); session.choose({ kind: 'area', id: area.id }, event.shiftKey || event.ctrlKey || event.metaKey || session.tool === 'multi-select'); if (['move', 'select'].includes(session.tool)) session.setDrag({ start: pointFromEvent(event), original: structuredClone(area) }); }}>{overlay.polygon ? <polygon points={pointsValue(overlay.polygon, width, height)}/> : <rect x={overlay.x / 100 * width} y={overlay.y / 100 * height} width={overlay.width / 100 * width} height={overlay.height / 100 * height}/>}<text x={(overlay.x + overlay.width / 2) / 100 * width} y={(overlay.y + overlay.height / 2) / 100 * height}>{area.shortName}</text>{selected && <rect className="selection-bounds" x={overlay.x / 100 * width} y={overlay.y / 100 * height} width={overlay.width / 100 * width} height={overlay.height / 100 * height}/>}</g>; })}</g>
    <g className="map-editor-walls">{(draft.mapConfig.walls ?? []).map((wall) => <polyline key={wall.id} className={session.selection.some((item) => item.kind === 'wall' && item.id === wall.id) ? 'selected' : ''} points={pointsValue(wall.points, width, height)} onPointerDown={(event) => { event.stopPropagation(); session.choose({ kind: 'wall', id: wall.id }, event.shiftKey || event.ctrlKey || event.metaKey); }}/>)}</g>
    <g className="map-editor-annotations">{(draft.mapConfig.annotations ?? []).map((annotation) => annotation.kind === 'TEXT' || annotation.kind === 'NOTE' ? <text key={annotation.id} x={annotation.x / 100 * width} y={annotation.y / 100 * height} fill={annotation.color} onPointerDown={(event) => { event.stopPropagation(); session.choose({ kind: 'annotation', id: annotation.id }, event.shiftKey || event.ctrlKey || event.metaKey); }}>{annotation.text}</text> : annotation.kind === 'RECTANGLE' || annotation.kind === 'CIRCLE' ? <rect key={annotation.id} x={annotation.x / 100 * width} y={annotation.y / 100 * height} width={annotation.width / 100 * width} height={annotation.height / 100 * height} stroke={annotation.color}/> : <polyline key={annotation.id} points={pointsValue('points' in annotation ? annotation.points : [], width, height)} stroke={annotation.color} className={`${annotation.kind.toLowerCase()} ${session.selection.some((item) => item.kind === 'annotation' && item.id === annotation.id) ? 'selected' : ''}`} onPointerDown={(event) => { event.stopPropagation(); session.choose({ kind: 'annotation', id: annotation.id }, event.shiftKey || event.ctrlKey || event.metaKey); }}/>)}</g>
    {session.workingPoints.length > 0 && <polyline className="map-editor-working" points={pointsValue(session.workingPoints, width, height)}/>} 
  </svg>;
}
