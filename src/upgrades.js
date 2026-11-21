// M5: spend coins on upgrades (better axe and pick, bigger backpack, faster boots),
// and the backpack panel where you can drop pieces you don't want to carry.
import * as THREE from 'three';
import { CONFIG, UPGRADES } from './config.js';
import { ICON } from './ui.js';

const PIECE_REST = 0.12; // height of a dropped piece lying on the ground

export class Upgrades {
  constructor(scene, player, gatherer, converters) {
    this.scene = scene;
    this.player = player;
    this.gatherer = gatherer;
    this.converters = converters;
    this.level = {};               // id -> level bought (0 = none)
    for (const u of UPGRADES.list) this.level[u.id] = 0;
    this.dropped = [];             // pieces falling to the ground and fading
    this.onChange = null;          // something worth saving changed
    this.base = {
      speed: CONFIG.player.speed,
      stackMax: CONFIG.gather.stackMax,
    };

    this.shop = document.getElementById('shop');
    this.bag = document.getElementById('bag');
    document.getElementById('coins').addEventListener('click', () => this.open(this.shop));
    document.getElementById('bagBtn').addEventListener('click', () => this.open(this.bag));
    for (const panel of [this.shop, this.bag]) {
      // Tapping the dark area around the panel closes it.
      panel.addEventListener('click', (e) => { if (e.target === panel) this.close(panel); });
      panel.querySelector('.close').addEventListener('click', () => this.close(panel));
    }
    this.apply();
  }

  // ---- Upgrades ----

  cost(u) {
    const lv = this.level[u.id];
    return lv < u.costs.length ? u.costs[lv] : null; // null = maxed out
  }

  buy(id) {
    const u = UPGRADES.list.find((x) => x.id === id);
    const price = this.cost(u);
    if (price === null || this.converters.coins < price) return false;
    this.converters.coins -= price;
    this.level[id]++;
    this.apply();
    if (this.converters.onCoins) this.converters.onCoins();
    if (this.onChange) this.onChange();
    this.drawShop();
    return true;
  }

  // Turns levels into the numbers the rest of the game reads.
  apply() {
    const L = this.level;
    CONFIG.player.speed = this.base.speed * (1 + UPGRADES.bootsStep * L.boots);
    CONFIG.gather.stackMax = this.base.stackMax + UPGRADES.bagStep * L.bag;
    // Gathering speed per type: a better axe cuts wood faster, a better pick breaks stone faster.
    this.gatherer.speedFor = {
      wood: Math.pow(UPGRADES.toolStep, L.axe),
      stone: Math.pow(UPGRADES.toolStep, L.pick),
      iron: 1.5 * Math.pow(UPGRADES.toolStep, L.pick), // iron ore is harder: 1.5 times slower than stone
    };
    if (this.gatherer.onChange) this.gatherer.onChange();
  }

  drawShop() {
    const coins = this.converters.coins;
    const rows = UPGRADES.list.map((u) => {
      const lv = this.level[u.id];
      const price = this.cost(u);
      const pips = u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const btn = price === null
        ? '<button disabled>Max</button>'
        : `<button data-buy="${u.id}" ${coins < price ? 'disabled' : ''}>${ICON.coin}${price}</button>`;
      return `<div class="row"><span class="big">${u.icon}</span><div class="what"><b>${u.name}</b><small>${u.text}</small><span class="pips">${pips}</span></div>${btn}</div>`;
    }).join('');
    this.shop.querySelector('.list').innerHTML = rows;
    this.shop.querySelector('.have').innerHTML = `${ICON.coin}${coins}`;
    for (const b of this.shop.querySelectorAll('[data-buy]')) {
      b.addEventListener('click', () => this.buy(b.dataset.buy));
    }
  }

  // ---- Backpack: drop pieces ----

  drawBag() {
    const types = ['wood', 'stone', 'plank', 'block', 'iron'];
    const rows = types.map((t) => {
      const n = this.gatherer.count(t);
      if (!n) return '';
      return `<div class="row"><span class="big">${ICON[t]}</span><div class="what"><b>${n}</b></div>` +
        `<button data-drop="${t}" data-n="1">Drop 1</button><button data-drop="${t}" data-n="all">Drop all</button></div>`;
    }).join('');
    const list = this.bag.querySelector('.list');
    list.innerHTML = rows || '<p class="empty">Your backpack is empty.</p>';
    this.bag.querySelector('.have').textContent = `${this.gatherer.carried.length}/${CONFIG.gather.stackMax}`;
    for (const b of list.querySelectorAll('[data-drop]')) {
      b.addEventListener('click', () => {
        this.drop(b.dataset.drop, b.dataset.n === 'all' ? Infinity : 1);
        this.drawBag();
      });
    }
  }

  // Takes pieces of "type" off your back, top ones first. They tumble to the ground and fade away.
  drop(type, howMany) {
    let n = 0;
    while (n < howMany) {
      const piece = this.gatherer.takeFor((t) => t === type);
      if (!piece) break;
      const ang = Math.random() * Math.PI * 2;
      const dist = 0.8 + Math.random() * 0.6;
      this.dropped.push({
        mesh: piece.mesh,
        from: piece.mesh.position.clone(),
        to: new THREE.Vector3(this.player.position.x + Math.cos(ang) * dist, PIECE_REST, this.player.position.z + Math.sin(ang) * dist),
        t: -n * 0.05, // small stagger so they don't all fly at once
      });
      n++;
    }
    if (n && this.onChange) this.onChange();
    return n;
  }

  update(dt) {
    for (let i = this.dropped.length - 1; i >= 0; i--) {
      const d = this.dropped[i];
      d.t += dt;
      const fly = Math.max(0, Math.min(1, d.t / 0.35));
      d.mesh.position.lerpVectors(d.from, d.to, fly);
      d.mesh.position.y += Math.sin(fly * Math.PI) * 0.6;
      d.mesh.rotation.z = fly * 1.6;
      // Lie on the ground a moment, then shrink away.
      const fade = (d.t - 1.2) / 0.4;
      if (fade > 0) d.mesh.scale.setScalar(Math.max(0.01, 1 - fade));
      if (fade >= 1) {
        this.scene.remove(d.mesh);
        this.dropped.splice(i, 1);
      }
    }
  }

  // ---- Panels ----

  open(panel) {
    if (panel === this.shop) this.drawShop();
    else this.drawBag();
    panel.classList.add('on');
  }

  close(panel) { panel.classList.remove('on'); }

  // Keeps an open panel up to date (coins arriving, pieces landing on your back).
  refresh() {
    if (this.shop.classList.contains('on')) this.drawShop();
    if (this.bag.classList.contains('on')) this.drawBag();
  }

  // ---- Saving ----
  save() { return { ...this.level }; }

  restore(saved) {
    if (!saved || typeof saved !== 'object') return;
    for (const u of UPGRADES.list) {
      this.level[u.id] = Math.max(0, Math.min(u.costs.length, Math.floor(Number(saved[u.id]) || 0)));
    }
    this.apply();
  }
}


