import { describe, expect, it } from 'vitest';
import { mapCoordinateLabel } from './DetailedBuildingLayout';

describe('technician map coordinate grid', () => {
  it('maps normalized positions to alphanumeric coordinates', () => {
    expect(mapCoordinateLabel(0, 0)).toBe('A1');
    expect(mapCoordinateLabel(50, 27)).toBe('N6');
    expect(mapCoordinateLabel(99.9, 99.9)).toBe('Z20');
  });
});
