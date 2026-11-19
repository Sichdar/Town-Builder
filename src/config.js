// All the numbers that tune how the game feels. Change values here, not in the code.
export const CONFIG = {
  version: 'v0.3 (M3)',

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
  },
};

// Build sites, in the order they appear. "after" = shows up once that site is built.
// x, z = where the site is (0, 0 is the start; north is negative z). "needs" = what it takes.
export const SITES = [
  { id: 'hut',  name: 'Woodcutter hut', x: 0,  z: 5,   needs: { wood: 10 },           builds: 'hut',  after: null },
  { id: 'gate', name: 'North gate',     x: 0,  z: -20, needs: { wood: 15, stone: 8 }, builds: 'gate', after: 'hut' },
  { id: 'well', name: 'Well',           x: -4, z: -31, needs: { stone: 12 },          builds: 'well', after: 'gate' },
];

export const DELIVER = {
  every: 0.12,       // seconds between two pieces flying off your back into a site
  padSize: 3,        // build site patch is padSize x padSize metres
  fly: 0.3,          // seconds a piece takes to fly into the site
};

export const SAVE = {
  key: 'town-builder-save-v1', // where progress is kept on the phone
  every: 3,                    // seconds between automatic saves
};
