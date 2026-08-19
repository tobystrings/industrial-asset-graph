import { useState } from 'react';
import { areas, machines } from '../facilityData';
import { markerClass } from '../lib/statusMark';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';

const floorPlanCrop = { x: 6, y: 10, width: 90, height: 78 } as const;

function floorPlanRect(rect: FacilityArea['overlay']) {
  return {
    left: `${((rect.x - floorPlanCrop.x) / floorPlanCrop.width) * 100}%`,
    top: `${((rect.y - floorPlanCrop.y) / floorPlanCrop.height) * 100}%`,
    width: `${(rect.width / floorPlanCrop.width) * 100}%`,
    height: `${(rect.height / floorPlanCrop.height) * 100}%`,
  };
}

export default function BlueprintMap({
  selectedArea,
  selectedAsset,
  filters,
  onArea,
  onAsset,
}: {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
}) {
  const [legendOpen, setLegendOpen] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  return (
    <div className="floor-plan-viewer">
      <div className="image-viewer-tools map-image-tools">
        <button type="button" onClick={() => setFitVersion((value) => value + 1)} aria-label="Fit floor plan to view">Fit</button>
        <button type="button" aria-expanded={legendOpen} aria-controls="floor-plan-legend" onClick={() => setLegendOpen((open) => !open)}>
          Legend {legendOpen ? '−' : '+'}
        </button>
      </div>
      <div key={fitVersion} className="blueprint-root floor-plan-root" data-testid="map-stage" role="group" aria-label="Interactive J. Lieb facility floor plan">
        <img className="floor-plan-image" src="/industrial-asset-graph/assets/facility-floor-plan.png" alt="J. Lieb facility floor plan" draggable={false} />
      {areas.map((area) => {
        const symbol = areas.indexOf(area) + 1;
        const rect = area.overlay;
        const dimmed = Boolean(selectedArea && selectedArea.id !== area.id);
        return (
          <div
            key={area.id}
            role="button"
            tabIndex={0}
            data-area={area.id}
            className={`floor-plan-area ${selectedArea?.id === area.id ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
            style={floorPlanRect(rect)}
            aria-label={`${area.name}, ${area.status}, ${area.assetIds.length} assets`}
            onClick={() => onArea(area)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onArea(area);
              }
            }}
          >
            <span className="floor-plan-label" aria-hidden="true">
              <i className={markerClass(area.status)} aria-hidden="true" />
              <b>{symbol}</b>
            </span>
            {area.assetIds.length > 0 && (
              <span className="floor-plan-assets">
                {area.assetIds.map((id) => {
                  const asset = machines.find((item) => item.id === id);
                  if (!asset) return null;
                  const hidden = !filters.has(asset.verificationStatus);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`machine-chip ${selectedAsset?.id === id ? 'selected' : ''} ${hidden ? 'is-dimmed' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAsset(asset);
                      }}
                    >
                      <i className={markerClass(asset.verificationStatus)} aria-hidden="true" />
                      <b aria-hidden="true">{asset.type === 'Control Cabinet' ? '▣' : '◆'}</b>
                      <span className="sr-only">{asset.id}</span>
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        );
      })}
      <span className="blueprint-disclaimer">Reference floor plan · labels are area-level · exact asset positions require field verification</span>
      </div>
      <aside id="floor-plan-legend" className={`floor-plan-legend ${legendOpen ? 'is-open' : ''}`} aria-hidden={!legendOpen}>
        <div className="floor-plan-legend-head"><b>Map symbols</b><button type="button" onClick={() => setLegendOpen(false)} aria-label="Close map legend">×</button></div>
        <div className="floor-plan-legend-status">
          <span><i className={markerClass('COMPLETE')} />Complete</span>
          <span><i className={markerClass('IN_PROGRESS')} />In progress</span>
          <span><i className={markerClass('NOT_STARTED')} />Not started</span>
        </div>
        <ol>
          {areas.map((area, index) => <li key={area.id}><button type="button" onClick={() => { onArea(area); setLegendOpen(false); }}><b>{index + 1}</b><span>{area.name}<small>{area.assetIds.length} documented {area.assetIds.length === 1 ? 'asset' : 'assets'}</small></span></button></li>)}
        </ol>
        <div className="floor-plan-legend-equipment"><span><b>◆</b> Machine</span><span><b>▣</b> Control cabinet</span></div>
      </aside>
    </div>
  );
}
