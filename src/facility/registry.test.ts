import { describe, expect, it } from 'vitest';
import { facilityRegistry } from '../../facilities/registry';
import { loadFacilityPackage } from './schema';

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
});
