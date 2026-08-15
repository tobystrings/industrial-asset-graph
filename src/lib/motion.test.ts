import { describe, expect, it } from 'vitest';
import {
  barWidthAt,
  cameraLerp,
  countAt,
  easeOutCubic,
  emissivePulse,
  growAt,
  liftScaleAt,
  kenBurnsAllowed,
  pinBobOffset,
  popScaleAt,
  staggerMs,
} from './motion';

describe('motion helpers', () => {
  it('counts and fills monotonically into the target', () => {
    let prevCount = -1;
    let prevBar = -1;
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      const counted = countAt(t, 14);
      const bar = barWidthAt(t, 18);
      expect(counted).toBeGreaterThanOrEqual(prevCount);
      expect(bar).toBeGreaterThanOrEqual(prevBar);
      prevCount = counted;
      prevBar = bar;
    }
    expect(countAt(0, 14)).toBe(0);
    expect(countAt(1, 14)).toBe(14);
    expect(countAt(0.5, 14)).toBe(Math.round(14 * easeOutCubic(0.5)));
    expect(barWidthAt(0, 18)).toBe(0);
    expect(barWidthAt(1, 18)).toBe(18);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('collapses pop, grow, bob, camera, and pulse to instant state when reduced', () => {
    expect(popScaleAt(0.15, true)).toBe(1);
    expect(growAt(0.2, true)).toBe(1);
    expect(pinBobOffset(1.4, true)).toBe(0);
    expect(cameraLerp(10, 50, true)).toBe(50);
    expect(emissivePulse(0.4, true, true)).toBe(0.28);
    expect(emissivePulse(0.4, false, false)).toBe(0);
    expect(liftScaleAt(true, false, true)).toBe(1.08);
    expect(liftScaleAt(false, true, true)).toBe(1.12);
    expect(kenBurnsAllowed(true, false)).toBe(false);
    expect(kenBurnsAllowed(false, true)).toBe(false);
  });

  it('pops from .6 toward 1 and staggers in 70ms steps', () => {
    expect(popScaleAt(0, false)).toBeCloseTo(0.6);
    expect(popScaleAt(1, false)).toBeCloseTo(1);
    expect(staggerMs(3)).toBe(210);
  });
});
