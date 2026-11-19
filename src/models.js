// Placeholder 3D models built from simple shapes.
// Later (your art): each maker will first look for assets/<name>.glb and use it if it exists.
import * as THREE from 'three';

const mat = (color) => new THREE.MeshLambertMaterial({ color });

const M = {
  skin: mat(0xf1c27d),
  tunic: mat(0x3b6fb6),
  belt: mat(0x5a3a1e),
  hat: mat(0x8c5a2b),
  trunk: mat(0x7a4a24),
  leaves: mat(0x3f8f3a),
  leaves2: mat(0x4fa346),
  rock: mat(0x8d8f93),
  stone: mat(0xa9acb1),
  wood: mat(0xd9b27a),
};

function shadowAll(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

export function makeVillager() {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 4, 12), M.tunic);
  body.position.y = 0.6;
  g.add(body);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 16), M.belt);
  belt.position.y = 0.5;
  g.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), M.skin);
  head.position.y = 1.28;
  g.add(head);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.32, 16), M.hat);
  hat.position.y = 1.55;
  g.add(hat);

  // Nose, so you can see which way the villager faces (the model faces +z).
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.skin);
  nose.position.set(0, 1.26, 0.27);
  g.add(nose);

  return shadowAll(g);
}

export function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 8), M.trunk);
  trunk.position.y = 0.6;
  g.add(trunk);
  const low = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 8), M.leaves);
  low.position.y = 1.7;
  g.add(low);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 8), M.leaves2);
  top.position.y = 2.5;
  g.add(top);
  g.scale.setScalar(scale);
  return shadowAll(g);
}

export function makeRock(scale = 1) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), M.rock);
  rock.position.y = 0.35;
  rock.scale.set(1, 0.7, 1);
  const g = new THREE.Group();
  g.add(rock);
  g.scale.setScalar(scale);
  return shadowAll(g);
}

// What's left of a cut tree or a used-up rock while it grows back.
export function makeStump(scale = 1) {
  const g = new THREE.Group();
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.25, 8), M.trunk);
  stump.position.y = 0.125;
  g.add(stump);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 8), M.wood);
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
  roof: mat(0xb5532f),
  door: mat(0x5a3a1e),
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

export function makeHut() {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2), M3.wall);
  walls.position.y = 0.7;
  g.add(walls);
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
  shedRoof: mat(0x6b4426),
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
