// M7: the town. Every finished house brings villagers who stroll around near it.
// The number of villagers sets the town level (Hamlet, Village, Town), shown at the top right.
// Villagers pay a little rent: 1 coin each every so often, added to your coins.
import { TOWN, SITES } from './config.js';
import { makeVillager, animateVillager } from './models.js';
import { ICON, floatText } from './ui.js';

export class Town {
  constructor(scene, world, sites, converters, camera) {
    this.scene = scene;
    this.world = world;
    this.sites = sites;
    this.converters = converters;
    this.camera = camera;
    this.folk = [];                 // the villagers
    this.homes = new Set();         // ids of houses whose villagers have moved in
    this.rentTimer = 0;
    this.level = 1;
    this.onLevelUp = null;          // called with the new level's info
    this.el = {
      box: document.getElementById('town'),
      name: document.getElementById('townName'),
      lv: document.getElementById('townLv'),
      people: document.getElementById('townPeople'),
    };
    this.houses = SITES.filter((s) => s.builds === 'house');
  }

  get count() { return this.folk.length; }

  // The level for a number of villagers: 1 = Hamlet, 2 = Village, 3 = Town.
  levelFor(n) {
    let lv = 1;
    TOWN.levels.forEach((l, i) => { if (n >= l.at) lv = i + 1; });
    return lv;
  }

  // Villagers move into a finished house. "instant" = loading a saved game (no walking out, no message).
  moveIn(def, instant = false) {
    if (this.homes.has(def.id)) return;
    this.homes.add(def.id);
    for (let i = 0; i < TOWN.perHouse; i++) {
      const color = TOWN.colors[this.folk.length % TOWN.colors.length];
      const mesh = makeVillager(color);
      // Only the body casts a shadow: cheaper on phones with many villagers.
      mesh.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      mesh.children[0].castShadow = true;
      mesh.scale.setScalar(0.92);
      const x = def.x + (i ? 0.6 : -0.6);
      const z = def.z + 1.6;
      mesh.position.set(x, 0, z);
      if (instant) mesh.position.set(x + (Math.random() - 0.5) * 3, 0, z + Math.random() * 2);
      this.scene.add(mesh);
      this.folk.push({
        mesh, home: def, tx: x, tz: z + 1.5, wait: instant ? Math.random() * 3 : 0.3 + i * 0.6,
        walkTime: Math.random() * 10, walk: 0, stuckFor: 0, best: Infinity,
      });
    }
    const before = this.level;
    this.level = this.levelFor(this.count);
    this.draw();
    if (!instant && this.level > before && this.onLevelUp) this.onLevelUp(TOWN.levels[this.level - 1], this.level);
  }

  draw() {
    const l = TOWN.levels[this.level - 1];
    this.el.box.classList.toggle('hide', this.count === 0);
    this.el.name.textContent = l.name;
    this.el.lv.textContent = `Lv ${this.level}`;
    this.el.people.textContent = `👥 ${this.count}`;
  }

  update(dt) {
    // New houses finished? Their villagers move in.
    for (const def of this.houses) {
      if (!this.homes.has(def.id) && this.sites.get(def.id).done) this.moveIn(def);
    }

    // Rent: every villager pays 1 coin every "rentEvery" seconds, all at once, shown over each house.
    if (this.count) {
      this.rentTimer += dt;
      if (this.rentTimer >= TOWN.rentEvery) {
        this.rentTimer -= TOWN.rentEvery;
        this.converters.coins += this.count;
        for (const id of this.homes) {
          const h = SITES.find((s) => s.id === id);
          floatText(`+${TOWN.perHouse} ${ICON.coin}`, h.x, 2.8, h.z, this.camera);
        }
        if (this.converters.onCoins) this.converters.onCoins();
        if (this.converters.onChange) this.converters.onChange();
      }
    }

    for (const v of this.folk) this.stroll(v, dt);
  }

  // Walk to a spot near home, stand a moment, pick another spot.
  stroll(v, dt) {
    const pos = v.mesh.position;
    let moving = false;
    if (v.wait > 0) {
      v.wait -= dt;
      if (v.wait <= 0) this.pickSpot(v);
    } else {
      const dx = v.tx - pos.x;
      const dz = v.tz - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) {
        v.wait = 1 + Math.random() * 3;
      } else {
        const step = Math.min(TOWN.speed * dt, d);
        pos.x += (dx / d) * step;
        pos.z += (dz / d) * step;
        moving = true;
        let diff = Math.atan2(dx, dz) - v.mesh.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        v.mesh.rotation.y += diff * Math.min(1, 8 * dt);
        // Step round trees, rocks and buildings.
        for (const o of this.world.obstacles) {
          const ox = pos.x - o.x;
          const oz = pos.z - o.z;
          const od = Math.hypot(ox, oz);
          const min = o.r + 0.4;
          if (od < min && od > 0.0001) { pos.x = o.x + (ox / od) * min; pos.z = o.z + (oz / od) * min; }
        }
        // Not getting closer? Give up on this spot and rest a moment.
        if (d < v.best - 0.2) { v.best = d; v.stuckFor = 0; }
        else if ((v.stuckFor += dt) > 1.2) v.wait = 0.5 + Math.random();
      }
    }
    if (moving) v.walkTime += dt * 9;
    v.walk += ((moving ? 0.6 : 0) - v.walk) * Math.min(1, 10 * dt);
    const bob = moving ? Math.abs(Math.sin(v.walkTime)) * 0.06 : 0;
    pos.y += (bob - pos.y) * Math.min(1, 20 * dt);
    animateVillager(v.mesh, v.walkTime, v.walk, false, 0);
  }

  // A random spot near home, inside the start area and not on top of a building, tree or rock.
  pickSpot(v) {
    const h = v.home;
    const a = this.world.areas[0];
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * TOWN.wander;
      const x = h.x + Math.cos(ang) * r;
      const z = h.z + Math.sin(ang) * r;
      if (x < a.minX + 1 || x > a.maxX - 1 || z < a.minZ + 1 || z > a.maxZ - 1) continue;
      if (this.world.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.6)) continue;
      v.tx = x; v.tz = z; v.best = Infinity; v.stuckFor = 0;
      return;
    }
    v.wait = 1; // no free spot found this time; try again in a moment
  }

  // Villagers come from the houses, which are saved with the build sites, so nothing extra to save.
  restore() {
    for (const def of this.houses) if (this.sites.get(def.id).done) this.moveIn(def, true);
  }
}
