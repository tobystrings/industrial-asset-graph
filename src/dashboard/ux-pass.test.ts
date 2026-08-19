import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('live workspace ux pass', () => {
  it('keeps facility map controls actionable and accessible', () => {
    const map = readFileSync(resolve(root, 'map', 'DetailedBuildingLayout.tsx'), 'utf8');
    expect(map).toContain('Zoom out');
    expect(map).toContain('Zoom in');
    expect(map).toContain('fitPlan');
    expect(map).toContain("event.key === 'Enter'");
    expect(map).toContain('reference-map-status');
  });

  it('provides useful document and relationship states', () => {
    const docs = readFileSync(resolve(root, 'dashboard', 'DocumentsWorkspace.tsx'), 'utf8');
    const relationships = readFileSync(resolve(root, 'dashboard', 'RelationshipsWorkspace.tsx'), 'utf8');
    expect(docs).toContain('No documents match this status.');
    expect(docs).toContain('Clear filter');
    expect(docs).toContain('aria-pressed');
    expect(relationships).toContain('Trace active');
    expect(relationships).toContain('No relationship path is available for this selection.');
    expect(relationships).toContain('aria-current');
  });
});
