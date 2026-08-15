import {
  filmChapterForAsset,
  filmCues,
  filmEmbedSrc,
  filmHonestyForAsset,
  type FilmCommand,
  type FilmCue,
} from './filmBridge';

export type GenieSource = 'header' | 'find' | 'cabinet' | 'asset' | 'url' | 'cue';

export type GenieTarget = {
  scene?: number;
  path?: 'line2';
  source: GenieSource;
};

export type GenieAction = {
  id: string;
  label: string;
  kind: 'play' | 'jump';
  scene: number;
  path?: 'line2';
  command?: Exclude<FilmCommand, 'risk' | 'help'>;
};

export function genieActions(cues: FilmCue[] = filmCues): GenieAction[] {
  return cues.map((cue) => ({
    id: cue.id,
    label: cue.label,
    kind: cue.command ? 'jump' : 'play',
    scene: cue.scene,
    path: cue.path,
    command: cue.command,
  }));
}

export function genieTargetFromUrl(search: string | URLSearchParams): GenieTarget | null {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  const flagged = params.get('film') === '1' || params.get('view') === 'film';
  const sceneRaw = params.get('scene');
  const parsed = sceneRaw === null ? undefined : Number(sceneRaw);
  const scene = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  const path = params.get('path') === 'line2' ? 'line2' as const : undefined;
  if (!flagged && scene === undefined && !path) return null;
  return { scene, path, source: 'url' };
}

export function genieTargetFromAsset(assetId: string): GenieTarget {
  const honesty = filmHonestyForAsset(assetId);
  if (honesty.kind === 'chapter') return { scene: honesty.scene, path: honesty.path, source: 'asset' };
  return { scene: 0, source: 'asset' };
}

export function genieTargetFromCabinet(): GenieTarget {
  return { scene: 5, path: 'line2', source: 'cabinet' };
}

export function genieTargetFromHeader(): GenieTarget {
  return { source: 'header' };
}

export function genieTargetFromFind(scene = 0): GenieTarget {
  return { scene, source: 'find' };
}

export function genieTargetFromCue(cue: FilmCue): GenieTarget {
  return { scene: cue.scene, path: cue.path, source: 'cue' };
}

export type GenieShow = 'mini' | 'dock';

export function genieChromeMode(): 'clock' | 'dock' {
  return 'dock';
}

export function genieHoldMini(search: string | URLSearchParams): boolean {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  return params.get('hold') === 'mini' || params.get('film') === '1' || params.get('view') === 'film';
}

export function genieMotionReduced(search: string | URLSearchParams, matchMediaReduced: boolean): boolean {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  if (params.get('motion') === 'full') return false;
  if (params.get('motion') === 'reduce') return true;
  return matchMediaReduced;
}

/** Dock bar is the default. Mini only after the user opens the tour or holds ?film=1. */
export function genieFirstShow(_reduced = false): GenieShow {
  return 'dock';
}

export function genieShouldAutoplay(): false {
  return false;
}

export function genieCollapseMs(reduced: boolean): number {
  return reduced ? 0 : 560;
}

/** Stay mini if the user continues the tour or asked for the film; otherwise settle into the dock. */
export function genieShowAfterWait(continuedTour: boolean, holdMini = false): GenieShow {
  return continuedTour || holdMini ? 'mini' : 'dock';
}

export function geniePresentMs(reduced: boolean): number {
  return genieCollapseMs(reduced);
}

export function genieDismissMs(reduced: boolean): number {
  return genieCollapseMs(reduced);
}

export function genieDockClass(reduced: boolean, show: GenieShow = 'dock'): string {
  const parts = ['film-genie', show === 'mini' ? 'is-mini' : 'is-dock', 'is-open'];
  if (reduced) parts.push('is-instant');
  return parts.join(' ');
}

export function genieSheetClass(open: boolean, reduced: boolean): string {
  return genieDockClass(reduced);
}

export function standalonePresentationHref(): string {
  return './presentation/';
}

export function genieEmbedSrc(target: Pick<GenieTarget, 'scene' | 'path'>): string {
  return filmEmbedSrc(target.scene, { path: target.path });
}

export function geniePreservesChapter(assetId: string): { scene: number; path?: 'line2' } | { scene: 0 } {
  return filmChapterForAsset(assetId) ?? { scene: 0 };
}
