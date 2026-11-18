// The villager you control: walks, turns to face where it goes, bumps into trees and rocks.
import { CONFIG } from './config.js';
import { makeVillager } from './models.js';

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.mesh = makeVillager();
    scene.add(this.mesh);
    this.walkTime = 0;
  }

  get position() { return this.mesh.position; }

  update(dt, input) {
    const P = CONFIG.player;
    const pos = this.mesh.position;
    const moving = input.x !== 0 || input.z !== 0;

    if (moving) {
      pos.x += input.x * P.speed * dt;
      pos.z += input.z * P.speed * dt;

      // Turn smoothly toward the walking direction, the short way round.
      const target = Math.atan2(input.x, input.z);
      let diff = target - this.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.mesh.rotation.y += diff * Math.min(1, P.turnSpeed * dt);
    }

    this.collide();

    // Little hop while walking, settles when standing still.
    const speed = Math.hypot(input.x, input.z);
    if (moving) this.walkTime += dt * (8 + 6 * speed);
    const bob = moving ? Math.abs(Math.sin(this.walkTime)) * 0.12 * speed : 0;
    pos.y += (bob - pos.y) * Math.min(1, 20 * dt);
  }

  collide() {
    const pos = this.mesh.position;
    const r = CONFIG.player.radius;
    for (const o of this.world.obstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + r;
      if (d < min && d > 0.0001) {
        pos.x = o.x + (dx / d) * min;
        pos.z = o.z + (dz / d) * min;
      }
    }
    const lim = this.world.half - r;
    pos.x = Math.max(-lim, Math.min(lim, pos.x));
    pos.z = Math.max(-lim, Math.min(lim, pos.z));
  }
}
