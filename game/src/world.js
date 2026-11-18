// Vice Harbor world simulation: city generation, player on foot and in cars,
// traffic, pedestrians, police and the wanted system, combat, pickups and the
// five-mission story chain. Pure logic — rendering and sound live elsewhere;
// the world queues sound names in state.sounds for the shell to play.
import { WORLD, PLAYER, CAR, WANTED, MISSIONS } from './config.js';
import { randRange, pick } from './random.js';

export const ROAD_CENTERS_X = [280, 840, 1400, 1960, 2520, 3080];
export const ROAD_CENTERS_Y = [280, 840, 1400, 1960];
export const ROAD_HALF = 74;

const CAR_COLORS = ['#c84b42', '#4278c8', '#e0e4e8', '#3aa655', '#e8b93e', '#7a4fa3', '#d97b2f', '#4fb3b0'];
const PED_COLORS = ['#e8e0d0', '#b5524a', '#4a7ab5', '#55a06a', '#d9c24a', '#8a5fa8', '#e07f3e', '#5ab0a8'];
const ROOFS = ['#8a5a44', '#5d6d7e', '#7a4a56', '#4f6152', '#6b5a7a', '#7d6a4a'];

export function isOnRoad(x, y) {
  for (const cx of ROAD_CENTERS_X) if (Math.abs(x - cx) <= ROAD_HALF) return true;
  for (const cy of ROAD_CENTERS_Y) if (Math.abs(y - cy) <= ROAD_HALF) return true;
  return false;
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function rectHit(x, y, r, rect) {
  const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - nx, y - ny) < r;
}

export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  for (let bx = 0; bx < ROAD_CENTERS_X.length - 1; bx++) {
    for (let by = 0; by < ROAD_CENTERS_Y.length - 1; by++) {
      const x0 = ROAD_CENTERS_X[bx] + ROAD_HALF + 26;
      const y0 = ROAD_CENTERS_Y[by] + ROAD_HALF + 26;
      const bw = ROAD_CENTERS_X[bx + 1] - ROAD_CENTERS_X[bx] - ROAD_HALF * 2 - 52;
      const bh = ROAD_CENTERS_Y[by + 1] - ROAD_CENTERS_Y[by] - ROAD_HALF * 2 - 52;
      const split = rng() > 0.5;
      const parts = split
        ? [{ x: x0, y: y0, w: bw * 0.46, h: bh }, { x: x0 + bw * 0.54, y: y0, w: bw * 0.46, h: bh }]
        : [{ x: x0, y: y0, w: bw, h: bh * 0.46 }, { x: x0, y: y0 + bh * 0.54, w: bw, h: bh * 0.46 }];
      for (const p of parts) {
        if (rng() > 0.16) buildings.push({ ...p, color: pick(rng, ROOFS), floors: 2 + Math.floor(rng() * 6) });
        else for (let i = 0; i < 4; i++) palms.push({ x: p.x + rng() * p.w, y: p.y + rng() * p.h, r: 9 });
      }
    }
  }
  // South docks and north airstrip are open ground: a few warehouses only.
  buildings.push({ x: 1500, y: 2280, w: 260, h: 120, color: '#5d6d7e', floors: 1 });
  buildings.push({ x: 2900, y: 120, w: 300, h: 110, color: '#6b5a7a', floors: 1 });
  return { buildings, palms };
}

const SPOTS = {
  spawn: { x: 430, y: 420 },
  hotelCar: { x: 356, y: 470 },
  garage: { x: 2620, y: 1880 },
  package: { x: 1252, y: 952 },
  docks: { x: 1680, y: 2380 },
  marinaCar: { x: 640, y: 2300 },
  hideout: { x: 2980, y: 420 },
  checkpoints: [
    { x: 840, y: 840 }, { x: 1960, y: 280 }, { x: 2520, y: 1400 }, { x: 560, y: 1960 },
  ],
  bags: [{ x: 1400, y: 1400 }, { x: 280, y: 1960 }, { x: 3080, y: 1830 }],
  hangar: { x: 3050, y: 300 },
  hospital: { x: 1400, y: 360 },
};

export function createWorld(rng) {
  const city = buildCity(rng);
  const state = {
    time: 0, cash: 120, wanted: 0, heat: 0, seen: false, bustedMeter: 0,
    mission: 0, phase: 0, phaseData: 0, timer: 0,
    banner: '', bannerT: 0, objective: '', marker: null,
    complete: false, busted: false, wasted: false, endT: 0,
    sounds: [], crimeCooldown: 0, attackT: 0, shake: 0,
    stats: { stolen: 0, hits: 0, missionsDone: 0 },
  };
  const player = {
    x: SPOTS.spawn.x, y: SPOTS.spawn.y, angle: -Math.PI / 2, vx: 0, vy: 0,
    health: PLAYER.health, inCar: null, moving: false,
  };
  const cars = [];
  const peds = [];
  const pickups = [];

  function addCar(x, y, angle, kind, color) {
    const car = {
      x, y, angle, speed: 0, kind, color: color || pick(rng, CAR_COLORS),
      health: 100, driver: kind === 'traffic' || kind === 'police',
      axis: null, dir: 1, lane: 34, targetSpeed: randRange(rng, 130, 190), id: cars.length,
    };
    cars.push(car); return car;
  }
  // Parked cars around the city (stealable) and moving traffic on the roads.
  for (let i = 0; i < 26; i++) {
    const vertical = rng() > 0.5;
    const cx = pick(rng, ROAD_CENTERS_X); const cy = pick(rng, ROAD_CENTERS_Y);
    if (vertical) addCar(cx + (rng() > 0.5 ? 52 : -52), randRange(rng, 120, WORLD.height - 120), Math.PI / 2, 'parked');
    else addCar(randRange(rng, 120, WORLD.width - 120), cy + (rng() > 0.5 ? 52 : -52), 0, 'parked');
  }
  for (let i = 0; i < 14; i++) {
    const vertical = rng() > 0.5;
    const c = vertical
      ? addCar(pick(rng, ROAD_CENTERS_X), randRange(rng, 100, WORLD.height - 100), 0, 'traffic')
      : addCar(randRange(rng, 100, WORLD.width - 100), pick(rng, ROAD_CENTERS_Y), 0, 'traffic');
    c.axis = vertical ? 'y' : 'x'; c.dir = rng() > 0.5 ? 1 : -1;
    c.angle = c.axis === 'y' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
  }
  const missionCar = addCar(SPOTS.hotelCar.x, SPOTS.hotelCar.y, Math.PI / 2, 'parked', '#e8b93e');
  const sportsCar = addCar(SPOTS.marinaCar.x, SPOTS.marinaCar.y, 0, 'parked', '#c22f2f');
  sportsCar.targetSpeed = 260;

  for (let i = 0; i < 34; i++) {
    let x = 0; let y = 0; let tries = 0;
    do { x = randRange(rng, 80, WORLD.width - 80); y = randRange(rng, 80, WORLD.height - 80); tries++; }
    while (isOnRoad(x, y) && tries < 8);
    peds.push({
      x, y, angle: rng() * Math.PI * 2, speed: randRange(rng, 34, 62), hp: 60,
      color: pick(rng, PED_COLORS), state: 'walk', wanderT: randRange(rng, 1, 4), downT: 0,
    });
  }

  function banner(text, seconds = 4) { state.banner = text; state.bannerT = seconds; }
  function crime(stars) {
    if (state.crimeCooldown > 0) return;
    state.crimeCooldown = 1.2;
    const before = state.wanted;
    state.wanted = Math.min(WANTED.max, state.wanted + stars);
    state.heat = 0;
    if (state.wanted > before) state.sounds.push('star');
  }
  function setObjective(text, marker) { state.objective = text; state.marker = marker; }

  function startMission(index) {
    state.mission = index; state.phase = 0; state.phaseData = 0; state.timer = 0;
    if (index >= MISSIONS.length) {
      state.complete = true; setObjective('Story complete — Vice Harbor is yours. Free roam: earn cash, outrun the Patrol.', null);
      banner('VICE HARBOR COMPLETE — free roam unlocked'); state.sounds.push('mission'); return;
    }
    banner(MISSIONS[index].title + ' — ' + MISSIONS[index].brief, 6);
    if (index === 0) setObjective('Get into the yellow coupe by the Palms Hotel', { ...SPOTS.hotelCar, r: 60, label: 'CAR' });
    if (index === 1) setObjective('Pick up the package at the market (on foot)', { ...SPOTS.package, r: 46, label: 'PKG' });
    if (index === 2) setObjective('Steal the red sports car at the marina', { ...SPOTS.marinaCar, r: 60, label: 'CAR' });
    if (index === 3) { state.timer = 110; setObjective('Checkpoint 1 of 4 — go!', { ...SPOTS.checkpoints[0], r: 84, label: '1' }); }
    if (index === 4) { setObjective('Collect cash bag 1 of 3', { ...SPOTS.bags[0], r: 52, label: '$' }); state.wanted = Math.max(state.wanted, 2); }
  }
  function completeMission() {
    const m = MISSIONS[state.mission];
    state.cash += m.reward; state.stats.missionsDone++;
    state.sounds.push('mission'); state.sounds.push('cash');
    banner(m.title + ' complete  +$' + m.reward + ' — ' + m.done, 6);
    startMission(state.mission + 1);
  }
  function missionStep(dt) {
    const m = state.marker;
    const inCar = !!player.inCar;
    const atMarker = m && dist(player, m) < m.r;
    if (state.mission === 0) {
      if (state.phase === 0 && inCar && player.inCar === missionCar) { state.phase = 1; setObjective('Drive the coupe to Deco\'s garage', { ...SPOTS.garage, r: 96, label: 'GARAGE' }); banner('Nice wheels. Now the garage — east side.'); }
      else if (state.phase === 1 && atMarker && inCar) completeMission();
    } else if (state.mission === 1) {
      if (state.phase === 0 && atMarker && !inCar) { state.phase = 1; setObjective('Deliver the package to the docks (south)', { ...SPOTS.docks, r: 96, label: 'DOCKS' }); banner('Package in hand. The Patrol noticed — move!'); crime(1); }
      else if (state.phase === 1 && atMarker) completeMission();
    } else if (state.mission === 2) {
      if (state.phase === 0 && inCar && player.inCar === sportsCar) { state.phase = 1; crime(2); setObjective('Lose the Patrol, then reach the hideout', { ...SPOTS.hideout, r: 96, label: 'HIDE' }); banner('That alarm was LOUD. Lose the stars, then hide.'); }
      else if (state.phase === 1 && atMarker && state.wanted === 0) completeMission();
      else if (state.phase === 1 && atMarker && state.wanted > 0) state.objective = 'Reach the hideout with ZERO stars — stay out of sight to cool down';
    } else if (state.mission === 3) {
      state.timer -= dt;
      if (state.timer <= 0) { banner('Out of time — Harbor Run restarts.'); state.phase = 0; state.timer = 110; setObjective('Checkpoint 1 of 4 — go!', { ...SPOTS.checkpoints[0], r: 84, label: '1' }); }
      else if (atMarker && inCar) {
        state.sounds.push('checkpoint'); state.phase++;
        if (state.phase >= 4) completeMission();
        else setObjective('Checkpoint ' + (state.phase + 1) + ' of 4 — ' + Math.ceil(state.timer) + 's left', { ...SPOTS.checkpoints[state.phase], r: 84, label: String(state.phase + 1) });
      }
    } else if (state.mission === 4) {
      if (state.phase < 3 && atMarker && !inCar) {
        state.phase++; state.sounds.push('cash'); state.cash += 150; crime(1);
        if (state.phase < 3) setObjective('Collect cash bag ' + (state.phase + 1) + ' of 3', { ...SPOTS.bags[state.phase], r: 52, label: '$' });
        else setObjective('All bags collected — reach the airstrip hangar!', { ...SPOTS.hangar, r: 110, label: 'FLY' });
        banner('Bag ' + state.phase + ' of 3 — +$150');
      } else if (state.phase >= 3 && atMarker) completeMission();
    }
  }

  function collideBuildings(entity, radius) {
    for (const b of city.buildings) {
      if (rectHit(entity.x, entity.y, radius, b)) {
        const left = entity.x - (b.x - radius); const right = (b.x + b.w + radius) - entity.x;
        const top = entity.y - (b.y - radius); const bottom = (b.y + b.h + radius) - entity.y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) entity.x = b.x - radius; else if (min === right) entity.x = b.x + b.w + radius;
        else if (min === top) entity.y = b.y - radius; else entity.y = b.y + b.h + radius;
        return true;
      }
    }
    entity.x = Math.max(radius, Math.min(WORLD.width - radius, entity.x));
    entity.y = Math.max(radius, Math.min(WORLD.height - radius, entity.y));
    return false;
  }

  function nearestCar(maxD) {
    let best = null; let bd = maxD;
    for (const c of cars) { if (c === player.inCar) continue; const d = dist(player, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  function enterExit() {
    if (player.inCar) {
      const c = player.inCar; player.inCar = null; c.driver = false; c.speed = 0;
      player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34; player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
      collideBuildings(player, PLAYER.radius); state.sounds.push('door');
    } else {
      const c = nearestCar(58);
      if (c) {
        if (c.driver && c.kind === 'traffic') { crime(1); state.stats.stolen++; }
        if (c.kind === 'parked' && c !== missionCar && c !== sportsCar && rng() > 0.6) crime(1);
        if (c === sportsCar && state.mission === 2) state.stats.stolen++;
        player.inCar = c; c.driver = true; c.kind = c.kind === 'police' ? 'police' : c.kind;
        state.sounds.push('door');
      }
    }
  }

  function attack() {
    if (state.attackT > 0) return;
    state.attackT = PLAYER.attackCooldown;
    state.sounds.push('punch');
    for (const p of peds) {
      if (p.state !== 'down' && Math.hypot(p.x - player.x, p.y - player.y) < PLAYER.attackRange + 10) {
        p.hp -= PLAYER.attackDamage; p.state = 'flee';
        if (p.hp <= 0) { p.state = 'down'; p.downT = 9; crime(2); pickups.push({ x: p.x, y: p.y, kind: 'cash', t: 20 }); }
        else crime(1);
      }
    }
    for (const c of cars) {
      if (c !== player.inCar && Math.hypot(c.x - player.x, c.y - player.y) < PLAYER.attackRange + 22) {
        c.health -= 18; if (c.health < 40 && c.kind === 'traffic') crime(1);
      }
    }
  }

  function spawnPolice() {
    const want = Math.min(5, state.wanted);
    const have = cars.filter((c) => c.kind === 'police').length;
    if (have >= want) return;
    const vertical = rng() > 0.5;
    const c = vertical
      ? addCar(pick(rng, ROAD_CENTERS_X), player.y + (rng() > 0.5 ? -560 : 560), 0, 'police', '#e8ecf2')
      : addCar(player.x + (rng() > 0.5 ? -560 : 560), pick(rng, ROAD_CENTERS_Y), 0, 'police', '#e8ecf2');
    c.targetSpeed = 250; c.driver = true;
  }
  function despawnPolice() {
    for (let i = cars.length - 1; i >= 0; i--) {
      if (cars[i].kind === 'police' && cars[i] !== player.inCar) cars.splice(i, 1);
    }
  }

  function driveCar(c, dt, throttle, steer, handbrake) {
    const top = c === sportsCar ? 330 : 265;
    if (throttle > 0) c.speed += CAR.accel * dt * (c.speed < 0 ? 2.2 : 1);
    else if (throttle < 0) c.speed -= (c.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
    c.speed -= c.speed * CAR.drag * dt * (handbrake ? 1.6 : 1);
    c.speed = Math.max(-CAR.maxReverse, Math.min(top, c.speed));
    if (Math.abs(c.speed) > 4) {
      const turn = steer * CAR.grip * (handbrake ? 1.5 : 1) * Math.min(1, Math.abs(c.speed) / 120) * (c.speed < 0 ? -1 : 1);
      c.angle += turn * dt;
    }
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const probe = { x: nx, y: ny };
    if (collideBuildings(probe, 24)) {
      if (Math.abs(c.speed) > 120) { state.sounds.push('crash'); state.shake = Math.min(8, Math.abs(c.speed) / 40); if (c === player.inCar) player.health -= 6; }
      c.speed *= -0.25; c.x = probe.x; c.y = probe.y;
    } else { c.x = nx; c.y = ny; }
  }

  function trafficStep(c, dt) {
    // Follow the current road; at intersections, sometimes turn onto the cross road.
    const speedSign = c.axis === 'y' ? Math.sin(c.angle) : Math.cos(c.angle);
    c.speed += (c.targetSpeed * Math.sign(speedSign || c.dir) - c.speed) * Math.min(1, dt * 1.4);
    let nx = c.x + Math.cos(c.angle) * c.speed * dt;
    let ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const nearCross = (c.axis === 'y' ? ROAD_CENTERS_Y : ROAD_CENTERS_X).some((v) => Math.abs((c.axis === 'y' ? ny : nx) - v) < 26);
    if (nearCross && rng() > 0.72) {
      c.axis = c.axis === 'y' ? 'x' : 'y'; c.dir = rng() > 0.5 ? 1 : -1;
      if (c.axis === 'y') { c.x = ROAD_CENTERS_X.reduce((a, b) => Math.abs(b - c.x) < Math.abs(a - c.x) ? b : a); c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { c.y = ROAD_CENTERS_Y.reduce((a, b) => Math.abs(b - c.y) < Math.abs(a - c.y) ? b : a); c.angle = c.dir > 0 ? 0 : Math.PI; }
      nx = c.x; ny = c.y;
    }
    // Keep to a lane and avoid buildings/other cars simply by slowing.
    for (const o of cars) { if (o !== c && Math.hypot(o.x - nx, o.y - ny) < 46) { c.speed *= 0.92; return; } }
    if (player.inCar && Math.hypot(player.inCar.x - nx, player.inCar.y - ny) < 44) { c.speed *= 0.9; return; }
    if (!player.inCar && Math.hypot(player.x - nx, player.y - ny) < 30) {
      c.speed *= 0.85;
      if (Math.hypot(player.x - nx, player.y - ny) < 24 && Math.abs(c.speed) > 60) {
        player.health -= 14; state.sounds.push('crash'); crime(0); state.shake = 6;
        player.x += Math.cos(c.angle) * 26; player.y += Math.sin(c.angle) * 26;
      }
      return;
    }
    const probe = { x: nx, y: ny };
    if (collideBuildings(probe, 22)) { c.speed = -c.speed * 0.4; c.angle += Math.PI; c.dir = -c.dir; }
    else { c.x = nx; c.y = ny; }
    if (c.x < -80 || c.x > WORLD.width + 80 || c.y < -80 || c.y > WORLD.height + 80) {
      c.x = Math.max(60, Math.min(WORLD.width - 60, c.x)); c.y = Math.max(60, Math.min(WORLD.height - 60, c.y)); c.angle += Math.PI;
    }
  }

  function policeStep(c, dt) {
    const target = player.inCar || player;
    const d = Math.hypot(target.x - c.x, target.y - c.y);
    const wantAngle = Math.atan2(target.y - c.y, target.x - c.x);
    c.angle = angleLerp(c.angle, wantAngle, Math.min(1, dt * (d > 200 ? 1.6 : 2.6)));
    const top = player.inCar ? 292 : 208;
    const goal = d > 54 ? top : top * 0.25;
    c.speed += (goal - c.speed) * Math.min(1, dt * 1.8);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const probe = { x: nx, y: ny };
    if (collideBuildings(probe, 23)) c.speed *= 0.4; else { c.x = nx; c.y = ny; }
    if (d < 700) state.seen = true;
    if (player.inCar && d < 40 && Math.abs(c.speed) > 130) {
      player.health -= 5 * dt * 10; state.shake = 4; state.sounds.push('crash');
    }
  }

  function pedStep(p, dt) {
    if (p.state === 'down') { p.downT -= dt; if (p.downT <= 0) { p.state = 'walk'; p.hp = 60; p.x += randRange(rng, -30, 30); p.y += randRange(rng, -30, 30); } return; }
    p.wanderT -= dt;
    if (p.state === 'flee') {
      const away = Math.atan2(p.y - player.y, p.x - player.x);
      p.angle = angleLerp(p.angle, away, dt * 6);
      if (Math.hypot(p.x - player.x, p.y - player.y) > 190) p.state = 'walk';
    } else if (p.wanderT <= 0) { p.angle = rng() * Math.PI * 2; p.wanderT = randRange(rng, 1.5, 4.5); }
    const sp = p.state === 'flee' ? 150 : p.speed;
    const probe = { x: p.x + Math.cos(p.angle) * sp * dt, y: p.y + Math.sin(p.angle) * sp * dt };
    if (collideBuildings(probe, 10)) p.angle += Math.PI / 2; else { p.x = probe.x; p.y = probe.y; }
    // Walking into the player's car at speed hurts.
    if (player.inCar && Math.abs(player.inCar.speed) > 90 && Math.hypot(p.x - player.inCar.x, p.y - player.inCar.y) < 26) {
      p.hp = 0; p.state = 'down'; p.downT = 9; crime(2); state.stats.hits++;
      state.sounds.push('crash'); pickups.push({ x: p.x, y: p.y, kind: 'cash', t: 20 });
    }
  }

  function resetRun(keepProgress) {
    player.x = SPOTS.spawn.x; player.y = SPOTS.spawn.y; player.health = PLAYER.health;
    player.inCar = null; player.vx = 0; player.vy = 0;
    state.wanted = 0; state.heat = 0; state.bustedMeter = 0; state.busted = false; state.wasted = false; state.endT = 0;
    despawnPolice();
    if (!keepProgress) { state.cash = 120; state.complete = false; startMission(0); }
    else startMission(state.mission);
  }

  function step(dt, input, actions) {
    state.time += dt;
    if (state.bannerT > 0) state.bannerT -= dt;
    if (state.crimeCooldown > 0) state.crimeCooldown -= dt;
    if (state.attackT > 0) state.attackT -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 14);
    state.seen = false;

    if (state.busted || state.wasted) {
      state.endT += dt;
      if (state.endT > 2.4) {
        const penalty = Math.min(state.cash, Math.floor(state.cash * 0.1) + 25);
        state.cash -= penalty;
        banner((state.busted ? 'BUSTED — the Patrol impounds $' : 'WASTED — hospital bill $') + penalty + '. Job restarted.');
        resetRun(true);
      }
      return;
    }

    if (actions & 4) enterExit(); // ACT_ENTER
    if ((actions & 8) && !player.inCar) attack(); // ACT_ATTACK

    if (player.inCar) {
      const c = player.inCar;
      driveCar(c, dt, -input.my, input.mx, input.sprint);
      player.x = c.x; player.y = c.y; player.angle = c.angle;
      player.moving = Math.abs(c.speed) > 12;
      if (Math.abs(c.speed) > 235 && isOnRoad(c.x, c.y) && rng() > 0.995) crime(1); // reckless speed
    } else {
      const len = Math.hypot(input.mx, input.my) || 1;
      const sp = input.sprint ? PLAYER.run : PLAYER.walk;
      const vx = (input.mx / len) * sp * (input.mx || input.my ? 1 : 0);
      const vy = (input.my / len) * sp * (input.mx || input.my ? 1 : 0);
      player.moving = !!(input.mx || input.my);
      if (player.moving) player.angle = Math.atan2(vy, vx);
      const probe = { x: player.x + vx * dt, y: player.y + vy * dt };
      const hit = collideBuildings(probe, PLAYER.radius);
      player.x = probe.x; player.y = probe.y;
      if (hit) { /* slid along wall by axis clamp in collideBuildings */ }
      // Stepping into traffic lanes is dangerous; cars brake in trafficStep.
    }

    for (const c of cars) {
      if (c === player.inCar) continue;
      if (c.kind === 'traffic' && c.driver) trafficStep(c, dt);
      else if (c.kind === 'police' && c !== player.inCar) policeStep(c, dt);
    }
    for (const p of peds) pedStep(p, dt);

    // Pickups: cash drops and health hearts from downed peds / found stashes.
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i]; pk.t -= dt;
      if (pk.t <= 0) { pickups.splice(i, 1); continue; }
      if (Math.hypot(pk.x - player.x, pk.y - player.y) < 30) {
        state.cash += 20; state.sounds.push('pickup'); pickups.splice(i, 1);
      }
    }
    if (rng() > 0.9995 && pickups.length < 5) pickups.push({ x: randRange(rng, 100, WORLD.width - 100), y: randRange(rng, 100, WORLD.height - 100), kind: 'cash', t: 30 });

    // Wanted lifecycle.
    if (state.wanted > 0) {
      spawnPolice();
      if (state.seen) state.heat = 0;
      else {
        state.heat += dt;
        if (state.heat >= WANTED.coolPerStar) {
          state.heat = 0; state.wanted--;
          if (state.wanted === 0) { despawnPolice(); banner('You lost the Patrol.'); }
          else banner('Heat fading — ' + state.wanted + ' star' + (state.wanted > 1 ? 's' : '') + ' left.');
        }
      }
      // Busted: cornered on foot by a nearby patrol car while barely moving.
      const nearCop = cars.some((c) => c.kind === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < 92);
      if (!player.inCar && nearCop && !player.moving) {
        state.bustedMeter += dt;
        if (state.bustedMeter > 2.2) { state.busted = true; state.endT = 0; state.sounds.push('busted'); }
      } else state.bustedMeter = Math.max(0, state.bustedMeter - dt * 1.6);
    }
    if (player.health <= 0) { player.health = 0; state.wasted = true; state.endT = 0; state.sounds.push('busted'); }

    missionStep(dt);
  }

  startMission(0);
  return { state, player, cars, peds, pickups, city, spots: SPOTS, missionCar, sportsCar, step, resetRun, startMission };
}
