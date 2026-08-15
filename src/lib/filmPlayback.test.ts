import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  captionAtProgress,
  captionLinesFromNarration,
  filmAudioPreloadMode,
  jumpCommandForScene,
  kenBurnsAllowed,
  line2PathIndexes,
  nextPathIndex,
  resolveFilmStartScene,
  shouldAcceptFilmBeat,
  shouldMountFilmFrame,
  stillHoldsKenBurns,
} from './filmPlayback';
import { kenBurnsAllowed as motionKenBurns, pinBobOffset } from './motion';

type Manifest = { scenes: Array<{ id: string; slug: string; visual: string; narration: string }> };

const manifest = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../presentation/narration-manifest.json'), 'utf8'),
) as Manifest;

describe('filmPlayback', () => {
  it('builds caption lines from the real narration manifest', () => {
    const cabinet = manifest.scenes.find((scene) => scene.slug === 'line2_standard');
    expect(cabinet).toBeTruthy();
    const lines = captionLinesFromNarration(cabinet!.narration);
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) {
      expect(cabinet!.narration).toContain(line);
      expect(line.startsWith('[')).toBe(false);
    }
    expect(captionAtProgress(lines, 0)).toBe(lines[0]);
    expect(captionAtProgress(lines, 1)).toBe(lines[lines.length - 1]);
  });

  it('keeps the Line 2 short path inside the real scene list', () => {
    const path = line2PathIndexes(manifest.scenes);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path.every((index) => index >= 0 && index < manifest.scenes.length)).toBe(true);
    expect(path.every((index) => {
      const scene = manifest.scenes[index];
      return scene.slug === 'line2_standard' || scene.slug === 'failure_scenario' || scene.id === '04' || scene.id === '06';
    })).toBe(true);
    expect(nextPathIndex(path, path[0], 1)).toBe(path[1]);
    expect(nextPathIndex(path, path[path.length - 1], 1)).toBeNull();
    expect(jumpCommandForScene(manifest.scenes[path[0]])).toBe('cabinet');
    expect(resolveFilmStartScene({ requestedScene: 5, path: 'line2', currentTime: 0, line2Path: path })).toBe(5);
    expect(resolveFilmStartScene({ path: 'line2', currentTime: 0, line2Path: path })).toBe(path[0]);
    expect(manifest.scenes[resolveFilmStartScene({ requestedScene: 5, path: 'line2', currentTime: 0, line2Path: path })].slug).toBe('line2_standard');
    expect(shouldAcceptFilmBeat(0, 5, 'line2')).toBe(false);
    expect(shouldAcceptFilmBeat(5, 5, 'line2')).toBe(true);
  });

  it('disables Ken Burns on cabinet stills and reduced motion, and keeps film lazy', () => {
    const cabinet = manifest.scenes.find((scene) => scene.slug === 'line2_standard')!;
    expect(stillHoldsKenBurns(cabinet.visual)).toBe(true);
    expect(kenBurnsAllowed(true, false)).toBe(false);
    expect(kenBurnsAllowed(false, true)).toBe(false);
    expect(kenBurnsAllowed(false, false)).toBe(true);
    expect(motionKenBurns(true, false)).toBe(false);
    expect(pinBobOffset(1, true)).toBe(0);
    expect(filmAudioPreloadMode()).toBe('none');
    expect(shouldMountFilmFrame(false)).toBe(false);
    expect(shouldMountFilmFrame(true)).toBe(true);
  });
});
