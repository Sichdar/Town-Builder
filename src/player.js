// The villager you control: walks, turns to face where it goes, bumps into trees, rocks and fences.
import { CONFIG } from './config.js';
import { makeVillager, animateVillager } from './models.js';

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.mesh = makeVillager();
    scene.add(this.mesh);
    this.walkTime = 0;
    this.prevZ = 0;
    this.prevX = 0;
    this.walk = 0;       // 0 standing, 1 full speed (smoothed, for the arm and leg swing)
    this.carrying = false;
    this.chop = 0;       // counts down after each piece gathered: the arm swings
  }

  get position() { return this.mesh.position; }

  update(dt, input) {
    const P = CONFIG.player;
    const pos = this.mesh.position;
    const moving = input.x !== 0 || input.z !== 0;
    this.prevZ = pos.z;
    this.prevX = pos.x;

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

    this.walk += ((moving ? speed : 0) - this.walk) * Math.min(1, 12 * dt);
    this.chop = Math.max(0, this.chop - dt * 4);
    animateVillager(this.mesh, this.walkTime, this.walk, this.carrying, this.chop);
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

    // Fences: can't cross, except through an open gate.
    // The north fence runs along x (axis 'z'), the east fence along z (axis 'x').
    for (const f of this.world.fences) {
      const alongZ = f.axis === 'x';
      const along = alongZ ? pos.z : pos.x;
      const across = alongZ ? pos.x : pos.z;
      const prev = alongZ ? this.prevX : this.prevZ;
      if (along < f.from - r || along > f.to + r) continue;
      const inGap = f.open && Math.abs(along - f.gap) < f.gapHalf - r * 0.5;
      if (inGap) continue;
      const lim = r + 0.12;
      if (Math.abs(across - f.at) < lim) {
        const side = prev >= f.at ? 1 : -1; // stay on the side you came from
        if (alongZ) pos.x = f.at + side * lim;
        else pos.z = f.at + side * lim;
      }
    }

    // Stay on the playable ground (the start, north and east areas). If a step would leave it,
    // keep the part of the step that stays on it, so you slide along the edge.
    const w = this.world;
    if (!w.fits(pos.x, pos.z, r)) {
      if (w.fits(pos.x, this.prevZ, r)) pos.z = this.prevZ;
      else if (w.fits(this.prevX, pos.z, r)) pos.x = this.prevX;
      else if (w.fits(this.prevX, this.prevZ, r)) { pos.x = this.prevX; pos.z = this.prevZ; }
    }
    const b = w.bounds;
    pos.x = Math.max(b.minX + r, Math.min(b.maxX - r, pos.x));
    pos.z = Math.max(b.minZ + r, Math.min(b.maxZ - r, pos.z));
  }
}
