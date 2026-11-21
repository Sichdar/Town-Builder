// Looks only, nothing you can touch: the ground with its grass patches and dirt road,
// grass tufts and flowers, and a thick forest around the edge of the map.
// Tufts, flowers and forest trees are drawn as "instances" (one shape repeated many times),
// which phones can draw cheaply.
import * as THREE from 'three';

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

// Smooth random bumps (value noise), used for the light and dark grass patches.
function noise2(x, z) {
  const h = (i, j) => {
    const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// The dirt roads: each is a line of points. Returns how far (x, z) is from the nearest one.
function distToRoad(roads, x, z) {
  let best = Infinity;
  for (const road of roads) {
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
    }
  }
  return best;
}

// The roads (north to the gate, and the M7 branch east to the iron area), plus circles to keep
// trees and rocks off them (used by world.js before placing them).
export function roadPoints(fenceZ, eastX) {
  return [
    [[0, 3.4], [0, 0], [0.4, -8], [-0.3, -16], [0, fenceZ], [0, fenceZ - 5], [-3, fenceZ - 8]],
    [[0.2, -4], [8, -3.2], [15, -1], [eastX, 0], [eastX + 6, 0.6], [eastX + 9, 3]],
  ];
}
export function roadKeepClear(roads, r = 1.8) {
  const out = [];
  for (const road of roads) for (let i = 0; i < road.length - 1; i++) {
    const [ax, az] = road[i], [bx, bz] = road[i + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5);
    for (let k = 0; k <= steps; k++) out.push({ x: ax + (bx - ax) * k / steps, z: az + (bz - az) * k / steps, r });
  }
  return out;
}

const C = {
  grass: new THREE.Color(0x78bf52),
  grassLight: new THREE.Color(0xa6d65f),
  grassDark: new THREE.Color(0x56a043),
  dirt: new THREE.Color(0xc29a5e),
  dirtEdge: new THREE.Color(0xa5b85a),
};

// areas: the playable rectangles { minX, maxX, minZ, maxZ }. avoid(x, z) says where tufts and flowers must not go.
export function buildScenery(scene, areas, road, avoid, seed = 11) {
  const rand = rng(seed);
  // The box around all areas, and how far a spot is outside the playable ground (0 = on it).
  const b = {
    minX: Math.min(...areas.map((a) => a.minX)), maxX: Math.max(...areas.map((a) => a.maxX)),
    minZ: Math.min(...areas.map((a) => a.minZ)), maxZ: Math.max(...areas.map((a) => a.maxZ)),
  };
  const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
  const outside = (x, z) => Math.min(...areas.map((a) => Math.max(a.minX - x, x - a.maxX, a.minZ - z, z - a.maxZ, 0)));

  for (const a of areas) buildGround(scene, a, road);
  buildDetails(scene, b, w, d, rand, road, avoid, outside);
}

// ---- Ground: one sheet per area, coloured corner by corner ----
function buildGround(scene, b, road) {
  const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w / 0.8), Math.round(d / 0.8));
  geo.rotateX(-Math.PI / 2);
  geo.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = noise2(x * 0.12, z * 0.12) * 0.7 + noise2(x * 0.45, z * 0.45) * 0.3;
    if (n > 0.5) c.copy(C.grass).lerp(C.grassLight, (n - 0.5) * 1.6);
    else c.copy(C.grass).lerp(C.grassDark, (0.5 - n) * 1.6);
    // Road: dirt in the middle, a worn yellowish edge, then grass.
    const r = distToRoad(road, x, z) + (noise2(x * 0.9, z * 0.9) - 0.5) * 0.5;
    if (r < 0.8) c.copy(C.dirt);
    else if (r < 1.4) c.lerp(C.dirtEdge, 1 - (r - 0.8) / 0.6).lerp(C.dirt, Math.max(0, 1.1 - r) * 2);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildDetails(scene, b, w, d, rand, road, avoid, outside) {
  // Forest floor all around, darker.
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ color: 0x447c36 }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.02;
  edge.receiveShadow = true;
  scene.add(edge);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const free = (x, z) => outside(x, z) === 0 && !avoid(x, z) && distToRoad(road, x, z) > 1.7;

  // ---- Grass tufts: three thin blades each ----
  const blade = new THREE.ConeGeometry(0.06, 0.38, 3);
  blade.translate(0, 0.19, 0);
  const TUFTS = 260;
  const tufts = new THREE.InstancedMesh(blade, new THREE.MeshLambertMaterial({ color: 0x5c9e3e }), TUFTS * 3);
  let n = 0;
  for (let tries = 0; n < TUFTS * 3 && tries < TUFTS * 20; tries++) {
    const x = b.minX + 0.5 + rand() * (w - 1), z = b.minZ + 0.5 + rand() * (d - 1);
    if (!free(x, z)) continue;
    const size = 0.7 + rand() * 0.6;
    for (let k = 0; k < 3; k++) {
      e.set((rand() - 0.5) * 0.7, rand() * 6, (rand() - 0.5) * 0.7);
      q.setFromEuler(e);
      m4.compose(v.set(x + (rand() - 0.5) * 0.25, 0, z + (rand() - 0.5) * 0.25), q, s.setScalar(size));
      tufts.setMatrixAt(n++, m4);
    }
  }
  tufts.count = n;
  scene.add(tufts);

  // ---- Flowers: little coloured heads, in small clusters ----
  const head = new THREE.IcosahedronGeometry(0.09, 0);
  head.translate(0, 0.14, 0);
  const FLOWERS = 220;
  const flowers = new THREE.InstancedMesh(head, new THREE.MeshLambertMaterial({ color: 0xffffff }), FLOWERS);
  const petals = [0xffffff, 0xffe066, 0xff8fb1, 0xb69cff, 0xffa94d].map((h) => new THREE.Color(h));
  n = 0;
  for (let tries = 0; n < FLOWERS && tries < FLOWERS * 20; tries++) {
    const cx = b.minX + 1 + rand() * (w - 2), cz = b.minZ + 1 + rand() * (d - 2);
    const col = petals[Math.floor(rand() * petals.length)];
    const many = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < many && n < FLOWERS; k++) {
      const x = cx + (rand() - 0.5) * 1.4, z = cz + (rand() - 0.5) * 1.4;
      if (!free(x, z)) continue;
      m4.compose(v.set(x, 0, z), q.identity(), s.setScalar(0.8 + rand() * 0.5));
      flowers.setMatrixAt(n, m4);
      flowers.setColorAt(n, col);
      n++;
    }
  }
  flowers.count = n;
  scene.add(flowers);

  // ---- Forest around the edge: pines in a thick band, never inside the playable ground ----
  const spots = [];
  const band = 10;
  // More spots now that the map has an east part and an empty corner to fill.
  for (let tries = 0; spots.length < 760 && tries < 9000; tries++) {
    const x = b.minX - band + rand() * (w + band * 2);
    const z = b.minZ - band + rand() * (d + band * 2);
    const out = outside(x, z);
    if (out < 0.9) continue;
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6)) continue;
    spots.push({ x, z, size: 0.9 + rand() * 0.7 + Math.min(out, 6) * 0.06, turn: rand() * 6, shade: rand() });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.0, 5);
  trunkGeo.translate(0, 0.5, 0);
  const lowGeo = new THREE.ConeGeometry(1.1, 1.6, 6);
  lowGeo.translate(0, 1.55, 0);
  const topGeo = new THREE.ConeGeometry(0.75, 1.3, 6);
  topGeo.translate(0, 2.4, 0);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const parts = [
    new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6a4020, flatShading: true }), spots.length),
    new THREE.InstancedMesh(lowGeo, leafMat, spots.length),
    new THREE.InstancedMesh(topGeo, leafMat, spots.length),
  ];
  const greens = [0x2f7a3a, 0x3a8a3f, 0x2b6e45, 0x417f33].map((h) => new THREE.Color(h));
  spots.forEach((p, i) => {
    q.setFromEuler(e.set(0, p.turn, 0));
    m4.compose(v.set(p.x, 0, p.z), q, s.setScalar(p.size));
    const col = greens[Math.floor(p.shade * greens.length)];
    for (const part of parts) part.setMatrixAt(i, m4);
    parts[1].setColorAt(i, col);
    parts[2].setColorAt(i, col.clone().offsetHSL(0, 0, 0.04));
  });
  // The front rows cast shadows onto the playable ground, which looks nicer at the border.
  for (const part of parts) { part.castShadow = true; scene.add(part); }
}
