export type ScrollBehaviorMode = 'auto' | 'smooth';

export function scrollBehavior(prefersReducedMotion: boolean): ScrollBehaviorMode {
  return prefersReducedMotion ? 'auto' : 'smooth';
}

export function overscrollContain(): 'contain' {
  return 'contain';
}

export function chipSnapAxis(): 'x proximity' {
  return 'x proximity';
}

/** Nested panes scroll themselves; the page does not steal the gesture. */
export const SCROLL_PANE_SELECTOR = '.scroll-pane';

export function scrollPaneToTop(element: HTMLElement | null, reducedMotion: boolean): void {
  if (!element) return;
  element.scrollTo({ top: 0, left: 0, behavior: scrollBehavior(reducedMotion) });
}

export const SCROLLABLE_VIEWS = [
  '.rail-body',
  '.asset-panel',
  '.activity-panel',
  '.list-view',
  '.area-scroll',
  '.map-panel',
  '.relationship-panel',
  '.cabinet-detail',
  '.cabinet-page',
  '.palette',
  '.facility-sidebar',
] as const;

export function cssAllowsScroll(css: string, selector: string): boolean {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{[^}]*overflow(?:-y)?:\\s*(auto|scroll)`, 'i');
  return block.test(css);
}

export function allViewsCanScroll(css: string): boolean {
  return SCROLLABLE_VIEWS.every((selector) => cssAllowsScroll(css, selector));
}

export function scrollCssIsContained(css: string): boolean {
  return css.includes('overscroll-behavior: contain') && css.includes('scrollbar-width: thin') && css.includes('scroll-snap-type: x proximity');
}

export function prefersReducedMotion(matchMediaImpl: (query: string) => { matches: boolean } = (query) => matchMedia(query)): boolean {
  try {
    return matchMediaImpl('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
