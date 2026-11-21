// Gathering: stand near a tree or rock and pieces fly onto your back, one by one.
// Cut trees and used rocks leave a stump or pebbles, then grow back.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeLog, makeStone, makePlank, makeBlock, makeIronOre, PIECE_HEIGHT } from './models.js';

export const makers = { wood: makeLog, stone: makeStone, plank: makePlank, block: makeBlock, iron: makeIronOre };
const tmp = new THREE.Vector3();

export class Gatherer {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.timer = 0;
    this.carried = [];   // 'wood' / 'stone' / 'plank' / 'block', bottom to top (includes pieces still flying)
    this.flying = [];    // { mesh, from, t }
    this.speedFor = { wood: 1, stone: 1 }; // time multiplier per type (upgrades make it smaller)
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
      const every = G.every * (this.speedFor[best.type] ?? 1);
      this.timer += dt;
      if (this.timer >= every) {
        this.timer = Math.min(this.timer - every, every);
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
    this.chip(node);
    this.player.chop = 1;
    const h = node.type === 'wood' ? 2 : 0.6;
    this.receive(node.type, tmp.set(node.x, h * node.scale, node.z));
  }

  // One piece comes off a tree or rock (also used by helpers). Used up = stump or pebbles until it regrows.
  chip(node) {
    node.amount--;
    node.shake = 0.25;
    if (node.amount <= 0) {
      node.obj.visible = false;
      node.leftover.visible = true;
      node.obstacle.r = 0.25 * node.scale;
      node.regrowIn = CONFIG.gather.regrow;
    }
  }

  // A piece of "type" flies from a spot in the world onto your back (from a tree, rock or building).
  receive(type, from) {
    this.carried.push(type);
    const mesh = makers[type]();
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.flying.push({ mesh, from: mesh.position.clone(), t: 0, slot: this.carried.length - 1 });
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

  // ---- Used by build sites (sites.js) and saving (save.js) ----

  // Takes the highest piece on your back that the site wants. Returns { type, mesh } with the
  // mesh moved into the world at the same spot, or null. Waits while pieces are still flying on.
  takeFor(wants) {
    if (this.flying.length) return null;
    for (let i = this.carried.length - 1; i >= 0; i--) {
      const type = this.carried[i];
      if (!wants(type)) continue;
      this.carried.splice(i, 1);
      const mesh = this.stack.children[i];
      this.scene.attach(mesh); // keeps its place on screen, now in the world
      this.restack();
      if (this.onChange) this.onChange();
      return { type, mesh };
    }
    return null;
  }

  // Pieces above a removed one drop down to close the gap.
  restack() {
    this.stack.children.forEach((m, i) => {
      m.position.set(0, i * PIECE_HEIGHT + PIECE_HEIGHT / 2, 0);
      m.rotation.set(0, (i % 2) * 0.12 - 0.06, 0);
    });
  }

  // Puts a saved stack back on your back, without the flying.
  restore(types) {
    if (!Array.isArray(types)) return;
    for (const type of types.slice(0, CONFIG.gather.stackMax)) {
      if (!makers[type]) continue;
      this.carried.push(type);
      this.stack.add(makers[type]());
    }
    this.restack();
    if (this.onChange) this.onChange();
  }
}
