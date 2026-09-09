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
import { applyActions, changeStudio, layerOf, layerState, makeSymbol, snapPoint, uid, validateStudio, type StudioAction } from './studioModel';
import type { FacilityMapSymbol, MapSymbolKind } from '../facility/types';
import { StudioSymbol } from './StudioSymbols';

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
  const assets = history.present.assets ?? facility.assets;
  const setAssets = (next: typeof assets) => setHistory(current => ({...current, present: {...current.present, assets:next}}));
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<MapEditorTool>('select');
  const [selection, setSelection] = useState<MapObjectRef[]>([]);
  const [message, setMessage] = useState('Select an editing tool. Structural geometry and manual markup are separate layers.');
  const [workingPoints, setWorkingPoints] = useState<MapPoint[]>([]);
  const [drag, setDrag] = useState<{ start: MapPoint; original: MapEditorHistory['present']; refs: MapObjectRef[]; resize?: {width:number;height:number} } | null>(null);
  const [symbolKind, setSymbolKind] = useState<MapSymbolKind>('door');
  const [template, setTemplate] = useState<FacilityMapSymbol | null>(null);
  const [equipmentId, setEquipmentId] = useState('');
  const [previewDraft, setPreviewDraft] = useState<MapEditorHistory['present'] | null>(null);
  const liveAtStart = useRef('');
  const snap = (point: MapPoint) => {
    const spacing=history.present.mapConfig.studio?.snap ?? .5;
    const snapped=snapPoint(point,spacing);
    if(tool!=='wall'||!spacing) return snapped;
    const anchors=[...(history.present.mapConfig.walls??[]).flatMap(w=>w.points),...history.present.areas.flatMap(a=>a.overlay.polygon??[{x:a.overlay.x,y:a.overlay.y},{x:a.overlay.x+a.overlay.width,y:a.overlay.y},{x:a.overlay.x,y:a.overlay.y+a.overlay.height},{x:a.overlay.x+a.overlay.width,y:a.overlay.y+a.overlay.height}])];
    const nearest=anchors.filter(p=>Math.hypot(p.x-point.x,p.y-point.y)<=spacing).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
    return nearest??snapped;
  };
  const startDrag = (event: React.PointerEvent<SVGElement>, ref: MapObjectRef) => {
    if (layerState(history.present.mapConfig,layerOf(ref)).locked || saving) return;
    if (!['select','multi-select','move','resize'].includes(tool)) return;
    event.stopPropagation();
    const additive=event.shiftKey||event.ctrlKey||event.metaKey||tool==='multi-select';
    choose(ref,additive);
    if (additive) return;
    const refs=selection.some(s=>s.kind===ref.kind&&s.id===ref.id)?selection:[ref];
    setSelection(refs);
    const svg=event.currentTarget.ownerSVGElement;
    svg?.setPointerCapture(event.pointerId);
    setDrag({start:snap(pointFromEvent(event)),original:structuredClone(history.present),refs});
  };
  const startResize = (event: React.PointerEvent<SVGElement>,ref:MapObjectRef,width:number,height:number) => {
    if(saving||layerState(history.present.mapConfig,layerOf(ref)).locked) return;
    event.stopPropagation(); event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    setSelection([ref]);setDrag({start:snap(pointFromEvent(event)),original:structuredClone(history.present),refs:[ref],resize:{width,height}});
  };
  const act = (actions: StudioAction[], message: string) => {
    try {commit(applyActions(history.present,actions,facility),message);} catch(error) {setMessage(error instanceof Error?error.message:'The edit could not be applied.');}
  };

  useEffect(() => {
    if (!active) return;
    baseline.current = draftFromPackage(facility);
    liveAtStart.current = JSON.stringify(baseline.current);
    setHistory(createHistory(baseline.current));
    setAssets(structuredClone(facility.assets));
    setSelection([]);
    setTool('select');
    setWorkingPoints([]);
  }, [active, facility.facility.id]);

  const commit = (next: MapEditorHistory['present'], text: string) => {
    if(saving) return;
    const prior=history.present;
    const contents=(draft:typeof prior,layer:string)=>layer==='areas'?draft.areas:layer==='walls'?draft.mapConfig.walls:layer==='symbols'?draft.mapConfig.studio?.symbols:layer==='masks'?draft.mapConfig.studio?.masks:layer==='equipment'?draft.mapConfig.markers:draft.mapConfig.annotations;
    for(const layer of ['areas','walls','symbols','masks','equipment','markup'] as const) if((layerState(prior.mapConfig,layer).locked||!layerState(prior.mapConfig,layer).visible) && JSON.stringify(contents(prior,layer))!==JSON.stringify(contents(next,layer))) {setMessage('Show and unlock the '+layer+' layer before editing.');return;}
    setPreviewDraft(null);
    setHistory((current) => pushHistory(current, next)); setMessage(text);
  };
  const choose = (ref: MapObjectRef, additive = tool === 'multi-select') => { if(layerState(history.present.mapConfig,layerOf(ref)).locked||saving) return; setSelection((current) => additive ? current.some((item) => refKey(item) === refKey(ref)) ? current.filter((item) => refKey(item) !== refKey(ref)) : [...current, ref] : [ref]); };
  const selectedAreas = selection.filter((item) => item.kind === 'area').map((item) => history.present.areas.find((area) => area.id === item.id)).filter(Boolean) as FacilityArea[];
  const selectedArea = selectedAreas.length === 1 ? selectedAreas[0] : undefined;
  const dirty = JSON.stringify(history.present) !== JSON.stringify(baseline.current) || JSON.stringify(assets) !== JSON.stringify(facility.assets);
  const errors = useMemo(() => [...validateMapDraft({ ...facility, assets }, history.present), ...validateStudio(history.present.mapConfig)], [assets, facility, history.present]);

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

  const removeSelected = () => { act([{op:'delete',targets:selection}], 'Removed selected objects. Equipment records are retained.'); setSelection([]); };

  const doMerge = () => {
    if (selectedAreas.length < 2) { setMessage('Select two or more areas with Multi-select before merging.'); return; }
    const survivor = selectedAreas.find(a=>a.id===facility.featureConfig.defaultAreaId)??selectedAreas[0];
    const name = window.prompt('Name for the merged area', survivor.name)?.trim();
    if (!name) return;
    try {
      const result = mergeAreas(history.present, { ...facility, assets }, selectedAreas.map((area) => area.id), survivor.id, name);
      commit(result.draft, `Merged ${selectedAreas.length} areas into ${name}; ${result.assets.filter((asset, index) => asset.areaId !== assets[index]?.areaId).length} asset reference(s) migrated.`); setSelection([{ kind: 'area', id: survivor.id }]);
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
      commit(result.draft, `Split ${selectedArea.name}; explicitly assigned ${affected.length} affected asset${affected.length === 1 ? '' : 's'}.`); setSelection([{ kind: 'area', id: newId }]);
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

  const moveSelection = (dx: number, dy: number) => act([{op:'move',targets:selection,dx,dy}], 'Moved selection.');

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
    const point = snap(pointFromEvent(event));
    if(saving) return;
    if (['symbol','replace-symbol','mask','add-area', 'add-rectangle', 'pen', 'highlight', 'line', 'arrow', 'wall'].includes(tool)) { event.currentTarget.setPointerCapture(event.pointerId); setWorkingPoints([point]); }
    else if (tool === 'place-equipment') {
      const asset=assets.find(a=>a.id===equipmentId);
      if(!asset) {setMessage('Choose an existing asset from the equipment tray.');return;}
      if(layerState(history.present.mapConfig,'equipment').locked) {setMessage('Unlock equipment placements first.');return;}
      const markers=(history.present.mapConfig.markers??[]).filter(m=>m.assetId!==asset.id);
      const existing=history.present.mapConfig.markers?.find(m=>m.assetId===asset.id);
      commit({...history.present,mapConfig:{...history.present.mapConfig,markers:[...markers,{id:existing?.id??uid('placement'),label:asset.name,...point,tone:existing?.tone??'machine',state:existing?.state??'FIELD_VERIFY',assetId:asset.id,placementSource:'TECHNICIAN'}]}},'Placed existing equipment; its asset record and area assignment are unchanged.');
    }
    else if (tool === 'add-polygon') setWorkingPoints((points) => [...points, point]);
    else if (tool === 'text' || tool === 'note') {
      const text = window.prompt(tool === 'text' ? 'Map label text' : 'Manual note text')?.trim();
      if (text) { const annotation: FacilityMapAnnotation = { id: makeId('annotation'), kind: tool === 'text' ? 'TEXT' : 'NOTE', x: point.x, y: point.y, text, color: tool === 'text' ? '#0f172a' : '#a16207' }; commit(setAnnotations(history.present, [...(history.present.mapConfig.annotations ?? []), annotation]), `Added manual ${tool}.`); }
    }
  };
  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    let point = snap(pointFromEvent(event));
    if(tool==='wall'&&event.shiftKey&&workingPoints.length) {const start=workingPoints[0];point=Math.abs(point.x-start.x)>Math.abs(point.y-start.y)?{x:point.x,y:start.y}:{x:start.x,y:point.y};}
    if (workingPoints.length && ['symbol','replace-symbol','mask','add-area', 'add-rectangle', 'pen', 'highlight', 'line', 'arrow', 'wall'].includes(tool)) setWorkingPoints((points) => tool === 'pen' || tool === 'highlight' ? [...points, point] : [points[0], point]);
    if (drag) {
      try {
        const next=applyActions(drag.original,[drag.resize?{op:'resize',targets:drag.refs,width:drag.resize.width+point.x-drag.start.x,height:drag.resize.height+point.y-drag.start.y}:{op:'move',targets:drag.refs,dx:point.x-drag.start.x,dy:point.y-drag.start.y}],facility);
        setHistory(current=>({...current,present:next}));
      } catch { /* Keep the last valid position while dragging beyond map bounds. */ }
    }
  };
  const pointerUp = () => {
    if (drag) {
      setHistory(current=>JSON.stringify(current.present)===JSON.stringify(drag.original)?current:{past:[...current.past,drag.original],present:current.present,future:[]});
      setDrag(null); setPreviewDraft(null); setMessage('Moved selection.'); return;
    }
    if(tool==='add-polygon') return;
    if (workingPoints.length < 2) { setWorkingPoints([]); return; }
    const points = workingPoints;
    if (tool==='symbol'||tool==='replace-symbol'||tool==='mask') {
      const box=areaBounds(points);
      if(box.width<.2||box.height<.2) {setMessage('Drag a box around the symbol or reference feature.');setWorkingPoints([]);return;}
      if(layerState(history.present.mapConfig,tool==='mask'?'masks':'symbols').locked || (tool==='replace-symbol'&&layerState(history.present.mapConfig,'masks').locked)) {setMessage('Unlock symbols and reference cleanup before drawing.');setWorkingPoints([]);return;}
      let next=history.present;
      if(tool!=='symbol') next=changeStudio(next,{masks:[...(next.mapConfig.studio?.masks??[]),{id:uid('mask'),x:box.x,y:box.y,width:box.width,height:box.height,label:'Hidden reference feature'}]});
      if(tool!=='mask') {
        const symbol=template?{...structuredClone(template),id:uid('symbol'),x:box.x,y:box.y,width:box.width,height:box.height}:makeSymbol(symbolKind,box);
        next=changeStudio(next,{symbols:[...(next.mapConfig.studio?.symbols??[]),symbol]});
        setSelection([{kind:'symbol',id:symbol.id}]);
      }
      commit(next,tool==='replace-symbol'?'Reference feature replaced. Its source cleanup stays anchored when you move or delete the new symbol.':'Added '+(tool==='mask'?'reference cleanup':'editable symbol')+'.');
      setTool('select');
    } else if (tool === 'add-area' || tool === 'add-rectangle') {
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
    if (liveAtStart.current !== JSON.stringify(draftFromPackage(facility))) {setMessage('The plant map changed outside this draft. Export your draft, then reopen Map Studio to reconcile it before saving.');return false;}
    if (errors.length) { setMessage(errors[0]); return false; }
    setSaving(true);
    const summary = mapChangeSummary(baseline.current, history.present);
    try { await editor.saveMapDraft({ ...history.present, assets }, summary); baseline.current = structuredClone(history.present); liveAtStart.current=JSON.stringify(history.present); setHistory(createHistory(history.present)); setMessage(`Saved on this device: ${summary.length} structural or markup change${summary.length === 1 ? '' : 's'}.`); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Map changes could not be saved.'); return false; }
    finally { setSaving(false); }
  };
  useEffect(() => {
    if(!active) return;
    const handler=(event:KeyboardEvent)=>{
      if((event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]') || saving) return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z') {event.preventDefault();setPreviewDraft(null);setHistory(event.shiftKey?redoHistory:undoHistory);}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y') {event.preventDefault();setPreviewDraft(null);setHistory(redoHistory);}
    };
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('keydown',handler);window.addEventListener('beforeunload',beforeUnload);
    return()=>{window.removeEventListener('keydown',handler);window.removeEventListener('beforeunload',beforeUnload);};
  },[active,saving,dirty]);
  const finish = async () => { if (saving) return; if (!dirty || await save()) onExit(); };
  const cancel = () => { if(saving) return; if(dirty&&!window.confirm('Discard unsaved Map Studio edits?')) return; setHistory(createHistory(baseline.current)); setAssets(structuredClone(facility.assets)); setSelection([]); setWorkingPoints([]); onExit(); };
  return { facility, commit, act, setMessage, symbolKind, setSymbolKind, template, setTemplate, equipmentId, setEquipmentId, startDrag, startResize, previewDraft, setPreviewDraft, active, saving, finish, editor, history, assets, tool, selection, selectedArea, selectedAreas, dirty, errors, message, workingPoints, choose, selectTool, setSelection, updateSelectedArea, nudge, resize, moveSelection, editVertex, addVertex, removeVertex, pointerDown, pointerMove, pointerUp, finishPolygon, setDrag, save, cancel, undo: () => {if(!saving){setHistory(undoHistory);setPreviewDraft(null);}}, redo: () => {if(!saving){setHistory(redoHistory);setPreviewDraft(null);}}, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
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
  const draft = session.previewDraft ?? session.history.present;
  return <svg className={`map-editor-svg tool-${session.tool} ${session.previewDraft ? 'studio-preview' : ''}` } viewBox={`0 0 ${width} ${height}`} aria-label="Editable facility geometry" onPointerDown={session.pointerDown} onPointerMove={session.pointerMove} onPointerUp={session.pointerUp} onPointerCancel={session.pointerUp}>
    <g className="map-editor-areas" style={{display:layerState(draft.mapConfig,'areas').visible?undefined:'none'}}>{draft.areas.filter((area) => area.visible !== false).map((area) => { const selected = session.selection.some((item) => item.kind === 'area' && item.id === area.id); const overlay = area.overlay; return <g key={area.id} className={selected ? 'selected' : ''} role="button" aria-label={`Edit area ${area.name}`} onPointerDown={(event) => session.startDrag(event,{kind:'area',id:area.id})}>{overlay.polygon ? <polygon points={pointsValue(overlay.polygon, width, height)}/> : <rect x={overlay.x / 100 * width} y={overlay.y / 100 * height} width={overlay.width / 100 * width} height={overlay.height / 100 * height}/>}<text x={(overlay.x + overlay.width / 2) / 100 * width} y={(overlay.y + overlay.height / 2) / 100 * height}>{area.shortName}</text>{selected && <rect className="selection-bounds" x={overlay.x / 100 * width} y={overlay.y / 100 * height} width={overlay.width / 100 * width} height={overlay.height / 100 * height}/>}</g>; })}</g>
    <g className="map-editor-walls" style={{display:layerState(draft.mapConfig,'walls').visible?undefined:'none'}}>{(draft.mapConfig.walls ?? []).map((wall) => <polyline key={wall.id} className={session.selection.some((item) => item.kind === 'wall' && item.id === wall.id) ? 'selected' : ''} points={pointsValue(wall.points, width, height)} onPointerDown={(event) => { session.startDrag(event,{kind:'wall',id:wall.id}); }}/>)}</g>
    <g className="map-editor-annotations" style={{display:layerState(draft.mapConfig,'markup').visible?undefined:'none'}}>{(draft.mapConfig.annotations ?? []).map((annotation) => annotation.kind === 'TEXT' || annotation.kind === 'NOTE' ? <text key={annotation.id} x={annotation.x / 100 * width} y={annotation.y / 100 * height} fill={annotation.color} onPointerDown={(event) => { session.startDrag(event,{kind:'annotation',id:annotation.id}); }}>{annotation.text}</text> : annotation.kind === 'RECTANGLE' || annotation.kind === 'CIRCLE' ? <rect key={annotation.id} x={annotation.x / 100 * width} y={annotation.y / 100 * height} width={annotation.width / 100 * width} height={annotation.height / 100 * height} stroke={annotation.color}/> : <polyline key={annotation.id} points={pointsValue('points' in annotation ? annotation.points : [], width, height)} stroke={annotation.color} className={`${annotation.kind.toLowerCase()} ${session.selection.some((item) => item.kind === 'annotation' && item.id === annotation.id) ? 'selected' : ''}`} onPointerDown={(event) => { session.startDrag(event,{kind:'annotation',id:annotation.id}); }}/>)}</g>
    {layerState(draft.mapConfig,'symbols').visible && <g className="studio-symbols">{draft.mapConfig.studio?.symbols?.map(symbol=><g key={symbol.id} role="button" aria-label={`Edit symbol ${symbol.label}`} className={session.selection.some(s=>s.id===symbol.id)?'selected':''} onPointerDown={event=>session.startDrag(event,{kind:'symbol',id:symbol.id})}><rect className="studio-symbol-hit" x={symbol.x/100*width} y={symbol.y/100*height} width={symbol.width/100*width} height={symbol.height/100*height}/><StudioSymbol symbol={symbol} width={width} height={height}/>{session.selection.some(s=>s.kind==='symbol'&&s.id===symbol.id)&&<circle className="studio-resize-handle" cx={(symbol.x+symbol.width)/100*width} cy={(symbol.y+symbol.height)/100*height} r={6} onPointerDown={event=>session.startResize(event,{kind:'symbol',id:symbol.id},symbol.width,symbol.height)}/>}</g>)}</g>}
    {layerState(draft.mapConfig,'equipment').visible && <g className="studio-equipment">{draft.mapConfig.markers?.map(m=><g key={m.id} role="button" aria-label={`Edit placement ${m.label}`} onPointerDown={event=>session.startDrag(event,{kind:'marker',id:m.id})}><circle cx={m.x/100*width} cy={m.y/100*height} r={9} className={session.selection.some(s=>s.id===m.id)?'selected':''}/><text x={m.x/100*width+12} y={m.y/100*height+4}>{m.label}</text></g>)}</g>}
    {layerState(draft.mapConfig,'masks').visible && <g className="studio-mask-handles">{draft.mapConfig.studio?.masks?.map(m=><rect key={m.id} aria-label={`Edit reference cleanup ${m.id}`} x={m.x/100*width} y={m.y/100*height} width={m.width/100*width} height={m.height/100*height} className={session.selection.some(s=>s.id===m.id)?'selected':''} onPointerDown={event=>session.startDrag(event,{kind:'mask',id:m.id})}/>)}</g>}
    {session.workingPoints.length > 0 && <polyline className="map-editor-working" points={pointsValue(session.workingPoints, width, height)}/>} 
  </svg>;
}
