const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

document.querySelector('#ccBtn')?.remove();

const audio = $('#completeFilm');
const startOverlay = $('#startOverlay');
const endScreen = $('#endScreen');
const chapterNum = $('#chapterNum');
const chapterTitle = $('#chapterTitle');
const statusText = $('#statusText');
const playBtn = $('#playBtn');
const progressBar = $('#progressBar');
const runtime = $('#runtime');
const terminal = $('#terminal');
const terminalOutput = $('#terminalOutput');
const introScene = $('.tyler-intro');
const finaleScene = $('.solana-finale');
const liveJump = $('#liveJump');
const chaptersBtn = $('#chaptersBtn');
const chapterButtons = $('#chapterButtons');
const pathBar = $('.path-bar');
const fullPathBtn = $('#fullPathBtn');
const line2PathBtn = $('#line2PathBtn');

// One continuous MP3 is the only playback clock. The component source tracks
// remain in the repository for replacement, but browsers never hand off between them.
const segmentTimes = { introEnd: 132.859, mainEnd: 410.880, total: 531.509 };
const masterDuration = segmentTimes.mainEnd - segmentTimes.introEnd;
const cueFractions = [0, .0849, .2173, .3324, .4302, .5571, .6676, .7780, .8942];
const introPhaseFractions = [0, .10, .27, .43, .60, .75, .90];
const finalePhaseFractions = [0, .16, .38, .62, .78, .91];
let chapters = [];
let sceneIndex = 0;
let ready = false;

const params = new URLSearchParams(location.search);
const embedded = params.has('embed') || window.parent !== window;
const requestedScene = Number(params.get('scene'));
const startOnLine2 = params.get('path') === 'line2';
if (embedded) document.documentElement.classList.add('embed');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) document.documentElement.classList.add('reduce-motion');

let line2Only = startOnLine2;
let line2Path = [5, 7];
let manifestScenes = [];

function line2PathIndexes(scenes) {
  return scenes.flatMap((scene, index) => (scene.slug === 'line2_standard' || scene.slug === 'failure_scenario' || scene.id === '04' || scene.id === '06' ? [index] : []));
}
function stillHoldsKenBurns(visual) {
  const text = String(visual || '').toLowerCase();
  return text.includes('cabinet') || text.includes('schematic') || text.includes('layout');
}
function jumpCommandForScene(scene) {
  const slug = scene?.slug || '';
  if (slug === 'line2_standard' || slug === 'failure_scenario') return 'cabinet';
  if (slug === 'the_answer' || slug === 'what_we_are_building') return '3d';
  return null;
}
function nextPathIndex(path, current, delta) {
  if (!path.length) return null;
  const at = path.indexOf(current);
  if (at < 0) return path[0];
  const next = at + delta;
  if (next < 0 || next >= path.length) return null;
  return path[next];
}

function ensureAudio() {
  if (!audio.getAttribute('src')) {
    const src = audio.dataset.src || 'audio/complete-project-film.mp3';
    audio.src = src;
  }
}

const commands = {
  risk: '45 years in the trade · 15 years at this facility\nWARNING: Undocumented operational knowledge is approaching retirement.',
  map: '11 facility areas indexed.\nBuilding layout is the navigation layer.\nBuilding → Area → Equipment → Evidence.',
  trace: 'Warehouse F / Line 2\nArea → Machine → Cabinet → Controls → Evidence\nRelationship path ready.',
  verify: 'Verified · Field verify · Inferred · Disputed · Retired\nEvery claim carries a source and review state.',
  cabinet: 'Line 2 conveyor control cabinet · L2-CC-INT-001 Rev A\n50 indexed devices. No inferred wiring.',
  '3d': 'Schematic 3D facility map · Warehouse F highlighted.\nOrbit, click a building, open a documented asset.',
  help: 'Controls: Play/Pause · Previous/Next · Replay · Fullscreen\nUse the chapter buttons to move through the film.'
};

const appHrefs = {
  map: '../?area=area-warehouse-f',
  trace: '../?area=area-warehouse-f&asset=L2-CC-001&command=trace',
  verify: '../?area=area-warehouse-f&asset=L2-CC-001&command=verify',
  cabinet: '../?view=cabinet',
  '3d': '../?area=area-warehouse-f&map=2d',
};

function openInApp(command) {
  if (embedded && window.parent !== window) {
    window.parent.postMessage({ source: 'iag-film', type: 'open', command }, '*');
    return;
  }
  const href = appHrefs[command];
  if (href) location.href = href;
}

const fallbackScenes = [
  ['Introduction', 'Tyler Intro — Why I Started This'],
  ['Opening', 'Cold Open — What a Plant Really Runs On'],
  ['01', 'The Problem — Knowledge Walks Out the Door'],
  ['02', 'The Answer — Industrial Asset Graph'],
  ['03', 'Capture Reality — Evidence, Not Guesswork'],
  ['04', 'Build the Standard — Line 2 Control Cabinet'],
  ['05', 'Capture the Human Knowledge'],
  ['06', 'When the Line Stops'],
  ['07', 'What We Are Actually Building'],
  ['Closing', 'Closing — Leave the Knowledge Behind'],
  ['Finale', 'Finale — Leave the Knowledge Behind']
].map(([num, title], index) => ({ num, title, shortTitle: title.split(' — ')[0], index }));

function formatTime(seconds) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function duration() { return Number.isFinite(audio.duration) ? audio.duration : segmentTimes.total; }

function sceneStart(index) {
  if (index <= 0) return 0;
  if (index >= chapters.length - 1) return segmentTimes.mainEnd;
  return segmentTimes.introEnd + cueFractions[index - 1] * masterDuration;
}

function sceneAt(time) {
  let result = 0;
  for (let index = 1; index < chapters.length; index += 1) {
    if (time >= sceneStart(index)) result = index;
  }
  return result;
}

function resolveStartScene() {
  if (line2Only) {
    if (Number.isFinite(requestedScene) && requestedScene >= 0 && (!line2Path.length || line2Path.includes(requestedScene))) {
      return requestedScene;
    }
    return line2Path[0] ?? 5;
  }
  if (Number.isFinite(requestedScene) && requestedScene >= 0) return requestedScene;
  return sceneAt(audio.currentTime || 0);
}

function updateCinematicPhases() {
  if (sceneIndex === 0 && introScene) {
    const position = Math.min(1, audio.currentTime / segmentTimes.introEnd);
    let phase = 0;
    introPhaseFractions.forEach((fraction, index) => { if (position >= fraction) phase = index; });
    introScene.dataset.phase = String(phase);
  }
  if (sceneIndex === chapters.length - 1 && finaleScene) {
    const position = Math.min(1, (audio.currentTime - segmentTimes.mainEnd) / Math.max(.1, duration() - segmentTimes.mainEnd));
    let phase = 0;
    finalePhaseFractions.forEach((fraction, index) => { if (position >= fraction) phase = index; });
    finaleScene.dataset.phase = String(phase);
  }
  const board = document.querySelector('.scene.active.board-scene');
  if (board) {
    const progress = sceneLocalProgress();
    board.dataset.beat = progress < .3 ? '0' : progress < .64 ? '1' : '2';
  }
}

function updateScene(index = sceneIndex) {
  sceneIndex = Math.max(0, Math.min(chapters.length - 1, index));
  $$('.scene').forEach((element, i) => {
    element.classList.toggle('active', i === sceneIndex);
    const visual = manifestScenes[i]?.visual || '';
    element.classList.toggle('still-hold', stillHoldsKenBurns(visual) || element.classList.contains('still-hold'));
  });
  $$('.chapter-btn').forEach((element) => element.classList.toggle('active', Number(element.dataset.scene) === sceneIndex));
  chapterNum.textContent = chapters[sceneIndex]?.num || '';
  chapterTitle.textContent = chapters[sceneIndex]?.title || '';
  terminal.classList.toggle('show', sceneIndex === chapters.length - 2);
  const command = jumpCommandForScene(manifestScenes[sceneIndex] || {});
  if (liveJump) {
    liveJump.hidden = !command;
    liveJump.dataset.command = command || '';
    liveJump.textContent = command === 'cabinet' ? 'Open Line 2 cabinet' : command === '3d' ? 'Open map' : 'Open in the live graph';
  }
  updateCinematicPhases();
  emitBeat();
}

function sceneLocalProgress() {
  const start = sceneStart(sceneIndex);
  const end = sceneIndex >= chapters.length - 1 ? duration() : sceneStart(sceneIndex + 1);
  return (audio.currentTime - start) / Math.max(0.1, end - start);
}

function emitBeat() {
  if (!embedded || window.parent === window) return;
  const scene = manifestScenes[sceneIndex] || {};
  const progress = sceneLocalProgress();
  window.parent.postMessage({
    source: 'iag-film',
    type: 'beat',
    sceneIndex,
    progress,
    caption: '',
    visual: scene.visual || '',
    slug: scene.slug || '',
    id: scene.id || '',
  }, '*');
}

function updateFromAudio() {
  if (!ready) return;
  let next = sceneAt(audio.currentTime);
  if (line2Only && line2Path.length && !line2Path.includes(next)) {
    const upcoming = line2Path.find((index) => sceneStart(index) > audio.currentTime);
    if (upcoming === undefined) {
      audio.pause();
      endScreen.classList.add('show');
      setPlayingUi(false);
      return;
    }
    audio.currentTime = sceneStart(upcoming) + .01;
    next = upcoming;
  }
  if (next !== sceneIndex) updateScene(next);
  updateCinematicPhases();
  emitBeat();
  progressBar.style.width = `${Math.min(100, (audio.currentTime / duration()) * 100)}%`;
  runtime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration())} · Scene ${sceneIndex + 1} of ${chapters.length}`;
}

function setPlayingUi(playing) {
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  statusText.textContent = playing ? `Playing · ${chapters[sceneIndex]?.title || ''}` : 'Paused';
}

async function playFilm() {
  endScreen.classList.remove('show');
  ensureAudio();
  try { await audio.play(); setPlayingUi(true); }
  catch { statusText.textContent = 'Tap Play to allow audio'; }
}

function startPresentation() {
  if (!ready) return;
  startOverlay.style.display = 'none';
  const first = line2Only && line2Path.length ? line2Path[0] : 0;
  ensureAudio();
  audio.currentTime = sceneStart(first);
  updateScene(first); updateFromAudio();
  playFilm();
}

function replayPresentation() {
  startOverlay.style.display = 'none';
  endScreen.classList.remove('show');
  startPresentation();
}

function goToScene(index) {
  if (!ready) return;
  let next = Math.max(0, Math.min(chapters.length - 1, index));
  if (line2Only && line2Path.length && !line2Path.includes(next)) {
    const mapped = nextPathIndex(line2Path, sceneIndex, next > sceneIndex ? 1 : -1);
    if (mapped === null) return;
    next = mapped;
  }
  const wasPlaying = !audio.paused;
  audio.pause();
  ensureAudio();
  audio.currentTime = sceneStart(next) + .01;
  updateScene(next); updateFromAudio();
  if (wasPlaying) playFilm(); else setPlayingUi(false);
}

function buildChapterButtons() {
  const wrap = $('#chapterButtons');
  wrap.innerHTML = '';
  const visible = line2Only && line2Path.length ? line2Path : chapters.map((_, index) => index);
  visible.forEach((index) => {
    const chapter = chapters[index];
    if (!chapter) return;
    const button = document.createElement('button');
    button.className = 'chapter-btn';
    button.dataset.scene = String(index);
    button.textContent = `${index + 1}. ${chapter.shortTitle}`;
    button.addEventListener('click', () => goToScene(index));
    wrap.appendChild(button);
  });
}

function setPathMode(nextLine2) {
  line2Only = nextLine2;
  fullPathBtn?.classList.toggle('active', !line2Only);
  line2PathBtn?.classList.toggle('active', line2Only);
  buildChapterButtons();
  if (line2Only && line2Path.length && !line2Path.includes(sceneIndex)) goToScene(line2Path[0]);
  else updateScene(sceneIndex);
}

function markReady() {
  if (!chapters.length) return;
  ready = true;
  $('#startBtn').disabled = false;
  statusText.textContent = `Ready · ${formatTime(duration())} continuous film`;
  runtime.textContent = `${formatTime(duration())} · ${chapters.length} scenes`;
  updateScene(0);
}

chapters = fallbackScenes;
buildChapterButtons();
markReady();

audio.addEventListener('loadedmetadata', markReady);
audio.addEventListener('timeupdate', updateFromAudio);
audio.addEventListener('play', () => setPlayingUi(true));
audio.addEventListener('pause', () => { if (!audio.ended && audio.currentTime > 0) setPlayingUi(false); });
audio.addEventListener('error', () => { statusText.textContent = 'Narration could not load. Refresh and try again.'; });
audio.addEventListener('ended', () => {
  updateScene(chapters.length - 1);
  progressBar.style.width = '100%';
  playBtn.textContent = '↻ Replay';
  statusText.textContent = 'Presentation complete';
  endScreen.classList.add('show');
});

$('#startBtn').disabled = false;
$('#startBtn').addEventListener('click', startPresentation);
playBtn.addEventListener('click', () => {
  if (audio.ended || audio.currentTime >= duration() - .1) replayPresentation();
  else if (audio.paused) playFilm();
  else audio.pause();
});
$('#prevBtn').addEventListener('click', () => goToScene(sceneIndex - 1));
$('#nextBtn').addEventListener('click', () => goToScene(sceneIndex + 1));
$('#replayBtn').addEventListener('click', replayPresentation);
$('#endReplay').addEventListener('click', replayPresentation);
$('#endCabinet')?.addEventListener('click', () => openInApp('cabinet'));
$('#end3d')?.addEventListener('click', () => openInApp('3d'));
fullPathBtn?.addEventListener('click', () => setPathMode(false));
line2PathBtn?.addEventListener('click', () => setPathMode(true));
liveJump?.addEventListener('click', () => {
  const command = liveJump.dataset.command;
  if (command) openInApp(command);
});
$('#exitBtn').addEventListener('click', () => {
  audio.pause();
  if (embedded && window.parent !== window) window.parent.postMessage({ source: 'iag-film', type: 'close' }, '*');
  else location.href = '../';
});
$('#fullBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
chaptersBtn?.addEventListener('click', () => {
  const open = !chapterButtons?.classList.contains('open');
  chapterButtons?.classList.toggle('open', open);
  pathBar?.classList.toggle('open', open);
  chaptersBtn.setAttribute('aria-expanded', String(open));
});
$$('[data-command]').forEach(button => button.addEventListener('click', () => {
  const command = button.dataset.command;
  terminalOutput.textContent = commands[command] || '';
  if (['map', 'trace', 'verify', 'cabinet', '3d'].includes(command)) {
    const action = document.createElement('button');
    action.textContent = 'OPEN IN APP';
    action.style.cssText = 'display:inline-block;margin-top:8px;color:#091120;background:#5eead4;border:0;border-radius:8px;padding:8px 12px;font-weight:800';
    action.addEventListener('click', () => openInApp(command));
    terminalOutput.append('\n');
    terminalOutput.append(action);
  }
}));

if (Number.isFinite(requestedScene) && requestedScene >= 0 || line2Only) {
  ensureAudio();
  audio.addEventListener('loadedmetadata', () => goToScene(resolveStartScene()), { once: true });
}

if (line2Only) setPathMode(true);

fetch('narration-manifest.json')
  .then(response => { if (!response.ok) throw new Error(`Narration manifest: ${response.status}`); return response.json(); })
  .then(manifest => {
    manifestScenes = manifest.scenes;
    line2Path = line2PathIndexes(manifestScenes);
    chapters = manifest.scenes.map((scene, index) => ({
      num: scene.id === 'T00' ? 'Introduction' : scene.id === '00' ? 'Opening' : scene.id === '08' ? 'Closing' : scene.id === 'F00' ? 'Finale' : scene.id,
      title: scene.title,
      shortTitle: scene.title.split(' — ')[0],
      index
    }));
    if (line2Only) setPathMode(true);
    else buildChapterButtons();
    const start = resolveStartScene();
    updateScene(start);
    emitBeat();
    markReady();
    if (audio.readyState >= 1) goToScene(start);
  })
  .catch(error => console.error(error));

addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); playBtn.click(); }
  if (event.key === 'ArrowLeft') goToScene(sceneIndex - 1);
  if (event.key === 'ArrowRight') goToScene(sceneIndex + 1);
  if (event.key.toLowerCase() === 'f') $('#fullBtn').click();
});
