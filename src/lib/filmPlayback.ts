/** Caption, short-path, Ken Burns, and lazy-load helpers used by the film player and theater. */

export const LINE2_PATH_SLUGS = ['line2_standard', 'failure_scenario'] as const;

export type FilmSceneRef = { slug?: string; id?: string; visual?: string; narration?: string };

export function captionLinesFromNarration(narration: string): string[] {
  return narration
    .split('\n')
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function captionAtProgress(lines: string[], progress: number): string {
  if (lines.length === 0) return '';
  const t = Math.min(1, Math.max(0, progress));
  return lines[Math.min(lines.length - 1, Math.floor(t * lines.length))];
}

export function line2PathIndexes(scenes: FilmSceneRef[]): number[] {
  return scenes.flatMap((scene, index) => {
    const slug = scene.slug ?? '';
    const id = scene.id ?? '';
    if (LINE2_PATH_SLUGS.includes(slug as (typeof LINE2_PATH_SLUGS)[number]) || id === '04' || id === '06') return [index];
    return [];
  });
}

export function stillHoldsKenBurns(visual = ''): boolean {
  const text = visual.toLowerCase();
  return text.includes('cabinet') || text.includes('schematic') || text.includes('layout');
}

export { kenBurnsAllowed } from './motion';

export function jumpCommandForScene(scene: FilmSceneRef): 'cabinet' | '3d' | null {
  const slug = scene.slug ?? '';
  if (slug === 'line2_standard' || slug === 'failure_scenario') return 'cabinet';
  if (slug === 'the_answer' || slug === 'what_we_are_building') return '3d';
  return null;
}

export function nextPathIndex(path: number[], current: number, delta: number): number | null {
  if (path.length === 0) return null;
  const at = path.indexOf(current);
  if (at < 0) return path[0];
  const next = at + delta;
  if (next < 0 || next >= path.length) return null;
  return path[next];
}

export function filmAudioPreloadMode(): 'none' {
  return 'none';
}

export function shouldMountFilmFrame(theaterOpen: boolean): boolean {
  return theaterOpen;
}

/** Query scene/path wins over currentTime=0 before audio metadata exists. */
export function resolveFilmStartScene(options: {
  requestedScene?: number | null;
  path?: string | null;
  currentTime?: number;
  line2Path?: number[];
}): number {
  const path = options.line2Path ?? [];
  const requested = options.requestedScene;
  const hasRequested = typeof requested === 'number' && Number.isFinite(requested) && requested >= 0;
  if (options.path === 'line2') {
    if (hasRequested && (path.length === 0 || path.includes(requested))) return requested;
    return path[0] ?? 5;
  }
  if (hasRequested) return requested;
  if ((options.currentTime ?? 0) <= 0) return 0;
  return 0;
}

export function shouldAcceptFilmBeat(beatSceneIndex: number, expectedScene?: number, path?: string | null): boolean {
  if (typeof expectedScene === 'number' && expectedScene > 0 && beatSceneIndex === 0) return false;
  if (path === 'line2' && beatSceneIndex === 0 && (expectedScene ?? 5) !== 0) return false;
  return true;
}

export function sceneProgress(now: number, start: number, end: number): number {
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}
