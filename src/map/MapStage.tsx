import { lazy, Suspense, useEffect, useState } from 'react';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import BlueprintMap from './BlueprintMap';

const FacilityMap3D = lazy(() => import('./FacilityMap3D'));

export type MapMode = '2d' | '3d';

export function mapModeFromQuery(search: string): MapMode {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('map') === '2d' ? '2d' : '3d';
}

function readMode(): MapMode {
  return mapModeFromQuery(location.search);
}

export default function MapStage({
  selectedArea,
  selectedAsset,
  filters,
  onArea,
  onAsset,
  mode,
  onMode,
}: {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
  mode?: MapMode;
  onMode?: (mode: MapMode) => void;
}) {
  const [internal, setInternal] = useState<MapMode>(readMode);
  const current = mode ?? internal;
  const setMode = (next: MapMode) => {
    onMode?.(next);
    setInternal(next);
  };
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (current === '2d') params.set('map', '2d');
    else params.set('map', '3d');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  }, [current]);

  return (
    <div className="map-stage">
      <div key={current} className="map-viewport" data-mode={current}>
        {current === '2d' ? (
          <BlueprintMap selectedArea={selectedArea} selectedAsset={selectedAsset} filters={filters} onArea={onArea} onAsset={onAsset} />
        ) : (
          <Suspense fallback={<div className="map3d-loading">Loading 3D facility…</div>}>
            <FacilityMap3D selectedArea={selectedArea} selectedAsset={selectedAsset} filters={filters} onArea={onArea} onAsset={onAsset} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
