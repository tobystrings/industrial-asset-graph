import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { filmChapterForAsset, filmHonestyForAsset, parseFilmMessage } from './filmBridge';
import { beatStageFor } from './filmBeats';
import { FILM_AUDIO_SRC, FILM_SEGMENT_TIMES, filmClockRatio, filmSceneAt, filmSceneStart, formatFilmClock, genieClockStart, geniePrimaryChrome } from './filmClock';
import { genieChromeMode, geniePresentMs } from './filmGenie';
import { line2PathIndexes, resolveFilmStartScene, stillHoldsKenBurns } from './filmPlayback';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { reconnectAfterFault } from './productLookup';

type Manifest = { scenes: Array<{ id: string; slug: string; visual: string; narration: string }> };

const manifest = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../presentation/narration-manifest.json'), 'utf8'),
) as Manifest;

describe('Genie clock', () => {
  it('starts Line 2 on the cabinet chapter using the shipped MP3 clock', () => {
    const path = line2PathIndexes(manifest.scenes);
    const startIndex = resolveFilmStartScene({ requestedScene: 5, path: 'line2', currentTime: 0, line2Path: path });
    expect(startIndex).toBe(5);
    expect(manifest.scenes[startIndex].slug).toBe('line2_standard');
    expect(genieClockStart({ scene: 5, path: 'line2', line2Path: path })).toBe(filmSceneStart(5));
    expect(filmSceneAt(genieClockStart({ scene: 5, path: 'line2', line2Path: path }))).toBe(5);
    expect(filmSceneAt(0)).toBe(0);
    expect(FILM_AUDIO_SRC).toContain('complete-project-film.mp3');
    expect(geniePrimaryChrome()).toBe('clock');
    expect(genieChromeMode()).toBe('dock');
    expect(formatFilmClock(0)).toBe('0:00');
    expect(formatFilmClock(132.859)).toBe('2:12');
    expect(filmClockRatio(0)).toBe(0);
    expect(filmClockRatio(FILM_SEGMENT_TIMES.total)).toBe(1);
    expect(filmClockRatio(FILM_SEGMENT_TIMES.total / 2)).toBeCloseTo(0.5);
    const beat = beatStageFor(manifest.scenes[startIndex], 0);
    expect(beat.caption.toLowerCase()).toContain('document');
    expect(stillHoldsKenBurns(manifest.scenes[startIndex].visual)).toBe(true);
    expect(beat.kenBurns).toBe(false);
    expect(filmHonestyForAsset('FG-L4-MTN-001').kind).toBe('intro-only');
    expect(filmChapterForAsset('L2-CC-001')).toEqual({ scene: 5, path: 'line2' });
    expect(geniePresentMs(true)).toBe(0);
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'cabinet' })?.command).toBe('cabinet');
    const unused = unusedRelationshipCounts();
    expect(unused.FEEDS).toBe(0);
    expect(unused.CONTROLS).toBe(0);
    expect(unused.SENSES).toBe(0);
    expect(unused.INTERLOCKS_WITH).toBe(0);
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
  });
});
