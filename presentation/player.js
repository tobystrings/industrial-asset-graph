const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const audio = $('#masterNarration');
const startOverlay = $('#startOverlay');
const endScreen = $('#endScreen');
const subtitle = $('#subtitle');
const chapterNum = $('#chapterNum');
const chapterTitle = $('#chapterTitle');
const statusText = $('#statusText');
const playBtn = $('#playBtn');
const progressBar = $('#progressBar');
const runtime = $('#runtime');
const terminal = $('#terminal');
const terminalOutput = $('#terminalOutput');

// Scene boundaries are proportional positions in the single 4:38 master narration.
// Audio currentTime is the only presentation clock.
const cueFractions = [0, .0849, .2173, .3324, .4302, .5571, .6676, .7780, .8942];
let chapters = [];
let sceneIndex = 0;
let captionsEnabled = true;
let ready = false;

const commands = {
  risk: '45 years in the trade · 15 years at this facility\nWARNING: Undocumented operational knowledge is approaching retirement.',
  map: '11 facility areas indexed.\nBuilding layout is the navigation layer.\nBuilding → Area → Equipment → Evidence.',
  trace: 'Warehouse F / Line 2\nArea → Machine → Cabinet → Controls → Evidence\nRelationship path ready.',
  verify: 'Verified · Field verify · Inferred · Disputed · Retired\nEvery claim carries a source and review state.',
  help: 'Controls: Play/Pause · Previous/Next · Captions · Replay · Fullscreen\nUse the chapter buttons to move through the film.'
};

function cleanCaptions(text) {
  return text
    .split(/\n\s*\n/)
    .map(line => line.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function formatTime(seconds) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function sceneStart(index) {
  return cueFractions[index] * audio.duration;
}

function sceneEnd(index) {
  return index + 1 < cueFractions.length ? sceneStart(index + 1) : audio.duration;
}

function sceneAt(time) {
  let result = 0;
  cueFractions.forEach((fraction, index) => {
    if (time >= fraction * audio.duration) result = index;
  });
  return result;
}

function captionAt(index, time) {
  const lines = chapters[index]?.captions || [];
  if (!lines.length) return '';
  const start = sceneStart(index);
  const duration = Math.max(.1, sceneEnd(index) - start);
  const position = Math.min(.999, Math.max(0, (time - start) / duration));
  return lines[Math.floor(position * lines.length)];
}

function updateScene(index = sceneIndex) {
  sceneIndex = Math.max(0, Math.min(chapters.length - 1, index));
  $$('.scene').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  $$('.chapter-btn').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  chapterNum.textContent = chapters[sceneIndex]?.num || '';
  chapterTitle.textContent = chapters[sceneIndex]?.title || '';
  terminal.classList.toggle('show', sceneIndex === chapters.length - 1);
}

function updateFromAudio() {
  if (!ready || !Number.isFinite(audio.duration)) return;
  const nextScene = sceneAt(audio.currentTime);
  if (nextScene !== sceneIndex) updateScene(nextScene);
  if (captionsEnabled) subtitle.textContent = captionAt(sceneIndex, audio.currentTime);
  progressBar.style.width = `${Math.min(100, (audio.currentTime / audio.duration) * 100)}%`;
  runtime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)} · Scene ${sceneIndex + 1} of ${chapters.length}`;
}

function setPlayingUi(playing) {
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  statusText.textContent = playing ? `Playing · ${chapters[sceneIndex]?.title || ''}` : 'Paused';
}

async function playAudio() {
  endScreen.classList.remove('show');
  try {
    await audio.play();
    setPlayingUi(true);
  } catch {
    statusText.textContent = 'Tap Play to allow audio';
  }
}

function startPresentation() {
  if (!ready) return;
  startOverlay.style.display = 'none';
  audio.currentTime = 0;
  updateScene(0);
  updateFromAudio();
  playAudio();
}

function replayPresentation() {
  startOverlay.style.display = 'none';
  endScreen.classList.remove('show');
  audio.currentTime = 0;
  updateScene(0);
  playAudio();
}

function goToScene(index) {
  if (!ready) return;
  const wasPlaying = !audio.paused;
  audio.pause();
  updateScene(index);
  audio.currentTime = sceneStart(sceneIndex) + .01;
  updateFromAudio();
  if (wasPlaying) playAudio(); else setPlayingUi(false);
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
  if (!chapters.length || audio.readyState < 1) return;
  ready = true;
  $('#startBtn').disabled = false;
  statusText.textContent = 'Ready · 4:38 master narration';
  runtime.textContent = `${formatTime(audio.duration)} · ${chapters.length} scenes`;
  updateScene(0);
}
audio.addEventListener('loadedmetadata', markReady);
audio.addEventListener('timeupdate', updateFromAudio);
audio.addEventListener('play', () => setPlayingUi(true));
audio.addEventListener('pause', () => { if (!audio.ended && audio.currentTime > 0) setPlayingUi(false); });
audio.addEventListener('ended', () => {
  updateScene(chapters.length - 1);
  progressBar.style.width = '100%';
  subtitle.textContent = 'When experience leaves, the knowledge does not have to leave with it.';
  playBtn.textContent = '↻ Replay';
  statusText.textContent = 'Presentation complete';
  endScreen.classList.add('show');
});
audio.addEventListener('error', () => {
  statusText.textContent = 'Narration could not load. Refresh and try again.';
});

$('#startBtn').disabled = true;
$('#startBtn').addEventListener('click', startPresentation);
playBtn.addEventListener('click', () => {
  if (audio.ended || audio.currentTime >= audio.duration - .1) replayPresentation();
  else if (audio.paused) playAudio();
  else audio.pause();
});
$('#prevBtn').addEventListener('click', () => goToScene(sceneIndex - 1));
$('#nextBtn').addEventListener('click', () => goToScene(sceneIndex + 1));
$('#replayBtn').addEventListener('click', replayPresentation);
$('#endReplay').addEventListener('click', replayPresentation);
$('#exitBtn').addEventListener('click', () => { location.href = '../'; });
$('#ccBtn').addEventListener('click', event => {
  captionsEnabled = !captionsEnabled;
  subtitle.classList.toggle('hide', !captionsEnabled);
  event.currentTarget.textContent = captionsEnabled ? 'CC On' : 'CC Off';
  if (captionsEnabled) updateFromAudio();
});
$('#fullBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
$$('[data-command]').forEach(button => button.addEventListener('click', () => {
  terminalOutput.textContent = commands[button.dataset.command];
}));

fetch('narration-manifest.json')
  .then(response => {
    if (!response.ok) throw new Error(`Narration manifest: ${response.status}`);
    return response.json();
  })
  .then(manifest => {
    chapters = manifest.scenes.map((scene, index) => ({
      num: scene.id === '00' ? 'Opening' : scene.id === '08' ? 'Closing' : scene.id,
      title: scene.title,
      shortTitle: scene.title.split(' — ')[0],
      captions: cleanCaptions(scene.narration),
      index
    }));
    buildChapterButtons();
    updateScene(0);
    markReady();
  })
  .catch(error => {
    console.error(error);
    statusText.textContent = 'Presentation data could not load.';
  });

addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); playBtn.click(); }
  if (event.key === 'ArrowLeft') goToScene(sceneIndex - 1);
  if (event.key === 'ArrowRight') goToScene(sceneIndex + 1);
  if (event.key.toLowerCase() === 'f') $('#fullBtn').click();
});
