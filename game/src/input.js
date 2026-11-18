// Keyboard + mouse input. Exposes a held-state snapshot plus edge-triggered
// action flags the world consumes once per step.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_ENTER = 4;
export const ACT_ATTACK = 8;
export const ACT_MUTE = 16;

const DOWN = new Set();
let pending = 0;
let mouseAttack = false;

const KEY_ACTIONS = {
  Enter: ACT_CONFIRM, Space: ACT_CONFIRM | ACT_ATTACK,
  KeyP: ACT_PAUSE, Escape: ACT_PAUSE,
  KeyE: ACT_ENTER, KeyF: ACT_ENTER,
  KeyJ: ACT_ATTACK, KeyM: ACT_MUTE,
};

export function createInput(canvas) {
  function onKeyDown(event) {
    if (event.repeat) return;
    DOWN.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) pending |= action;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  }
  function onKeyUp(event) { DOWN.delete(event.code); }
  function onMouseDown() { pending |= ACT_ATTACK; mouseAttack = true; }
  function onBlur() { DOWN.clear(); }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  return {
    snapshot() {
      let mx = 0; let my = 0;
      if (DOWN.has('KeyA') || DOWN.has('ArrowLeft')) mx -= 1;
      if (DOWN.has('KeyD') || DOWN.has('ArrowRight')) mx += 1;
      if (DOWN.has('KeyW') || DOWN.has('ArrowUp')) my -= 1;
      if (DOWN.has('KeyS') || DOWN.has('ArrowDown')) my += 1;
      return {
        mx, my,
        sprint: DOWN.has('ShiftLeft') || DOWN.has('ShiftRight'),
        actions: 0,
      };
    },
    takeActions() { const a = pending; pending = 0; mouseAttack = false; return a; },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousedown', onMouseDown);
    },
  };
}
export function isMouseAttack() { return mouseAttack; }
