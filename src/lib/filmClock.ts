import { resolveFilmStartScene } from './filmPlayback';

/** Same continuous-MP3 clock the presentation player uses. Not regenerated audio. */
export const FILM_AUDIO_SRC = './presentation/audio/complete-project-film.mp3';

export const FILM_SEGMENT_TIMES = { introEnd: 132.859, mainEnd: 410.880, total: 531.509 } as const;

const MASTER = FILM_SEGMENT_TIMES.mainEnd - FILM_SEGMENT_TIMES.introEnd;
const CUE_FRACTIONS = [0, 0.0849, 0.2173, 0.3324, 0.4302, 0.5571, 0.6676, 0.7780, 0.8942];

export function filmSceneStart(index: number, sceneCount = 11): number {
  if (index <= 0) return 0;
  if (index >= sceneCount - 1) return FILM_SEGMENT_TIMES.mainEnd;
  const cue = CUE_FRACTIONS[index - 1] ?? 1;
  return FILM_SEGMENT_TIMES.introEnd + cue * MASTER;
}

export function filmSceneAt(time: number, sceneCount = 11): number {
  let result = 0;
  for (let index = 1; index < sceneCount; index += 1) {
    if (time >= filmSceneStart(index, sceneCount)) result = index;
  }
  return result;
}

export function filmSceneProgress(time: number, index: number, sceneCount = 11): number {
  const start = filmSceneStart(index, sceneCount);
  const end = index >= sceneCount - 1 ? FILM_SEGMENT_TIMES.total : filmSceneStart(index + 1, sceneCount);
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

export function genieClockStart(options: { scene?: number; path?: 'line2' | null; sceneCount?: number; line2Path?: number[] }): number {
  const index = resolveFilmStartScene({
    requestedScene: options.scene,
    path: options.path,
    currentTime: 0,
    line2Path: options.line2Path ?? [5, 7],
  });
  return filmSceneStart(index, options.sceneCount ?? 11);
}

export function filmClockRatio(time: number): number {
  if (FILM_SEGMENT_TIMES.total <= 0) return 0;
  return Math.min(1, Math.max(0, time / FILM_SEGMENT_TIMES.total));
}

export function formatFilmClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function geniePrimaryChrome(): 'clock' {
  return 'clock';
}
