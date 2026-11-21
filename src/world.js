// The ground and the scenery: the start area, the north area behind a fence and gate,
// the east iron area behind a second fence and gate (M7), and the trees (wood),
// rocks (stone) and ore rocks (iron) you can gather from.
import * as THREE from 'three';
import { CONFIG, SITES, DELIVER } from './config.js';
import { buildScenery, roadPoints, roadKeepClear } from './scenery.js';
import { makeTree, makeRock, makeIronRock, makeStump, makePebbles, makeFenceSection, makeFencePost, makeGateDoor } from './models.js';

// Small seeded random generator so the map is the same every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A straight fence with a gate in it.
// axis 'z': the fence runs along x at z = "at" (the north fence). axis 'x': it runs along z at x = "at" (the east fence).
// from..to: where the fence starts and ends along its length. gap: the middle of the gate.
function buildFence(scene, obstacles, { id, axis, at, from, to, gap, gapHalf }) {
  const section = 2;
  const put = (obj, along, across) => {
    if (axis === 'z') obj.position.set(along, 0, across);
    else { obj.position.set(across, 0, along); obj.rotation.y += -Math.PI / 2; }
  };
  for (let a = from; a < to - 0.01; a += section) {
    const mid = a + section / 2;
    if (Math.abs(mid - gap) < gapHalf) continue;
    const s = makeFenceSection(section);
    put(s, mid, at);
    scene.add(s);
  }
  for (const side of [-1, 1]) {
    const p = makeFencePost();
    const along = gap + side * (gapHalf + 0.15);
    put(p, along, at);
    scene.add(p);
    obstacles.push(axis === 'z' ? { x: along, z: at, r: 0.25 } : { x: at, z: along, r: 0.25 });
  }
  // Two doors, hinged at the posts, meeting in the middle.
  const doorW = gapHalf - 0.05;
  const doors = [-1, 1].map((side) => {
    const d = makeGateDoor(doorW);
    d.rotation.y = side < 0 ? 0 : Math.PI; // the second door is turned round so it also reaches the middle
    put(d, gap + side * gapHalf, at);
    scene.add(d);
    return { mesh: d, side, closed: d.rotation.y };
  });
  // z and gapX are kept for the north fence, which the helpers use to find the gate.
  return { id, axis, at, from, to, gap, gapHalf, open: false, opening: 0, doors, z: at, gapX: gap };
}

export function buildWorld(scene) {
  const W = CONFIG.world;
  const G = CONFIG.gather;
  const E = W.east;
  const half = W.size / 2;
  const fenceZ = -half;                  // the fence between the start area and the north area
  const northEnd = fenceZ - W.north.depth;
  const eastX = half;                    // the fence between the start area and the east area
  const obstacles = []; // { x, z, r } circles the villager can't walk through
  const nodes = [];     // trees and rocks you can gather from (see gather.js)

  // The playable ground is made of these rectangles; fences stand where they meet.
  const areas = [
    { id: 'start', minX: -half, maxX: half, minZ: -half, maxZ: half },
    { id: 'north', minX: -half, maxX: half, minZ: northEnd, maxZ: fenceZ },
    { id: 'east', minX: eastX, maxX: eastX + E.depth, minZ: -E.halfZ, maxZ: E.halfZ },
  ];

  const road = roadPoints(fenceZ, eastX);

  const gapHalf = W.gateWidth / 2;
  const fences = [
    buildFence(scene, obstacles, { id: 'north', axis: 'z', at: fenceZ, from: -half, to: half, gap: 0, gapHalf }),
    buildFence(scene, obstacles, { id: 'east', axis: 'x', at: eastX, from: -E.halfZ, to: E.halfZ, gap: E.gateZ, gapHalf }),
  ];

  // ---- Trees and rocks ----
  // Keep them off build sites, the start point and the paths through the gates.
  const keepClear = [{ x: 0, z: 0, r: W.clearRadius }];
  for (const s of SITES) keepClear.push({ x: s.x, z: s.z, r: s.clear || DELIVER.padSize + 0.5 });
  for (let z = fenceZ + 6; z > fenceZ - 6; z -= 2) keepClear.push({ x: 0, z, r: 3 });
  for (let x = eastX - 6; x < eastX + 6; x += 2) keepClear.push({ x, z: E.gateZ, r: 3 });
  keepClear.push(...roadKeepClear(road));

  const rand = rng(W.seed);
  const place = (count, type, make, makeLeftover, radius, amount, area, areaId) => {
    let tries = 0;
    let placed = 0;
    while (placed < count && tries < count * 30) {
      tries++;
      const x = area.x0 + rand() * (area.x1 - area.x0);
      const z = area.z0 + rand() * (area.z1 - area.z0);
      if (keepClear.some((c) => Math.hypot(c.x - x, c.z - z) < c.r)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + radius + 0.8)) continue;
      const scale = 0.85 + rand() * 0.4;
      const obj = make(scale);
      obj.position.set(x, 0, z);
      obj.rotation.y = rand() * Math.PI * 2;
      scene.add(obj);
      const leftover = makeLeftover(scale);
      leftover.position.set(x, 0, z);
      leftover.visible = false;
      scene.add(leftover);
      const obstacle = { x, z, r: radius * scale };
      obstacles.push(obstacle);
      nodes.push({ type, obj, leftover, obstacle, x, z, r: obstacle.r, scale, amount, max: amount, regrowIn: 0, shake: 0, grow: 1, area: areaId });
      placed++;
    }
  };
  // Not too close to the fences, so nothing can be gathered through them.
  // (Trees near the east fence stay out of reach from the far side: the gathering range is shorter than the gap.)
  const start = { x0: -half + 1.5, x1: half - 1.5, z0: fenceZ + 2.5, z1: half - 1.5 };
  const north = { x0: -half + 1.5, x1: half - 1.5, z0: northEnd + 1.5, z1: fenceZ - 2.5 };
  const east = { x0: eastX + 2.5, x1: eastX + E.depth - 1.5, z0: -E.halfZ + 1.5, z1: E.halfZ - 1.5 };
  place(W.trees, 'wood', makeTree, makeStump, 0.35, G.woodPerTree, start, 'start');
  place(W.rocks, 'stone', makeRock, makePebbles, 0.6, G.stonePerRock, start, 'start');
  place(W.north.trees, 'wood', makeTree, makeStump, 0.35, G.woodPerTree, north, 'north');
  place(W.north.rocks, 'stone', makeRock, makePebbles, 0.6, G.stonePerRock, north, 'north');
  place(E.iron, 'iron', makeIronRock, makePebbles, 0.6, W.ironPerRock, east, 'east');
  place(E.rocks, 'stone', makeRock, makePebbles, 0.6, G.stonePerRock, east, 'east');

  // Ground, road, grass tufts, flowers and the forest edge (looks only).
  const pads = SITES.map((s) => ({ x: s.x, z: s.z, r: (s.clear || DELIVER.padSize) * 0.75 }));
  const avoid = (x, z) =>
    obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.2) ||
    pads.some((p) => Math.hypot(p.x - x, p.z - z) < p.r) ||
    Math.abs(z - fenceZ) < 0.6 || Math.abs(x - eastX) < 0.6;
  buildScenery(scene, areas, road, avoid);

  const inArea = (x, z) => areas.some((a) => x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ);

  const world = {
    half,
    areas,
    // The box around all areas (the player is also kept inside the areas themselves, see player.js).
    bounds: { minX: -half, maxX: eastX + E.depth, minZ: northEnd, maxZ: half },
    obstacles,
    nodes,
    fences,

    // True when a circle of radius r at (x, z) is on playable ground.
    fits(x, z, r) {
      return inArea(x - r, z) && inArea(x + r, z) && inArea(x, z - r) && inArea(x, z + r);
    },

    // Opens a gate ('north' or 'east'). "instant" is used when loading a saved game.
    openGate(id = 'north', instant = false) {
      const f = fences.find((x) => x.id === id);
      f.open = true;
      if (instant) f.opening = 1;
    },

    update(dt) {
      for (const f of fences) {
        if (f.open && f.opening < 1) f.opening = Math.min(1, f.opening + dt / 0.8);
        // Doors swing outward (into the new area).
        const a = (1 - Math.pow(1 - f.opening, 3)) * (Math.PI / 2) * 0.95;
        for (const d of f.doors) d.mesh.rotation.y = d.closed + (d.side < 0 ? a : -a);
      }
    },
  };
  return world;
}
