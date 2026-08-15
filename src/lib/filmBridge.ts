/** Film → app deep links. Only uses existing area/asset ids. */

export type FilmCommand = 'map' | 'trace' | 'verify' | 'cabinet' | '3d' | 'risk' | 'help';

export type FilmCue = {
  id: string;
  label: string;
  scene: number;
  command?: Exclude<FilmCommand, 'risk' | 'help'>;
  path?: 'line2';
};

export const filmCues: FilmCue[] = [
  { id: 'intro', label: 'Intro', scene: 0 },
  { id: 'line2path', label: 'Line 2 path', scene: 5, path: 'line2' },
  { id: 'line2', label: 'Line 2 cabinet', scene: 5, command: 'cabinet' },
  { id: 'explore', label: 'Map', scene: 3, command: '3d' },
];

export function isFilmCommand(value: string): value is FilmCommand {
  return ['map', 'trace', 'verify', 'cabinet', '3d', 'risk', 'help'].includes(value);
}

export function appQueryForFilmCommand(command: FilmCommand): URLSearchParams {
  const next = new URLSearchParams();
  if (command === 'map') next.set('area', 'area-warehouse-f');
  if (command === 'trace') {
    next.set('area', 'area-warehouse-f');
    next.set('asset', 'L2-CC-001');
    next.set('command', 'trace');
  }
  if (command === 'verify') {
    next.set('area', 'area-warehouse-f');
    next.set('asset', 'L2-CC-001');
    next.set('command', 'verify');
  }
  if (command === 'cabinet') next.set('view', 'cabinet');
  if (command === '3d') {
    next.set('area', 'area-warehouse-f');
    next.set('map', '2d');
  }
  return next;
}

export function appHrefForFilmCommand(command: FilmCommand, base = '../'): string {
  if (command === 'risk' || command === 'help') return '';
  const query = appQueryForFilmCommand(command).toString();
  return `${base}${query ? `?${query}` : ''}`;
}

export function filmChapterForAsset(assetId: string): { scene: number; path?: 'line2' } | null {
  if (assetId === 'L2-CC-001') return { scene: 5, path: 'line2' };
  return null;
}

export function filmHonestyForAsset(assetId: string): { kind: 'chapter'; scene: number; path?: 'line2' } | { kind: 'intro-only'; scene: 0; note: string } {
  const chapter = filmChapterForAsset(assetId);
  if (chapter) return { kind: 'chapter', ...chapter };
  return { kind: 'intro-only', scene: 0, note: 'No L4 chapter is mapped. Intro only — the app does not invent a scene.' };
}

export function filmEmbedSrc(scene?: number, options?: { path?: 'line2' }): string {
  const params = new URLSearchParams({ embed: '1' });
  if (scene !== undefined && Number.isFinite(scene) && scene >= 0) params.set('scene', String(scene));
  if (options?.path === 'line2') params.set('path', 'line2');
  return `./presentation/?${params}`;
}

export type FilmMessage =
  | { source: 'iag-film'; type: 'open'; command: FilmCommand }
  | { source: 'iag-film'; type: 'close' }
  | { source: 'iag-film'; type: 'ready' };

export function parseFilmMessage(data: unknown): FilmMessage | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as { source?: string; type?: string; command?: string };
  if (value.source !== 'iag-film') return null;
  if (value.type === 'close' || value.type === 'ready') return { source: 'iag-film', type: value.type };
  if (value.type === 'open' && value.command && isFilmCommand(value.command)) {
    return { source: 'iag-film', type: 'open', command: value.command };
  }
  return null;
}
