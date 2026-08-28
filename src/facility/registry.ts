import type { FacilityPackage } from './types';

/** The application-facing registry. Facility packs are replaceable providers. */
export type FacilityPackLoader = () => FacilityPackage;

export function createFacilityRegistry(entries: Record<string, FacilityPackLoader>, defaultId: string) {
  const registry = new Map(Object.entries(entries));
  if (!registry.has(defaultId)) throw new Error(`Default facility pack is not registered: ${defaultId}`);

  return {
    register(id: string, loader: FacilityPackLoader) {
      if (!id.trim()) throw new Error('Facility pack id is required.');
      registry.set(id, loader);
    },
    load(id: string | undefined): FacilityPackage {
      const key = id === undefined || id.trim() === '' ? defaultId : id;
      const loader = registry.get(key);
      if (!loader) throw new Error(`Unknown facility pack: ${key}. Registered facilities: ${[...registry.keys()].join(', ')}`);
      return structuredClone(loader());
    },
    ids() { return [...registry.keys()]; },
  };
}
