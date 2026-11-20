// Placeholder 3D models built from simple shapes (low-poly style: flat-shaded faces).
// Later (your art): each maker will first look for assets/<name>.glb and use it if it exists.
import * as THREE from 'three';

const mat = (color) => new THREE.MeshLambertMaterial({ color });
const flat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

const M = {
  skin: mat(0xf1c27d),
  tunic: mat(0x3b6fb6),
  belt: mat(0x5a3a1e),
  hat: flat(0x8c5a2b),
  trousers: mat(0x5b4a3a),
  boots: mat(0x3a2a1c),
  eye: new THREE.MeshBasicMaterial({ color: 0x2a1d14 }),
  trunk: flat(0x7a4a24),
  pine: [flat(0x2f7a3a), flat(0x3a8a3f), flat(0x2b6e45)],
  leaf: [flat(0x4f9e3a), flat(0x5cad44), flat(0x6bb84a), flat(0x8fbf3f)],
  rock: flat(0x8d8f93),
  rockDark: flat(0x7a7c80),
  moss: flat(0x5e8f3a),
  stone: mat(0xa9acb1),
  wood: mat(0xd9b27a),
};

function shadowAll(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

// A number from 0 to 1 that is always the same for the same input (so the map looks the same each time).
export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Moves each corner of a shape a little, so rocks and trees don't all look the same.
function lumpy(geo, amount, seed) {
  const p = geo.attributes.position;
  const seen = new Map(); // corners shared by several faces must move together, or the shape cracks
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 1 + (hash(seen.size + seed * 13) - 0.5) * 2 * amount);
    const f = seen.get(key);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---- Villagers ----
const legGeo = new THREE.BoxGeometry(0.16, 0.36, 0.18);
legGeo.translate(0, -0.18, 0);  // pivot at the hip
const bootGeo = new THREE.BoxGeometry(0.18, 0.1, 0.26);
const armGeo = new THREE.CapsuleGeometry(0.075, 0.34, 3, 8);
armGeo.translate(0, -0.2, 0);   // pivot at the shoulder
const handGeo = new THREE.SphereGeometry(0.08, 8, 6);

// tunic = colour for helpers (the player keeps blue).
export function makeVillager(tunic = null) {
  const g = new THREE.Group();
  const cloth = tunic === null ? M.tunic : mat(tunic);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.36, 4, 12), cloth);
  body.position.y = 0.78;
  g.add(body);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), M.belt);
  belt.position.y = 0.62;
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), M.wood);
  buckle.position.set(0, 0.62, 0.35);
  g.add(buckle);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), M.skin);
  head.position.y = 1.36;
  g.add(head);
  for (const x of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), M.eye);
    eye.position.set(x, 1.4, 0.245);
    g.add(eye);
  }
  // Nose, so you can see which way the villager faces (the model faces +z).
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), M.skin);
  nose.position.set(0, 1.33, 0.27);
  g.add(nose);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 12), M.hat);
  brim.position.y = 1.55;
  g.add(brim);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.34, 12), M.hat);
  hat.position.y = 1.73;
  g.add(hat);

  const limb = (geo, m, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(new THREE.Mesh(geo, m));
    g.add(pivot);
    return pivot;
  };
  const legL = limb(legGeo, M.trousers, -0.13, 0.46);
  const legR = limb(legGeo, M.trousers, 0.13, 0.46);
  for (const leg of [legL, legR]) {
    const boot = new THREE.Mesh(bootGeo, M.boots);
    boot.position.set(0, -0.38, 0.04);
    leg.add(boot);
  }
  const armL = limb(armGeo, cloth, -0.4, 1.0);
  const armR = limb(armGeo, cloth, 0.4, 1.0);
  for (const arm of [armL, armR]) {
    const hand = new THREE.Mesh(handGeo, M.skin);
    hand.position.y = -0.45;
    arm.add(hand);
  }
  armL.rotation.z = -0.12;
  armR.rotation.z = 0.12;
  g.userData.limbs = { legL, legR, armL, armR };
  return shadowAll(g);
}

// Swings arms and legs. "walk" is 0 standing still, 1 at full speed.
// "carrying" keeps the arms forward a little, as if holding the straps of the load.
// "chop" goes from 1 to 0 right after a piece is gathered: the right arm swings down like an axe.
export function animateVillager(mesh, time, walk, carrying = false, chop = 0) {
  const L = mesh.userData.limbs;
  if (!L) return;
  const s = Math.sin(time) * 0.7 * walk;
  L.legL.rotation.x = s;
  L.legR.rotation.x = -s;
  const lift = carrying ? -0.5 : 0;
  L.armL.rotation.x = lift - s * (carrying ? 0.3 : 0.8);
  L.armR.rotation.x = lift + s * (carrying ? 0.3 : 0.8);
  if (chop > 0) L.armR.rotation.x = -Math.sin(chop * Math.PI) * 2.0;
}

// ---- Trees and rocks ----
// Pines and leafy trees, picked from the size so the same tree always looks the same.
export function makeTree(scale = 1) {
  const g = new THREE.Group();
  const pick = hash(Math.round(scale * 10000));
  const shade = Math.floor(hash(scale * 7777) * 3);
  if (pick < 0.55) {
    // Pine: three stacked cones.
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.0, 6), M.trunk);
    trunk.position.y = 0.5;
    g.add(trunk);
    const m = M.pine[shade];
    for (const [r, h, y] of [[1.05, 1.3, 1.4], [0.85, 1.15, 2.0], [0.6, 1.0, 2.6]]) {
      const c = new THREE.Mesh(lumpy(new THREE.ConeGeometry(r, h, 7), 0.08, shade + y), m);
      c.position.y = y;
      c.rotation.y = y;
      g.add(c);
    }
  } else {
    // Leafy tree: a few round clumps on a trunk.
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 1.6, 6), M.trunk);
    trunk.position.y = 0.8;
    g.add(trunk);
    const m = M.leaf[Math.floor(pick * 10) % 4];
    const clumps = pick < 0.8
      ? [[0, 2.1, 0, 0.95], [0.5, 1.75, 0.2, 0.6], [-0.45, 1.85, -0.2, 0.62], [0.1, 2.65, -0.1, 0.6]]
      : [[0, 2.0, 0, 0.85], [0.35, 2.5, 0.15, 0.6], [-0.3, 1.7, 0.35, 0.55]];
    clumps.forEach(([x, y, z, r], i) => {
      const c = new THREE.Mesh(lumpy(new THREE.IcosahedronGeometry(r, 1), 0.12, i + pick * 50), m);
      c.position.set(x, y, z);
      g.add(c);
    });
  }
  g.scale.setScalar(scale);
  return shadowAll(g);
}

export function makeRock(scale = 1) {
  const seed = Math.round(scale * 1000);
  const g = new THREE.Group();
  const rock = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(0.7, 1), 0.16, seed), M.rock);
  rock.position.y = 0.33;
  rock.scale.set(1, 0.72, 0.95);
  rock.rotation.y = seed;
  g.add(rock);
  const small = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(0.32, 0), 0.15, seed + 3), M.rockDark);
  small.position.set(0.55, 0.15, 0.3);
  g.add(small);
  if (hash(seed) < 0.6) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), M.moss);
    moss.position.y = 0.6;
    moss.scale.set(1, 0.35, 1);
    g.add(moss);
  }
  g.scale.setScalar(scale);
  return shadowAll(g);
}

// What's left of a cut tree or a used-up rock while it grows back.
export function makeStump(scale = 1) {
  const g = new THREE.Group();
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.25, 7), M.trunk);
  stump.position.y = 0.125;
  g.add(stump);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 7), M.wood);
  top.position.y = 0.26;
  g.add(top);
  g.scale.setScalar(scale);
  return shadowAll(g);
}

export function makePebbles(scale = 1) {
  const g = new THREE.Group();
  for (const [x, z, s] of [[0.2, 0.1, 0.18], [-0.15, 0.2, 0.14], [0, -0.2, 0.16]]) {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), M.rock);
    p.position.set(x, s * 0.6, z);
    g.add(p);
  }
  g.scale.setScalar(scale);
  return shadowAll(g);
}

// Pieces you carry on your back. Both are 0.2 tall so the stack is even.
export const PIECE_HEIGHT = 0.2;

const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
logGeo.rotateZ(Math.PI / 2);
export function makeLog() {
  const g = new THREE.Group();
  const a = new THREE.Mesh(logGeo, M.trunk);
  g.add(a);
  return shadowAll(g);
}

const stoneGeo = new THREE.BoxGeometry(0.5, PIECE_HEIGHT, 0.34);
export function makeStone() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(stoneGeo, M.stone));
  return shadowAll(g);
}

// ---- M3: build sites, buildings, the fence and gate ----

const M3 = {
  wall: mat(0xe8d3a8),
  roof: flat(0xb5532f),
  door: mat(0x5a3a1e),
  beam: mat(0x6b4426),
  glass: mat(0x3a5470),
  sill: mat(0xd9b27a),
  pad: mat(0xc9a66b),
  padEdge: mat(0xfff3d6),
  fence: mat(0x8a5a2e),
  arrow: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }),
};

// A see-through copy of a model, shown on a build site before it's built.
export function ghostOf(model) {
  model.traverse((o) => { if (o.isMesh) { o.material = M3.ghost; o.castShadow = false; o.receiveShadow = false; } });
  return model;
}

// The marked patch you walk onto to deliver.
export function makePad(size = 3, edge = M3.padEdge) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(size, 0.04, size), M3.pad);
  base.position.y = 0.02;
  base.receiveShadow = true;
  g.add(base);
  const t = 0.12;
  for (const [x, z, w, d] of [[0, size / 2, size, t], [0, -size / 2, size, t], [size / 2, 0, t, size], [-size / 2, 0, t, size]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), edge);
    e.position.set(x, 0.03, z);
    g.add(e);
  }
  return g;
}

// Dark wooden beams on the corners and along the top of a box-shaped wall (half-timbered look).
function timber(g, w, h, d) {
  const t = 0.12;
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), M3.beam);
    post.position.set(x, h / 2, z);
    g.add(post);
  }
  for (const z of [-d / 2, d / 2]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + t, t, t), M3.beam);
    top.position.set(0, h - t / 2, z);
    g.add(top);
  }
  for (const x of [-w / 2, w / 2]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(t, t, d + t), M3.beam);
    top.position.set(x, h - t / 2, 0);
    g.add(top);
  }
}

// A small window. "side" is the direction the wall faces: 'front' (+z), 'left' (-x) or 'right' (+x).
function windowOn(g, side, along, y, wallHalf) {
  const w = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.04), M3.glass);
  w.add(glass);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), M3.beam);
  w.add(bar);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.1), M3.sill);
  sill.position.set(0, -0.21, 0.03);
  w.add(sill);
  if (side === 'front') w.position.set(along, y, wallHalf + 0.02);
  else {
    const s = side === 'right' ? 1 : -1;
    w.position.set(s * (wallHalf + 0.02), y, along);
    w.rotation.y = s * Math.PI / 2;
  }
  g.add(w);
}

export function makeHut() {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2), M3.wall);
  walls.position.y = 0.7;
  g.add(walls);
  timber(g, 2.2, 1.4, 2);
  windowOn(g, 'front', 0.65, 0.8, 1);
  windowOn(g, 'left', 0, 0.8, 1.1);
  windowOn(g, 'right', 0, 0.8, 1.1);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), M.rock);
  chimney.position.set(-0.55, 2.1, -0.35);
  g.add(chimney);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.1, 4), M3.roof);
  roof.position.y = 1.95;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.9);
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.05), M3.door);
  door.position.set(0, 0.43, 1.01);
  g.add(door);
  return shadowAll(g);
}

export function makeWell() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.7, 12, 1, true), M.rock);
  ring.material = M.rock;
  ring.position.y = 0.35;
  g.add(ring);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), mat(0x3d7fc4));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.5;
  g.add(water);
  for (const x of [-0.7, 0.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), M3.fence);
    post.position.set(x, 1.05, 0);
    g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.6, 4), M3.roof);
  roof.position.y = 2.05;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  return shadowAll(g);
}

// One stretch of fence between two posts, along x.
export function makeFenceSection(length) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), M3.fence);
  post.position.set(-length / 2, 0.55, 0);
  g.add(post);
  for (const y of [0.4, 0.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.07), M3.fence);
    rail.position.y = y;
    g.add(rail);
  }
  return shadowAll(g);
}

export function makeFencePost() {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), M3.fence);
  post.position.y = 0.75;
  const g = new THREE.Group();
  g.add(post);
  return shadowAll(g);
}

// One gate door. Its hinge is at x = 0, the door reaches to x = width.
export function makeGateDoor(width) {
  const g = new THREE.Group();
  for (const y of [0.3, 0.7, 1.1]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.08), M3.fence);
    plank.position.set(width / 2, y, 0);
    g.add(plank);
  }
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.09), M3.door);
  brace.position.set(width * 0.7, 0.7, 0);
  g.add(brace);
  return shadowAll(g);
}

// Flat arrow on the ground that points to the next build site.
export function makeArrow() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.55); s.lineTo(0.4, 0.05); s.lineTo(0.15, 0.05); s.lineTo(0.15, -0.4);
  s.lineTo(-0.15, -0.4); s.lineTo(-0.15, 0.05); s.lineTo(-0.4, 0.05); s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2); // lie flat, pointing toward -z
  const m = new THREE.Mesh(geo, M3.arrow);
  return m;
}

// ---- M4: planks, blocks and the buildings that make them ----

const M4 = {
  plank: mat(0xe0b878),
  block: mat(0xcfd2d6),
  shed: mat(0x9a6a3a),
  shedRoof: flat(0x6b4426),
  blade: mat(0xd8dde2),
  masonWall: mat(0xb9bcc0),
  awning1: mat(0xd94b3a),
  awning2: mat(0xf3eee2),
  padIn: mat(0x6fd06a),   // green edge: drop goods here
  padOut: mat(0xffc93c),  // yellow edge: collect here
};
export const PAD_IN = M4.padIn;
export const PAD_OUT = M4.padOut;

// Two thin boards = one plank piece, 0.2 tall like the others.
const boardGeo = new THREE.BoxGeometry(0.62, 0.085, 0.26);
export function makePlank() {
  const g = new THREE.Group();
  for (const y of [-0.05, 0.05]) {
    const b = new THREE.Mesh(boardGeo, M4.plank);
    b.position.y = y;
    g.add(b);
  }
  return shadowAll(g);
}

const blockGeo = new THREE.BoxGeometry(0.4, PIECE_HEIGHT, 0.4);
export function makeBlock() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(blockGeo, M4.block));
  return shadowAll(g);
}

export function makeSawmill() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.2), M4.shed);
  floor.position.y = 0.1;
  g.add(floor);
  for (const [x, z] of [[-1.15, -0.95], [1.15, -0.95], [-1.15, 0.95], [1.15, 0.95]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.18), M4.shed);
    post.position.set(x, 1.0, z);
    g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 4), M4.shedRoof);
  roof.position.y = 2.3;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.85);
  g.add(roof);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.6), M4.plank);
  table.position.y = 0.45;
  g.add(table);
  // The saw blade spins while it works (found by name in converters.js).
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16), M4.blade);
  blade.rotation.x = Math.PI / 2;
  blade.position.set(0, 0.8, 0);
  blade.name = 'spinner';
  g.add(blade);
  return shadowAll(g);
}

export function makeMason() {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 2), M4.masonWall);
  walls.position.y = 0.65;
  g.add(walls);
  windowOn(g, 'left', 0, 0.75, 1.2);
  windowOn(g, 'right', 0, 0.75, 1.2);
  windowOn(g, 'front', -0.6, 0.75, 1);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), M3.roof);
  roof.position.y = 1.8;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.85);
  g.add(roof);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), M.rock);
  chimney.position.set(0.6, 2.1, -0.4);
  g.add(chimney);
  // A block on the workbench that bobs while it works.
  const work = new THREE.Mesh(blockGeo, M4.block);
  work.position.set(0, 0.25, 1.25);
  work.name = 'bobber';
  g.add(work);
  return shadowAll(g);
}

export function makeMarket() {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.8), M4.shed);
  counter.position.set(0, 0.45, 0.5);
  g.add(counter);
  for (const [x, z] of [[-1.15, -0.8], [1.15, -0.8], [-1.15, 0.8], [1.15, 0.8]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.0, 0.14), M4.shed);
    post.position.set(x, 1.0, z);
    g.add(post);
  }
  // Striped awning.
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 2.0), i % 2 ? M4.awning2 : M4.awning1);
    s.position.set(-1.05 + i * 0.42, 2.05, 0);
    s.rotation.x = 0.15;
    g.add(s);
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M4.plank);
  crate.position.set(-0.7, 1.15, 0.5);
  g.add(crate);
  return shadowAll(g);
}

// ---- M6 ----
const M6 = {
  lodgeWall: mat(0xe8d3a8),
  lodgeRoof: flat(0x3f6fa0),
  beam: mat(0x6b4426),
};

// Helper lodge: a long house with a blue roof and a bench out front.
export function makeLodge() {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.9), M6.lodgeWall);
  walls.position.y = 0.65;
  g.add(walls);
  timber(g, 2.6, 1.3, 1.9);
  windowOn(g, 'front', -0.7, 0.75, 0.95);
  windowOn(g, 'left', 0, 0.75, 1.3);
  windowOn(g, 'right', 0, 0.75, 1.3);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.8, 3), M6.lodgeRoof);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = 1.71;
  roof.scale.set(1, 1, 0.75);
  g.add(roof);
  for (const x of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), M6.beam);
    post.position.set(x, 0.65, 0.96);
    g.add(post);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.05), M3.door);
  door.position.set(0, 0.43, 0.96);
  g.add(door);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.3), M6.beam);
  bench.position.set(0.85, 0.35, 1.3);
  g.add(bench);
  return shadowAll(g);
}
