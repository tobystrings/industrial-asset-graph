import { expect, it } from 'vitest';
import { labelSuggestions } from './labelReader';
it('extracts only explicit label fields for human review', () => {
  expect(labelSuggestions('MFR: Synthetic\nP/N: TEST-24\nModel: M1\nRatings: 24 V\nLot: 123')).toEqual({ manufacturer: 'Synthetic', partNumber: 'TEST-24', model: 'M1', specifications: '24 V', serialLot: '123' });
  expect(labelSuggestions('Probably a motor manufactured by somebody 24V')).toEqual({});
});
