import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('mobile navigation ux', () => {
  it('uses a dedicated mobile search control and current-workspace label', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const topNav = readFileSync(resolve(root, 'dashboard', 'TopNav.tsx'), 'utf8');
    expect(topNav).toContain('mobile-search-button');
    expect(topNav).toContain('mobile-workspace-label');
    expect(topNav).toContain("aria-current={workspaceTab === 'map' ? 'page' : undefined}");
    expect(topNav).toContain("drawerOpen ? 'Close facility menu' : 'Open facility menu'");
  });

  it('makes bottom navigation the primary mobile model', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const css = readFileSync(resolve(root, 'ui', 'system.css'), 'utf8');
    expect(css).toContain('@media (max-width: 820px)');
    expect(css).toContain('.top-nav nav.open,');
    expect(css).toContain('.global-search { display: none !important; }');
    expect(css).toContain('body .bottom-nav');
    expect(css).toContain('.bottom-nav button.active');
    expect(css).toContain('.facility-status { display: none !important; }');
  });
});
