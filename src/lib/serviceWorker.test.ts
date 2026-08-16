import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('deployment service worker', () => {
  const source = readFileSync('public/sw.js', 'utf8');

  it('never serves deployed HTML cache-first', () => {
    expect(source).toContain("event.request.mode === 'navigate'");
    expect(source).toContain('fetch(event.request)');
    expect(source).not.toContain("'/industrial-asset-graph/',\n");
  });

  it('immediately removes the stale shell cache', () => {
    expect(source).toContain('self.skipWaiting()');
    expect(source).toContain('caches.delete(key)');
    expect(source).toContain('client.navigate(client.url)');
  });
});
