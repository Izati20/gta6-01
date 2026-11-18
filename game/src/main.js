// Boot and the one loop for Vice Harbor: fixed-step simulation, screens
// (title / play / paused), save + best in localStorage, synthesized sound,
// and the ?shot= staging hook used for screenshots.
// ?seed=N fixes the city. ?shot=start|play|end (with &seed=N) stages a scene,
// paints it twice and sets window.__shotReady.
import { STEP, SAVE_KEY, BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACT_CONFIRM, ACT_PAUSE, ACT_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx, updateEngine, stopEngine, toggleMute } from './audio.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readJSON(key) {
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
function writeJSON(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage off: session only */ }
}
function loadSave() {
  const s = readJSON(SAVE_KEY);
  if (s && Number.isInteger(s.mission) && s.mission >= 0 && s.mission <= 5 && Number.isFinite(s.cash)) return s;
  return null;
}

function runShot(name) {
  const scene = stageShot(name, world);
  const save = loadSave();
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, save);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readJSON(BEST_KEY) || 0;
  let save = loadSave();
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  let lastMission = world.state.mission;
  let announcedEnd = false;

  function announce(message) { status.textContent = message; }
  function persist() {
    save = { cash: world.state.cash, mission: world.state.complete ? 5 : world.state.mission };
    writeJSON(SAVE_KEY, save);
    if (world.state.cash > best) { best = world.state.cash; writeJSON(BEST_KEY, best); }
  }
  function startGame() {
    if (save && (save.mission > 0 || save.cash !== 120)) {
      world.state.cash = save.cash;
      world.startMission(Math.min(save.mission, 5));
      if (save.mission >= 5) world.state.complete = true;
    }
    screen = SCREEN_PLAY;
    announcedEnd = false;
    announce('Playing Vice Harbor. Job: ' + world.state.objective);
  }
  function drainSounds() {
    for (const name of world.state.sounds) sfx(name);
    world.state.sounds.length = 0;
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACT_MUTE) announce(toggleMute() ? 'Muted.' : 'Sound on.');
    if (actions & ACT_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) { startGame(); return 0; }
    if (actions & ACT_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; stopEngine(); announce('Paused.'); return 0; }
      if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); return 0; }
    }
    return screen === SCREEN_PLAY ? actions : 0;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) { world.step(STEP, { mx: 0, my: 0, sprint: false }, 0); accumulator -= STEP; }
    } else if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP) {
        world.step(STEP, input.snapshot(), first ? actions : 0);
        first = false;
        accumulator -= STEP;
        saveTimer += STEP;
      }
      drainSounds();
      const speedRatio = world.player.inCar ? Math.abs(world.player.inCar.speed) / 300 : 0;
      updateEngine(speedRatio, world.state.wanted, 1 / 60);
      if (world.state.mission !== lastMission) { lastMission = world.state.mission; persist(); }
      if (saveTimer > 5) { saveTimer = 0; persist(); }
      if ((world.state.busted || world.state.wasted) && !announcedEnd) {
        announcedEnd = true;
        announce(world.state.busted ? 'Busted.' : 'Wasted.');
      }
      if (!world.state.busted && !world.state.wasted) announcedEnd = false;
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, save);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; stopEngine(); announce('Paused.'); }
  });
  canvas.addEventListener('mousedown', () => {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
  });
  announce('Vice Harbor. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
