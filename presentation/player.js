const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const introAudio = $('#tylerNarration');
const masterAudio = $('#masterNarration');
const finaleAudio = $('#solanaNarration');
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
const introScene = $('.tyler-intro');
const finaleScene = $('.solana-finale');

// The original film remains one continuous 4:38 master track. Tyler's supplied
// introduction is a separate permanent first scene and advances on audio ended.
const cueFractions = [0, .0849, .2173, .3324, .4302, .5571, .6676, .7780, .8942];
const introPhaseFractions = [0, .10, .27, .43, .60, .75, .90];
const finalePhaseFractions = [0, .16, .38, .62, .78, .91];
const knownDurations = { intro: 132.859, master: 278.021, finale: 118.544 };
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
  return text.split(/\n\s*\n/).map(line => line.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function formatTime(seconds) {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function introDuration() { return Number.isFinite(introAudio.duration) ? introAudio.duration : knownDurations.intro; }
function masterDuration() { return Number.isFinite(masterAudio.duration) ? masterAudio.duration : knownDurations.master; }
function finaleDuration() { return Number.isFinite(finaleAudio.duration) ? finaleAudio.duration : knownDurations.finale; }
function totalDuration() { return introDuration() + masterDuration() + finaleDuration(); }
function elapsedTime() { return sceneIndex === 0 ? introAudio.currentTime : sceneIndex === chapters.length - 1 ? introDuration() + masterDuration() + finaleAudio.currentTime : introDuration() + masterAudio.currentTime; }
function activeAudio() { return sceneIndex === 0 ? introAudio : sceneIndex === chapters.length - 1 ? finaleAudio : masterAudio; }

function masterSceneStart(globalIndex) { return cueFractions[globalIndex - 1] * masterDuration(); }
function masterSceneEnd(globalIndex) { return globalIndex < cueFractions.length ? cueFractions[globalIndex] * masterDuration() : masterDuration(); }
function masterSceneAt(time) {
  let result = 1;
  cueFractions.forEach((fraction, index) => { if (time >= fraction * masterDuration()) result = index + 1; });
  return result;
}

function captionAt(index, time) {
  const lines = chapters[index]?.captions || [];
  if (!lines.length) return '';
  const isFinale = index === chapters.length - 1;
  const start = index === 0 || isFinale ? 0 : masterSceneStart(index);
  const end = index === 0 ? introDuration() : isFinale ? finaleDuration() : masterSceneEnd(index);
  const position = Math.min(.999, Math.max(0, (time - start) / Math.max(.1, end - start)));
  return lines[Math.floor(position * lines.length)];
}

function updateIntroVisuals() {
  if (!introScene) return;
  const position = introAudio.currentTime / introDuration();
  let phase = 0;
  introPhaseFractions.forEach((fraction, index) => { if (position >= fraction) phase = index; });
  introScene.dataset.phase = String(phase);
}

function updateFinaleVisuals() {
  if (!finaleScene) return;
  const position = finaleAudio.currentTime / finaleDuration();
  let phase = 0;
  finalePhaseFractions.forEach((fraction, index) => { if (position >= fraction) phase = index; });
  finaleScene.dataset.phase = String(phase);
}

function updateScene(index = sceneIndex) {
  sceneIndex = Math.max(0, Math.min(chapters.length - 1, index));
  $$('.scene').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  $$('.chapter-btn').forEach((element, i) => element.classList.toggle('active', i === sceneIndex));
  chapterNum.textContent = chapters[sceneIndex]?.num || '';
  chapterTitle.textContent = chapters[sceneIndex]?.title || '';
  terminal.classList.toggle('show', sceneIndex === chapters.length - 2);
}

function updateProgress() {
  if (!ready) return;
  const elapsed = elapsedTime();
  progressBar.style.width = `${Math.min(100, (elapsed / totalDuration()) * 100)}%`;
  runtime.textContent = `${formatTime(elapsed)} / ${formatTime(totalDuration())} · Scene ${sceneIndex + 1} of ${chapters.length}`;
}

function updateFromIntro() {
  if (!ready || sceneIndex !== 0) return;
  updateIntroVisuals();
  if (captionsEnabled) subtitle.textContent = captionAt(0, introAudio.currentTime);
  updateProgress();
}

function updateFromMaster() {
  if (!ready || sceneIndex === 0 || sceneIndex === chapters.length - 1) return;
  const nextScene = masterSceneAt(masterAudio.currentTime);
  if (nextScene !== sceneIndex) updateScene(nextScene);
  if (captionsEnabled) subtitle.textContent = captionAt(sceneIndex, masterAudio.currentTime);
  updateProgress();
}


function updateFromFinale() {
  if (!ready || sceneIndex !== chapters.length - 1) return;
  updateFinaleVisuals();
  if (captionsEnabled) subtitle.textContent = captionAt(sceneIndex, finaleAudio.currentTime);
  updateProgress();
}

function setPlayingUi(playing) {
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  statusText.textContent = playing ? `Playing · ${chapters[sceneIndex]?.title || ''}` : 'Paused';
}

async function playActiveAudio() {
  endScreen.classList.remove('show');
  try {
    await activeAudio().play();
    setPlayingUi(true);
  } catch {
    statusText.textContent = 'Tap Play to allow audio';
  }
}

function resetAudio() {
  introAudio.pause(); masterAudio.pause(); finaleAudio.pause();
  if (introAudio.readyState) introAudio.currentTime = 0;
  if (masterAudio.readyState) masterAudio.currentTime = 0;
  if (finaleAudio.readyState) finaleAudio.currentTime = 0;
}

function startPresentation() {
  if (!ready) return;
  startOverlay.style.display = 'none';
  resetAudio();
  updateScene(0); updateIntroVisuals(); updateProgress();
  playActiveAudio();
}

function replayPresentation() {
  startOverlay.style.display = 'none';
  endScreen.classList.remove('show');
  resetAudio();
  updateScene(0); updateIntroVisuals(); updateProgress();
  playActiveAudio();
}

function goToScene(index) {
  if (!ready) return;
  const next = Math.max(0, Math.min(chapters.length - 1, index));
  const wasPlaying = !activeAudio().paused;
  introAudio.pause(); masterAudio.pause(); finaleAudio.pause();
  updateScene(next);
  const targetAudio = activeAudio();
  const targetTime = next === 0 || next === chapters.length - 1 ? .01 : masterSceneStart(next) + .01;
  const seek = () => { targetAudio.currentTime = targetTime; if (wasPlaying) playActiveAudio(); };
  if (targetAudio.readyState) seek(); else { targetAudio.load(); targetAudio.addEventListener('loadedmetadata', seek, { once: true }); }
  if (captionsEnabled) subtitle.textContent = captionAt(next, activeAudio().currentTime);
  updateProgress();
  if (!wasPlaying) setPlayingUi(false);
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
  statusText.textContent = `Ready · ${formatTime(totalDuration())} narrated film`;
  runtime.textContent = `${formatTime(totalDuration())} · ${chapters.length} scenes`;
  updateScene(0); updateIntroVisuals();
}

[introAudio, masterAudio, finaleAudio].forEach(item => item.addEventListener('loadedmetadata', markReady));
introAudio.addEventListener('timeupdate', updateFromIntro);
masterAudio.addEventListener('timeupdate', updateFromMaster);
finaleAudio.addEventListener('timeupdate', updateFromFinale);
[introAudio, masterAudio, finaleAudio].forEach(item => {
  item.addEventListener('play', () => setPlayingUi(true));
  item.addEventListener('pause', () => { if (!item.ended && item.currentTime > 0 && item === activeAudio()) setPlayingUi(false); });
  item.addEventListener('error', () => { statusText.textContent = 'Narration could not load. Refresh and try again.'; });
});
introAudio.addEventListener('ended', () => {
  updateScene(1);
  const beginMainFilm = () => {
    masterAudio.currentTime = 0;
    if (captionsEnabled) subtitle.textContent = captionAt(1, 0);
    updateProgress();
    playActiveAudio();
  };
  if (masterAudio.readyState) beginMainFilm();
  else { masterAudio.load(); masterAudio.addEventListener('loadedmetadata', beginMainFilm, { once: true }); }
});
masterAudio.addEventListener('ended', () => {
  updateScene(chapters.length - 1);
  const beginFinale = () => {
    finaleAudio.currentTime = 0;
    updateFinaleVisuals();
    if (captionsEnabled) subtitle.textContent = captionAt(sceneIndex, 0);
    updateProgress();
    playActiveAudio();
  };
  if (finaleAudio.readyState) beginFinale();
  else { finaleAudio.load(); finaleAudio.addEventListener('loadedmetadata', beginFinale, { once: true }); }
});
finaleAudio.addEventListener('ended', () => {
  updateScene(chapters.length - 1);
  progressBar.style.width = '100%';
  subtitle.textContent = 'A record of what this facility knows.';
  playBtn.textContent = '↻ Replay';
  statusText.textContent = 'Presentation complete';
  endScreen.classList.add('show');
});

$('#startBtn').disabled = true;
$('#startBtn').addEventListener('click', startPresentation);
playBtn.addEventListener('click', () => {
  if (finaleAudio.ended || (sceneIndex === chapters.length - 1 && finaleAudio.currentTime >= finaleDuration() - .1)) replayPresentation();
  else if (activeAudio().paused) playActiveAudio();
  else activeAudio().pause();
});
$('#prevBtn').addEventListener('click', () => goToScene(sceneIndex - 1));
$('#nextBtn').addEventListener('click', () => goToScene(sceneIndex + 1));
$('#replayBtn').addEventListener('click', replayPresentation);
$('#endReplay').addEventListener('click', replayPresentation);
$('#exitBtn').addEventListener('click', () => { introAudio.pause(); masterAudio.pause(); finaleAudio.pause(); location.href = '../'; });
$('#ccBtn').addEventListener('click', event => {
  captionsEnabled = !captionsEnabled;
  subtitle.classList.toggle('hide', !captionsEnabled);
  event.currentTarget.textContent = captionsEnabled ? 'CC On' : 'CC Off';
  if (captionsEnabled) sceneIndex === 0 ? updateFromIntro() : sceneIndex === chapters.length - 1 ? updateFromFinale() : updateFromMaster();
});
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
      captions: cleanCaptions(scene.narration),
      index
    }));
    buildChapterButtons(); updateScene(0); markReady();
  })
  .catch(error => { console.error(error); statusText.textContent = 'Presentation data could not load.'; });

addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); playBtn.click(); }
  if (event.key === 'ArrowLeft') goToScene(sceneIndex - 1);
  if (event.key === 'ArrowRight') goToScene(sceneIndex + 1);
  if (event.key.toLowerCase() === 'f') $('#fullBtn').click();
});
