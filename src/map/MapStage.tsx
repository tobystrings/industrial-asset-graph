import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import DetailedBuildingLayout from './DetailedBuildingLayout';

export type MapMode = '2d';

export function mapModeFromQuery(search: string): MapMode {
  void search;
  return '2d';
}

export default function MapStage({
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
    <div className="map-stage detailed-map-stage">
      <div className="map-viewport detailed-map-viewport" data-mode="2d">
        <DetailedBuildingLayout selectedArea={selectedArea} selectedAsset={selectedAsset} filters={filters} onArea={onArea} onAsset={onAsset} />
      </div>
    </div>
  );
}
