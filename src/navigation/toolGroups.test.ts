import { describe, expect, it } from 'vitest';
import { toolGroups, toolGroupFor } from './toolGroups';
import { pageSearch, readPage, type PageId } from './pages';

describe('tool navigation preserves workflows', () => {
  it('keeps every original More destination reachable exactly once', () => {
    const original: PageId[] = ['lines','documentation','maintenance','dependencies','field','observation','evidence','cabinet','wulftec','relationships','history','manage','assetAdd','connection','review','health','conflicts','database','import','setup','settings','account','help'];
    expect(toolGroups.flatMap(group => [...group.ids]).sort()).toEqual(original.sort());
  });
  it('returns to the matching tool group without losing the facility', () => {
    for (const group of toolGroups) for (const page of group.ids) {
      expect(toolGroupFor(page)?.id).toBe(group.id);
      const url = pageSearch('more', '?facilityId=facility-test', { tools: group.id });
      expect(new URLSearchParams(url).get('facilityId')).toBe('facility-test');
      expect(readPage(url)).toBe('more');
    }
  });
});
