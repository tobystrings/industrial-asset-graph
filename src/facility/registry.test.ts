import { describe, expect, it } from 'vitest';
import { loadFacilityPack, registerFacilityPack } from './registry';

describe('facility pack registry', () => {
  it('loads J. Lieb through the generic loader', () => expect(loadFacilityPack('lieb-foods').facility.id).toBe('facility-j-lieb'));
  it('isolates a registered second pack without changing core code', () => {
    registerFacilityPack('synthetic-second-site', () => ({ ...loadFacilityPack('demo-plant'), facility: { ...loadFacilityPack('demo-plant').facility, id: 'facility-second-site' } }));
    const second = loadFacilityPack('synthetic-second-site');
    expect(second.facility.id).toBe('facility-second-site');
    expect(loadFacilityPack('lieb-foods').facility.id).toBe('facility-j-lieb');
  });
});
