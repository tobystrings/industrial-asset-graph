import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { documents } from '../facilityData';
import { renderMarkdown } from './markdown';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../');

describe('facility documents', () => {
  it('resolves every document record to a real markdown file that renders more than a path stub', () => {
    expect(documents.length).toBeGreaterThan(0);
    for (const document of documents) {
      const full = resolve(root, document.path);
      expect(existsSync(full), full).toBe(true);
      const source = readFileSync(full, 'utf8');
      expect(source.includes(document.path)).toBe(false);
      const html = renderMarkdown(source);
      expect(html.includes('<p>') || html.includes('<h1>') || html.includes('<h2>') || html.includes('<ul>')).toBe(true);
      expect(html.trim().length).toBeGreaterThan(document.path.length);
    }
  });
});
