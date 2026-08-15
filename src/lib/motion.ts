export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function clamp01(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/** 1e pop: scale from .6 with a slight overshoot. */
export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export function countAt(progress: number, target: number): number {
  return Math.round(target * easeOutCubic(progress));
}

export function barWidthAt(progress: number, percent: number): number {
  return Math.min(100, Math.max(0, percent * easeOutCubic(progress)));
}

export function popScaleAt(progress: number, reduced = false): number {
  if (reduced) return 1;
  return 0.6 + 0.4 * easeOutBack(progress);
}

export function growAt(progress: number, reduced = false): number {
  if (reduced) return 1;
  return easeOutCubic(progress);
}

export function pinBobOffset(elapsed: number, reduced = false): number {
  if (reduced) return 0;
  return Math.sin(elapsed * 2) * 0.35;
}

export function liftScaleAt(hovered: boolean, selected: boolean, reduced = false): number {
  const next = selected ? 1.12 : hovered ? 1.08 : 1;
  if (reduced) return next;
  return next;
}

export function cameraLerp(from: number, to: number, reduced = false, delta = 0.06): number {
  if (reduced) return to;
  return from + (to - from) * delta;
}

export function staggerMs(index: number, step = 70): number {
  return Math.max(0, index) * step;
}

export function emissivePulse(elapsed: number, selected: boolean, reduced = false): number {
  if (!selected) return 0;
  if (reduced) return 0.28;
  return 0.22 + (0.5 + 0.5 * Math.sin(elapsed * 3)) * 0.18;
}

export function kenBurnsAllowed(reduced: boolean, stillHold: boolean): boolean {
  return !reduced && !stillHold;
}
