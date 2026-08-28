import { describe, expect, it } from 'vitest';
import { facilityRegistry } from '../../facilities/registry';
import { loadFacilityPackage } from './schema';
import { requestedFacilityId } from './activeFacility';
import { createFacilityRegistry } from './registry';

describe('facility pack registry', () => {
  it('loads J. Lieb through the composed registry', () => expect(facilityRegistry.load('lieb-foods').facility.id).toBe('facility-j-lieb'));
  it('defaults only when selection is unset', () => expect(facilityRegistry.load(undefined).facility.id).toBe('facility-j-lieb'));
  it('rejects an explicitly invalid facility id', () => expect(() => facilityRegistry.load('missing-facility')).toThrow(/Unknown facility pack/));
  it('isolates a selectable synthetic facility', () => {
    const second = loadFacilityPackage(facilityRegistry.load('test-facility'));
    expect(second.facility.id).toBe('facility-synthetic-test');
    expect(second.assets.map((asset) => asset.id)).toEqual(['SYNTH-ASSET-001']);
    expect(JSON.stringify(second)).not.toContain('L2-CC');
    expect(JSON.stringify(second)).not.toContain('FG-L4');
    expect(JSON.stringify(facilityRegistry.load('lieb-foods'))).not.toContain('SYNTH-ASSET-001');
  });
  it('validates registered facility packages at the schema boundary', () => {
    expect(loadFacilityPackage(facilityRegistry.load('lieb-foods')).facility.id).toBe('facility-j-lieb');
    expect(loadFacilityPackage(facilityRegistry.load('test-facility')).facility.id).toBe('facility-synthetic-test');
  });
  it('resolves URL selection ahead of the deployment default', () => {
    expect(requestedFacilityId('?facilityId=test-facility', 'lieb-foods')).toBe('test-facility');
    expect(requestedFacilityId('', 'lieb-foods')).toBe('lieb-foods');
    expect(requestedFacilityId('', undefined)).toBeUndefined();
  });
  it('rejects a package whose canonical facility identity mismatches its registration', () => {
    const registry = createFacilityRegistry({ bad: { facilityId: 'expected-id', load: () => facilityRegistry.load('test-facility') } }, 'bad');
    expect(() => registry.load('bad')).toThrow(/identity mismatch/);
  });
});
