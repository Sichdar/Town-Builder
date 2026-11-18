// Gathering: stand near a tree or rock and pieces fly onto your back, one by one.
// Cut trees and used rocks leave a stump or pebbles, then grow back.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeLog, makeStone, PIECE_HEIGHT } from './models.js';

const makers = { wood: makeLog, stone: makeStone };
const tmp = new THREE.Vector3();

export class Gatherer {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.timer = 0;
    this.carried = [];   // 'wood' / 'stone', bottom to top (includes pieces still flying)
    this.flying = [];    // { mesh, from, t }
    this.onChange = null;

    // The stack sits on the villager's back (the villager faces +z, so the back is -z).
    this.stack = new THREE.Group();
    this.stack.position.set(0, 0.55, -0.48);
    player.mesh.add(this.stack);
  }

  get full() { return this.carried.length >= CONFIG.gather.stackMax; }

  count(type) { return this.carried.filter((t) => t === type).length; }

  update(dt, moving) {
    const G = CONFIG.gather;
    const pos = this.player.position;

    // Find the closest tree or rock in reach that still has something to give.
    let best = null;
    let bestD = Infinity;
    for (const n of this.world.nodes) {
      if (n.amount <= 0) continue;
      const d = Math.hypot(pos.x - n.x, pos.z - n.z) - n.r;
      if (d < G.range && d < bestD) { best = n; bestD = d; }
    }

    if (best && !this.full) {
      this.timer += dt;
      if (this.timer >= G.every) {
        this.timer -= G.every;
        this.take(best);
      }
    } else {
      // Start straight away on the next tree, but not faster than "every".
      this.timer = Math.min(this.timer + dt, G.every);
    }

    this.animateNodes(dt);
    this.animateFlying(dt);

    // The stack sways a little while walking.
    const sway = moving ? Math.sin(this.player.walkTime * 0.5) * 0.06 : 0;
    this.stack.rotation.x += (-0.08 + sway - this.stack.rotation.x) * Math.min(1, 10 * dt);
  }

  take(node) {
    node.amount--;
    node.shake = 0.25;
    const type = node.type;
    this.carried.push(type);

    const mesh = makers[type]();
    const h = type === 'wood' ? 2 : 0.6;
    mesh.position.set(node.x, h * node.scale, node.z);
    this.scene.add(mesh);
    this.flying.push({ mesh, from: mesh.position.clone(), t: 0, slot: this.carried.length - 1 });

    if (node.amount <= 0) {
      node.obj.visible = false;
      node.leftover.visible = true;
      node.obstacle.r = 0.25 * node.scale;
      node.regrowIn = CONFIG.gather.regrow;
    }
    if (this.onChange) this.onChange();
  }

  animateFlying(dt) {
    const T = CONFIG.gather.fly;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt / T;
      // Where this piece will sit on the back, in world space (it moves with the villager).
      tmp.set(0, f.slot * PIECE_HEIGHT + PIECE_HEIGHT / 2, 0);
      this.stack.localToWorld(tmp);
      if (f.t >= 1) {
        this.scene.remove(f.mesh);
        this.stack.add(f.mesh);
        f.mesh.position.set(0, f.slot * PIECE_HEIGHT + PIECE_HEIGHT / 2, 0);
        f.mesh.rotation.set(0, (f.slot % 2) * 0.12 - 0.06, 0);
        this.flying.splice(i, 1);
        continue;
      }
      const t = f.t;
      f.mesh.position.lerpVectors(f.from, tmp, t);
      f.mesh.position.y += Math.sin(t * Math.PI) * 1.2; // little arc
      f.mesh.rotation.y = t * Math.PI * 2;
    }
  }

  animateNodes(dt) {
    for (const n of this.world.nodes) {
      if (n.shake > 0) {
        n.shake = Math.max(0, n.shake - dt);
        n.obj.rotation.z = Math.sin(n.shake * 60) * n.shake * 0.4;
      }
      if (n.regrowIn > 0) {
        n.regrowIn -= dt;
        if (n.regrowIn <= 0) {
          n.amount = n.max;
          n.obj.visible = true;
          n.leftover.visible = false;
          n.obstacle.r = n.r;
          n.grow = 0;
          // If the villager stands where the tree comes back, it gets nudged out by the normal bumping.
        }
      }
      if (n.grow < 1) {
        n.grow = Math.min(1, n.grow + dt / 0.5);
        // Pops up with a small bounce.
        const g = n.grow;
        const s = 1 + Math.sin(g * Math.PI) * 0.15 - (1 - g) * 0.7;
        n.obj.scale.setScalar(n.scale * s);
      }
    }
  }
}
