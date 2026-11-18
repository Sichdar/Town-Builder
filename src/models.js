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
