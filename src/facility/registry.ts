import { demoFacilityPackage } from '../../facilities/demo-plant';
import { buildLiebFoodsPackage } from '../../facilities/lieb-foods';
import type { FacilityPackage } from './types';

/** The application-facing registry. Facility packs are replaceable providers. */
export type FacilityPackLoader = () => FacilityPackage;

const registry = new Map<string, FacilityPackLoader>([
  ['lieb-foods', buildLiebFoodsPackage],
  ['demo-plant', () => demoFacilityPackage],
]);

export function registerFacilityPack(id: string, loader: FacilityPackLoader) {
  if (!id.trim()) throw new Error('Facility pack id is required.');
  registry.set(id, loader);
}

export function loadFacilityPack(id: string | undefined): FacilityPackage {
  const key = id && registry.has(id) ? id : 'lieb-foods';
  const loader = registry.get(key)!;
  return structuredClone(loader());
}

export function registeredFacilityIds() { return [...registry.keys()]; }
