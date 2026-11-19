// Buildings that turn goods into other goods: the sawmill (wood -> planks), the mason (stone -> blocks)
// and the market (any goods -> coins). They start working once their build site is finished.
// Green-edged pad = drop goods in. Yellow-edged pad = collect what was made.
import * as THREE from 'three';
import { SITES, CONVERTERS, DELIVER } from './config.js';
import { makePad, PAD_IN, PAD_OUT, PIECE_HEIGHT } from './models.js';
import { makers } from './gather.js';
import { ICON, placeLabel, floatText } from './ui.js';

const NAMES = { sawmill: 'Sawmill', mason: 'Mason', market: 'Market' };
const tmp = new THREE.Vector3();

export class Converters {
  constructor(scene, player, gatherer, sites, camera) {
    this.scene = scene;
    this.player = player;
    this.gatherer = gatherer;
    this.sites = sites;
    this.camera = camera;
    this.coins = 0;
    this.flying = [];          // goods on their way into a building
    this.onChange = null;      // something worth saving changed
    this.onCoins = null;       // coins changed (for the counter at the top)
    this.pending = {};         // saved counts waiting for their building to be built

    const labels = document.getElementById('labels');
    this.list = SITES.filter((s) => CONVERTERS[s.builds]).map((def) => {
      const rule = CONVERTERS[def.builds];
      const off = CONVERTERS.padOffset;
      const b = {
        id: def.id, kind: def.builds, rule, def,
        active: false, input: 0, output: 0, timer: 0, inTimer: 0, outTimer: 0,
        inPad: { x: def.x - off, z: def.z },
        outPad: rule.makes ? { x: def.x + off, z: def.z } : null,
        pile: [], // meshes on the out pad
      };
      b.label = document.createElement('div');
      b.label.className = 'site-label';
      b.label.style.display = 'none';
      labels.appendChild(b.label);
      return b;
    });
  }

  get(id) { return this.list.find((b) => b.id === id); }

  // Called every frame: a building whose site was just finished starts working.
  activate(b) {
    b.active = true;
    const size = CONVERTERS.padSize;
    const inPad = makePad(size, PAD_IN);
    inPad.position.set(b.inPad.x, 0, b.inPad.z);
    this.scene.add(inPad);
    if (b.outPad) {
      const outPad = makePad(size, PAD_OUT);
      outPad.position.set(b.outPad.x, 0, b.outPad.z);
      this.scene.add(outPad);
    }
    const saved = this.pending[b.id];
    if (saved) {
      b.input = Math.min(b.rule.inMax ?? 0, Math.max(0, Number(saved.input) || 0));
      const out = Math.min(b.rule.outMax ?? 0, Math.max(0, Number(saved.output) || 0));
      for (let i = 0; i < out; i++) this.addToPile(b);
    }
    // The working parts of the model (spinning saw, bobbing block).
    const group = this.sites.get(b.id).group;
    b.spinner = group.getObjectByName('spinner');
    b.bobber = group.getObjectByName('bobber');
    this.drawLabel(b);
  }

  onPad(pad) {
    if (!pad) return false;
    const p = this.player.position;
    const half = CONVERTERS.padSize / 2 + 0.3;
    return Math.abs(p.x - pad.x) < half && Math.abs(p.z - pad.z) < half;
  }

  incoming(b) {
    return this.flying.filter((f) => f.b === b).length;
  }

  update(dt) {
    for (const b of this.list) {
      if (!b.active) {
        if (this.sites.get(b.id).done) this.activate(b);
        else continue;
      }

      // Drop goods in.
      if (this.onPad(b.inPad)) {
        b.inTimer += dt;
        while (b.inTimer >= DELIVER.every) {
          b.inTimer -= DELIVER.every;
          const wants = b.rule.prices
            ? (t) => b.rule.prices[t] !== undefined
            : (t) => t === b.rule.takes && b.input + this.incoming(b) < b.rule.inMax;
          const piece = this.gatherer.takeFor(wants);
          if (!piece) break;
          this.flying.push({ ...piece, b, from: piece.mesh.position.clone(), t: 0 });
        }
      } else {
        b.inTimer = DELIVER.every;
      }

      // Collect what was made.
      if (this.onPad(b.outPad)) {
        b.outTimer += dt;
        while (b.outTimer >= DELIVER.every) {
          b.outTimer -= DELIVER.every;
          if (this.gatherer.full || b.output <= 0) break;
          const mesh = b.pile.pop();
          b.output--;
          mesh.getWorldPosition(tmp);
          this.scene.remove(mesh);
          this.gatherer.receive(b.rule.makes, tmp);
          this.drawLabel(b);
          if (this.onChange) this.onChange();
        }
      } else {
        b.outTimer = DELIVER.every;
      }

      // Work: one piece in, one piece out, every "every" seconds.
      const working = b.rule.makes && b.input > 0 && b.output < b.rule.outMax;
      if (working) {
        b.timer += dt;
        if (b.timer >= b.rule.every) {
          b.timer -= b.rule.every;
          b.input--;
          this.addToPile(b);
          this.drawLabel(b);
          if (this.onChange) this.onChange();
        }
      } else {
        b.timer = 0;
      }
      if (b.spinner && working) b.spinner.rotation.y += dt * 14;
      if (b.bobber) b.bobber.position.y = 0.25 + (working ? Math.abs(Math.sin(b.timer * 10)) * 0.15 : 0);
    }

    this.animateFlying(dt);
    // Counters only for buildings near you, so far-away ones don't clutter the screen.
    const p = this.player.position;
    for (const b of this.list) {
      if (b.active && Math.hypot(p.x - b.def.x, p.z - b.def.z) < 15) placeLabel(b.label, b.def.x, 3.0, b.def.z, this.camera);
      else b.label.style.display = 'none';
    }
  }

  // Finished pieces sit on the out pad in neat piles of 4 per layer.
  addToPile(b) {
    const i = b.pile.length;
    const mesh = makers[b.rule.makes]();
    const col = i % 4;
    mesh.position.set(b.outPad.x + (col % 2 ? 0.35 : -0.35), Math.floor(i / 4) * PIECE_HEIGHT + PIECE_HEIGHT / 2 + 0.05, b.outPad.z + (col < 2 ? -0.3 : 0.3));
    this.scene.add(mesh);
    b.pile.push(mesh);
    b.output++;
  }

  animateFlying(dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt / DELIVER.fly;
      tmp.set(f.b.def.x, 1.2, f.b.def.z);
      if (f.t >= 1) {
        this.scene.remove(f.mesh);
        this.flying.splice(i, 1);
        if (f.b.rule.prices) {
          const pay = f.b.rule.prices[f.type] || 0;
          this.coins += pay;
          floatText(`+${pay} ${ICON.coin}`, f.b.def.x, 2.4, f.b.def.z, this.camera);
          if (this.onCoins) this.onCoins();
        } else {
          f.b.input++;
        }
        this.drawLabel(f.b);
        if (this.onChange) this.onChange();
        continue;
      }
      f.mesh.position.lerpVectors(f.from, tmp, f.t);
      f.mesh.position.y += Math.sin(f.t * Math.PI) * 1.5;
      f.mesh.rotation.x = f.t * Math.PI * 2;
    }
  }

  drawLabel(b) {
    const name = `<b>${NAMES[b.kind]}</b>`;
    if (b.rule.prices) {
      const prices = Object.entries(b.rule.prices)
        .map(([k, p]) => `<span class="need">${ICON[k]}${p}</span>`).join('');
      b.label.innerHTML = `${name}<div class="small">pays ${ICON.coin} for</div><div>${prices}</div>`;
    } else {
      b.label.innerHTML = `${name}<div><span class="need">${ICON[b.rule.takes]}${b.input}</span>➜<span class="need">${ICON[b.rule.makes]}${b.output}</span></div>`;
    }
  }

  // ---- Saving ----
  save() {
    const out = { coins: this.coins };
    for (const b of this.list) {
      if (!b.active) continue;
      // Goods still in the air count as delivered.
      let input = b.input;
      for (const f of this.flying) {
        if (f.b !== b) continue;
        if (b.rule.prices) out.coins += b.rule.prices[f.type] || 0;
        else input++;
      }
      out[b.id] = { input, output: b.output };
    }
    return out;
  }

  restore(saved) {
    if (!saved) return;
    this.coins = Math.max(0, Math.floor(Number(saved.coins) || 0));
    for (const b of this.list) if (saved[b.id]) this.pending[b.id] = saved[b.id];
    if (this.onCoins) this.onCoins();
  }
}
