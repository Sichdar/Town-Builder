// Build sites: walk onto the marked patch and the goods on your back fly into it.
// When everything it needs is in, the building appears and the next site shows up.
import * as THREE from 'three';
import { SITES, DELIVER } from './config.js';
import { makePad, makeHut, makeWell, makeSawmill, makeMason, makeMarket, ghostOf, makeArrow } from './models.js';

import { ICON, placeLabel } from './ui.js';

const builders = { hut: makeHut, well: makeWell, sawmill: makeSawmill, mason: makeMason, market: makeMarket, gate: null }; // the gate is part of the fence (world.js)
const tmp = new THREE.Vector3();

export class Sites {
  constructor(scene, world, player, gatherer, camera) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.gatherer = gatherer;
    this.camera = camera;
    this.timer = 0;
    this.flying = [];        // pieces on their way into a site
    this.onChange = null;    // called when something worth saving changes
    this.onBuilt = null;     // called with the site when it's finished

    const labels = document.getElementById('labels');
    this.list = SITES.map((def) => {
      const site = { def, have: {}, done: false, shown: false, pop: 1 };
      for (const k of Object.keys(def.needs)) site.have[k] = 0;

      site.group = new THREE.Group();
      site.group.position.set(def.x, 0, def.z);
      site.group.add(makePad(DELIVER.padSize));
      if (builders[def.builds]) site.group.add(ghostOf(builders[def.builds]()));
      site.group.visible = false;
      scene.add(site.group);

      site.label = document.createElement('div');
      site.label.className = 'site-label';
      site.label.style.display = 'none';
      labels.appendChild(site.label);
      return site;
    });

    this.arrow = makeArrow();
    this.arrow.visible = false;
    scene.add(this.arrow);

    this.refresh(false);
  }

  get(id) { return this.list.find((s) => s.def.id === id); }

  // Sites whose turn has come (the one before them is built) and that aren't built yet.
  get active() {
    return this.list.filter((s) => !s.done && (!s.def.after || this.get(s.def.after).done));
  }

  refresh(animate = true) {
    for (const s of this.active) {
      if (!s.shown) {
        s.shown = true;
        s.group.visible = true;
        if (animate) s.pop = 0;
      }
    }
    for (const s of this.list) this.drawLabel(s);
  }

  drawLabel(s) {
    const rows = Object.entries(s.def.needs)
      .map(([k, n]) => `<span class="need${s.have[k] >= n ? ' ok' : ''}">${ICON[k]}${s.have[k]}/${n}</span>`)
      .join('');
    s.label.innerHTML = `<b>${s.def.name}</b><div>${rows}</div>`;
  }

  wantsOf(s) {
    return (type) => s.def.needs[type] !== undefined && s.have[type] + this.incoming(s, type) < s.def.needs[type];
  }

  incoming(s, type) {
    return this.flying.filter((f) => f.site === s && f.type === type).length;
  }

  update(dt) {
    const pos = this.player.position;
    const half = DELIVER.padSize / 2 + 0.3;

    // Standing on a site? Unload what it needs, one piece at a time.
    const here = this.active.find((s) => Math.abs(pos.x - s.def.x) < half && Math.abs(pos.z - s.def.z) < half);
    if (here) {
      this.timer += dt;
      while (this.timer >= DELIVER.every) {
        this.timer -= DELIVER.every;
        const piece = this.gatherer.takeFor(this.wantsOf(here));
        if (!piece) break;
        this.flying.push({ ...piece, site: here, from: piece.mesh.position.clone(), t: 0 });
      }
    } else {
      this.timer = DELIVER.every; // first piece goes straight away
    }

    this.animateFlying(dt);
    this.animateSites(dt);
    this.pointArrow();
    this.placeLabels();
  }

  animateFlying(dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt / DELIVER.fly;
      tmp.set(f.site.def.x, 0.3, f.site.def.z);
      if (f.t >= 1) {
        this.scene.remove(f.mesh);
        this.flying.splice(i, 1);
        f.site.have[f.type]++;
        this.drawLabel(f.site);
        if (this.isFull(f.site)) this.finish(f.site);
        if (this.onChange) this.onChange();
        continue;
      }
      f.mesh.position.lerpVectors(f.from, tmp, f.t);
      f.mesh.position.y += Math.sin(f.t * Math.PI) * 1.5;
      f.mesh.rotation.x = f.t * Math.PI * 2;
    }
  }

  isFull(s) {
    return Object.entries(s.def.needs).every(([k, n]) => s.have[k] >= n);
  }

  // Turns a full site into its building. "instant" is used when loading a saved game.
  finish(s, instant = false) {
    s.done = true;
    s.shown = true;
    s.group.clear();
    s.group.visible = true;
    const make = builders[s.def.builds];
    if (make) s.group.add(make());
    if (s.def.builds === 'gate') {
      this.world.openGate(instant);
    }
    // Buildings are solid.
    if (make) this.world.obstacles.push({ x: s.def.x, z: s.def.z, r: 1.2 });
    s.pop = instant ? 1 : 0;
    this.refresh(!instant);
    if (!instant && this.onBuilt) this.onBuilt(s);
  }

  animateSites(dt) {
    for (const s of this.list) {
      if (s.pop >= 1) continue;
      s.pop = Math.min(1, s.pop + dt / 0.45);
      const g = s.pop;
      s.group.scale.setScalar(Math.max(0.01, 1 + Math.sin(g * Math.PI) * 0.18 - (1 - g) * 0.8));
    }
  }

  // Yellow arrow at your feet, pointing to the nearest site still waiting, when it's off to the side.
  pointArrow() {
    const pos = this.player.position;
    let best = null;
    let bestD = Infinity;
    for (const s of this.active) {
      const d = Math.hypot(s.def.x - pos.x, s.def.z - pos.z);
      if (d < bestD) { best = s; bestD = d; }
    }
    if (!best || bestD < 7) { this.arrow.visible = false; return; }
    const dx = (best.def.x - pos.x) / bestD;
    const dz = (best.def.z - pos.z) / bestD;
    this.arrow.visible = true;
    this.arrow.position.set(pos.x + dx * 1.4, 0.06, pos.z + dz * 1.4);
    this.arrow.rotation.y = Math.atan2(-dx, -dz);
  }

  // Counters float above each site that's waiting.
  placeLabels() {
    for (const s of this.list) {
      if (s.shown && !s.done) placeLabel(s.label, s.def.x, 2.6, s.def.z, this.camera);
      else s.label.style.display = 'none';
    }
  }

  // ---- Saving ----
  save() {
    const out = {};
    for (const s of this.list) {
      // Pieces still in the air count as delivered, so nothing is lost if the app closes mid-flight.
      const have = { ...s.have };
      for (const f of this.flying) if (f.site === s) have[f.type]++;
      out[s.def.id] = { have, done: s.done };
    }
    return out;
  }

  restore(saved) {
    if (!saved) return;
    for (const def of SITES) {
      const s = this.get(def.id);
      const v = saved[def.id];
      if (!v) continue;
      for (const k of Object.keys(def.needs)) s.have[k] = Math.min(def.needs[k], Number(v.have?.[k]) || 0);
    }
    // Build finished ones in order, so each one's "after" is already done.
    for (const def of SITES) {
      const s = this.get(def.id);
      if (saved[def.id]?.done || this.isFull(s)) this.finish(s, true);
    }
    this.refresh(false);
  }
}
