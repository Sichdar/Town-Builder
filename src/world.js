// The ground and the scenery (trees and rocks you can't gather yet; that's M2).
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeTree, makeRock } from './models.js';

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
  const half = W.size / 2;
  const obstacles = []; // { x, z, r } circles the villager can't walk through

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W.size, W.size),
    new THREE.MeshLambertMaterial({ color: 0x7cc35a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A darker band around the edge so the border is visible.
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(W.size + 30, W.size + 30),
    new THREE.MeshLambertMaterial({ color: 0x4f8f3a }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.02;
  scene.add(edge);

  const rand = rng(W.seed);
  const place = (count, make, radius) => {
    let tries = 0;
    let placed = 0;
    while (placed < count && tries < count * 30) {
      tries++;
      const x = (rand() - 0.5) * (W.size - 3);
      const z = (rand() - 0.5) * (W.size - 3);
      if (Math.hypot(x, z) < W.clearRadius) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + radius + 0.8)) continue;
      const scale = 0.85 + rand() * 0.4;
      const obj = make(scale);
      obj.position.set(x, 0, z);
      obj.rotation.y = rand() * Math.PI * 2;
      scene.add(obj);
      obstacles.push({ x, z, r: radius * scale });
      placed++;
    }
  };
  place(W.trees, makeTree, 0.35);
  place(W.rocks, makeRock, 0.6);

  return { half, obstacles };
}
