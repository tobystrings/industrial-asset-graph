import { useEffect, useRef, useState } from 'react';
import { filmLiveCommandForScene, parseFilmMessage, type FilmCommand } from './lib/filmBridge';
import { beatStageFor, type BeatStage } from './lib/filmBeats';
import {
  FILM_AUDIO_SRC,
  FILM_SEGMENT_TIMES,
  filmClockRatio,
  filmSceneAt,
  filmSceneProgress,
  formatFilmClock,
  genieClockStart,
  geniePrimaryChrome,
} from './lib/filmClock';
import {
  genieActions,
  genieChromeMode,
  genieCollapseMs,
  genieDockClass,
  genieFirstShow,
  genieHoldMini,
  genieMotionReduced,
  geniePresentMs,
  genieShouldAutoplay,
  genieShowAfterWait,
  standalonePresentationHref,
  type GenieShow,
  type GenieTarget,
} from './lib/filmGenie';
import { line2PathIndexes, resolveFilmStartScene, type FilmSceneRef } from './lib/filmPlayback';
import { prefersReducedMotion } from './lib/motion';

type ManifestScene = FilmSceneRef & { id?: string; title?: string };

function BeatStageView({ beat }: { beat: BeatStage }) {
  return (
    <div className="film-beat-stage" data-testid="film-beat" data-token={beat.token} data-motion={beat.motion} data-kenburns={beat.kenBurns ? 'on' : 'off'}>
      {beat.still && <img className={beat.kenBurns ? 'beat-still is-live' : 'beat-still is-hold'} src={beat.still} alt="" />}
    </div>
  );
}

export default function FilmTheater({
  scene,
  path,
  playing = false,
  opened = false,
  onOpenedChange,
  onPlayingChange,
  onCommand,
}: {
  scene?: number;
  path?: 'line2';
  playing?: boolean;
  opened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  onPlayingChange?: (playing: boolean) => void;
  onCommand: (command: FilmCommand) => void;
}) {
  const [landingSearch] = useState(() => (typeof location === 'undefined' ? '' : location.search));
  const liveSearch = typeof location === 'undefined' ? landingSearch : location.search;
  const search = genieHoldMini(liveSearch) ? liveSearch : landingSearch || liveSearch;
  const reduced = genieMotionReduced(liveSearch || landingSearch, prefersReducedMotion());
  const holdMini = genieHoldMini(search) || genieHoldMini(landingSearch);
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekRef = useRef(true);
  const tourRef = useRef(false);
  const guidedSceneRef = useRef<number | null>(null);
  const [localScene, setLocalScene] = useState(scene);
  const [localPath, setLocalPath] = useState(path);
  const [clockIndex, setClockIndex] = useState(scene ?? 0);
  const [clockTime, setClockTime] = useState(0);
  const [scenes, setScenes] = useState<ManifestScene[]>([]);
  const [beat, setBeat] = useState<BeatStage>(() => beatStageFor(undefined, 0, reduced));
  const [showOverride, setShowOverride] = useState<GenieShow | null>(null);
  const show: GenieShow = showOverride ?? ((opened || holdMini) ? 'mini' : genieFirstShow(reduced));
  useEffect(() => {
    seekRef.current = true;
    setLocalScene(scene);
    setLocalPath(path);
  }, [scene, path]);
  useEffect(() => {
    fetch(new URL('./presentation/narration-manifest.json', document.baseURI).href)
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { scenes?: ManifestScene[] } | null) => {
        if (manifest?.scenes) setScenes(manifest.scenes);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const pathIndexes = line2PathIndexes(scenes);
    const index = resolveFilmStartScene({ requestedScene: localScene, path: localPath, currentTime: 0, line2Path: pathIndexes });
    const current = scenes[index];
    if (current) setBeat(beatStageFor(current, 0, reduced));
    if (!seekRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const start = genieClockStart({ scene: localScene, path: localPath, sceneCount: scenes.length || 11, line2Path: pathIndexes });
    audio.currentTime = start;
    setClockTime(start);
    setClockIndex(index);
    seekRef.current = false;
  }, [scenes, localScene, localPath, reduced]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [playing]);
  useEffect(() => {
    if (genieShouldAutoplay()) onPlayingChange?.(true);
  }, [onPlayingChange]);
  useEffect(() => {
    if (holdMini || opened || tourRef.current) {
      setShowOverride('mini');
      return;
    }
    setShowOverride(genieShowAfterWait(false, false));
  }, [holdMini, opened]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        tourRef.current = false;
        setShowOverride('dock');
        onOpenedChange?.(false);
        onPlayingChange?.(false);
        audioRef.current?.pause();
      }
    };
    const onMessage = (event: MessageEvent) => {
      const message = parseFilmMessage(event.data);
      if (!message) return;
      if (message.type === 'close') {
        tourRef.current = false;
        setShowOverride('dock');
        onOpenedChange?.(false);
        onPlayingChange?.(false);
        audioRef.current?.pause();
      }
      if (message.type === 'open') onCommand(message.command);
    };
    addEventListener('keydown', onKey);
    addEventListener('message', onMessage);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('message', onMessage);
    };
  }, [onCommand, onOpenedChange, onPlayingChange]);
  const continueTour = () => {
    tourRef.current = true;
    setShowOverride('mini');
    onOpenedChange?.(true);
    onPlayingChange?.(true);
  };
  const seekTo = (next: Pick<GenieTarget, 'scene' | 'path'>) => {
    continueTour();
    seekRef.current = true;
    setLocalScene(next.scene);
    setLocalPath(next.path);
  };
  const onTime = () => {
    const audio = audioRef.current;
    if (!audio || !scenes.length) return;
    const index = filmSceneAt(audio.currentTime, scenes.length);
    const progress = filmSceneProgress(audio.currentTime, index, scenes.length);
    const current = scenes[index];
    if (current) setBeat(beatStageFor(current, progress, reduced));
    if (playing && (opened || tourRef.current) && guidedSceneRef.current !== index) {
      guidedSceneRef.current = index;
      onCommand(filmLiveCommandForScene(index));
    }
    setClockIndex(index);
    setClockTime(audio.currentTime);
  };
  const togglePlay = () => {
    if (playing) onPlayingChange?.(false);
    else continueTour();
  };
  const seekRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(1, Math.max(0, ratio)) * FILM_SEGMENT_TIMES.total;
    audio.currentTime = next;
    const index = filmSceneAt(next, scenes.length || 11);
    const current = scenes[index];
    if (current) setBeat(beatStageFor(current, filmSceneProgress(next, index, scenes.length || 11), reduced));
    setClockIndex(index);
    setClockTime(next);
  };
  const actionCurrent = (action: ReturnType<typeof genieActions>[number]) => {
    if (action.kind === 'play') return action.scene === clockIndex;
    if (action.command === 'cabinet') return clockIndex === 5;
    if (action.command === '3d') return clockIndex === 3;
    return false;
  };
  return (
    <div
      className="film-genie-root"
      data-testid="film-genie"
      data-mode={show === 'mini' ? 'mini' : genieChromeMode()}
      data-show={show}
      data-chrome={geniePrimaryChrome()}
      data-playing={playing ? 'true' : 'false'}
      style={{ ['--genie-ms' as string]: `${geniePresentMs(reduced)}ms`, ['--genie-collapse-ms' as string]: `${genieCollapseMs(reduced)}ms` }}
    >
      <section className={genieDockClass(reduced, show)} aria-label="Project film Genie">
        {show === 'mini' && (
          <div className="film-mini-bar" data-testid="film-mini">
            <strong>Live graph tour</strong>
            <button type="button" className="film-tour-continue" data-testid="film-tour-continue" onClick={continueTour}>Continue tour</button>
          </div>
        )}
        <BeatStageView beat={beat} />
        <nav className="film-genie-actions" aria-label="Film chapters and jumps">
          {genieActions().map((action) => (
            <button
              key={action.id}
              type="button"
              data-kind={action.kind}
              className={actionCurrent(action) ? 'is-current' : ''}
              onClick={() => {
                continueTour();
                if (action.kind === 'jump' && action.command) onCommand(action.command);
                else seekTo({ scene: action.scene, path: action.path });
              }}
            >
              {action.label}
            </button>
          ))}
        </nav>
        <div className="film-clock-bar" data-testid="film-clock">
          <button type="button" className={playing ? 'is-current' : ''} onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
          <a href={standalonePresentationHref()} target="_blank" rel="noopener noreferrer">Standalone ↗</a>
        </div>
        <div className="film-clock-meter">
          <button
            type="button"
            className="film-clock-track"
            data-testid="film-clock-progress"
            aria-label="Seek film"
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              if (box.width <= 0) return;
              seekRatio((event.clientX - box.left) / box.width);
            }}
          >
            <i style={{ width: `${Math.round(filmClockRatio(clockTime) * 100)}%` }} />
          </button>
          <span data-testid="film-clock-time">{formatFilmClock(clockTime)} / {formatFilmClock(FILM_SEGMENT_TIMES.total)}</span>
        </div>
        <audio
          ref={audioRef}
          className="film-clock-audio"
          src={FILM_AUDIO_SRC}
          preload="metadata"
          onTimeUpdate={onTime}
          onEnded={() => onPlayingChange?.(false)}
        />
      </section>
    </div>
  );
}
