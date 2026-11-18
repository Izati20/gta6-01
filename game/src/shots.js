// Deterministic scenes for screenshots: ?shot=start|play|end&seed=1.
// Each scene is staged by placing the world directly, then stepping the real
// simulation a fixed number of steps so physics, traffic and AI are live.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const IDLE = { mx: 0, my: 0, sprint: false };

export function stageShot(name, world) {
  const { state, player } = world;
  if (name === 'start') {
    for (let i = 0; i < 90; i++) world.step(STEP, IDLE, 0);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-chase: Marina in the yellow coupe on Harbor Avenue, Patrol behind,
    // two wanted stars, garage marker set — the core loop in one frame.
    world.startMission(0);
    const car = world.missionCar;
    car.x = 1150; car.y = 806; car.angle = 0; car.speed = 190;
    player.inCar = car; car.driver = true;
    player.x = car.x; player.y = car.y; player.angle = 0;
    state.phase = 1;
    state.objective = 'Drive the coupe to Deco\'s garage';
    state.marker = { ...world.spots.garage, r: 96, label: 'GARAGE' };
    state.cash = 370; state.wanted = 2;
    state.banner = 'The Patrol is on you — keep moving!'; state.bannerT = 99;
    for (let i = 0; i < 100; i++) world.step(STEP, { mx: 0, my: -1, sprint: false }, 0);
    state.banner = 'The Patrol is on you — keep moving!'; state.bannerT = 99;
    state.wanted = Math.max(2, state.wanted);
    // Frame one patrol car visibly in pursuit behind the player for the shot.
    const cop = world.cars.find((c) => c.kind === 'police');
    if (cop) { cop.x = player.x - 300; cop.y = player.y + 6; cop.angle = 0; cop.speed = 200; }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // end: the Last Score is done — story complete, free roam at the airstrip
  // in the red sports car, cash banked, harbor at her feet.
  world.startMission(5);
  const car = world.sportsCar;
  car.x = 2920; car.y = 300; car.angle = 0; car.speed = 0;
  player.inCar = car; car.driver = true;
  player.x = car.x; player.y = car.y; player.angle = 0;
  state.cash = 4720; state.stats.missionsDone = 5;
  for (let i = 0; i < 45; i++) world.step(STEP, IDLE, 0);
  state.complete = true;
  state.bannerT = 0; state.banner = '';
  return { screen: SCREEN_PLAY, best: 4720 };
}
