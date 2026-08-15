import { describe, expect, it } from 'vitest';
import { areas, machines, relationships } from '../facilityData';
import { appHrefForFilmCommand, appQueryForFilmCommand, filmCues, filmEmbedSrc, parseFilmMessage } from './filmBridge';

describe('filmBridge', () => {
  it('deep-links only to existing facility ids', () => {
    const areaIds = new Set(areas.map((item) => item.id));
    const assetIds = new Set(machines.map((item) => item.id));
    const relIds = new Set(relationships.flatMap((item) => [item.source, item.target]));
    for (const command of ['map', 'trace', 'verify', '3d'] as const) {
      const query = appQueryForFilmCommand(command);
      const area = query.get('area');
      const asset = query.get('asset');
      if (area) expect(areaIds.has(area)).toBe(true);
      if (asset) {
        expect(assetIds.has(asset)).toBe(true);
        expect(relIds.has(asset)).toBe(true);
      }
    }
    expect(appQueryForFilmCommand('cabinet').get('view')).toBe('cabinet');
    expect(appHrefForFilmCommand('trace')).toContain('asset=L2-CC-001');
    expect(appHrefForFilmCommand('3d')).toContain('map=3d');
    expect(filmEmbedSrc(5)).toContain('embed=1');
    expect(filmEmbedSrc(5)).toContain('scene=5');
    expect(filmEmbedSrc(5, { path: 'line2' })).toContain('path=line2');
    expect(filmCues.every((cue) => cue.scene >= 0)).toBe(true);
  });

  it('accepts only typed film postMessages', () => {
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'cabinet' })).toEqual({
      source: 'iag-film', type: 'open', command: 'cabinet',
    });
    expect(parseFilmMessage({ source: 'other', type: 'open', command: 'cabinet' })).toBeNull();
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'delete-everything' })).toBeNull();
  });
});
