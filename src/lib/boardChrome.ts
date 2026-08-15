export type InspectorTab = 'capture' | 'intel' | 'record' | 'docs' | 'activity';
export type InspectorPanel = InspectorTab | 'verification' | 'unknowns' | 'banner';
export type PhoneNav = 'map' | 'find' | 'queue' | 'cabinet';

export const INSPECTOR_TABS: InspectorTab[] = ['capture', 'intel', 'record', 'docs', 'activity'];
export const PHONE_NAV: PhoneNav[] = ['map', 'find', 'queue', 'cabinet'];
export const MIN_HIT_TARGET_PX = 44;

export const KEPT_SURFACES = [
  'dashboard',
  'assets',
  'documents',
  'cabinet',
  'film',
  'find',
  'walkdown',
  'device-intel',
  'packet',
  'map-2d',
  'map-3d',
  'systems',
  'documents-grouped',
  'keys-tqc',
  'device-query',
  'serial-dispute',
  'unused-rels',
  'area-kit',
  'field-queue',
] as const;

export function cycleInspectorTab(current: InspectorTab, delta: 1 | -1): InspectorTab {
  const index = INSPECTOR_TABS.indexOf(current);
  const next = (index + delta + INSPECTOR_TABS.length) % INSPECTOR_TABS.length;
  return INSPECTOR_TABS[next];
}

export function parseInspectorTab(raw: string | null | undefined): InspectorTab {
  if (raw === 'queue' || raw === 'capture') return 'capture';
  if (raw === 'overview' || raw === 'record') return 'record';
  if (raw === 'intel') return 'intel';
  if (raw === 'docs') return 'docs';
  if (raw === 'activity' || raw === 'log') return 'activity';
  return 'record';
}

export function railColumnWidth(viewport: number): number {
  if (viewport < 620) return viewport;
  if (viewport < 1050) return Math.min(viewport, 420);
  if (viewport < 1440) return 360;
  return 380;
}

export function railBodyScrolls(): true {
  return true;
}

export function inspectorVisible(tab: InspectorTab, panel: InspectorPanel): boolean {
  if (panel === 'banner') return true;
  if (panel === 'unknowns' || panel === 'capture') return tab === 'capture';
  if (panel === 'verification') return tab === 'record';
  return tab === panel;
}

export function chromeAtWidth(width: number): {
  sidebar: 'inline' | 'drawer';
  topNav: 'inline' | 'menu';
  bottomNav: boolean;
  inspectorTabs: true;
  kpi: 'row' | 'compact';
  relationships: 'band' | 'in-intel';
  mapMinHeight: number;
} {
  if (width < 620) {
    return { sidebar: 'drawer', topNav: 'menu', bottomNav: true, inspectorTabs: true, kpi: 'compact', relationships: 'in-intel', mapMinHeight: 280 };
  }
  if (width < 1050) {
    return { sidebar: 'drawer', topNav: 'inline', bottomNav: false, inspectorTabs: true, kpi: 'row', relationships: 'band', mapMinHeight: 320 };
  }
  return { sidebar: 'inline', topNav: 'inline', bottomNav: false, inspectorTabs: true, kpi: 'row', relationships: 'band', mapMinHeight: 360 };
}

export function phoneCabinetOrder(): Array<'detail' | 'devices' | 'drawing'> {
  return ['devices', 'detail', 'drawing'];
}

export function dualNavHidden(width: number): boolean {
  const chrome = chromeAtWidth(width);
  return chrome.sidebar !== 'inline' && chrome.topNav !== 'inline' && !chrome.bottomNav;
}

export function destUnknownHighlight(deviceId: string, destId: string | null): 'is-dest-unknown' | '' {
  if (!deviceId.startsWith('vfd-')) return '';
  return destId ? '' : 'is-dest-unknown';
}

/** Phone chrome must fit five inspector tabs and four nav items without sideways scroll. */
export function phoneBarFits(width: number): { tabs: number; nav: number; tabWidth: number; navWidth: number } {
  const gutter = 16;
  const inner = Math.max(0, width - gutter);
  const tabs = INSPECTOR_TABS.length;
  const nav = PHONE_NAV.length;
  return {
    tabs,
    nav,
    tabWidth: inner / tabs,
    navWidth: width / nav,
  };
}

export function phoneTargetsMeetMinimum(width: number): boolean {
  const fit = phoneBarFits(width);
  return fit.tabs === 5 && fit.nav === 4 && fit.tabWidth >= 44 && fit.navWidth >= 44;
}

/** Phone must hide the tall device list without killing the chip picker. */
export const PHONE_CABINET_LIST_HIDE = '.cabinet-device-list > div:not(.device-chips)';

export function phoneCabinetCssAllowsChips(css: string): boolean {
  const blanketHide = /\.cabinet-device-list\s*>\s*div\s*\{\s*display:\s*none/.test(css);
  const exceptChips = /\.cabinet-device-list\s*>\s*div:not\(\.device-chips\)/.test(css);
  const chipsFlex = /\.device-chips\s*\{[^}]*display:\s*flex/.test(css);
  return exceptChips && chipsFlex && !blanketHide;
}
