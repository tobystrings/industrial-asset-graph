import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAppHeight, cabinetDockClearance, cabinetDrawingContained, cabinetWorkspaceColumns, dashboardSearch, genieQueryFromSearch, phoneTabFromQuery, readViewport } from './viewport';

describe('viewport rebalance', () => {
  it('classifies phone, tablet, and desktop from live widths', () => {
    expect(readViewport(390, 844).phone).toBe(true);
    expect(readViewport(900, 700).tablet).toBe(true);
    expect(readViewport(1366, 768).desktop).toBe(true);
    expect(readViewport(1366, 768).phone).toBe(false);
  });

  it('restores phone queue from capture/verify query after reload', () => {
    expect(phoneTabFromQuery('capture', null)).toBe('queue');
    expect(phoneTabFromQuery('intel', 'verify')).toBe('queue');
    expect(phoneTabFromQuery(null, null)).toBe('map');
  });

  it('rebuilds dashboard search without dropping tab/asset and without inventing device', () => {
    const query = dashboardSearch({ view: 'dashboard', area: 'area-warehouse-f', asset: 'L2-CC-001', tab: 'intel' });
    expect(query).toContain('asset=L2-CC-001');
    expect(query).toContain('tab=intel');
    expect(query).not.toContain('device=');
    expect(dashboardSearch({ view: 'dashboard' })).toBe('?map=3d');
  });

  it('carries film/motion/hold/scene/path/view through dashboardSearch so mini-player URLs survive mount', () => {
    const carried = genieQueryFromSearch('?film=1&motion=full&hold=mini&scene=5&path=line2&view=dashboard');
    expect(carried).toEqual({ film: '1', motion: 'full', hold: 'mini', scene: '5', path: 'line2' });
    const query = dashboardSearch({
      view: 'dashboard',
      area: 'area-warehouse-f',
      asset: 'L2-CC-001',
      tab: 'intel',
      ...carried,
    });
    expect(query).toContain('film=1');
    expect(query).toContain('motion=full');
    expect(query).toContain('hold=mini');
    expect(query).toContain('scene=5');
    expect(query).toContain('path=line2');
    expect(query).toContain('asset=L2-CC-001');
    const filmHold = genieQueryFromSearch('?view=film&motion=reduce');
    expect(filmHold.film).toBe('1');
    expect(filmHold).not.toHaveProperty('view');
    const held = dashboardSearch({ view: 'assets', ...filmHold });
    expect(held).toContain('view=assets');
    expect(held).toContain('film=1');
    expect(held).toContain('motion=reduce');
    expect(held).not.toContain('view=film');
    expect(dashboardSearch({ view: 'dashboard', ...genieQueryFromSearch('') })).toBe('?map=3d');
    expect(dashboardSearch({ view: 'dashboard', film: '0', motion: 'off', hold: 'dock', path: 'line4' })).toBe('?map=3d');
    expect(dashboardSearch({ view: 'dashboard', map: '2d' })).toBe('?map=2d');
  });

  it('keeps cabinet drawing inside its track and clears the Genie dock', () => {
    expect(cabinetWorkspaceColumns()).toContain('minmax(0, 1fr)');
    expect(cabinetDockClearance()).toBe(118);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../dashboard.css'), 'utf8');
    expect(cabinetDrawingContained(css)).toBe(true);
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 340px)');
    expect(css).toContain('.cabinet-workspace > * { min-width: 0; min-height: 0; }');
    expect(css).toContain("data-show='mini'");
    expect(css).toContain('bottom: calc(148px + 36px + var(--genie-dock-height, 118px) + env(safe-area-inset-bottom))');
    expect(css).toContain('bottom: calc(136px + 36px + var(--genie-dock-height, 118px) + env(safe-area-inset-bottom))');
    expect(css).toContain('var(--genie-ms');
    expect(css).toContain('.cabinet-detail .walkdown-form');
    expect(css).not.toContain('.cabinet-detail .photo-file');
    expect(css).toContain('.map-viewport { flex: 1; min-height: 0; display: flex; overflow: hidden; }');
    expect(css).toContain('.map-mode {\n  position: static');
    expect(css).toContain('.cabinet-device-list .panel-title');
    expect(css).toContain('.cabinet-hit text');
    expect(css).toContain('.app-shell:has(.cabinet-page) .backdrop');
    expect(css).not.toContain('Open 3D');
    const html = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../index.html'), 'utf8');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).not.toContain('href="/industrial-asset-graph/manifest.webmanifest"');
    expect(html).toContain('Industrial Asset Graph');
    expect(html).not.toContain('Plant Dependency Map');
    const presentation = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../presentation/index.html'), 'utf8');
    const player = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../presentation/player.js'), 'utf8');
    expect(presentation).not.toContain('Open 3D');
    expect(player).not.toContain('Open 3D');
    expect(presentation).toContain('>3D map<');
    expect(player).toContain("command === '3d' ? '3D map'");
  });

  it('writes --app-height for load/reload rebalance', () => {
    const store: Record<string, string> = {};
    const root = { setProperty: (key: string, value: string) => { store[key] = value; } };
    applyAppHeight(812, root as unknown as CSSStyleDeclaration);
    expect(store['--app-height']).toBe('812px');
  });
});
