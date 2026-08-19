import { areas, machines } from '../facilityData';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import './detailedBuildingLayout.css';

type Props = {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
};

type Marker = { id: string; label: string; x: number; y: number; tone: 'cabinet' | 'machine' | 'power' };

const markerLayout: Marker[] = [
  { id: 'CAB-001', label: 'Warehouse B Panel', x: 153, y: 166, tone: 'cabinet' },
  { id: 'MCH-001', label: 'Production Line 1', x: 394, y: 140, tone: 'machine' },
  { id: 'MCH-002', label: 'Production Line 2', x: 510, y: 140, tone: 'machine' },
  { id: 'CAB-002A', label: 'Building C · Left Panel', x: 359, y: 177, tone: 'cabinet' },
  { id: 'CAB-002B', label: 'Building C · Right Panel', x: 637, y: 177, tone: 'cabinet' },
  { id: 'CAB-003', label: 'Cooler 2 Panel', x: 759, y: 152, tone: 'cabinet' },
  { id: 'CAB-004', label: 'Warehouse 5 Panel', x: 878, y: 190, tone: 'cabinet' },
  { id: 'CAB-005', label: 'Freezer 7 Panel', x: 1002, y: 190, tone: 'cabinet' },
  { id: 'CAB-006', label: 'Freezer 8 Panel', x: 1122, y: 190, tone: 'cabinet' },
  { id: 'CAB-007', label: 'Warehouse A Panel', x: 154, y: 424, tone: 'cabinet' },
  { id: 'MCH-003', label: 'Warehouse F Primary Equipment', x: 448, y: 438, tone: 'machine' },
  { id: 'CAB-009', label: 'Warehouse E Panel', x: 754, y: 438, tone: 'cabinet' },
  { id: 'CAB-010', label: 'Main Power / Office Panel', x: 832, y: 470, tone: 'power' },
];

const areaByName = (name: string) => areas.find((area) => area.name === name) ?? null;

function liveAssetFor(marker: Marker) {
  if (marker.id === 'MCH-003') return machines.find((asset) => asset.id === 'FG-L4-MTN-001') ?? null;
  if (marker.id === 'CAB-010') return machines.find((asset) => asset.id === 'L2-CC-001') ?? null;
  return null;
}

function markerWidth(id: string) {
  return id.length > 7 ? 66 : 58;
}

export default function DetailedBuildingLayout({ selectedArea, selectedAsset, filters, onArea, onAsset }: Props) {
  const warehouseA = areaByName('Warehouse A');
  const warehouseF = areaByName('Warehouse F');
  const freezers = areaByName('Freezers');

  const handleArea = (area: FacilityArea | null) => {
    if (area) onArea(area);
  };

  return (
    <section className="reference-layout" aria-label="Building Layout">
      <header className="reference-layout-head">
        <div>
          <h2>Building Layout</h2>
          <p>Interior layout merged with asset graph</p>
        </div>
        <div className="reference-layout-actions">
          <button type="button" onClick={() => window.dispatchEvent(new Event('resize'))}>Fit to Screen</button>
          <button type="button" onClick={() => window.print()}>Print / PDF</button>
          <button type="button" className="primary">Edit Map</button>
        </div>
      </header>

      <div className="reference-drawing-sheet">
        <div className="reference-plan-wrap">
          <svg className="reference-plan" viewBox="0 0 1210 525" role="img" aria-label="J. Lieb Foods detailed interior facility plan">
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
              <path d="M963 315H1110M963 331H1110M1040 286V331M1110 286V331" />
              <path d="M1000 300V331M1025 300V331M1060 300V331" />
              <path d="M92 190H150M92 190V245M150 190V245" />
            </g>

            <g className="doors" aria-hidden="true">
              <path d="M286 246h28M288 286h30M330 286h28M668 286h34M833 286h24M940 286h24M1030 286h26M1090 286h30" />
              <path d="M291 315h25M585 315h24M695 315h22M837 315h25" />
              <path d="M280 18h25M370 18h22M492 18h22M604 18h22M680 18h22M834 18h22M920 18h22M1068 18h22M1160 18h22" />
            </g>

            <g className="labels">
              <text x="112" y="109">Warehouse B</text>
              <text x="400" y="63">Maintenance</text>
              <text x="515" y="63">Engine Room</text>
              <text x="397" y="104">Building C (Production)</text>
              <text x="448" y="155">Cook Rooms</text>
              <text x="744" y="116">Cooler 2</text>
              <text x="744" y="184">Cooler 3</text>
              <text x="744" y="253">Cooler 4</text>
              <text x="865" y="123">Warehouse 5</text>
              <text x="988" y="123">Freezer 7</text>
              <text x="1116" y="123">Freezer 8</text>
              <text x="108" y="374">Warehouse A</text>
              <text x="420" y="400">Warehouse F</text>
              <text x="739" y="400">Warehouse E</text>
              <text x="858" y="514">Main Offices</text>
            </g>

            <g className="click-zones">
              <path d="M24 286H300V493H24Z" onClick={() => handleArea(warehouseA)} data-selected={selectedArea?.id === warehouseA?.id || undefined} />
              <path d="M372 315H596V500H372Z" onClick={() => handleArea(warehouseF)} data-selected={selectedArea?.id === warehouseF?.id || undefined} />
              <path d="M950 18H1083V286H950ZM1098 18H1184V286H1200V331H1098Z" onClick={() => handleArea(freezers)} data-selected={selectedArea?.id === freezers?.id || undefined} />
            </g>

            {markerLayout.map((marker) => {
              const live = liveAssetFor(marker);
              const isLive = Boolean(live && filters.has(live.verificationStatus));
              const selected = Boolean(live && selectedAsset?.id === live.id);
              const width = markerWidth(marker.id);
              return (
                <g
                  key={marker.id}
                  className={`reference-marker ${marker.tone} ${isLive ? 'live' : 'reference'} ${selected ? 'selected' : ''}`}
                  transform={`translate(${marker.x} ${marker.y})`}
                  onClick={live && isLive ? () => onAsset(live) : undefined}
                  role={live && isLive ? 'button' : undefined}
                  tabIndex={live && isLive ? 0 : undefined}
                  aria-label={live ? `${live.name} (${marker.id})` : `${marker.id}, ${marker.label}`}
                >
                  <rect x={-width / 2} y={-13} width={width} height={26} rx="4" />
                  <text textAnchor="middle" y="4">{marker.id}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="reference-info-strip">
          <section>
            <h3>Legend</h3>
            <div className="legend-grid">
              <span><i className="swatch outline cabinet" />Control Cabinet</span>
              <span><i className="swatch fill production" />Production Area</span>
              <span><i className="swatch outline machine" />Major Machine / Equipment</span>
              <span><i className="swatch fill cold" />Cooler / Freezer</span>
              <span><i className="swatch power">⚡</i>Electrical / Main Power</span>
              <span><i className="swatch fill storage" />Warehouse / Storage</span>
              <span><i className="swatch wall" />Walls / Boundaries</span>
              <span><i className="swatch fill office" />Offices / Support</span>
              <span><i className="swatch door" />Door / Opening</span>
            </div>
          </section>

          <section>
            <h3>Control Cabinets</h3>
            {markerLayout.filter((m) => m.tone !== 'machine').map((marker) => (
              <div className="directory-row" key={marker.id}><b className={`tag ${marker.tone}`}>{marker.id}</b><span>{marker.label}</span></div>
            ))}
          </section>

          <section>
            <h3>Major Machines / Equipment</h3>
            {markerLayout.filter((m) => m.tone === 'machine').map((marker) => (
              <div className="directory-row" key={marker.id}><b className="tag machine">{marker.id}</b><span>{marker.label}</span></div>
            ))}
          </section>

          <section>
            <h3>Area Directory</h3>
            <div className="area-grid">
              <b>Warehouse A</b><span>Raw Materials / Storage</span>
              <b>Warehouse B</b><span>Storage / Staging</span>
              <b>Building C (Production)</b><span>Main Production</span>
              <b>Cook Rooms</b><span>Food Preparation</span>
              <b>Cooler 2 / 3 / 4</b><span>Refrigerated Storage</span>
              <b>Warehouse 5</b><span>Dry Storage</span>
              <b>Freezer 7 / Freezer 8</b><span>Frozen Storage</span>
              <b>Warehouse E</b><span>Packing / Storage</span>
              <b>Warehouse F</b><span>Equipment / Storage</span>
              <b>Main Offices</b><span>Administration / Support</span>
            </div>
          </section>

          <section className="notes-column">
            <h3>Notes</h3>
            <ul>
              <li>This map merges the interior layout with the asset graph.</li>
              <li>Existing boundaries, labeling, and room names are retained.</li>
              <li>Fire alarm assembly and ammonia shelter-in-place callouts are intentionally omitted.</li>
              <li>Live asset positions remain subject to field verification.</li>
            </ul>
          </section>
        </div>

        <footer className="reference-title-block">
          <div className="north-arrow" aria-label="North arrow"><b>N</b><span>▲</span></div>
          <div><b>FACILITY:</b><span>J. LIEB FOODS</span><b>LOCATION:</b><span>Forest Grove, Oregon</span><b>DATE:</b><span>08/19/2026</span><b>DRAWN BY:</b><span>Industrial Asset Graph</span></div>
        </footer>
      </div>
    </section>
  );
}
