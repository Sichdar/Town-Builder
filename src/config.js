// All the numbers that tune how the game feels. Change values here, not in the code.
export const CONFIG = {
  version: 'v0.1 (M1)',

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

  world: {
    size: 48,          // the playable square is size x size metres
    trees: 45,
    rocks: 14,
    clearRadius: 6,    // no trees or rocks this close to the start point
    seed: 7,           // same seed = same map every time
  },
};
