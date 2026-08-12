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

const commands = {
  risk: '45 years in the trade · 15 years at this facility\nWARNING: Undocumented operational knowledge is approaching retirement.',
  map: '11 facility areas indexed.\nBuilding layout is the navigation layer.\nBuilding → Area → Equipment → Evidence.',
  trace: 'Warehouse F / Line 2\nArea → Machine → Cabinet → Controls → Evidence\nRelationship path ready.',
  verify: 'Verified · Field verify · Inferred · Disputed · Retired\nEvery claim carries a source and review state.',
  help: 'Controls: Play/Pause · Previous/Next · Replay · Fullscreen\nUse the chapter buttons to move through the film.'
};

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
}

function updateScene(index = sceneIndex) {
  sceneIndex = Math.max(0, Math.min(chapters.length - 1, index));
  $$('.scene').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  $$('.chapter-btn').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  chapterNum.textContent = chapters[sceneIndex]?.num || '';
  chapterTitle.textContent = chapters[sceneIndex]?.title || '';
  terminal.classList.toggle('show', sceneIndex === chapters.length - 2);
  updateCinematicPhases();
}

function updateFromAudio() {
  if (!ready) return;
  const next = sceneAt(audio.currentTime);
  if (next !== sceneIndex) updateScene(next);
  updateCinematicPhases();
  progressBar.style.width = `${Math.min(100, (audio.currentTime / duration()) * 100)}%`;
  runtime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration())} · Scene ${sceneIndex + 1} of ${chapters.length}`;
}

function setPlayingUi(playing) {
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  statusText.textContent = playing ? `Playing · ${chapters[sceneIndex]?.title || ''}` : 'Paused';
}

async function playFilm() {
  endScreen.classList.remove('show');
  try { await audio.play(); setPlayingUi(true); }
  catch { statusText.textContent = 'Tap Play to allow audio'; }
}

function startPresentation() {
  if (!ready) return;
  startOverlay.style.display = 'none';
  audio.currentTime = 0;
  updateScene(0); updateFromAudio();
  playFilm();
}

function replayPresentation() {
  startOverlay.style.display = 'none';
  endScreen.classList.remove('show');
  audio.currentTime = 0;
  updateScene(0); updateFromAudio();
  playFilm();
}

function goToScene(index) {
  if (!ready) return;
  const next = Math.max(0, Math.min(chapters.length - 1, index));
  const wasPlaying = !audio.paused;
  audio.pause();
  audio.currentTime = sceneStart(next) + .01;
  updateScene(next); updateFromAudio();
  if (wasPlaying) playFilm(); else setPlayingUi(false);
}

function buildChapterButtons() {
  const wrap = $('#chapterButtons');
  wrap.innerHTML = '';
  chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.className = 'chapter-btn';
    button.textContent = `${index + 1}. ${chapter.shortTitle}`;
    button.addEventListener('click', () => goToScene(index));
    wrap.appendChild(button);
  });
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
$('#exitBtn').addEventListener('click', () => { audio.pause(); location.href = '../'; });
$('#fullBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
$$('[data-command]').forEach(button => button.addEventListener('click', () => { terminalOutput.textContent = commands[button.dataset.command]; }));

fetch('narration-manifest.json')
  .then(response => { if (!response.ok) throw new Error(`Narration manifest: ${response.status}`); return response.json(); })
  .then(manifest => {
    chapters = manifest.scenes.map((scene, index) => ({
      num: scene.id === 'T00' ? 'Introduction' : scene.id === '00' ? 'Opening' : scene.id === '08' ? 'Closing' : scene.id === 'F00' ? 'Finale' : scene.id,
      title: scene.title,
      shortTitle: scene.title.split(' — ')[0],
      index
    }));
    buildChapterButtons(); updateScene(sceneAt(audio.currentTime)); markReady();
  })
  .catch(error => console.error(error));

addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); playBtn.click(); }
  if (event.key === 'ArrowLeft') goToScene(sceneIndex - 1);
  if (event.key === 'ArrowRight') goToScene(sceneIndex + 1);
  if (event.key.toLowerCase() === 'f') $('#fullBtn').click();
});
