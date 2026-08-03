import { BuildingFootprint } from './osm';

export interface OnlineBuildingModel {
  footprint: BuildingFootprint;
  centroid: [number, number];
  groundElevationMeters: number | null;
  heightMeters: number;
  heightConfidence: 'source-confirmed' | 'estimated';
  generatedAt: string;
}

function centroid(geometry: [number, number][]): [number, number] {
  const total = geometry.reduce(([lat, lon], point) => [lat + point[0], lon + point[1]], [0, 0]);
  return [total[0] / geometry.length, total[1] / geometry.length];
}

async function loadGroundElevation([latitude, longitude]: [number, number]): Promise<number | null> {
  const params = new URLSearchParams({ x: String(longitude), y: String(latitude), units: 'Meters', wkid: '4326', includeDate: 'false' });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://epqs.nationalmap.gov/v1/json?${params}`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json() as { value?: number };
    return Number.isFinite(data.value) ? Number(data.value) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function reconstructOnlineBuilding(footprint: BuildingFootprint): Promise<OnlineBuildingModel> {
  const center = centroid(footprint.geometry);
  return {
    footprint,
    centroid: center,
    groundElevationMeters: await loadGroundElevation(center),
    heightMeters: footprint.heightMeters,
    heightConfidence: footprint.approximateHeight ? 'estimated' : 'source-confirmed',
    generatedAt: new Date().toISOString(),
  };
}
