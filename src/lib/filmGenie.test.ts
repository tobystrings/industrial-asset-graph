import { describe, expect, it } from 'vitest';
import { filmChapterForAsset, filmEmbedSrc, filmHonestyForAsset, parseFilmMessage } from './filmBridge';
import {
  genieActions,
  genieChromeMode,
  genieCollapseMs,
  genieEmbedSrc,
  genieFirstShow,
  genieHoldMini,
  genieMotionReduced,
  geniePresentMs,
  geniePreservesChapter,
  genieSheetClass,
  genieShouldAutoplay,
  genieShowAfterWait,
  genieTargetFromAsset,
  genieTargetFromCabinet,
  genieTargetFromFind,
  genieTargetFromHeader,
  genieTargetFromUrl,
  standalonePresentationHref,
} from './filmGenie';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { reconnectAfterFault } from './productLookup';

describe('film Genie helpers', () => {
  it('keeps every film entry as one Genie target and preserves L2 / L4 honesty', () => {
    expect(genieChromeMode()).toBe('dock');
    const actions = genieActions();
    expect(actions.map((item) => item.label)).toEqual(['Intro', 'Line 2 path', 'Line 2 cabinet', 'Map']);
    expect(actions.filter((item) => item.kind === 'play').map((item) => item.id)).toEqual(['intro', 'line2path']);
    expect(actions.find((item) => item.id === 'line2')?.command).toBe('cabinet');
    expect(actions.find((item) => item.id === 'explore')?.command).toBe('3d');
    expect(genieTargetFromHeader().source).toBe('header');
    expect(genieTargetFromFind().scene).toBe(0);
    expect(genieTargetFromCabinet()).toEqual({ scene: 5, path: 'line2', source: 'cabinet' });
    expect(genieTargetFromAsset('L2-CC-001')).toEqual({ scene: 5, path: 'line2', source: 'asset' });
    expect(genieTargetFromAsset('FG-L4-MTN-001')).toEqual({ scene: 0, source: 'asset' });
    expect(filmHonestyForAsset('L2-CC-001').kind).toBe('chapter');
    expect(filmHonestyForAsset('FG-L4-MTN-001').kind).toBe('intro-only');
    expect(filmChapterForAsset('L2-CC-001')).toEqual({ scene: 5, path: 'line2' });
    expect(geniePreservesChapter('L2-CC-001')).toEqual({ scene: 5, path: 'line2' });
    expect(genieTargetFromUrl('?film=1')?.source).toBe('url');
    expect(genieTargetFromUrl('?view=film')?.source).toBe('url');
    expect(genieTargetFromUrl('?scene=5&path=line2')).toEqual({ scene: 5, path: 'line2', source: 'url' });
    expect(genieTargetFromUrl('')).toBeNull();
  });

  it('preserves embed, postMessage commands, dest-null reconnect, and unused rels', () => {
    const embed = genieEmbedSrc({ scene: 5, path: 'line2' });
    expect(embed).toContain('embed=1');
    expect(embed).toContain('scene=5');
    expect(embed).toContain('path=line2');
    expect(embed).toContain('captions=1');
    expect(filmEmbedSrc(5, { path: 'line2', captions: true })).toBe(embed);
    expect(standalonePresentationHref()).toBe('./presentation/');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'cabinet' })?.type).toBe('open');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'trace' })?.command).toBe('trace');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: '3d' })?.command).toBe('3d');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'map' })?.command).toBe('map');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'verify' })?.command).toBe('verify');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'explode' })).toBeNull();
    expect(parseFilmMessage({ source: 'iag-film', type: 'close' })?.type).toBe('close');
    expect(geniePresentMs(true)).toBe(0);
    expect(geniePresentMs(false)).toBe(560);
    expect(genieCollapseMs(true)).toBe(0);
    expect(genieFirstShow(true)).toBe('dock');
    expect(genieFirstShow(false)).toBe('dock');
    expect(genieShouldAutoplay()).toBe(false);
    expect(genieShowAfterWait(false)).toBe('dock');
    expect(genieShowAfterWait(true)).toBe('mini');
    expect(genieShowAfterWait(false, true)).toBe('mini');
    expect(genieHoldMini('?film=1')).toBe(true);
    expect(genieHoldMini('?hold=mini')).toBe(true);
    expect(genieHoldMini('')).toBe(false);
    expect(genieMotionReduced('?motion=full', true)).toBe(false);
    expect(genieMotionReduced('?motion=reduce', false)).toBe(true);
    expect(genieMotionReduced('', true)).toBe(true);
    expect(genieFirstShow(genieMotionReduced('?film=1&motion=full', true))).toBe('dock');
    expect(genieHoldMini('?film=1')).toBe(true);
    expect(genieSheetClass(true, true)).toContain('is-instant');
    expect(genieSheetClass(true, false)).toContain('is-open');
    expect(genieSheetClass(true, false)).toContain('is-dock');
    const unused = unusedRelationshipCounts();
    expect(unused.FEEDS).toBe(0);
    expect(unused.CONTROLS).toBe(0);
    expect(unused.SENSES).toBe(0);
    expect(unused.INTERLOCKS_WITH).toBe(0);
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
    expect(reconnectAfterFault('L2-CC-VFD-001').signals.every((item) => item.destId === null)).toBe(true);
  });
});
