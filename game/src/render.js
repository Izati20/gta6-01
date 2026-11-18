// Canvas renderer: camera over the city, all entities, HUD with minimap,
// wanted stars, health, cash, objective and banner, plus title / pause /
// busted / wasted / complete screens. Everything is drawn in code.
import { VIEW, WORLD, PALETTE, FONT, CITY_NAME, HERO, INTRO, CONTROLS, MISSIONS } from './config.js';
import { ROAD_CENTERS_X, ROAD_CENTERS_Y, ROAD_HALF } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width; canvas.height = VIEW.height;

  function drawCar(c, cam, isPlayerCar, t) {
    const x = c.x - cam.x; const y = c.y - cam.y;
    if (x < -80 || y < -80 || x > VIEW.width + 80 || y > VIEW.height + 80) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-20, -8, 46, 24);
    ctx.fillStyle = c.color;
    ctx.strokeStyle = isPlayerCar ? '#ffd23f' : 'rgba(0,0,0,0.45)';
    ctx.lineWidth = isPlayerCar ? 3 : 1.5;
    roundRect(-22, -11, 44, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1c2733';
    roundRect(-6, -8, 13, 16, 3); ctx.fill();
    roundRect(-16, -8, 6, 16, 2); ctx.fill();
    ctx.fillStyle = '#f7e9a0'; ctx.fillRect(20, -8, 3, 5); ctx.fillRect(20, 3, 3, 5);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-23, -8, 3, 5); ctx.fillRect(-23, 3, 3, 5);
    if (c.kind === 'police') {
      ctx.fillStyle = '#2456c8'; ctx.fillRect(-12, -11, 24, 4); ctx.fillRect(-12, 7, 24, 4);
      const flash = Math.floor(t * 4) % 2 === 0;
      ctx.fillStyle = flash ? '#ff4040' : '#ffd0d0'; ctx.fillRect(-3, -4, 6, 3);
      ctx.fillStyle = flash ? '#cfe0ff' : '#4080ff'; ctx.fillRect(-3, 1, 6, 3);
    }
    if (c.health < 45) { ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(8, 0, 7 + (c.health < 20 ? 4 : 0), 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(str, x, y, size, color, align = 'left', bold = false) {
    ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT;
    ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function panel(x, y, w, h) { ctx.fillStyle = PALETTE.panel; roundRect(x, y, w, h, 10); ctx.fill(); }

  function draw(world, screen, best, saveInfo) {
    const { state, player, cars, peds, pickups, city } = world;
    const t = state.time;
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const cam = {
      x: Math.max(0, Math.min(WORLD.width - VIEW.width, player.x - VIEW.width / 2)) + shakeX,
      y: Math.max(0, Math.min(WORLD.height - VIEW.height, player.y - VIEW.height / 2)) + shakeY,
    };
    // Ground, beach and water.
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(0, 2400 - cam.y, VIEW.width, 70);
    ctx.fillStyle = PALETTE.water; ctx.fillRect(0, 2470 - cam.y, VIEW.width, VIEW.height);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = 0; i < 8; i++) { const wy = 2490 + i * 4 - cam.y; if (wy > 0 && wy < VIEW.height) ctx.fillRect((i * 173 + Math.sin(t + i) * 9) % VIEW.width, wy, 90, 2); }
    // Airstrip (north-east).
    ctx.fillStyle = '#4a4f55'; ctx.fillRect(2820 - cam.x, 60 - cam.y, 500, 130);
    ctx.fillStyle = '#e8e8e8';
    for (let i = 0; i < 6; i++) ctx.fillRect(2860 + i * 76 - cam.x, 120 - cam.y, 40, 5);
    // Sidewalks then roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const cx of ROAD_CENTERS_X) ctx.fillRect(cx - ROAD_HALF - 12 - cam.x, 0 - cam.y, (ROAD_HALF + 12) * 2, WORLD.height);
    for (const cy of ROAD_CENTERS_Y) ctx.fillRect(0 - cam.x, cy - ROAD_HALF - 12 - cam.y, WORLD.width, (ROAD_HALF + 12) * 2);
    ctx.fillStyle = PALETTE.road;
    for (const cx of ROAD_CENTERS_X) ctx.fillRect(cx - ROAD_HALF - cam.x, 0 - cam.y, ROAD_HALF * 2, WORLD.height);
    for (const cy of ROAD_CENTERS_Y) ctx.fillRect(0 - cam.x, cy - ROAD_HALF - cam.y, WORLD.width, ROAD_HALF * 2);
    ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (const cx of ROAD_CENTERS_X) { ctx.moveTo(cx - cam.x, -cam.y); ctx.lineTo(cx - cam.x, WORLD.height - cam.y); }
    for (const cy of ROAD_CENTERS_Y) { ctx.moveTo(-cam.x, cy - cam.y); ctx.lineTo(WORLD.width - cam.x, cy - cam.y); }
    ctx.stroke(); ctx.setLineDash([]);
    // Crosswalks.
    ctx.fillStyle = PALETTE.crosswalk;
    for (const cx of ROAD_CENTERS_X) for (const cy of ROAD_CENTERS_Y) {
      for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 26 - 9 - cam.x, cy - ROAD_HALF - 10 - cam.y, 18, 8);
    }
    // Buildings and palms.
    for (const b of city.buildings) {
      const x = b.x - cam.x; const y = b.y - cam.y;
      if (x + b.w < 0 || y + b.h < 0 || x > VIEW.width || y > VIEW.height) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + 7, y + 9, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(x, y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,235,170,0.5)';
      const cols = Math.max(2, Math.floor(b.w / 42)); const rows = Math.max(1, Math.floor(b.h / 42));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 13 + b.floors) % 3 !== 0) ctx.fillRect(x + 12 + i * 42, y + 12 + j * 42, 14, 10);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + b.w / 2 - 16, y + b.h / 2 - 11, 32, 22);
    }
    for (const p of city.palms) {
      const x = p.x - cam.x; const y = p.y - cam.y;
      if (x < -20 || y < -20 || x > VIEW.width + 20 || y > VIEW.height + 20) continue;
      ctx.fillStyle = '#2e6b34'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#48a355'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 8, 0, 7); ctx.fill();
    }
    // Mission marker beacon.
    if (state.marker) {
      const mx = state.marker.x - cam.x; const my = state.marker.y - cam.y;
      const pulse = 1 + Math.sin(t * 4) * 0.16;
      ctx.strokeStyle = PALETTE.marker; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(mx, my, state.marker.r * 0.55 * pulse, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,207,63,0.16)';
      ctx.beginPath(); ctx.arc(mx, my, state.marker.r * 0.55 * pulse, 0, 7); ctx.fill();
      text(state.marker.label, mx, my - state.marker.r * 0.55 * pulse - 14, 20, PALETTE.marker, 'center', true);
      text('▼', mx, my - 34 + Math.sin(t * 4) * 5, 22, PALETTE.marker, 'center', true);
    }
    // Pickups.
    for (const pk of pickups) {
      const x = pk.x - cam.x; const y = pk.y - cam.y + Math.sin(t * 3 + pk.x) * 3;
      ctx.fillStyle = '#2fae5f'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d9ffd9'; ctx.lineWidth = 2; ctx.stroke();
      text('$', x, y + 6, 15, '#fff', 'center', true);
    }
    // Cars, peds, player.
    for (const c of cars) if (c !== player.inCar) drawCar(c, cam, false, t);
    for (const p of peds) {
      const x = p.x - cam.x; const y = p.y - cam.y;
      if (x < -30 || y < -30 || x > VIEW.width + 30 || y > VIEW.height + 30) continue;
      if (p.state === 'down') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle);
        ctx.fillStyle = p.color; roundRect(-13, -6, 26, 12, 6); ctx.fill(); ctx.restore();
        continue;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 9, 0, 7); ctx.fill();
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8c39a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = p.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(p.angle) * 11, y + Math.sin(p.angle) * 11); ctx.stroke();
    }
    if (player.inCar) drawCar(player.inCar, cam, true, t);
    else {
      const x = player.x - cam.x; const y = player.y - cam.y;
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.arc(x + 2, y + 4, 12, 0, 7); ctx.fill();
      ctx.fillStyle = PALETTE.player; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7a5b00'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#20303e'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(player.angle) * 16, y + Math.sin(player.angle) * 16); ctx.stroke();
      if (state.attackT > 0.2) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + Math.cos(player.angle) * 22, y + Math.sin(player.angle) * 22, 8, 0, 7); ctx.stroke(); }
    }

    drawHud(world, screen, best, saveInfo);
    if (screen === SCREEN_TITLE) drawTitle(best, saveInfo);
    if (screen === SCREEN_PAUSED) overlay('PAUSED', 'Press P or Enter to keep playing.');
    if (state.busted) overlay('BUSTED', 'The Harbor Patrol got you. Fine paid, job restarted.');
    if (state.wasted) overlay('WASTED', 'You wake up at Harbor General. Bill paid, job restarted.');
    if (state.complete && screen === SCREEN_PLAY) {
      panel(VIEW.width / 2 - 330, 120, 660, 64);
      text('STORY COMPLETE — Vice Harbor is yours. Free roam!', VIEW.width / 2, 160, 21, PALETTE.marker, 'center', true);
    }
  }

  function overlay(title, sub) {
    ctx.fillStyle = 'rgba(6,8,12,0.62)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(title, VIEW.width / 2, VIEW.height / 2 - 8, 64, title === 'BUSTED' ? '#7fb0ff' : '#ff6b61', 'center', true);
    text(sub, VIEW.width / 2, VIEW.height / 2 + 34, 19, PALETTE.text, 'center');
  }

  function drawTitle(best, saveInfo) {
    ctx.fillStyle = 'rgba(8,10,16,0.55)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(240, 86, 800, 548);
    text('VICE HARBOR', VIEW.width / 2, 176, 62, PALETTE.marker, 'center', true);
    text('An original open-world crime caper — no kings, just the harbor.', VIEW.width / 2, 214, 18, PALETTE.text, 'center');
    text(HERO + ' returns to ' + CITY_NAME + '.', VIEW.width / 2, 246, 16, PALETTE.muted, 'center');
    let y = 288;
    for (const line of INTRO) { text(line, VIEW.width / 2, y, 16, PALETTE.text, 'center'); y += 25; }
    y += 8;
    for (const c of CONTROLS) { text(c, VIEW.width / 2, y, 15, PALETTE.muted, 'center'); y += 22; }
    y += 10;
    text(saveInfo && saveInfo.mission > 0 ? 'Press ENTER — continue at job ' + (saveInfo.mission + 1) + ' of 5 · $' + saveInfo.cash + ' saved' : 'Press ENTER or click to start', VIEW.width / 2, y, 20, '#7be495', 'center', true);
    if (best) text('Best cash in one run: $' + best, VIEW.width / 2, y + 30, 14, PALETTE.muted, 'center');
    text('Five jobs: wheels, a package, hot metal, a harbor run, and the last score.', VIEW.width / 2, 606, 14, PALETTE.muted, 'center');
  }

  function drawHud(world, screen, best, saveInfo) {
    if (screen === SCREEN_TITLE) return;
    const { state, player } = world;
    // Top-left: cash + mission.
    panel(14, 14, 352, 74);
    text('$' + state.cash, 30, 46, 26, '#7be495', 'left', true);
    const mTitle = state.complete ? 'FREE ROAM' : MISSIONS[state.mission].title;
    text(mTitle, 30, 74, 16, PALETTE.text, 'left', true);
    if (state.mission === 3 && !state.complete) text(Math.ceil(state.timer) + 's', 330, 46, 22, state.timer < 20 ? '#ff6b61' : PALETTE.marker, 'right', true);
    // Top-right: wanted stars.
    panel(VIEW.width - 246, 14, 232, 52);
    for (let i = 0; i < 5; i++) text(i < state.wanted ? '★' : '☆', VIEW.width - 224 + i * 42, 52, 30, i < state.wanted ? '#ffb02e' : '#5a636e');
    if (state.wanted > 0 && !state.seen && state.heat > 0) {
      ctx.fillStyle = '#3d4652'; ctx.fillRect(VIEW.width - 224, 58, 190, 4);
      ctx.fillStyle = '#7fb0ff'; ctx.fillRect(VIEW.width - 224, 58, 190 * Math.min(1, state.heat / 7), 4);
    }
    // Objective bar.
    if (state.objective) {
      panel(VIEW.width / 2 - 360, VIEW.height - 52, 720, 38);
      let obj = state.objective;
      if (state.marker) {
        const d = Math.round(Math.hypot(state.marker.x - player.x, state.marker.y - player.y));
        obj += '  ·  ' + d + 'm';
      }
      text(obj, VIEW.width / 2, VIEW.height - 27, 15, PALETTE.text, 'center');
    }
    // Banner.
    if (state.bannerT > 0 && state.banner) {
      panel(VIEW.width / 2 - 420, 96, 840, 44);
      text(state.banner, VIEW.width / 2, 124, 16, PALETTE.marker, 'center', true);
    }
    // Bottom-left: health (+ busted meter).
    panel(14, VIEW.height - 108, 240, 56);
    text('HEALTH', 28, VIEW.height - 82, 12, PALETTE.muted, 'left', true);
    ctx.fillStyle = '#3d2326'; ctx.fillRect(28, VIEW.height - 74, 200, 12);
    ctx.fillStyle = player.health > 30 ? '#57c96b' : '#e5534b';
    ctx.fillRect(28, VIEW.height - 74, 200 * Math.max(0, player.health) / 100, 12);
    if (state.bustedMeter > 0) {
      text('BUSTED…', 140, VIEW.height - 82, 12, '#7fb0ff', 'left', true);
      ctx.fillStyle = '#2456c8'; ctx.fillRect(140, VIEW.height - 74, 88 * Math.min(1, state.bustedMeter / 2.2), 12);
    }
    // Bottom-right: speed or hint + minimap.
    if (player.inCar) {
      panel(VIEW.width - 170, VIEW.height - 108, 156, 56);
      text(Math.round(Math.abs(player.inCar.speed) * 0.36) + ' km/h', VIEW.width - 92, VIEW.height - 72, 22, PALETTE.text, 'center', true);
    } else {
      panel(VIEW.width - 262, VIEW.height - 108, 248, 56);
      const near = world.cars.some((c) => c !== player.inCar && Math.hypot(c.x - player.x, c.y - player.y) < 58);
      text(near ? 'E — get in / steal car' : 'E — enter car · J — punch', VIEW.width - 138, VIEW.height - 72, 14, PALETTE.muted, 'center');
    }
    drawMinimap(world);
  }

  function drawMinimap(world) {
    const { state, player, cars } = world;
    const mw = 216; const mh = 162; const x0 = VIEW.width - mw - 14; const y0 = 78;
    const sx = mw / WORLD.width; const sy = mh / WORLD.height;
    ctx.fillStyle = 'rgba(10,26,18,0.88)'; roundRect(x0, y0, mw, mh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#565d66';
    for (const cx of ROAD_CENTERS_X) ctx.fillRect(x0 + (cx - ROAD_HALF) * sx, y0, ROAD_HALF * 2 * sx, mh);
    for (const cy of ROAD_CENTERS_Y) ctx.fillRect(x0, y0 + (cy - ROAD_HALF) * sy, mw, ROAD_HALF * 2 * sy);
    ctx.fillStyle = '#24507a'; ctx.fillRect(x0, y0 + 2470 * sy, mw, mh - 2470 * sy);
    for (const c of cars) {
      if (c.kind !== 'police') continue;
      ctx.fillStyle = Math.floor(state.time * 3) % 2 ? '#ff5050' : '#5f8dff';
      ctx.fillRect(x0 + c.x * sx - 2, y0 + c.y * sy - 2, 4, 4);
    }
    if (state.marker) {
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath(); ctx.arc(x0 + state.marker.x * sx, y0 + state.marker.y * sy, 5 + Math.sin(state.time * 4) * 1.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x0 + player.x * sx, y0 + player.y * sy, 3.6, 0, 7); ctx.fill();
    ctx.strokeStyle = PALETTE.marker; ctx.stroke();
    text(CITY_NAME.toUpperCase(), x0 + 8, y0 + 16, 10, 'rgba(255,255,255,0.75)');
  }

  return { draw };
}
