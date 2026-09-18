import { describe, expect, it } from 'vitest';
import { pageSearch, readPage, pages, parentSearch, backDestination } from './pages';
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
  it('walks direct machine links up one level and keeps repair and facility context', () => {
    let route = '?page=machine&asset=cabinet&section=manuals&doc=manual&work=repair-1&facilityId=plant';
    route = parentSearch(route);
    expect(new URLSearchParams(route).get('section')).toBe('manuals');
    expect(new URLSearchParams(route).has('doc')).toBe(false);
    expect(new URLSearchParams(route).get('work')).toBe('repair-1');
    route = parentSearch(route);
    expect(new URLSearchParams(route).get('asset')).toBe('cabinet');
    expect(new URLSearchParams(route).has('section')).toBe(false);
    route = parentSearch(route);
    expect(readPage(route)).toBe('assets');
    expect(new URLSearchParams(route).get('facilityId')).toBe('plant');
  });
  it('returns to the actual source, including search, model and cabinet selection', () => {
    for (const source of ['?page=assets&q=Climax','?page=wulftec&asset=wrapper&assembly=carriage&explode=0.5','?page=cabinet&asset=cabinet&component=drive&image=interior&section=parameters']) {
      expect(backDestination('?page=component&asset=cabinet&component=drive',{iagPrevious:source})).toEqual({search:source,recorded:true});
    }
  });
  it('keeps direct repair, review, component and document links inside their parent workspace', () => {
    expect(readPage(parentSearch('?page=repairSummary&work=123&asset=machine'))).toBe('repair');
    expect(readPage(parentSearch('?page=submission&submission=123'))).toBe('inbox');
    expect(readPage(parentSearch('?page=inbox'))).toBe('admin');
    expect(parentSearch('?page=component&asset=cabinet&component=drive')).toBe('?page=machine&asset=cabinet');
    expect(parentSearch('?page=documents&asset=cabinet&doc=manual')).toBe('?page=documents&asset=cabinet');
  });
  it('never uses another facility or external address as a recorded back destination', () => {
    for (const previous of ['https://example.com','//example.com','?page=assets&facilityId=other']) {
      expect(backDestination('?page=machine&asset=machine&facilityId=plant',{iagPrevious:previous}).recorded).toBe(false);
    }
  });
});
