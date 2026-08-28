import type { FacilityPackage } from './types';
import { loadFacilityPackage } from './schema';

/** The application-facing registry. Facility packs are replaceable providers. */
export type FacilityPackLoader = () => FacilityPackage;
export type FacilityPackRegistration = { facilityId: string; load: FacilityPackLoader };

export function createFacilityRegistry(entries: Record<string, FacilityPackRegistration>, defaultId: string) {
  const registry = new Map(Object.entries(entries));
  if (!registry.has(defaultId)) throw new Error(`Default facility pack is not registered: ${defaultId}`);

  return {
    register(id: string, registration: FacilityPackRegistration) {
      if (!id.trim()) throw new Error('Facility pack id is required.');
      registry.set(id, registration);
    },
    load(id: string | undefined): FacilityPackage {
      const key = id === undefined || id.trim() === '' ? defaultId : id;
      const registration = registry.get(key);
      if (!registration) throw new Error(`Unknown facility pack: ${key}. Registered facilities: ${[...registry.keys()].join(', ')}`);
      const pkg = loadFacilityPackage(registration.load());
      if (pkg.facility.id !== registration.facilityId) throw new Error(`Facility pack ${key} identity mismatch: expected ${registration.facilityId}, received ${pkg.facility.id}`);
      return structuredClone(pkg);
    },
    ids() { return [...registry.keys()]; },
  };
}
