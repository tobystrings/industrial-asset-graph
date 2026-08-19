import { describe, expect, it } from 'vitest';
import { searchCatalog } from './searchIndex';

describe('searchCatalog', () => {
  it('finds assets, areas, documents, and cabinet devices from live records', () => {
    expect(searchCatalog('warehouse f').some((hit) => hit.kind === 'area' && hit.id === 'area-warehouse-f')).toBe(true);
    expect(searchCatalog('meta').some((hit) => hit.kind === 'asset' && hit.id === 'FG-L4-MTN-001')).toBe(true);
    expect(searchCatalog('electrical').some((hit) => hit.kind === 'document')).toBe(true);
    expect(searchCatalog('micrologix').some((hit) => hit.kind === 'component' && hit.id === 'L2-CC-PLC-001')).toBe(true);
    expect(searchCatalog('film').some((hit) => hit.kind === 'film' || hit.id === 'project-film')).toBe(false);
    expect(searchCatalog('analog positive').some((hit) => hit.kind === 'manual')).toBe(true);
    expect(searchCatalog('A1').some((hit) => hit.kind === 'manual' && hit.title.toLowerCase().includes('powerflex'))).toBe(true);
  });
});
