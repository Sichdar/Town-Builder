// The ground and the scenery: the start area, the north area behind a fence and gate,
// and the trees (wood) and rocks (stone) you can gather from.
import * as THREE from 'three';
import { CONFIG, SITES, DELIVER } from './config.js';
import { makeTree, makeRock, makeStump, makePebbles, makeFenceSection, makeFencePost, makeGateDoor } from './models.js';

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

export function buildWorld(scene) {
  const W = CONFIG.world;
  const G = CONFIG.gather;
  const half = W.size / 2;
  const fenceZ = -half;                  // the fence between the start area and the north area
  const northEnd = fenceZ - W.north.depth;
  const obstacles = []; // { x, z, r } circles the villager can't walk through
  const nodes = [];     // trees and rocks you can gather from (see gather.js)

  const groundMat = new THREE.MeshLambertMaterial({ color: 0x7cc35a });
  const addGround = (w, d, x, z) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), groundMat);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0, z);
    g.receiveShadow = true;
    scene.add(g);
  };
  addGround(W.size, W.size, 0, 0);
  addGround(W.size, W.north.depth, 0, fenceZ - W.north.depth / 2);

  // A darker band all around so the border is visible.
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ color: 0x4f8f3a }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.02;
  scene.add(edge);

  // ---- Fence with a gate in the middle ----
  const gapHalf = W.gateWidth / 2;
  const section = 2;
  for (let x = -half; x < half - 0.01; x += section) {
    const mid = x + section / 2;
    if (Math.abs(mid) < gapHalf) continue;
    const s = makeFenceSection(section);
    s.position.set(mid, 0, fenceZ);
    scene.add(s);
  }
  for (const side of [-1, 1]) {
    const p = makeFencePost();
    p.position.set(side * (gapHalf + 0.15), 0, fenceZ);
    scene.add(p);
    obstacles.push({ x: side * (gapHalf + 0.15), z: fenceZ, r: 0.25 });
  }
  // Two doors, hinged at the posts, meeting in the middle.
  const doorW = gapHalf - 0.05;
  const doors = [-1, 1].map((side) => {
    const d = makeGateDoor(doorW);
    d.position.set(side * gapHalf, 0, fenceZ);
    d.rotation.y = side < 0 ? 0 : Math.PI; // the right door is turned round so it also reaches the middle
    scene.add(d);
    return { mesh: d, side, closed: d.rotation.y };
  });
  const fence = { z: fenceZ, gapX: 0, gapHalf, open: false, opening: 0 };

  // ---- Trees and rocks ----
  // Keep them off build sites, the start point and the path through the gate.
  const keepClear = [{ x: 0, z: 0, r: W.clearRadius }];
  for (const s of SITES) keepClear.push({ x: s.x, z: s.z, r: s.clear || DELIVER.padSize + 0.5 });
  for (let z = fenceZ + 6; z > fenceZ - 6; z -= 2) keepClear.push({ x: 0, z, r: 3 });

  const rand = rng(W.seed);
  const place = (count, type, make, makeLeftover, radius, amount, area) => {
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
      nodes.push({ type, obj, leftover, obstacle, x, z, r: obstacle.r, scale, amount, max: amount, regrowIn: 0, shake: 0, grow: 1 });
      placed++;
    }
  };
  // Not too close to the fence, so nothing can be gathered through it.
  const start = { x0: -half + 1.5, x1: half - 1.5, z0: fenceZ + 2.5, z1: half - 1.5 };
  const north = { x0: -half + 1.5, x1: half - 1.5, z0: northEnd + 1.5, z1: fenceZ - 2.5 };
  place(W.trees, 'wood', makeTree, makeStump, 0.35, G.woodPerTree, start);
  place(W.rocks, 'stone', makeRock, makePebbles, 0.6, G.stonePerRock, start);
  place(W.north.trees, 'wood', makeTree, makeStump, 0.35, G.woodPerTree, north);
  place(W.north.rocks, 'stone', makeRock, makePebbles, 0.6, G.stonePerRock, north);

  const world = {
    half,
    bounds: { minX: -half, maxX: half, minZ: northEnd, maxZ: half },
    obstacles,
    nodes,
    fences: [fence],

    // Opens the gate. "instant" is used when loading a saved game.
    openGate(instant = false) {
      fence.open = true;
      if (instant) fence.opening = 1;
    },

    update(dt) {
      if (fence.open && fence.opening < 1) fence.opening = Math.min(1, fence.opening + dt / 0.8);
      // Doors swing outward (into the north area).
      const a = (1 - Math.pow(1 - fence.opening, 3)) * (Math.PI / 2) * 0.95;
      for (const d of doors) d.mesh.rotation.y = d.closed + (d.side < 0 ? a : -a);
    },
  };
  return world;
}
