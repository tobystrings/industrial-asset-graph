import { useEffect, useRef, useState } from 'react';
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
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
};

type ViewTransform = { scale: number; x: number; y: number };
type MetaTab = 'legend' | 'cabinets' | 'areas' | 'notes';

const clampScale = (value: number) => Math.max(0.75, Math.min(3.2, Math.round(value * 100) / 100));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function DetailedBuildingLayout({ selectedArea, selectedAsset, filters, onArea, onAsset }: Props) {
  const { facility, areas, assets, mapConfig } = useFacility();
  const markers = (mapConfig?.markers ?? []) as FacilityMapMarker[];
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: ViewTransform; origin: { x: number; y: number }; distance?: number }>({ start: { scale: 1, x: 0, y: 0 }, origin: { x: 0, y: 0 } });
  const [view, setView] = useState<ViewTransform>(() => ({ scale: loadAppSettings().mapZoom / 100, x: 0, y: 0 }));
  const [gesturing, setGesturing] = useState(false);
  const [metaTab, setMetaTab] = useState<MetaTab>(() => loadAppSettings().mapDetails);
  const [editMode, setEditMode] = useState(false);
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
  const fitPlan = () => setView({ scale: 1, x: 0, y: 0 });
  const zoomBy = (amount: number) => setView((current) => ({ ...current, scale: clampScale(current.scale + amount) }));

  const markerPosition = (marker: FacilityMapMarker) => {
    if (marker.x <= 100 && marker.y <= 100) return { left: `${marker.x}%`, top: `${marker.y}%` };
    const width = naturalSize.width || Number(mapConfig?.drawingWidth) || 1200;
    const height = naturalSize.height || Number(mapConfig?.drawingHeight) || 650;
    return { left: `${Math.max(0, Math.min(100, marker.x / width * 100))}%`, top: `${Math.max(0, Math.min(100, marker.y / height * 100))}%` };
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
      setView({ ...gesture.current.start, x: gesture.current.start.x + point.x - gesture.current.origin.x, y: gesture.current.start.y + point.y - gesture.current.origin.y });
      return;
    }
    if (points.length >= 2 && gesture.current.distance) {
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

  const addAtClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || (event.target as Element).closest('.map-hotspot')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 100;
    const y = (event.clientY - rect.top) / rect.height * 100;
    window.dispatchEvent(new CustomEvent('iag-map-add-asset', { detail: { x, y } }));
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
    <header className="reference-layout-head"><div><h2>{mapConfig?.drawingTitle ?? 'Building Layout'}</h2></div><div className="reference-layout-actions" aria-label="Map controls"><button type="button" onClick={() => zoomBy(-.15)} aria-label="Zoom out">−</button><output className="map-zoom-readout" aria-live="polite">{Math.round(view.scale * 100)}%</output><button type="button" onClick={() => zoomBy(.15)} aria-label="Zoom in">+</button><button type="button" onClick={fitPlan}>Fit to Screen</button><button className="print-action" type="button" onClick={() => window.print()}>Print / PDF</button><button className="edit-map-action" type="button" aria-pressed={editMode} onClick={() => { const next = !editMode; setEditMode(next); window.dispatchEvent(new CustomEvent('iag-map-edit-mode', { detail: next })); }}>{editMode ? 'Done' : 'Edit Map'}</button></div></header>
    <div className={`reference-drawing-sheet ${editMode ? 'is-editing' : ''}`}>
      <div className="reference-plan-wrap" tabIndex={0} onKeyDown={handleKeyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheelZoom}>
        <div className={`reference-plan-transform ${gesturing ? 'is-gesturing' : ''}`} style={{ transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})` }}>
          <div className="reference-plan-image-stage" onClick={addAtClick}>
            <img className="reference-plan-image" src={buildingLayoutImage} alt={`${facility.name} facility layout and asset graph`} draggable={false} onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}/>
            {areas.map((area) => area.overlay ? <button key={area.id} type="button" className={`map-hotspot area ${selectedArea?.id === area.id ? 'selected' : ''}`} style={{ left: `${area.overlay.x}%`, top: `${area.overlay.y}%`, width: `${area.overlay.width}%`, height: `${area.overlay.height}%` }} onClick={() => onArea(area)} aria-label={`Select ${area.name}`}><span><b>{area.shortName}</b></span></button> : null)}
            {markers.map((marker) => {
              const asset = liveAsset(marker.assetId);
              const selected = Boolean(asset && selectedAsset?.id === asset.id);
              const visible = marker.state === 'REFERENCE' || !asset || filters.has(asset.verificationStatus);
              if (!visible) return null;
              return <button key={marker.id} type="button" className={`map-hotspot asset ${marker.tone} ${selected ? 'selected' : ''} ${marker.state === 'REFERENCE' ? 'reference-only' : ''}`} style={markerPosition(marker)} onClick={() => activateMarker(marker)} aria-label={marker.label}><span>{marker.id}</span></button>;
            })}
          </div>
        </div>
        <div className="map-floating-controls" aria-label="Touch map controls"><button type="button" onClick={() => zoomBy(.2)} aria-label="Zoom in">+</button><button type="button" onClick={() => zoomBy(-.2)} aria-label="Zoom out">−</button><button type="button" onClick={fitPlan}>Fit</button></div>
      </div>
      <div className="reference-map-status" aria-live="polite"><span><b>{actionableMarkers.length}</b> graph-linked map tags</span><span><b>{markers.length - actionableMarkers.length}</b> reference tags</span></div>
      <div className="reference-info-strip"><section><h3>Legend</h3>{legendContent}</section><section><h3>Control Cabinets</h3>{cabinetDirectory}</section><section><h3>Major Machines / Equipment</h3>{machineDirectory}</section><section><h3>Areas</h3>{areaDirectory}</section><section><h3>Notes</h3>{notes}</section></div>
      <div className="mobile-map-meta-tabs" role="tablist" aria-label="Map details">{(['legend','cabinets','areas','notes'] as MetaTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-pressed={metaTab === tab} onClick={() => setMetaTab(tab)}>{tab}</button>)}</div>
      <section className="mobile-map-meta-panel" role="tabpanel"><h3>{metaTab === 'cabinets' ? 'Asset directories' : metaTab}</h3>{metaTab === 'legend' && legendContent}{metaTab === 'cabinets' && cabinetDirectory}{metaTab === 'areas' && areaDirectory}{metaTab === 'notes' && notes}</section>
      <footer className="reference-title-block"><div className="north-arrow" aria-label="North arrow"><b>N</b><span>▲</span></div><div><b>FACILITY:</b><span>{facility.name}</span><b>LOCATION:</b><span>{mapConfig?.drawingTitle ?? ''}</span></div></footer>
    </div>
  </section>;
}
