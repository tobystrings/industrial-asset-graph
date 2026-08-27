import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFacility } from '../facility';
import type { FacilityMapMarker } from '../facility/types';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import buildingLayoutImage from './embeddedBuildingLayoutImage';
import './detailedBuildingLayout.css';
import './buildingLayoutImage.css';
import '../ui/map-polish.css';
import { loadAppSettings, type AppSettings } from '../lib/appSettings';

type Props = {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  traceAssetIds?: Set<string>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
};

type ViewTransform = { scale: number; x: number; y: number };
type MetaTab = 'legend' | 'cabinets' | 'areas' | 'notes';

const clampScale = (value: number) => Math.max(0.2, Math.min(3.2, Math.round(value * 100) / 100));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const mapCoordinateLabel = (x: number, y: number) => `${String.fromCharCode(65 + Math.max(0, Math.min(25, Math.floor(x / (100 / 26)))))}${Math.max(1, Math.min(20, Math.floor(y / 5) + 1))}`;

export default function DetailedBuildingLayout({ selectedArea, selectedAsset, filters, traceAssetIds, onArea, onAsset }: Props) {
  const { facility, areas, assets, mapConfig } = useFacility();
  const markers = (mapConfig?.markers ?? []) as FacilityMapMarker[];
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const didPan = useRef(false);
  const planWrapRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ start: ViewTransform; origin: { x: number; y: number }; distance?: number }>({ start: { scale: 1, x: 0, y: 0 }, origin: { x: 0, y: 0 } });
  const [view, setView] = useState<ViewTransform>(() => ({ scale: loadAppSettings().mapZoom / 100, x: 0, y: 0 }));
  const [gesturing, setGesturing] = useState(false);
  const [metaTab, setMetaTab] = useState<MetaTab>(() => loadAppSettings().mapDetails);
  const [editMode, setEditMode] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [gridPoint, setGridPoint] = useState<{ x: number; y: number; label: string } | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [layers, setLayers] = useState({ cabinets: true, machines: true, reference: false });
  const [layerOpen, setLayerOpen] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = (event: Event) => setEditMode(Boolean((event as CustomEvent<boolean>).detail));
    addEventListener('iag-map-edit-mode', handler);
    return () => removeEventListener('iag-map-edit-mode', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const settings = (event as CustomEvent<AppSettings>).detail;
      setMetaTab(settings.mapDetails);
      setView((current) => ({ ...current, scale: settings.mapZoom / 100 }));
    };
    addEventListener('iag-settings-changed', handler);
    return () => removeEventListener('iag-settings-changed', handler);
  }, []);

  const liveAsset = (assetId?: string) => assetId ? assets.find((asset) => asset.id === assetId) ?? null : null;
  const actionableMarkers = markers.filter((marker) => marker.state !== 'REFERENCE' && liveAsset(marker.assetId));
  const drawingWidth = naturalSize.width || Number(mapConfig?.drawingWidth) || 1210;
  const drawingHeight = naturalSize.height || Number(mapConfig?.drawingHeight) || 525;
  const fitPlan = useCallback(() => {
    const availableWidth = Math.max(0, (planWrapRef.current?.clientWidth ?? 0) - 20);
    const availableHeight = Math.max(0, (planWrapRef.current?.clientHeight ?? 0) - 20);
    const sourceWidth = naturalSize.width || Number(mapConfig?.drawingWidth) || 1210;
    const sourceHeight = naturalSize.height || Number(mapConfig?.drawingHeight) || 525;
    const bounds = mapConfig?.contentBounds ?? { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    const scale = availableWidth ? clampScale(Math.min(1, availableWidth / bounds.width, availableHeight ? availableHeight / bounds.height : 1)) : 1;
    setView({ scale, x: (availableWidth - bounds.width * scale) / 2 - bounds.x * scale, y: (availableHeight - bounds.height * scale) / 2 - bounds.y * scale });
  }, [mapConfig?.contentBounds, mapConfig?.drawingHeight, mapConfig?.drawingWidth, naturalSize.height, naturalSize.width]);

  useEffect(() => {
    if (!naturalSize.width || !planWrapRef.current) return;
    fitPlan();
    const observer = new ResizeObserver(fitPlan);
    observer.observe(planWrapRef.current);
    return () => observer.disconnect();
  }, [fitPlan, naturalSize.width]);
  const zoomBy = (amount: number) => setView((current) => ({ ...current, scale: clampScale(current.scale + amount) }));
  const resetPlan = () => setView({ scale: 1, x: 0, y: 0 });

  const markerPoint = (marker: FacilityMapMarker) => marker.x <= 100 && marker.y <= 100
    ? { x: marker.x / 100 * drawingWidth, y: marker.y / 100 * drawingHeight }
    : { x: marker.x, y: marker.y };

  const focusBounds = (x: number, y: number, width: number, height: number) => {
    const hostWidth = Math.max(0, (planWrapRef.current?.clientWidth ?? 0) - 28);
    const hostHeight = Math.max(0, (planWrapRef.current?.clientHeight ?? 0) - 28);
    if (!hostWidth || !hostHeight) return;
    const scale = clampScale(Math.min(2.4, hostWidth / Math.max(width * 1.45, 1), hostHeight / Math.max(height * 1.45, 1)));
    setView({ scale, x: hostWidth / 2 - (x + width / 2) * scale, y: hostHeight / 2 - (y + height / 2) * scale });
  };

  const searchResults = useMemo(() => {
    const needle = mapSearch.trim().toLowerCase();
    if (!needle) return [];
    return [
      ...areas.filter((area) => `${area.name} ${area.shortName} ${area.id}`.toLowerCase().includes(needle)).map((area) => ({ kind: 'area' as const, id: area.id, title: area.name, area })),
      ...assets.filter((asset) => `${asset.id} ${asset.name} ${asset.type} ${asset.line}`.toLowerCase().includes(needle)).map((asset) => ({ kind: 'asset' as const, id: asset.id, title: `${asset.id} · ${asset.name}`, asset })),
    ].slice(0, 8);
  }, [areas, assets, mapSearch]);

  const openSearchResult = (result: (typeof searchResults)[number]) => {
    if (result.kind === 'area') {
      onArea(result.area);
      const box = result.area.overlay;
      focusBounds(box.x / 100 * drawingWidth, box.y / 100 * drawingHeight, box.width / 100 * drawingWidth, box.height / 100 * drawingHeight);
    }
    else {
      const area = areas.find((item) => item.id === result.asset.areaId);
      if (area) onArea(area);
      onAsset(result.asset);
      const marker = markers.find((item) => item.assetId === result.asset.id && item.state !== 'REFERENCE');
      if (marker) {
        setLayers((current) => ({ ...current, [marker.tone === 'cabinet' ? 'cabinets' : 'machines']: true }));
        const point = markerPoint(marker);
        focusBounds(point.x - 42, point.y - 30, 84, 60);
      }
    }
    setMapSearch('');
  };

  const activateMarker = (marker: FacilityMapMarker) => {
    if (editMode || marker.state === 'REFERENCE') return;
    const asset = liveAsset(marker.assetId);
    if (asset && filters.has(asset.verificationStatus)) onAsset(asset);
  };

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editMode || (event.target as Element).closest('.map-hotspot')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    didPan.current = false;
    setGesturing(true);
    const points = [...pointers.current.values()];
    if (points.length === 1) gesture.current = { start: view, origin: points[0] };
    if (points.length === 2) gesture.current = { start: view, origin: midpoint(points[0], points[1]), distance: distance(points[0], points[1]) };
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editMode || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 1) {
      const point = points[0];
      if (distance(point, gesture.current.origin) > 6) didPan.current = true;
      setView({ ...gesture.current.start, x: gesture.current.start.x + point.x - gesture.current.origin.x, y: gesture.current.start.y + point.y - gesture.current.origin.y });
      return;
    }
    if (points.length >= 2 && gesture.current.distance) {
      didPan.current = true;
      const center = midpoint(points[0], points[1]);
      const nextScale = clampScale(gesture.current.start.scale * distance(points[0], points[1]) / gesture.current.distance);
      setView({ scale: nextScale, x: gesture.current.start.x + center.x - gesture.current.origin.x, y: gesture.current.start.y + center.y - gesture.current.origin.y });
    }
  };

  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) setGesturing(false);
  };

  const wheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (editMode) return;
    event.preventDefault();
    setView((current) => ({ ...current, scale: clampScale(current.scale + (event.deltaY < 0 ? .12 : -.12)) }));
  };

  const addAtClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!editMode || (event.target as Element).closest('.map-hotspot')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 100;
    const y = (event.clientY - rect.top) / rect.height * 100;
    const point = { x, y, label: mapCoordinateLabel(x, y) };
    setGridPoint(point);
    window.dispatchEvent(new CustomEvent('iag-map-add-asset', { detail: point }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      const button = (event.target as HTMLElement | null)?.closest('button') as HTMLButtonElement | null;
      if (button && !button.disabled) {
        button.click();
        event.preventDefault();
      }
    }
  };

  const legendContent = <div className="legend-grid"><span><i className="swatch outline cabinet" />Control Cabinet</span><span><i className="swatch outline machine" />Major Machine / Equipment</span><span><i className="swatch outline power" />Power Distribution</span></div>;

  const markerDirectory = (tone?: 'machine') => markers.filter((marker) => tone ? marker.tone === tone : marker.tone !== 'machine').map((marker) => {
    const asset = liveAsset(marker.assetId);
    const actionable = marker.state !== 'REFERENCE' && Boolean(asset);
    return <button className={`directory-row ${actionable ? 'actionable' : 'reference-only'}`} type="button" key={marker.id} disabled={!actionable} onClick={() => activateMarker(marker)}><b className={`tag ${marker.tone}`}>{marker.id}</b><span>{marker.label}<em>{marker.state === 'REFERENCE' ? 'REF' : marker.state === 'FIELD_VERIFY' ? 'VERIFY' : 'LIVE'}</em></span></button>;
  });
  const cabinetDirectory = markerDirectory();
  const machineDirectory = markerDirectory('machine');

  const areaDirectory = <div className="area-grid">{areas.map((area) => <button type="button" key={area.id} onClick={() => onArea(area)}><b>{area.name}</b><span>{area.shortName}</span></button>)}</div>;
  const notes = <ul><li>Map boundaries and labels remain drawing context.</li><li>Graph-linked pins are loaded from the editable plant database.</li><li>Use Map Edit to place new assets without editing source code.</li></ul>;

  return <section className="reference-layout" aria-label="Building Layout">
    <header className="reference-layout-head"><div><h2>{mapConfig?.drawingTitle ?? 'Building Layout'}</h2><p className="map-honesty-note">Equipment locations are not field verified unless explicitly marked.</p></div><div className="map-toolbar-search"><label><span className="sr-only">Search map</span><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Search rooms, areas, or assets…" /></label>{searchResults.length > 0 && <div className="map-search-results">{searchResults.map((result) => <button type="button" key={`${result.kind}-${result.id}`} onClick={() => openSearchResult(result)}><b>{result.title}</b><small>{result.kind === 'asset' ? result.asset.type : 'Room / area'}</small></button>)}</div>}</div><div className="reference-layout-actions" aria-label="Map controls"><div className="map-layer-control"><button type="button" aria-expanded={layerOpen} onClick={() => setLayerOpen((open) => !open)}>Layers</button>{layerOpen && <div className="map-layer-menu"><label><input type="checkbox" checked={layers.cabinets} onChange={(event) => setLayers((value) => ({ ...value, cabinets: event.target.checked }))}/>Control cabinets</label><label><input type="checkbox" checked={layers.machines} onChange={(event) => setLayers((value) => ({ ...value, machines: event.target.checked }))}/>Machines</label><label><input type="checkbox" checked={layers.reference} onChange={(event) => setLayers((value) => ({ ...value, reference: event.target.checked }))}/>Reference symbols</label></div>}</div><button type="button" aria-pressed={gridOpen} onClick={() => setGridOpen((open) => !open)}>Grid</button><button type="button" onClick={() => zoomBy(-.15)} aria-label="Zoom out">−</button><output className="map-zoom-readout" aria-live="polite">{Math.round(view.scale * 100)}%</output><button type="button" onClick={() => zoomBy(.15)} aria-label="Zoom in">+</button><button type="button" onClick={fitPlan}>Fit</button><button type="button" onClick={resetPlan}>Reset</button><button className="edit-map-action" type="button" aria-pressed={editMode} onClick={() => { const next = !editMode; setEditMode(next); window.dispatchEvent(new CustomEvent('iag-map-edit-mode', { detail: next })); }}>{editMode ? 'Done' : 'Edit Map'}</button></div></header>
    <div className={`reference-drawing-sheet ${editMode ? 'is-editing' : ''}`}>
      <div ref={planWrapRef} className="reference-plan-wrap" tabIndex={0} onKeyDown={handleKeyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheelZoom}>
        <div className={`reference-plan-transform ${gesturing ? 'is-gesturing' : ''}`} style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})` }}>
          <div className="reference-plan-image-stage" style={{ '--facility-drawing-width': `${drawingWidth}px`, '--facility-drawing-ratio': `${drawingWidth} / ${drawingHeight}` } as React.CSSProperties}>
            <svg className="facility-map-svg" viewBox={`0 0 ${drawingWidth} ${drawingHeight}`} role="img" aria-label={`${facility.name} interactive facility layout`} onClick={addAtClick}>
            <image href={buildingLayoutImage} width={drawingWidth} height={drawingHeight} preserveAspectRatio="xMinYMin meet" onLoad={(event) => { const image = event.currentTarget as SVGImageElement; const box = image.getBBox(); if (box.width && box.height) setNaturalSize({ width: box.width, height: box.height }); }}/>
            {gridOpen && <g className="svg-coordinate-grid" aria-label="Technician placement coordinate grid">{Array.from({ length: 27 }, (_, index) => <line key={`v-${index}`} x1={index * drawingWidth / 26} x2={index * drawingWidth / 26} y1={0} y2={drawingHeight}/>) }{Array.from({ length: 21 }, (_, index) => <line key={`h-${index}`} x1={0} x2={drawingWidth} y1={index * drawingHeight / 20} y2={index * drawingHeight / 20}/>) }{Array.from({ length: 26 }, (_, index) => <text key={`c-${index}`} x={(index + .5) * drawingWidth / 26} y={14}>{String.fromCharCode(65 + index)}</text>)}{Array.from({ length: 20 }, (_, index) => <text key={`r-${index}`} x={8} y={(index + .5) * drawingHeight / 20 + 4}>{index + 1}</text>)}</g>}
            <g className="svg-zone-layer">{areas.map((area) => area.overlay ? <g key={area.id} role="button" tabIndex={0} className={`svg-zone ${selectedArea?.id === area.id ? 'selected' : ''}`} aria-label={`Select ${area.name}`} onClick={(event) => { event.stopPropagation(); if (!didPan.current) onArea(area); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onArea(area); } }}><rect x={area.overlay.x / 100 * drawingWidth} y={area.overlay.y / 100 * drawingHeight} width={area.overlay.width / 100 * drawingWidth} height={area.overlay.height / 100 * drawingHeight}/><text x={(area.overlay.x + area.overlay.width / 2) / 100 * drawingWidth} y={(area.overlay.y + area.overlay.height / 2) / 100 * drawingHeight}>{area.shortName}</text></g> : null)}</g>
            {markers.map((marker) => {
              const asset = liveAsset(marker.assetId);
              const selected = Boolean(asset && selectedAsset?.id === asset.id);
              const traced = Boolean(asset && traceAssetIds?.has(asset.id));
              const unrelated = Boolean(traceAssetIds?.size && asset && !traced);
              const categoryVisible = marker.tone === 'cabinet' ? layers.cabinets : marker.tone === 'machine' ? layers.machines : true;
              const visible = categoryVisible && (marker.state !== 'REFERENCE' || layers.reference) && (marker.state === 'REFERENCE' || !asset || filters.has(asset.verificationStatus));
              if (!visible) return null;
              const point = markerPoint(marker);
              return <g key={marker.id} role={marker.state === 'REFERENCE' ? undefined : 'button'} tabIndex={marker.state === 'REFERENCE' ? undefined : 0} className={`svg-asset-marker ${marker.tone} ${selected ? 'selected' : ''} ${traced ? 'trace-related' : ''} ${unrelated ? 'trace-unrelated' : ''} ${marker.state === 'REFERENCE' ? 'reference-only' : ''}`} transform={`translate(${point.x} ${point.y})`} onClick={(event) => { event.stopPropagation(); if (!didPan.current) activateMarker(marker); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activateMarker(marker); }} aria-label={marker.label}><rect x={-34} y={-12} width={68} height={24} rx={4}/><text textAnchor="middle" dominantBaseline="central">{marker.id}</text></g>;
            })}
            </svg>
          </div>
        </div>
        <div className="map-floating-controls" aria-label="Touch map controls"><button type="button" onClick={() => zoomBy(.2)} aria-label="Zoom in">+</button><button type="button" onClick={() => zoomBy(-.2)} aria-label="Zoom out">−</button><button type="button" onClick={fitPlan}>Fit</button></div>
      </div>
      <div className="reference-map-status" aria-live="polite"><span><b>{actionableMarkers.length}</b> graph-linked map tags</span><span><b>{markers.length - actionableMarkers.length}</b> reference tags</span>{gridPoint && <span>Selected coordinate <b>{gridPoint.label}</b> · {gridPoint.x.toFixed(1)}%, {gridPoint.y.toFixed(1)}%</span>}</div>
      <div className="reference-info-strip"><section><h3>Legend</h3>{legendContent}</section><section><h3>Control Cabinets</h3>{cabinetDirectory}</section><section><h3>Major Machines / Equipment</h3>{machineDirectory}</section><section><h3>Areas</h3>{areaDirectory}</section><section><h3>Notes</h3>{notes}</section></div>
      <div className="mobile-map-meta-tabs" role="tablist" aria-label="Map details">{(['legend','cabinets','areas','notes'] as MetaTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-pressed={metaTab === tab} onClick={() => setMetaTab(tab)}>{tab}</button>)}</div>
      <section className="mobile-map-meta-panel" role="tabpanel"><h3>{metaTab === 'cabinets' ? 'Asset directories' : metaTab}</h3>{metaTab === 'legend' && legendContent}{metaTab === 'cabinets' && cabinetDirectory}{metaTab === 'areas' && areaDirectory}{metaTab === 'notes' && notes}</section>
      <footer className="reference-title-block"><div className="north-arrow" aria-label="North arrow"><b>N</b><span>▲</span></div><div><b>FACILITY:</b><span>{facility.name}</span><b>LOCATION:</b><span>{mapConfig?.drawingTitle ?? ''}</span></div></footer>
    </div>
  </section>;
}
