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
  return (
    <div className="blueprint-root floor-plan-root" data-testid="map-stage" role="group" aria-label="Interactive J. Lieb facility floor plan">
      <img className="floor-plan-image" src="/industrial-asset-graph/assets/facility-floor-plan.png" alt="" aria-hidden="true" />
      {areas.map((area) => {
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
            <span className="floor-plan-label">
              <i className={markerClass(area.status)} aria-hidden="true" />
              <b>{area.shortName}</b>
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
                      <b>{asset.id}</b>
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
  );
}
