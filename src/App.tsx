import { useLayoutEffect, useState } from 'react';
import ControlCabinetView from './ControlCabinetView';
import Dashboard, { type AppView } from './Dashboard';
import FilmTheater from './FilmTheater';
import type { FilmCommand } from './lib/filmBridge';
import { genieHoldMini, genieTargetFromCabinet, genieTargetFromUrl } from './lib/filmGenie';
import { subscribeViewport } from './lib/viewport';

function initialView(): AppView {
  const value = new URLSearchParams(location.search).get('view');
  if (value === 'cabinet' || value === 'assets' || value === 'documents') return value;
  return 'dashboard';
}

export default function App() {
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<AppView>(initialView);
  const fromUrl = genieTargetFromUrl(params);
  const cabinetLanding = initialView() === 'cabinet' && fromUrl === null && params.get('scene') === null;
  const [filmScene, setFilmScene] = useState<number | undefined>(() => fromUrl?.scene ?? (Number.isFinite(Number(params.get('scene'))) ? Number(params.get('scene')) : (cabinetLanding ? 5 : undefined)));
  const [filmPath, setFilmPath] = useState<'line2' | undefined>(fromUrl?.path ?? (params.get('path') === 'line2' ? 'line2' : (cabinetLanding ? 'line2' : undefined)));
  const holdOpen = genieHoldMini(location.search);
  const [filmOpen, setFilmOpen] = useState(holdOpen);
  const [filmPlaying, setFilmPlaying] = useState(holdOpen);
  const [pendingCommand, setPendingCommand] = useState<FilmCommand | null>(
    params.get('command') === 'verify' || params.get('command') === 'trace' || params.get('command') === '3d' || params.get('command') === 'map'
      ? params.get('command') as FilmCommand
      : null,
  );
  useLayoutEffect(() => subscribeViewport(() => undefined), []);
  const changeView = (next: AppView) => {
    setView(next);
    const nextParams = new URLSearchParams(location.search);
    if (next === 'dashboard') nextParams.delete('view');
    else nextParams.set('view', next);
    history.replaceState(null, '', `${location.pathname}${nextParams.size ? `?${nextParams}` : ''}`);
  };
  const seekFilm = (scene?: number, path?: 'line2') => {
    setFilmScene(scene);
    setFilmPath(path);
    setFilmOpen(true);
    setFilmPlaying(true);
  };
  return (
    <div className="app-shell has-genie-dock">
      <div className="backdrop" aria-hidden="true" />
      {view === 'cabinet'
        ? <ControlCabinetView onBack={() => changeView('dashboard')} onOpenFilm={() => {
            const target = genieTargetFromCabinet();
            seekFilm(target.scene, target.path);
          }} />
        : (
          <Dashboard
            view={view}
            onView={changeView}
            onOpenCabinet={() => {
              const target = genieTargetFromCabinet();
              setFilmScene(target.scene);
              setFilmPath(target.path);
              changeView('cabinet');
            }}
            onOpenFilm={seekFilm}
            filmPlaying={filmPlaying}
            onToggleFilm={() => setFilmPlaying((value) => !value)}
            pendingCommand={pendingCommand}
            onPendingCommand={setPendingCommand}
          />
        )}
      <FilmTheater
        scene={filmScene}
        path={filmPath}
        playing={filmPlaying}
        opened={filmOpen}
        onOpenedChange={setFilmOpen}
        onPlayingChange={setFilmPlaying}
        onCommand={(command) => {
          if (command === 'cabinet') changeView('cabinet');
          else {
            changeView('dashboard');
            setPendingCommand(command);
          }
        }}
      />
    </div>
  );
}
