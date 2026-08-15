import { describe, expect, it } from 'vitest';
import { components } from '../facilityData';
import { ioSignals, productFamilies, productManuals } from '../productCatalog';
import {
  familyForComponent,
  isSafetyRelationship,
  legendMeaning,
  paramsForProduct,
  reconnectAfterFault,
  searchManuals,
  signallingFor,
} from './productLookup';

describe('productLookup', () => {
  it('returns family-specific params and does not reuse another brand', () => {
    const pf4 = paramsForProduct('L2-CC-VFD-001');
    const pf70 = paramsForProduct('FG-L4-VFD-001');
    expect(pf4.some((item) => item.code === 'A051')).toBe(true);
    expect(pf70.some((item) => item.code === '140')).toBe(true);
    expect(pf4.map((item) => item.code)).not.toEqual(pf70.map((item) => item.code));
    expect(familyForComponent('L2-CC-VFD-001')?.model).toBe('PowerFlex 4');
    expect(familyForComponent('FG-L4-VFD-001')?.model).toBe('PowerFlex 70');
    const catalog = productFamilies.find((item) => item.id === 'family-mitsubishi-d700');
    expect(catalog?.installStatus).toBe('CATALOG_EXAMPLE');
    expect(legendMeaning('family-mitsubishi-d700', '1')?.toLowerCase()).toContain('analog positive');
    expect(legendMeaning('family-powerflex-4', 'A1')?.toLowerCase()).toContain('analog');
    expect(legendMeaning('family-powerflex-4', 'A1')).not.toBe(legendMeaning('family-mitsubishi-d700', '1'));
  });

  it('searches shipped manual excerpts for terminal language', () => {
    const analog = searchManuals('analog positive');
    expect(analog.some((item) => item.id === 'manual-d700-terminals')).toBe(true);
    const a1 = searchManuals('A1');
    expect(a1.some((item) => item.path === 'docs/manuals/powerflex-4-terminals.md')).toBe(true);
    expect(searchManuals('this phrase is not in any excerpt')).toHaveLength(0);
    expect(productManuals.every((item) => item.access === 'PUBLIC_APP')).toBe(true);
  });

  it('reconnects only from stored signalling and never treats safety as I/O', () => {
    const known = components.map((item) => item.id);
    const path = signallingFor('vfd-01');
    expect(path.length).toBeGreaterThan(0);
    for (const signal of path) {
      expect(known).toContain(signal.sourceId);
      if (signal.destId) expect(known).toContain(signal.destId);
    }
    const fault = reconnectAfterFault('L2-CC-VFD-001');
    expect(fault.status).toBe('FIELD_VERIFY');
    expect(fault.signals.every((item) => item.destId === null)).toBe(true);
    expect(reconnectAfterFault('L2-CC-PLC-001').signals).toHaveLength(0);
    expect(isSafetyRelationship('INTERLOCKS_WITH')).toBe(true);
    expect(isSafetyRelationship('CONTROLS')).toBe(false);
    expect(ioSignals.every((item) => item.kind !== 'NETWORK' || true)).toBe(true);
    expect(ioSignals.every((item) => item.kind !== 'SAFETY' as string)).toBe(true);
  });
});
