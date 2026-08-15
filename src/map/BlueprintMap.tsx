import { areas, machines } from '../facilityData';
import { markerClass } from '../lib/statusMark';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import { schematicFor, unmappedSchematic } from './layout';

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
    <div className="blueprint-root" data-testid="map-stage" role="group" aria-label="Interactive J. Lieb facility layout">
      <div className="blueprint-grid" />
      <div
        className="blueprint-area unmapped"
        style={{ left: `${unmappedSchematic.x}%`, top: `${unmappedSchematic.y}%`, width: `${unmappedSchematic.width}%`, height: `${unmappedSchematic.height}%` }}
        aria-hidden="true"
      >
        <span className="blueprint-label">Unmapped</span>
      </div>
      {areas.map((area) => {
        const rect = schematicFor(area.id);
        const dimmed = Boolean(selectedArea && selectedArea.id !== area.id);
        return (
          <button
            key={area.id}
            type="button"
            className={`blueprint-area ${selectedArea?.id === area.id ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
            style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
            aria-label={`${area.name}, ${area.status}, ${area.assetIds.length} assets`}
            onClick={() => onArea(area)}
          >
            <span className="blueprint-label">{area.shortName}</span>
            <i className={`${markerClass(area.status)} pop`} aria-hidden="true" />
            {area.assetIds.length > 0 && (
              <span className="area-tray">
                {area.assetIds.map((id) => {
                  const asset = machines.find((item) => item.id === id);
                  if (!asset) return null;
                  const hidden = !filters.has(asset.verificationStatus);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`machine-chip pop ${selectedAsset?.id === id ? 'selected' : ''} ${hidden ? 'is-dimmed' : ''}`}
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
          </button>
        );
      })}
      <span className="blueprint-disclaimer">Schematic layout · markers are area-level · exact positions require field verification</span>
    </div>
  );
}
