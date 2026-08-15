import { captionAtProgress, captionLinesFromNarration, shouldAcceptFilmBeat, stillHoldsKenBurns } from './filmPlayback';
import { kenBurnsAllowed } from './motion';
import type { FilmSceneRef } from './filmPlayback';

export type VisualToken = 'cabinet' | 'fault' | 'verify' | 'field' | 'people' | 'graph' | 'map' | 'knowledge' | 'plant';

export type BeatStage = {
  index: number;
  caption: string;
  token: VisualToken;
  kenBurns: boolean;
  motion: 'none' | 'hold' | 'rise' | 'pulse';
  still: string | null;
  label: string;
};

const STILLS: Record<string, string> = {
  T00: './presentation/assets/00_opening.png',
  '00': './presentation/assets/00_opening.png',
  '01': './presentation/assets/01_problem.png',
  '02': './presentation/assets/02_breakdown.png',
  '03': './presentation/assets/03_one_place.png',
  '04': './presentation/assets/04_build.png',
  '05': './presentation/assets/05_connect.png',
  '06': './presentation/assets/06_value.png',
  '07': './presentation/assets/07_terminal.png',
  '08': './presentation/assets/07_terminal.png',
  F00: './presentation/assets/07_terminal.png',
};

export function beatIndexAt(lines: string[], progress: number): number {
  if (lines.length === 0) return 0;
  const t = Math.min(1, Math.max(0, progress));
  return Math.min(lines.length - 1, Math.floor(t * lines.length));
}

export function stillForSceneId(id = ''): string | null {
  return STILLS[id] ?? null;
}

export function visualTokenFor(visual = '', slug = '', line = ''): VisualToken {
  const hay = `${visual} ${slug} ${line}`.toLowerCase();
  if (hay.includes('cabinet') || hay.includes('schematic') || hay.includes('layout') || hay.includes('plc') || hay.includes('drive')) return 'cabinet';
  if (hay.includes('fault') || hay.includes('alarm') || hay.includes('stop') || hay.includes('downtime') || hay.includes('warning')) return 'fault';
  if (hay.includes('verified') || hay.includes('field verify') || hay.includes('disputed') || hay.includes('badge')) return 'verify';
  if (hay.includes('photo') || hay.includes('nameplate') || hay.includes('field capture')) return 'field';
  if (hay.includes('people') || hay.includes('electrician') || hay.includes('retire') || hay.includes(' don')) return 'people';
  if (hay.includes('graph') || hay.includes('relationship') || hay.includes('node') || hay.includes('feeds')) return 'graph';
  if (hay.includes('map') || hay.includes('warehouse') || hay.includes('facility layout')) return 'map';
  if (hay.includes('knowledge') || hay.includes('remember') || hay.includes('memory')) return 'knowledge';
  return 'plant';
}

export function motionForBeat(token: VisualToken, kenBurnsHold: boolean, reduced: boolean): BeatStage['motion'] {
  if (reduced) return 'none';
  if (kenBurnsHold) return 'hold';
  if (token === 'fault') return 'pulse';
  return 'rise';
}

export function beatStageFor(
  scene: (FilmSceneRef & { id?: string; title?: string }) | undefined,
  progress: number,
  reduced = false,
): BeatStage {
  const lines = captionLinesFromNarration(scene?.narration ?? '');
  const index = beatIndexAt(lines, progress);
  const caption = captionAtProgress(lines, progress);
  const hold = stillHoldsKenBurns(scene?.visual);
  const token = visualTokenFor(scene?.visual, scene?.slug, caption);
  return {
    index,
    caption,
    token,
    kenBurns: kenBurnsAllowed(reduced, hold),
    motion: motionForBeat(token, hold, reduced),
    still: stillForSceneId(scene?.id),
    label: scene?.slug ?? scene?.title ?? 'intro',
  };
}

export type FilmBeatMessage = {
  source: 'iag-film';
  type: 'beat';
  sceneIndex: number;
  progress: number;
  caption: string;
  visual?: string;
  slug?: string;
  id?: string;
};

export function parseFilmBeat(data: unknown): FilmBeatMessage | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Partial<FilmBeatMessage>;
  if (value.source !== 'iag-film' || value.type !== 'beat') return null;
  if (typeof value.sceneIndex !== 'number' || typeof value.progress !== 'number') return null;
  return {
    source: 'iag-film',
    type: 'beat',
    sceneIndex: value.sceneIndex,
    progress: value.progress,
    caption: typeof value.caption === 'string' ? value.caption : '',
    visual: value.visual,
    slug: value.slug,
    id: value.id,
  };
}

export function sceneProgressInWindow(now: number, start: number, end: number): number {
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function applyIncomingBeat(
  data: unknown,
  expectedScene: number | undefined,
  path: string | null | undefined,
  scenes: Array<FilmSceneRef & { id?: string; title?: string }>,
  reduced = false,
): BeatStage | null {
  const beat = parseFilmBeat(data);
  if (!beat) return null;
  if (!shouldAcceptFilmBeat(beat.sceneIndex, expectedScene, path)) return null;
  const scene = scenes[beat.sceneIndex] ?? {
    id: beat.id,
    slug: beat.slug,
    visual: beat.visual,
    narration: beat.caption,
  };
  return beatStageFor({ ...scene, narration: scene.narration || beat.caption }, beat.progress, reduced);
}
