// Floating joystick: put a thumb anywhere, drag to walk. Also WASD / arrow keys for testing on a PC.
import { CONFIG } from './config.js';

export class Joystick {
  constructor(baseEl, knobEl) {
    this.base = baseEl;
    this.knob = knobEl;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };
    this.stick = { x: 0, y: 0 };   // -1..1 from touch, screen axes (y down)
    this.keys = new Set();
    this.onFirstMove = null;

    window.addEventListener('pointerdown', (e) => this.down(e), { passive: false });
    window.addEventListener('pointermove', (e) => this.move(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('blur', () => { this.release(); this.keys.clear(); });
    window.addEventListener('keydown', (e) => { this.keys.add(e.code); this.firstMove(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  down(e) {
    if (this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.origin = { x: e.clientX, y: e.clientY };
    this.stick = { x: 0, y: 0 };
    this.place();
    this.base.classList.add('on');
    this.firstMove();
  }

  move(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const R = CONFIG.joystick.radius;
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      // Drag past the edge: the joystick follows the thumb, like in the ads.
      const over = len - R;
      this.origin.x += (dx / len) * over;
      this.origin.y += (dy / len) * over;
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    this.stick = { x: dx / R, y: dy / R };
    this.place();
  }

  up(e) {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  }

  release() {
    this.pointerId = null;
    this.stick = { x: 0, y: 0 };
    this.base.classList.remove('on');
  }

  place() {
    const R = CONFIG.joystick.radius;
    this.base.style.transform = `translate(${this.origin.x}px, ${this.origin.y}px)`;
    this.knob.style.transform = `translate(${this.stick.x * R}px, ${this.stick.y * R}px)`;
  }

  firstMove() {
    if (this.onFirstMove) { this.onFirstMove(); this.onFirstMove = null; }
  }

  // Movement on the ground: x = right, z = toward the camera. Length 0..1.
  get vector() {
    let x = this.stick.x;
    let z = this.stick.y;
    const k = this.keys;
    const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const kz = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (kx || kz) { x = kx; z = kz; }

    let len = Math.hypot(x, z);
    if (len < CONFIG.joystick.deadZone) return { x: 0, z: 0 };
    if (len > 1) { x /= len; z /= len; len = 1; }
    return { x, z };
  }
}
