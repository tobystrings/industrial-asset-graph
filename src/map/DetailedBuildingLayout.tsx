import { useRef, useState } from 'react';
import { useFacility } from '../facility';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import './detailedBuildingLayout.css';
import '../ui/map-polish.css';

type Props = {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
};

const markerWidth = (id: string) => id.length > 7 ? 68 : 60;
const clampZoom = (value: number) => Math.max(0.85, Math.min(1.75, Math.round(value * 100) / 100));

export default function DetailedBuildingLayout({ selectedArea, selectedAsset, filters, onArea, onAsset }: Props) {
  const { facility, areas, assets, mapConfig } = useFacility();
  const markers = mapConfig?.markers ?? [];
  const planWrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const areaByName = (name: string) => areas.find((area) => area.name === name) ?? null;
  const warehouseA = areaByName('Warehouse A');
  const warehouseF = areaByName('Warehouse F');
  const freezers = areaByName('Freezers');
  const liveAsset = (assetId?: string) => assetId ? assets.find((asset) => asset.id === assetId) ?? null : null;
  const clickArea = (area: FacilityArea | null) => area && onArea(area);
  const selectedMarker = selectedAsset ? markers.find((marker) => marker.assetId === selectedAsset.id) : null;
  const actionableMarkers = markers.filter((marker) => marker.state !== 'REFERENCE' && liveAsset(marker.assetId));

  const fitPlan = () => {
    setZoom(1);
    requestAnimationFrame(() => {
      const wrap = planWrapRef.current;
      if (!wrap) return;
      wrap.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  };

  const activateMarker = (markerId: string) => {
    const marker = markers.find((item) => item.id === markerId);
    if (!marker || marker.state === 'REFERENCE') return;
    const asset = liveAsset(marker.assetId);
    if (asset && filters.has(asset.verificationStatus)) onAsset(asset);
  };

  return (
    <section className="reference-layout" aria-label="Building Layout">
      <header className="reference-layout-head">
        <div>
          <h2>{mapConfig?.drawingTitle ?? 'Building Layout'}</h2>
          <p>Interior layout merged with asset graph</p>
        </div>
        <div className="reference-layout-actions" aria-label="Map controls">
          <button type="button" onClick={() => setZoom((value) => clampZoom(value - 0.15))} aria-label="Zoom out">−</button>
          <output className="map-zoom-readout" aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button type="button" onClick={() => setZoom((value) => clampZoom(value + 0.15))} aria-label="Zoom in">+</button>
          <button type="button" onClick={fitPlan}>Fit to Screen</button>
          <button type="button" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </header>

      <div className="reference-drawing-sheet">
        <div className="reference-plan-wrap" ref={planWrapRef}>
          <svg className="reference-plan" style={{ width: `${zoom * 100}%` }} viewBox="0 0 1210 525" role="img" aria-label={`${facility.name} detailed interior facility plan`}>
            <rect className="sheet-bg" x="0" y="0" width="1210" height="525" />
            <g className="zone-fills" aria-hidden="true">
              <path className="production-fill" d="M300 18H704V286H300V245H286V208H300Z" />
              <rect className="cold-fill" x="704" y="75" width="141" height="211" />
              <path className="cold-fill" d="M950 18H1083V286H950Z" />
              <path className="cold-fill" d="M1098 18H1184V286H1200V331H1098Z" />
              <path className="office-fill" d="M846 315H963V500H846Z" />
            </g>
            <g className="walls" aria-hidden="true">
              <path className="outer" d="M24 18H300V18H704V18H950V18H1083V18H1184V18H1184V286H1200V331H1110V315H1040V286H950V315H846V500H704V500H596V500H372V500H300V493H24V286H286V245H300V18Z" />
              <path d="M24 286H300M300 18V245M300 245H704M704 18V286M845 18V286M950 18V286M1083 18V286M1098 18V331" />
              <path d="M704 75H845M704 145H845M704 215H845" />
              <path d="M396 18V74M504 18V74M396 74H704" />
              <path d="M381 112H593V194H381M407 112V194M450 112V194M493 112V194M536 112V194" />
              <path d="M300 208H704M318 208V245M350 208V245M385 208V245M421 208V245M454 208V245M488 208V245M524 208V245M559 208V245M595 208V245M630 208V245M667 208V245" />
              <path d="M300 286H704M300 315H596M596 315V500M372 315V500M372 315H596" />
              <path d="M300 315V405M300 438V493M300 405H348L372 428" />
              <path d="M315 330H350V376H315ZM360 330H400V350H360ZM410 330H450V350H410ZM470 330H530V352H470" />
              <path d="M704 315H846M704 315V500M704 500H846" />
              <path d="M846 315H963M963 315V500M846 500H963" />
              <path d="M865 325H948M865 356H948M865 387H948M865 418H948M865 449H948M882 315V483M912 315V483M938 315V483" />
              <path d="M963 315H1110M963 331H1110M1040 286V331M1110 286V331M1000 300V331M1025 300V331M1060 300V331" />
              <path d="M92 190H150M92 190V245M150 190V245" />
            </g>
            <g className="doors" aria-hidden="true">
              <path d="M286 246h28M288 286h30M330 286h28M668 286h34M833 286h24M940 286h24M1030 286h26M1090 286h30" />
              <path d="M291 315h25M585 315h24M695 315h22M837 315h25" />
              <path d="M280 18h25M370 18h22M492 18h22M604 18h22M680 18h22M834 18h22M920 18h22M1068 18h22M1160 18h22" />
            </g>
            <g className="labels">
              <text x="112" y="109">Warehouse B</text><text x="400" y="63">Maintenance</text><text x="515" y="63">Engine Room</text>
              <text x="397" y="104">Building C (Production)</text><text x="448" y="155">Cook Rooms</text>
              <text x="744" y="116">Cooler 2</text><text x="744" y="184">Cooler 3</text><text x="744" y="253">Cooler 4</text>
              <text x="865" y="123">Warehouse 5</text><text x="988" y="123">Freezer 7</text><text x="1116" y="123">Freezer 8</text>
              <text x="108" y="374">Warehouse A</text><text x="420" y="400">Warehouse F</text><text x="739" y="400">Warehouse E</text><text x="858" y="514">Main Offices</text>
            </g>
            <g className="click-zones">
              {warehouseA && <path d="M24 286H300V493H24Z" onClick={() => clickArea(warehouseA)} data-selected={selectedArea?.id === warehouseA.id || undefined} />}
              {warehouseF && <path d="M372 315H596V500H372Z" onClick={() => clickArea(warehouseF)} data-selected={selectedArea?.id === warehouseF.id || undefined} />}
              {freezers && <path d="M950 18H1083V286H950ZM1098 18H1184V286H1200V331H1098Z" onClick={() => clickArea(freezers)} data-selected={selectedArea?.id === freezers.id || undefined} />}
            </g>
            {markers.map((marker) => {
              const asset = liveAsset(marker.assetId);
              const visibleLive = Boolean(asset && filters.has(asset.verificationStatus));
              const selected = Boolean(asset && selectedAsset?.id === asset.id);
              const clickable = marker.state !== 'REFERENCE' && visibleLive;
              const width = markerWidth(marker.id);
              return (
                <g
                  key={marker.id}
                  className={`reference-marker ${marker.tone} state-${marker.state.toLowerCase()} ${selected ? 'selected' : ''}`}
                  transform={`translate(${marker.x} ${marker.y})`}
                  onClick={clickable ? () => activateMarker(marker.id) : undefined}
                  onKeyDown={clickable ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      activateMarker(marker.id);
                    }
                  } : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={`${marker.id}: ${marker.label}. ${marker.state.replace('_', ' ').toLowerCase()}.`}
                >
                  <rect x={-width / 2} y={-13} width={width} height={26} rx="4" />
                  <text textAnchor="middle" y="4">{marker.id}</text>
                  <title>{marker.label} — {marker.state === 'REFERENCE' ? 'reference only, not linked to a verified asset record' : marker.state === 'FIELD_VERIFY' ? 'linked asset; physical position requires field verification' : 'live asset'}</title>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="reference-map-status" aria-live="polite">
          <span><b>{actionableMarkers.length}</b> graph-linked map tags</span>
          <span><b>{markers.length - actionableMarkers.length}</b> reference-only tags</span>
          <span>{selectedMarker ? `Selected: ${selectedMarker.id} · ${selectedMarker.label}` : selectedArea ? `Selected area: ${selectedArea.name}` : 'No map selection'}</span>
        </div>

        <div className="reference-info-strip">
          <section>
            <h3>Legend</h3>
            <div className="legend-grid">
              <span><i className="swatch outline cabinet" />Control Cabinet</span><span><i className="swatch outline machine" />Major Machine / Equipment</span>
              <span><i className="swatch wall" />Walls / Boundaries</span><span><i className="swatch door" />Door / Opening</span>
              <span><i className="truth-dot live" />Live record</span><span><i className="truth-dot verify" />Field verify</span><span><i className="truth-dot reference" />Reference only</span>
            </div>
          </section>
          <section>
            <h3>Control Cabinets</h3>
            {markers.filter((m) => m.tone !== 'machine').map((marker) => {
              const asset = liveAsset(marker.assetId);
              const actionable = marker.state !== 'REFERENCE' && Boolean(asset);
              return (
                <button className={`directory-row ${actionable ? 'actionable' : 'reference-only'}`} type="button" key={marker.id} disabled={!actionable} onClick={() => activateMarker(marker.id)}>
                  <b className={`tag ${marker.tone}`}>{marker.id}</b><span>{marker.label}<em>{marker.state === 'REFERENCE' ? 'REF' : marker.state === 'FIELD_VERIFY' ? 'VERIFY' : 'LIVE'}</em></span>
                </button>
              );
            })}
          </section>
          <section>
            <h3>Major Machines / Equipment</h3>
            {markers.filter((m) => m.tone === 'machine').map((marker) => {
              const asset = liveAsset(marker.assetId);
              const actionable = marker.state !== 'REFERENCE' && Boolean(asset);
              return (
                <button className={`directory-row ${actionable ? 'actionable' : 'reference-only'}`} type="button" key={marker.id} disabled={!actionable} onClick={() => activateMarker(marker.id)}>
                  <b className="tag machine">{marker.id}</b><span>{marker.label}<em>{marker.state === 'REFERENCE' ? 'REF' : marker.state === 'FIELD_VERIFY' ? 'VERIFY' : 'LIVE'}</em></span>
                </button>
              );
            })}
          </section>
          <section>
            <h3>Area Directory</h3>
            <div className="area-grid">
              <button type="button" disabled={!warehouseA} onClick={() => clickArea(warehouseA)}><b>Warehouse A</b><span>Raw Materials / Storage</span></button>
              <div><b>Warehouse B</b><span>Storage / Staging</span></div>
              <div><b>Building C</b><span>Main Production</span></div>
              <div><b>Coolers 2 / 3 / 4</b><span>Refrigerated Storage</span></div>
              <div><b>Warehouse 5</b><span>Dry Storage</span></div>
              <button type="button" disabled={!freezers} onClick={() => clickArea(freezers)}><b>Freezers 7 / 8</b><span>Frozen Storage</span></button>
              <div><b>Warehouse E</b><span>Packing / Storage</span></div>
              <button type="button" disabled={!warehouseF} onClick={() => clickArea(warehouseF)}><b>Warehouse F</b><span>Equipment / Storage</span></button>
              <div><b>Main Offices</b><span>Administration / Support</span></div>
            </div>
          </section>
          <section className="notes-column"><h3>Map confidence</h3><ul><li>Reference-only tags reproduce drawing context but are not asset records.</li><li>Field-verify tags are linked to the graph, but their physical location is not yet verified.</li><li>Fire alarm assembly and ammonia shelter-in-place callouts are intentionally omitted.</li></ul></section>
        </div>
        <footer className="reference-title-block">
          <div className="north-arrow" aria-label="North arrow"><b>N</b><span>▲</span></div>
          <div><b>FACILITY:</b><span>{facility.name}</span><b>LOCATION:</b><span>{facility.location}</span><b>DATE:</b><span>{mapConfig?.drawingDate ?? '—'}</span><b>DRAWN BY:</b><span>Industrial Asset Graph</span></div>
        </footer>
      </div>
    </section>
  );
}
