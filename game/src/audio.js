// Tiny synthesized sound: no audio files, everything is WebAudio oscillators.
// Engine hum, sirens, pickup blips, punches and mission stingers. Mute with M.
let ctx = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenTimer = 0;

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ctx = null; }
  return ctx;
}
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; if (muted) stopEngine(); return muted; }

function blip(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  if (muted || !ensure()) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur);
}
export function sfx(name) {
  if (muted) return;
  if (name === 'pickup') { blip(660, 0.09); setTimeout(() => blip(990, 0.12), 60); }
  else if (name === 'cash') { blip(880, 0.07, 'triangle', 0.1); setTimeout(() => blip(1320, 0.1, 'triangle', 0.1), 55); }
  else if (name === 'punch') blip(140, 0.08, 'sawtooth', 0.1, -70);
  else if (name === 'crash') blip(90, 0.22, 'sawtooth', 0.14, -40);
  else if (name === 'door') blip(220, 0.06, 'square', 0.05);
  else if (name === 'star') blip(520, 0.16, 'square', 0.09, 260);
  else if (name === 'mission') { blip(523, 0.12, 'triangle', 0.1); setTimeout(() => blip(784, 0.18, 'triangle', 0.1), 110); }
  else if (name === 'busted') { blip(392, 0.2, 'square', 0.09); setTimeout(() => blip(262, 0.3, 'square', 0.09), 160); }
  else if (name === 'checkpoint') blip(1046, 0.1, 'triangle', 0.1);
}
export function updateEngine(speedRatio, wantedLevel, dt) {
  if (muted || !ensure()) { stopEngine(); return; }
  if (speedRatio > 0.02) {
    if (!engineOsc) {
      engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.0;
      engineOsc.connect(engineGain).connect(ctx.destination); engineOsc.start();
    }
    engineOsc.frequency.value = 55 + speedRatio * 165;
    engineGain.gain.value = 0.018 + speedRatio * 0.02;
  } else stopEngine();
  if (wantedLevel > 0) {
    sirenTimer -= dt;
    if (sirenTimer <= 0) { blip(720, 0.28, 'sine', 0.03, 240); sirenTimer = 0.62; }
  }
}
export function stopEngine() {
  if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; engineGain = null; }
}
