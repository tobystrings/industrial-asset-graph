import { useMemo } from 'react';
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

const areaByName = (name: string) => areas.find((area) => area.name === name) ?? null;

function assetTone(asset: FacilityAsset) {
  return asset.type === 'Control Cabinet' ? 'cabinet' : 'machine';
}

export default function DetailedBuildingLayout({ selectedArea, selectedAsset, filters, onArea, onAsset }: Props) {
  const warehouseA = useMemo(() => areaByName('Warehouse A'), []);
  const warehouseF = useMemo(() => areaByName('Warehouse F'), []);
  const freezers = useMemo(() => areaByName('Freezers'), []);

  const machine = machines.find((item) => item.id === 'FG-L4-MTN-001') ?? machines.find((item) => item.type !== 'Control Cabinet') ?? null;
  const cabinet = machines.find((item) => item.id === 'L2-CC-001') ?? machines.find((item) => item.type === 'Control Cabinet') ?? null;

  const clickArea = (area: FacilityArea | null) => area && onArea(area);

  return (
    <section className="detailed-layout" aria-label="Detailed building layout">
      <div className="detailed-layout-head">
        <div>
          <h2>Building Layout</h2>
          <p>Interior layout merged with asset graph</p>
        </div>
        <div className="detailed-layout-actions">
          <button type="button" onClick={() => window.dispatchEvent(new Event('resize'))}>Fit to Screen</button>
          <button type="button" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      <div className="detailed-layout-sheet">
        <div className="detailed-map-frame">
          <svg className="detailed-map-svg" viewBox="0 0 1200 540" role="img" aria-label="J. Lieb Foods interior facility layout">
            <rect x="18" y="18" width="1164" height="504" rx="4" fill="#fff" />

            <g className="plan-zone warehouse-b">
              <path d="M50 40 H350 V270 H50 Z" />
              <text x="170" y="145">Warehouse B</text>
            </g>

            <g className="plan-zone production">
              <path d="M350 40 H760 V270 H350 Z" />
              <text x="470" y="86">Building C (Production)</text>
              <rect x="372" y="40" width="120" height="58" className="subroom" />
              <text x="400" y="73" className="small-label">Maintenance</text>
              <rect x="492" y="40" width="112" height="58" className="subroom" />
              <text x="516" y="73" className="small-label">Engine Room</text>
              <rect x="430" y="118" width="200" height="76" className="subroom dashed-room" />
              <text x="485" y="158" className="small-label">Cook Rooms</text>
              <path d="M350 215 H760" className="interior-line" />
              <path d="M392 215 V270 M438 215 V270 M474 215 V270 M514 215 V270 M558 215 V270 M602 215 V270 M644 215 V270 M690 215 V270" className="interior-line thin" />
            </g>

            <g className="plan-zone coolers">
              <rect x="760" y="96" width="132" height="58" />
              <rect x="760" y="154" width="132" height="58" />
              <rect x="760" y="212" width="132" height="58" />
              <text x="806" y="130">Cooler 2</text>
              <text x="806" y="188">Cooler 3</text>
              <text x="806" y="246">Cooler 4</text>
            </g>

            <g className="plan-zone warehouse-5">
              <path d="M892 40 H995 V270 H892 Z" />
              <text x="914" y="152">Warehouse 5</text>
            </g>

            <g className="plan-zone freezer" onClick={() => clickArea(freezers)} data-selected={selectedArea?.id === freezers?.id || undefined}>
              <path d="M995 40 H1090 V270 H995 Z" />
              <text x="1018" y="152">Freezer 7</text>
              <path d="M1090 40 H1170 V270 H1170 V305 H1090 Z" />
              <text x="1103" y="152">Freezer 8</text>
            </g>

            <g className="plan-zone warehouse-a" onClick={() => clickArea(warehouseA)} data-selected={selectedArea?.id === warehouseA?.id || undefined}>
              <path d="M50 270 H350 V500 H50 Z" />
              <text x="165" y="390">Warehouse A</text>
            </g>

            <g className="plan-zone warehouse-f" onClick={() => clickArea(warehouseF)} data-selected={selectedArea?.id === warehouseF?.id || undefined}>
              <path d="M350 300 H680 V500 H350 Z" />
              <text x="475" y="390">Warehouse F</text>
              <path d="M350 300 H680 M395 300 V348 M440 300 V345 M505 300 V332 M565 300 V346 M620 300 V344" className="interior-line thin" />
              <rect x="392" y="315" width="48" height="18" className="equipment-outline" />
              <rect x="452" y="315" width="48" height="18" className="equipment-outline" />
            </g>

            <g className="plan-zone warehouse-e">
              <path d="M680 300 H910 V500 H680 Z" />
              <text x="748" y="397">Warehouse E</text>
            </g>

            <g className="plan-zone offices">
              <path d="M910 300 H1085 V500 H910 Z" />
              <text x="972" y="506" className="small-label">Main Offices</text>
              <path d="M930 320 H1060 M930 352 H1060 M930 384 H1060 M930 416 H1060 M930 448 H1060 M968 300 V475 M1006 300 V475 M1042 300 V475" className="interior-line thin" />
            </g>

            <g className="doors" aria-hidden="true">
              <path d="M330 270 h40 M748 270 h30 M884 270 h30 M985 270 h30 M1080 270 h30" />
              <path d="M330 300 h40 M670 300 h30 M900 300 h30" />
            </g>

            {machine && filters.has(machine.verificationStatus) && (
              <g className={`asset-pin ${assetTone(machine)} ${selectedAsset?.id === machine.id ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); onAsset(machine); }} role="button" tabIndex={0}>
                <rect x="505" y="405" width="116" height="30" rx="5" />
                <text x="563" y="425" textAnchor="middle">{machine.id}</text>
              </g>
            )}

            {cabinet && filters.has(cabinet.verificationStatus) && (
              <g className={`asset-pin ${assetTone(cabinet)} ${selectedAsset?.id === cabinet.id ? 'selected' : ''}`} onClick={(event) => { event.stopPropagation(); onAsset(cabinet); }} role="button" tabIndex={0}>
                <rect x="395" y="405" width="96" height="30" rx="5" />
                <text x="443" y="425" textAnchor="middle">{cabinet.id}</text>
              </g>
            )}
          </svg>
        </div>

        <div className="detailed-map-info">
          <div>
            <h3>Legend</h3>
            <span><i className="legend-box cabinet" />Control Cabinet</span>
            <span><i className="legend-box machine" />Major Machine / Equipment</span>
            <span><i className="legend-line" />Walls / Boundaries</span>
            <span><i className="legend-door" />Door / Opening</span>
          </div>
          <div>
            <h3>Tracked assets</h3>
            {machines.map((asset) => (
              <button key={asset.id} type="button" className={`map-info-asset ${assetTone(asset)}`} onClick={() => onAsset(asset)}>
                <b>{asset.id}</b><span>{asset.name}</span>
              </button>
            ))}
          </div>
          <div>
            <h3>Area directory</h3>
            <span><b>Warehouse A</b> — Raw materials / storage</span>
            <span><b>Warehouse B</b> — Storage / staging</span>
            <span><b>Building C</b> — Production</span>
            <span><b>Coolers 2 / 3 / 4</b> — Refrigerated storage</span>
            <span><b>Warehouse 5</b> — Dry storage</span>
            <span><b>Freezers 7 / 8</b> — Frozen storage</span>
            <span><b>Warehouse E</b> — Packing / storage</span>
            <span><b>Warehouse F</b> — Equipment / storage</span>
            <span><b>Main Offices</b> — Administration / support</span>
          </div>
          <div>
            <h3>Notes</h3>
            <p>Interior boundaries and labels are based on the posted facility layout.</p>
            <p>Fire-alarm assembly and ammonia shelter-in-place callouts are intentionally omitted.</p>
            <p>Asset positions remain field-verification items until physically confirmed.</p>
          </div>
        </div>

        <footer className="detailed-map-footer">
          <strong>J. LIEB FOODS</strong>
          <span>Forest Grove, Oregon</span>
          <span>Industrial Asset Graph</span>
        </footer>
      </div>
    </section>
  );
}
