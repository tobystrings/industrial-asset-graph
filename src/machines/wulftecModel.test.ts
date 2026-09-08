import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { assemblyInfo, createWulftec } from './wulftecModel';

describe('reference WCRT-200 model', () => {
  it('provides independently separable assemblies and preserves drawing envelopes', () => {
    const { root, assemblies } = createWulftec();
    expect(assemblies.map(p => p.id)).toEqual(assemblyInfo.map(p => p[0]));
    const frame = new Box3().setFromObject(assemblies.find(p => p.id === 'frame')!.group);
    expect(frame.max.y).toBe(142);
    const conveyor = new Box3().setFromObject(assemblies.find(p => p.id === 'conveyor')!.group);
    expect(conveyor.max.x - conveyor.min.x).toBeCloseTo(385);
    for (const part of assemblies) {
      expect(part.group.parent).toBe(root);
      const base = part.group.position.clone();
      part.group.position.copy(part.base).add(part.offset);
      expect(part.group.position.distanceTo(base)).toBeGreaterThan(0);
      part.group.position.copy(part.base);
      expect(part.group.position.equals(base)).toBe(true);
    }
  });
});
