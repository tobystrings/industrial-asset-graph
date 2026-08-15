import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allViewsCanScroll, chipSnapAxis, overscrollContain, prefersReducedMotion, scrollBehavior, scrollCssIsContained, scrollPaneToTop } from './scrollChrome';

describe('scrollChrome', () => {
  it('uses smooth scroll unless reduced motion is requested', () => {
    expect(scrollBehavior(false)).toBe('smooth');
    expect(scrollBehavior(true)).toBe('auto');
    expect(overscrollContain()).toBe('contain');
    expect(chipSnapAxis()).toBe('x proximity');
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it('scrolls a real pane to the top through the shipped helper', () => {
    const calls: Array<{ top: number; behavior: string }> = [];
    const pane = {
      scrollTo(opts: { top: number; left: number; behavior: string }) {
        calls.push({ top: opts.top, behavior: opts.behavior });
      },
    };
    scrollPaneToTop(pane as unknown as HTMLElement, false);
    scrollPaneToTop(pane as unknown as HTMLElement, true);
    scrollPaneToTop(null, false);
    expect(calls).toEqual([
      { top: 0, behavior: 'smooth' },
      { top: 0, behavior: 'auto' },
    ]);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../dashboard.css'), 'utf8');
    expect(scrollCssIsContained(css)).toBe(true);
    expect(allViewsCanScroll(css)).toBe(true);
  });
});
