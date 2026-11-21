// M6: helpers. Build the Helper lodge, step on its green pad to hire woodcutters and quarry workers
// with coins. Each helper walks to a tree or rock, gathers a few pieces, carries them to the
// stockpile (yellow pad) and goes back for more. Step on the stockpile to load what they brought.
import * as THREE from 'three';
import { CONFIG, SITES, HELPERS, DELIVER, CONVERTERS } from './config.js';
import { makeVillager, animateVillager, makePad, PAD_IN, PAD_OUT, PIECE_HEIGHT } from './models.js';
import { makers } from './gather.js';
import { ICON, placeLabel } from './ui.js';

const tmp = new THREE.Vector3();
const JOB_ICON = { wood: '🪓', stone: '⛏️' };

export class Helpers {
  constructor(scene, world, player, gatherer, sites, converters, camera) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.gatherer = gatherer;
    this.sites = sites;
    this.converters = converters;
    this.camera = camera;
    this.def = SITES.find((s) => s.builds === 'lodge');
    const off = CONVERTERS.padOffset;
    this.hirePad = { x: this.def.x - off, z: this.def.z };
    this.pilePad = { x: this.def.x + off, z: this.def.z };
    this.active = false;
    this.list = [];          // the helpers
    this.pile = [];          // { type, mesh } on the stockpile, bottom to top
    this.flying = [];        // pieces on their way from a helper's back to the pile
    this.collectTimer = 0;
    this.wasOnHire = false;
    this.pending = null;     // saved helpers waiting for the lodge to be built
    this.onChange = null;    // something worth saving changed
    this.onOpen = null;      // the hire panel opened (main.js lets go of the joystick)

    this.label = document.createElement('div');
    this.label.className = 'site-label';
    this.label.style.display = 'none';
    document.getElementById('labels').appendChild(this.label);

    this.panel = document.getElementById('hire');
    this.panel.addEventListener('click', (e) => { if (e.target === this.panel) this.close(); });
    this.panel.querySelector('.close').addEventListener('click', () => this.close());
  }

  count(job) { return this.list.filter((h) => h.job === job).length; }

  get nextCost() {
    return this.list.length < HELPERS.costs.length ? HELPERS.costs[this.list.length] : null;
  }

  activate() {
    this.active = true;
    const size = CONVERTERS.padSize;
    const hire = makePad(size, PAD_IN);
    hire.position.set(this.hirePad.x, 0, this.hirePad.z);
    const pile = makePad(size, PAD_OUT);
    pile.position.set(this.pilePad.x, 0, this.pilePad.z);
    this.scene.add(hire, pile);
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      for (const job of ['wood', 'stone']) {
        const n = Math.max(0, Math.floor(Number(p[job]) || 0));
        for (let i = 0; i < n && this.list.length < HELPERS.costs.length; i++) this.spawn(job);
      }
      if (Array.isArray(p.pile)) {
        for (const t of p.pile.slice(0, HELPERS.pileMax)) if (t === 'wood' || t === 'stone') this.addToPile(t);
      }
    }
    this.drawLabel();
  }

  // ---- Hiring ----

  hire(job) {
    const price = this.nextCost;
    if (price === null || this.converters.coins < price || !HELPERS.jobs[job]) return false;
    this.converters.coins -= price;
    this.spawn(job);
    if (this.converters.onCoins) this.converters.onCoins();
    if (this.onChange) this.onChange();
    this.drawPanel();
    this.drawLabel();
    return true;
  }

  // A new helper walks out of the lodge door.
  spawn(job) {
    const mesh = makeVillager(HELPERS.jobs[job].color);
    const i = this.list.length;
    mesh.position.set(this.def.x + (i - 1.5) * 0.6, 0, this.def.z + 1.6);
    this.scene.add(mesh);
    const stack = new THREE.Group();
    stack.position.set(0, 0.55, -0.48);
    mesh.add(stack);
    this.list.push({
      job, mesh, stack, carried: [], state: 'find', node: null, timer: 0,
      walkTime: Math.random() * 10, best: Infinity, stuckFor: 0, ghost: 0,
    });
  }

  drawPanel() {
    const coins = this.converters.coins;
    const price = this.nextCost;
    const rows = Object.entries(HELPERS.jobs).map(([job, j]) => {
      const btn = price === null
        ? '<button disabled>Full</button>'
        : `<button data-hire="${job}" ${coins < price ? 'disabled' : ''}>${ICON.coin}${price}</button>`;
      return `<div class="row"><span class="big">${JOB_ICON[job]}</span><div class="what"><b>${j.name}</b>` +
        `<small>Brings ${ICON[job]} to the stockpile · you have ${this.count(job)}</small></div>${btn}</div>`;
    }).join('');
    this.panel.querySelector('.list').innerHTML = rows;
    this.panel.querySelector('.have').innerHTML = `${ICON.coin}${coins}`;
    this.panel.querySelector('.note').textContent =
      `Helpers: ${this.list.length}/${HELPERS.costs.length}. Collect from the yellow pad.`;
    for (const b of this.panel.querySelectorAll('[data-hire]')) {
      b.addEventListener('click', () => this.hire(b.dataset.hire));
    }
  }

  open() {
    this.drawPanel();
    this.panel.classList.add('on');
    if (this.onOpen) this.onOpen();
  }

  close() { this.panel.classList.remove('on'); }

  refresh() { if (this.panel.classList.contains('on')) this.drawPanel(); }

  // ---- Every frame ----

  onPad(pad) {
    const p = this.player.position;
    const half = CONVERTERS.padSize / 2 + 0.3;
    return Math.abs(p.x - pad.x) < half && Math.abs(p.z - pad.z) < half;
  }

  update(dt) {
    if (!this.active) {
      if (this.sites.get(this.def.id).done) this.activate();
      else return;
    }

    // Stepping onto the green pad opens the hire panel (once per visit).
    const onHire = this.onPad(this.hirePad);
    if (onHire && !this.wasOnHire) this.open();
    this.wasOnHire = onHire;

    // Standing on the stockpile: pieces fly onto your back, top ones first.
    if (this.onPad(this.pilePad)) {
      this.collectTimer += dt;
      while (this.collectTimer >= DELIVER.every) {
        this.collectTimer -= DELIVER.every;
        if (this.gatherer.full || !this.pile.length) break;
        const { type, mesh } = this.pile.pop();
        mesh.getWorldPosition(tmp);
        this.scene.remove(mesh);
        this.gatherer.receive(type, tmp);
        this.drawLabel();
        if (this.onChange) this.onChange();
      }
    } else {
      this.collectTimer = DELIVER.every;
    }

    for (const h of this.list) this.think(h, dt);
    this.animateFlying(dt);

    const p = this.player.position;
    if (Math.hypot(p.x - this.def.x, p.z - this.def.z) < 15) placeLabel(this.label, this.def.x, 3.0, this.def.z, this.camera);
    else this.label.style.display = 'none';
  }

  // What a helper does: find -> walk -> gather -> home -> unload -> find ...
  think(h, dt) {
    const G = CONFIG.gather;
    let moving = false;

    if (h.state === 'find') {
      h.node = this.pickNode(h);
      if (h.node) { h.node.claimedBy = h; this.setGoal(h, 'walk'); }
      else if (h.carried.length) this.setGoal(h, 'home');
      else moving = this.walkTo(h, this.def.x, this.def.z + 2.2, dt, 0.5); // nothing to do: wait by the lodge
    }

    if (h.state === 'walk') {
      const n = h.node;
      if (!n || n.amount <= 0) { this.release(h); h.state = 'find'; return; }
      const d = Math.hypot(h.mesh.position.x - n.x, h.mesh.position.z - n.z);
      if (d <= n.r + 0.75) { h.state = 'gather'; h.timer = 0; }
      else moving = this.walkTo(h, n.x, n.z, dt, n.r + 0.7, n);
    }

    if (h.state === 'gather') {
      const n = h.node;
      // Face the tree or rock.
      this.face(h, n.x - h.mesh.position.x, n.z - h.mesh.position.z, dt);
      if (n.amount <= 0) {
        this.release(h);
        h.state = h.carried.length >= HELPERS.carry ? 'home' : 'find';
      } else {
        h.timer += dt;
        const every = G.every * HELPERS.gatherSlower * (this.gatherer.speedFor[h.job] ?? 1);
        if (h.timer >= every) {
          h.timer -= every;
          this.gatherer.chip(n);
          h.chop = 1;
          const mesh = makers[n.type]();
          h.stack.add(mesh);
          h.carried.push(n.type);
          this.restack(h);
          if (h.carried.length >= HELPERS.carry) { this.release(h); this.setGoal(h, 'home'); }
        }
      }
    }

    if (h.state === 'home') {
      const d = Math.hypot(h.mesh.position.x - this.pilePad.x, h.mesh.position.z - this.pilePad.z);
      if (d < 1.1) { h.state = 'unload'; h.timer = 0; }
      else moving = this.walkTo(h, this.pilePad.x, this.pilePad.z, dt, 0.9);
    }

    if (h.state === 'unload') {
      h.timer += dt;
      while (h.timer >= DELIVER.every) {
        h.timer -= DELIVER.every;
        if (!h.carried.length) { h.state = 'find'; break; }
        if (this.pile.length + this.flying.length >= HELPERS.pileMax) break; // full: wait here
        const type = h.carried.pop();
        const mesh = h.stack.children[h.stack.children.length - 1];
        this.scene.attach(mesh);
        this.flying.push({ type, mesh, from: mesh.position.clone(), t: 0 });
      }
    }

    // Hop while walking, like you.
    if (moving) h.walkTime += dt * 14;
    const bob = moving ? Math.abs(Math.sin(h.walkTime)) * 0.1 : 0;
    h.mesh.position.y += (bob - h.mesh.position.y) * Math.min(1, 20 * dt);
    h.walk = (h.walk || 0) + ((moving ? 1 : 0) - (h.walk || 0)) * Math.min(1, 12 * dt);
    h.chop = Math.max(0, (h.chop || 0) - dt * 4);
    animateVillager(h.mesh, h.walkTime, h.walk, h.carried.length > 0, h.chop);
  }

  setGoal(h, state) {
    h.state = state;
    h.best = Infinity;
    h.stuckFor = 0;
  }

  release(h) {
    if (h.node && h.node.claimedBy === h) h.node.claimedBy = null;
    h.node = null;
  }

  // Nearest tree or rock of the helper's kind that still has something and nobody else is on.
  // Behind the fence only once the gate is open.
  pickNode(h) {
    const fence = this.world.fences[0];
    const p = h.mesh.position;
    let best = null;
    let bestD = Infinity;
    for (const n of this.world.nodes) {
      if (n.type !== h.job || n.amount <= 0 || n.area === 'east') continue; // helpers stay out of the iron area
      if (n.claimedBy && n.claimedBy !== h) continue;
      if (!fence.open && n.z < fence.z) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z) + (n.z < fence.z ? 8 : 0); // prefer this side of the fence
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  // Walks toward (x, z) until "stop" metres away. Goes through the gate if the goal is on the other side.
  // Returns true while walking.
  walkTo(h, x, z, dt, stop, target = null) {
    const pos = h.mesh.position;
    const fence = this.world.fences[0];
    let gx = x;
    let gz = z;
    if ((pos.z - fence.z) * (z - fence.z) < 0) {
      // Other side of the fence: aim for the middle of the gate first.
      gx = fence.gapX;
      gz = Math.abs(pos.x - fence.gapX) > 0.6 ? fence.z + Math.sign(pos.z - fence.z) * 1.5 : z;
    }
    const dx = gx - pos.x;
    const dz = gz - pos.z;
    const d = Math.hypot(dx, dz);
    const finalLeg = gx === x && gz === z;
    if (finalLeg && d <= stop) return false;
    const step = Math.min(HELPERS.speed * dt, d);
    pos.x += (dx / d) * step;
    pos.z += (dz / d) * step;
    this.face(h, dx, dz, dt);

    // Bump into trees, rocks and buildings, but not the one we're heading for.
    // If a helper makes no progress for a while it walks through for a moment, so it never gets stuck.
    if (h.ghost > 0) h.ghost -= dt;
    else {
      const r = CONFIG.player.radius;
      for (const o of this.world.obstacles) {
        if (target && o === target.obstacle) continue;
        const ox = pos.x - o.x;
        const oz = pos.z - o.z;
        const od = Math.hypot(ox, oz);
        const min = o.r + r;
        if (od < min && od > 0.0001) { pos.x = o.x + (ox / od) * min; pos.z = o.z + (oz / od) * min; }
      }
    }
    const left = Math.hypot(x - pos.x, z - pos.z);
    if (left < h.best - 0.3) { h.best = left; h.stuckFor = 0; }
    else if ((h.stuckFor += dt) > 1.5) { h.ghost = 1.2; h.stuckFor = 0; h.best = left; }
    return true;
  }

  face(h, dx, dz, dt) {
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    let diff = Math.atan2(dx, dz) - h.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    h.mesh.rotation.y += diff * Math.min(1, 10 * dt);
  }

  restack(h) {
    h.stack.children.forEach((m, i) => {
      m.position.set(0, i * PIECE_HEIGHT + PIECE_HEIGHT / 2, 0);
      m.rotation.set(0, (i % 2) * 0.12 - 0.06, 0);
    });
  }

  // ---- Stockpile ----

  pileSpot(i, v) {
    const col = i % 4;
    return v.set(this.pilePad.x + (col % 2 ? 0.35 : -0.35), Math.floor(i / 4) * PIECE_HEIGHT + PIECE_HEIGHT / 2 + 0.05, this.pilePad.z + (col < 2 ? -0.3 : 0.3));
  }

  addToPile(type, mesh = makers[type]()) {
    this.pileSpot(this.pile.length, mesh.position);
    mesh.rotation.set(0, 0, 0);
    if (!mesh.parent) this.scene.add(mesh);
    this.pile.push({ type, mesh });
  }

  animateFlying(dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt / DELIVER.fly;
      this.pileSpot(this.pile.length, tmp);
      if (f.t >= 1) {
        this.flying.splice(i, 1);
        this.addToPile(f.type, f.mesh);
        this.drawLabel();
        if (this.onChange) this.onChange();
        continue;
      }
      f.mesh.position.lerpVectors(f.from, tmp, f.t);
      f.mesh.position.y += Math.sin(f.t * Math.PI) * 1.2;
      f.mesh.rotation.y = f.t * Math.PI * 2;
    }
  }

  drawLabel() {
    const w = this.pile.filter((p) => p.type === 'wood').length;
    const s = this.pile.length - w;
    const team = this.list.length
      ? `${JOB_ICON.wood}${this.count('wood')} ${JOB_ICON.stone}${this.count('stone')}`
      : 'step on the green pad to hire';
    this.label.innerHTML = `<b>Helper lodge</b><div class="small">${team}</div>` +
      `<div><span class="need">${ICON.wood}${w}</span><span class="need">${ICON.stone}${s}</span></div>`;
  }

  // ---- Saving ----
  save() {
    if (!this.active) return this.pending;
    // What helpers carry and what's in the air counts as on the pile, so nothing is lost.
    const pile = this.pile.map((p) => p.type);
    for (const f of this.flying) pile.push(f.type);
    for (const h of this.list) pile.push(...h.carried);
    return { wood: this.count('wood'), stone: this.count('stone'), pile: pile.slice(0, HELPERS.pileMax) };
  }

  restore(saved) {
    if (saved && typeof saved === 'object') this.pending = saved;
  }
}
