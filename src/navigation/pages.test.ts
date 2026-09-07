import { describe, expect, it } from 'vitest';
import { pageSearch, readPage, pages } from './pages';
describe('page navigation', () => {
  it('opens a simple home and maps existing deep links to their workspaces', () => {
    expect(readPage('')).toBe('home');
    expect(readPage('?view=cabinet&device=VFD-1')).toBe('cabinet');
    expect(readPage('?manager=database')).toBe('database');
    expect(readPage('?view=assets')).toBe('assets');
    expect(readPage('?field=1&asset=L2-CC-001')).toBe('field');
    expect(readPage('?trace=full&asset=L2-CC-001')).toBe('relationships');
    expect(readPage('?area=warehouse')).toBe('map');
  });
  it('round-trips every page and preserves facility identity without leaking old page state', () => {
    for (const page of Object.keys(pages) as (keyof typeof pages)[]) expect(readPage(pageSearch(page))).toBe(page);
    const query = pageSearch('documents', '?facilityId=test-facility&asset=old&trace=full&manager=users', {doc:'manual'});
    expect(new URLSearchParams(query).get('facilityId')).toBe('test-facility');
    expect(new URLSearchParams(query).get('doc')).toBe('manual');
    expect(query).not.toMatch(/trace|manager|asset=/);
  });
  it('rejects unknown or prototype page names', () => {
    expect(readPage('?page=__proto__')).toBe('home');
    expect(readPage('?page=missing')).toBe('home');
  });
});
