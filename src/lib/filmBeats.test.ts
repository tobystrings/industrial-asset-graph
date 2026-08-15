import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allViewsCanScroll } from './scrollChrome';
import { filmChapterForAsset, filmEmbedSrc, filmHonestyForAsset, parseFilmMessage } from './filmBridge';
import { genieEmbedSrc, geniePresentMs } from './filmGenie';
import { unusedRelationshipCounts } from './relationshipHonesty';
import { reconnectAfterFault } from './productLookup';
import { line2PathIndexes, resolveFilmStartScene, shouldAcceptFilmBeat, stillHoldsKenBurns } from './filmPlayback';
import { applyIncomingBeat, beatIndexAt, beatStageFor, parseFilmBeat, visualTokenFor } from './filmBeats';

type Manifest = { scenes: Array<{ id: string; slug: string; visual: string; narration: string; title: string }> };

const manifest = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../presentation/narration-manifest.json'), 'utf8'),
) as Manifest;

describe('film beat visuals', () => {
  it('maps live narration lines to distinct beats and honest visual tokens', () => {
    const intro = manifest.scenes.find((scene) => scene.slug === 'tyler_intro')!;
    const cabinet = manifest.scenes.find((scene) => scene.slug === 'line2_standard')!;
    const lines = intro.narration.split('\n').map((line) => line.trim()).filter(Boolean);
    expect(beatIndexAt(lines, 0)).not.toBe(beatIndexAt(lines, 0.9));
    const early = beatStageFor(intro, 0.05);
    const late = beatStageFor(intro, 0.9);
    expect(early.caption).not.toBe(late.caption);
    expect(early.index).toBeLessThan(late.index);
    expect(stillHoldsKenBurns(cabinet.visual)).toBe(true);
    const held = beatStageFor(cabinet, 0.4, false);
    expect(held.kenBurns).toBe(false);
    expect(held.motion).toBe('hold');
    expect(held.still).toContain('04_build');
    expect(beatStageFor(cabinet, 0.4, true).motion).toBe('none');
    expect(visualTokenFor(cabinet.visual, cabinet.slug, 'Click the drive')).toBe('cabinet');
    expect(parseFilmBeat({ source: 'iag-film', type: 'beat', sceneIndex: 5, progress: 0.2, caption: 'hello' })?.caption).toBe('hello');
    expect(parseFilmBeat({ source: 'iag-film', type: 'open', command: 'cabinet' })).toBeNull();
    const line2Index = resolveFilmStartScene({ requestedScene: 5, path: 'line2', currentTime: 0, line2Path: line2PathIndexes(manifest.scenes) });
    const line2Beat = beatStageFor(manifest.scenes[line2Index], 0);
    expect(line2Beat.caption.toLowerCase()).toContain('document');
    expect(line2Beat.caption.toLowerCase()).not.toContain('i started this because');
    expect(shouldAcceptFilmBeat(0, line2Index, 'line2')).toBe(false);
    expect(shouldAcceptFilmBeat(line2Index, line2Index, 'line2')).toBe(true);
    const stale = applyIncomingBeat(
      { source: 'iag-film', type: 'beat', sceneIndex: 0, progress: 0.9, caption: 'I started this because I am the electrician trying to learn this facility.' },
      5,
      'line2',
      manifest.scenes,
    );
    expect(stale).toBeNull();
    const live = applyIncomingBeat(
      { source: 'iag-film', type: 'beat', sceneIndex: line2Index, progress: 0, caption: line2Beat.caption },
      5,
      'line2',
      manifest.scenes,
    );
    expect(live?.caption.toLowerCase()).toContain('document');
    expect(live?.label).toBe('line2_standard');
  });

  it('keeps Genie film helpers, dest-null reconnect, unused rels, and rail scroll', () => {
    expect(filmChapterForAsset('L2-CC-001')).toEqual({ scene: 5, path: 'line2' });
    expect(filmHonestyForAsset('FG-L4-MTN-001').kind).toBe('intro-only');
    const embed = genieEmbedSrc({ scene: 5, path: 'line2' });
    expect(embed).toContain('embed=1');
    expect(embed).toContain('scene=5');
    expect(embed).toContain('path=line2');
    expect(filmEmbedSrc(5, { path: 'line2', captions: true })).toBe(embed);
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'cabinet' })?.command).toBe('cabinet');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'trace' })?.command).toBe('trace');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: '3d' })?.command).toBe('3d');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'map' })?.command).toBe('map');
    expect(parseFilmMessage({ source: 'iag-film', type: 'open', command: 'verify' })?.command).toBe('verify');
    expect(geniePresentMs(true)).toBe(0);
    const unused = unusedRelationshipCounts();
    expect(unused.FEEDS).toBe(0);
    expect(unused.CONTROLS).toBe(0);
    expect(unused.SENSES).toBe(0);
    expect(unused.INTERLOCKS_WITH).toBe(0);
    expect(reconnectAfterFault('L2-CC-VFD-001').status).toBe('FIELD_VERIFY');
    expect(reconnectAfterFault('L2-CC-VFD-001').signals.every((item) => item.destId === null)).toBe(true);
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../dashboard.css'), 'utf8');
    expect(allViewsCanScroll(css)).toBe(true);
  });
});
