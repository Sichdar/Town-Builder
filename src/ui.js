// Small helpers for the on-screen bits: resource icons and labels that float above things.
import * as THREE from 'three';

export const ICON = {
  wood: '<span class="ico wood"></span>',
  stone: '<span class="ico stone"></span>',
  plank: '<span class="ico plank"></span>',
  block: '<span class="ico block"></span>',
  coin: '<span class="ico coin"></span>',
};

const v = new THREE.Vector3();

// Puts a label above a point in the world. Hides it when the point is off screen.
// Keeps the label fully on screen when the point is near the edge.
export function placeLabel(el, x, y, z, camera) {
  v.set(x, y, z).project(camera);
  const on = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
  el.style.display = on ? '' : 'none';
  if (!on) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const half = el.offsetWidth / 2 + 6;
  const sx = Math.max(half, Math.min(w - half, ((v.x + 1) / 2) * w));
  el.style.transform = `translate(${sx}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
}

// "+3" that floats up from a point and fades.
export function floatText(text, x, y, z, camera) {
  v.set(x, y, z).project(camera);
  if (v.z > 1) return;
  const el = document.createElement('div');
  el.className = 'float-text';
  el.innerHTML = text;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
