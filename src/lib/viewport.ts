export type ViewportSnapshot = {
  width: number;
  height: number;
  phone: boolean;
  tablet: boolean;
  desktop: boolean;
};

export function readViewport(width = 1280, height = 800): ViewportSnapshot {
  return {
    width,
    height,
    phone: width < 620,
    tablet: width >= 620 && width < 1050,
    desktop: width >= 1050,
  };
}

export function measureViewport(win: Window | null | undefined = typeof window === 'undefined' ? null : window): ViewportSnapshot {
  if (!win) return readViewport();
  const width = win.innerWidth || win.document.documentElement.clientWidth || 1280;
  const height = win.visualViewport?.height || win.innerHeight || 800;
  return readViewport(width, height);
}

export function applyAppHeight(height: number, root: CSSStyleDeclaration | null | undefined = typeof document === 'undefined' ? null : document.documentElement.style): void {
  if (!root) return;
  root.setProperty('--app-height', `${Math.round(height)}px`);
}

export function subscribeViewport(onChange: (snap: ViewportSnapshot) => void, win: Window | null | undefined = typeof window === 'undefined' ? null : window): () => void {
  if (!win) return () => undefined;
  const fire = () => {
    const snap = measureViewport(win);
    applyAppHeight(snap.height, win.document.documentElement.style);
    onChange(snap);
  };
  fire();
  win.addEventListener('resize', fire);
  win.addEventListener('orientationchange', fire);
  win.visualViewport?.addEventListener('resize', fire);
  win.visualViewport?.addEventListener('scroll', fire);
  return () => {
    win.removeEventListener('resize', fire);
    win.removeEventListener('orientationchange', fire);
    win.visualViewport?.removeEventListener('resize', fire);
    win.visualViewport?.removeEventListener('scroll', fire);
  };
}

/** Desktop cabinet tracks stay shrinkable so the 1600px drawing cannot cover the inspector. */
export function cabinetWorkspaceColumns(): string {
  return 'minmax(0, 200px) minmax(0, 1fr) minmax(0, 340px)';
}

export function cabinetDockClearance(): number {
  return 118;
}

export function cabinetDrawingContained(css: string): boolean {
  return css.includes(cabinetWorkspaceColumns())
    && css.includes('grid-template-rows: minmax(0, 1fr)')
    && css.includes('.cabinet-drawing { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; isolation: isolate; }')
    && css.includes('--genie-dock-height: 118px')
    && css.includes("data-show='mini'")
    && css.includes('bottom: calc(148px + 36px + var(--genie-dock-height, 118px) + env(safe-area-inset-bottom))')
    && css.includes('background: rgba(9, 17, 32, .96)');
}

export function phoneTabFromQuery(tab: string | null | undefined, command: string | null | undefined): 'map' | 'find' | 'queue' | 'cabinet' {
  if (tab === 'capture' || tab === 'queue' || command === 'verify') return 'queue';
  if (tab === 'find' || tab === 'q') return 'find';
  return 'map';
}

export type GenieQueryCarry = {
  film?: string | null;
  motion?: string | null;
  hold?: string | null;
  scene?: string | number | null;
  path?: string | null;
};

/** Copy film / motion / hold / scene / path from the live URL. view=film becomes film=1 so it cannot overwrite Assets/Documents. */
export function genieQueryFromSearch(search: string | URLSearchParams = typeof location === 'undefined' ? '' : location.search): GenieQueryCarry {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  const holdFilm = params.get('film') === '1' || params.get('view') === 'film';
  return {
    film: holdFilm ? '1' : params.get('film'),
    motion: params.get('motion'),
    hold: params.get('hold'),
    scene: params.get('scene'),
    path: params.get('path'),
  };
}

export function dashboardSearch(state: {
  view: string;
  area?: string | null;
  asset?: string | null;
  doc?: string | null;
  map?: string | null;
  tab?: string | null;
  focus?: boolean;
  q?: string | null;
  device?: string | null;
  door?: boolean;
} & GenieQueryCarry): string {
  const next = new URLSearchParams();
  if (state.view && state.view !== 'dashboard') next.set('view', state.view);
  if (state.area) next.set('area', state.area);
  if (state.asset) next.set('asset', state.asset);
  if (state.doc) next.set('doc', state.doc);
  next.set('map', '2d');
  if (state.tab && state.tab !== 'record') next.set('tab', state.tab);
  if (state.focus) next.set('focus', 'cabinet');
  if (state.q) next.set('q', state.q);
  if (state.device) next.set('device', state.device);
  if (state.door) next.set('door', '1');
  if (state.film === '1') next.set('film', '1');
  if (state.motion === 'full' || state.motion === 'reduce') next.set('motion', state.motion);
  if (state.hold === 'mini') next.set('hold', 'mini');
  if (state.scene != null && String(state.scene) !== '') next.set('scene', String(state.scene));
  if (state.path === 'line2') next.set('path', 'line2');
  const query = next.toString();
  return query ? `?${query}` : '';
}
