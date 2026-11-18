// Vice Harbor — tuning, palette and story text in one place.
// The world is a fixed 3360x2520 city; the camera shows a 1280x720 view of it.

export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3360, height: 2520 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walk: 175,
  run: 285,
  health: 100,
  attackRange: 46,
  attackDamage: 34,
  attackCooldown: 0.38,
};

export const CAR = {
  width: 44,
  height: 22,
  accel: 340,
  brake: 520,
  drag: 0.55,
  grip: 3.4,
  maxReverse: 120,
};

export const WANTED = {
  max: 5,
  // Seconds of staying out of police sight needed to shed one star.
  coolPerStar: 7,
  policePerStar: 1,
};

export const SAVE_KEY = 'vice-harbor.save.v1';
export const BEST_KEY = 'vice-harbor.best.v1';

export const PALETTE = {
  water: '#123a56',
  sand: '#c9b078',
  grass: '#3e7d44',
  sidewalk: '#9aa0a3',
  road: '#33373d',
  roadLine: '#d8c95a',
  crosswalk: '#cfd3d6',
  roofA: '#8a5a44',
  roofB: '#5d6d7e',
  roofC: '#7a4a56',
  roofD: '#4f6152',
  player: '#ffd23f',
  police: '#e8ecf2',
  policeTrim: '#2456c8',
  marker: '#ffcf3f',
  danger: '#e5534b',
  text: '#f2f4f6',
  muted: '#aeb6bf',
  panel: 'rgba(12,16,22,0.78)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const CITY_NAME = 'Vice Harbor';
export const HERO = 'Marina Vale';

export const INTRO = [
  'Vice Harbor, 2026. Marina Vale is back in the city that owes her money.',
  'An old friend, Deco, has work: wheels, packages and one last score.',
  'Finish all five jobs to own the harbor. Avoid the Harbor Patrol — or outrun them.',
];

export const MISSIONS = [
  {
    title: '1 · First Wheels',
    brief: 'Deco left a coupe by the Palms Hotel. Get in and drive it to his garage.',
    done: 'Garage reached. Deco approves of the paint — mostly.',
    reward: 250,
  },
  {
    title: '2 · Package Run',
    brief: 'Pick up the package at the market on foot, then deliver it to the docks.',
    done: 'Delivered. The dockmaster pays in cash and silence.',
    reward: 400,
  },
  {
    title: '3 · Hot Metal',
    brief: 'Steal the red sports car at the marina, then lose the Patrol and reach the hideout.',
    done: 'Heat lost, car kept. Deco calls it a donation.',
    reward: 650,
  },
  {
    title: '4 · Harbor Run',
    brief: 'Hit all four checkpoints around the city before the clock runs out. Any car.',
    done: 'Every checkpoint, seconds to spare. The harbor respects speed.',
    reward: 800,
  },
  {
    title: '5 · The Last Score',
    brief: 'Collect the three cash bags, then bring them to the airstrip hangar. Expect heat.',
    done: 'The Last Score is done. Vice Harbor is yours, Marina.',
    reward: 1500,
  },
];

export const CONTROLS = [
  'WASD / Arrows — move · drive',
  'Shift — run · handbrake drift',
  'E or F — enter / exit car (walk up to any car to steal it)',
  'J / Space / Click — punch · shove',
  'P or Esc — pause · M — mute',
];
