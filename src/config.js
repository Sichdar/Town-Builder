// All the numbers that tune how the game feels. Change values here, not in the code.
export const CONFIG = {
  version: 'v0.7 (town)',

  player: {
    speed: 6,          // metres per second at full joystick
    radius: 0.45,      // how wide the villager is for bumping into things
    turnSpeed: 12,     // how fast the villager turns to face where it walks
  },

  joystick: {
    radius: 55,        // pixels from the centre to the edge of the joystick
    deadZone: 0.12,    // tiny drags below this are ignored
  },

  camera: {
    fov: 45,
    offset: { x: 0, y: 12.5, z: 10 }, // where the camera sits relative to the villager
    follow: 6,         // higher = camera catches up faster
  },

  gather: {
    range: 1.3,        // how close (metres from the edge of a tree or rock) you must stand to gather
    every: 0.35,       // seconds between two pieces gathered
    stackMax: 10,      // most pieces you can carry on your back
    woodPerTree: 4,    // pieces of wood in one tree before it is cut down
    stonePerRock: 3,   // pieces of stone in one rock before it is used up
    regrow: 15,        // seconds until a cut tree or used rock is back
    fly: 0.28,         // seconds a piece takes to fly onto your back
  },

  world: {
    size: 48,          // the playable square is size x size metres
    trees: 45,
    rocks: 14,
    clearRadius: 6,    // no trees or rocks this close to the start point
    seed: 7,           // same seed = same map every time
    north: { depth: 32, trees: 35, rocks: 18 }, // the area behind the fence, opened by the gate
    gateWidth: 4,      // metres of opening in the fence
    // M7: the iron area east of the start, behind a second fence and gate (opened at town level 2).
    east: { depth: 26, halfZ: 18, gateZ: 0, iron: 16, rocks: 6 },
    ironPerRock: 3,    // pieces of iron ore in one ore rock
  },
};

// Build sites, in the order they appear. "after" = shows up once that site is built.
// x, z = where the site is (0, 0 is the start; north is negative z). "needs" = what it takes.
export const SITES = [
  { id: 'hut',  name: 'Woodcutter hut', x: 0,  z: 5,   needs: { wood: 10 },           builds: 'hut',  after: null },
  { id: 'gate', name: 'North gate',     x: 0,  z: -20, needs: { wood: 15, stone: 8 }, builds: 'gate', after: 'hut' },
  { id: 'well', name: 'Well',           x: -4, z: -31, needs: { stone: 12 },          builds: 'well', after: 'gate' },
  // Buildings that turn one thing into another (see CONVERTERS below). They need room for two pads.
  { id: 'sawmill', name: 'Sawmill', x: -9, z: 8,   needs: { wood: 20 },            builds: 'sawmill', after: 'well',    clear: 5.5 },
  { id: 'mason',   name: 'Mason',   x: 9,  z: -34, needs: { stone: 15, plank: 6 }, builds: 'mason',   after: 'sawmill', clear: 5.5 },
  { id: 'market',  name: 'Market',  x: 9,  z: 8,   needs: { plank: 8, block: 8 },  builds: 'market',  after: 'mason',   clear: 5.5 },
  // M6: hire helpers here (green pad), collect what they bring from the stockpile (yellow pad).
  { id: 'lodge',   name: 'Helper lodge', x: -9, z: -8, needs: { wood: 15, plank: 10 }, builds: 'lodge', after: 'market', clear: 5.5 },
  // M7: houses bring villagers (see TOWN below). Two houses make a Village, which opens the east gate site.
  { id: 'house1', name: 'House', x: -4, z: -2,  needs: { plank: 8,  block: 4 },  builds: 'house', after: 'lodge' },
  { id: 'house2', name: 'House', x: 5,  z: -10, needs: { plank: 10, block: 6 },  builds: 'house', after: 'house1' },
  { id: 'egate',  name: 'East gate', x: 20, z: 0, needs: { wood: 20, block: 10 }, builds: 'egate', after: 'house2' },
  { id: 'house3', name: 'House', x: -5, z: -15, needs: { plank: 12, block: 8 },  builds: 'house', after: 'house2' },
  { id: 'house4', name: 'House', x: 6,  z: -17, needs: { plank: 14, block: 10 }, builds: 'house', after: 'house3' },
  { id: 'house5', name: 'House', x: -16, z: 1,  needs: { plank: 16, block: 12 }, builds: 'house', after: 'house4' },
];

// M7: the town. Each house brings villagers; the number of villagers sets the town level.
export const TOWN = {
  perHouse: 2,        // villagers each house brings
  levels: [           // "at" = villagers needed
    { name: 'Hamlet',  at: 0 },
    { name: 'Village', at: 4 },
    { name: 'Town',    at: 10 },
  ],
  rentEvery: 30,      // seconds; each villager pays 1 coin this often
  speed: 1.6,         // villagers stroll, metres per second
  wander: 9,          // how far from their house they stroll
  colors: [0xc0504d, 0x9bbb59, 0xf2c14e, 0x4bacc6, 0xe08cc0, 0x8064a2, 0xf79646, 0x6aa84f, 0xd9d2c5, 0x5b9bd5],
};

export const DELIVER = {
  every: 0.12,       // seconds between two pieces flying off your back into a site
  padSize: 3,        // build site patch is padSize x padSize metres
  fly: 0.3,          // seconds a piece takes to fly into the site
};

export const SAVE = {
  key: 'town-builder-save-v1', // where progress is kept on the phone (old name kept on purpose, so saves still load)
  every: 3,                    // seconds between automatic saves
};

// What the buildings do once built. Drop goods on the left pad (in), collect from the right pad (out).
export const CONVERTERS = {
  sawmill: { takes: 'wood',  makes: 'plank', every: 1.2, inMax: 20, outMax: 20 },
  mason:   { takes: 'stone', makes: 'block', every: 1.5, inMax: 20, outMax: 20 },
  market:  { prices: { wood: 1, stone: 1, plank: 3, block: 3, iron: 5 } }, // coins paid per piece
  padSize: 2.2,      // the in and out pads
  padOffset: 3,      // metres from the building's middle to each pad
};

// M5 upgrades, bought with coins. Each level costs the next number in "costs".
export const UPGRADES = {
  toolStep: 0.8,   // each axe or pick level: gathering takes 80% of the time it did
  bagStep: 4,      // each backpack level: room for 4 more pieces
  bootsStep: 0.1,  // each boots level: walk 10% faster than at the start
  list: [
    { id: 'axe',   name: 'Sharper axe',      icon: '🪓', text: 'Cut wood faster',     costs: [10, 25, 50, 90, 150] },
    { id: 'pick',  name: 'Stronger pick',    icon: '⛏️', text: 'Break stone faster',  costs: [10, 25, 50, 90, 150] },
    { id: 'bag',   name: 'Bigger backpack',  icon: '🎒', text: 'Carry 4 more pieces', costs: [15, 35, 70, 120, 200] },
    { id: 'boots', name: 'Faster boots',     icon: '👢', text: 'Walk 10% faster',     costs: [12, 30, 60, 100, 160] },
  ],
};

// M6 helpers: villagers you hire at the lodge. They gather on their own and carry to the stockpile.
export const HELPERS = {
  costs: [20, 40, 70, 110], // coins for the 1st, 2nd, 3rd and 4th helper (4 at most)
  jobs: {
    wood:  { name: 'Woodcutter',    color: 0xd08a2e }, // orange shirt
    stone: { name: 'Quarry worker', color: 0x7a4fa0 }, // purple shirt
  },
  speed: 3.5,       // metres per second (your boots don't count for them)
  carry: 5,         // pieces a helper brings back each trip
  pileMax: 40,      // most pieces the stockpile holds; helpers wait when it's full
  gatherSlower: 1.6,// helpers gather this many times slower than you; your axe and pick upgrades help them too
};
