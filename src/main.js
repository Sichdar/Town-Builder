// Starts the game: scene, lights, camera, the villager, and the frame loop.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Joystick } from './joystick.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Gatherer } from './gather.js';
import { Sites } from './sites.js';
import { Converters } from './converters.js';
import { Upgrades } from './upgrades.js';
import { Helpers } from './helpers.js';
import { loadSave, startSaving, resetSave } from './save.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Film-like colour handling: softer bright spots, richer colours.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8d8f0);
scene.fog = new THREE.Fog(0xb9dcea, 28, 58); // far things fade into a light haze

// Sky light from above (cool blue) and bounce light from the grass below (green),
// plus a warm late-afternoon sun that casts the shadows.
scene.add(new THREE.HemisphereLight(0xd6ecff, 0x5d8a3c, 1.0));
const sun = new THREE.DirectionalLight(0xfff0d0, 2.0);
sun.castShadow = true;
// Sharper shadows on bigger screens; phones keep the lighter setting.
const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio, 2) > 1800;
sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
const S = 15;
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 50 });
scene.add(sun, sun.target);

const C = CONFIG.camera;
const camera = new THREE.PerspectiveCamera(C.fov, 1, 0.1, 200);

const world = buildWorld(scene);
const player = new Player(scene, world);
const gatherer = new Gatherer(scene, world, player);
const joystick = new Joystick(document.getElementById('stick'), document.getElementById('knob'));

const hint = document.getElementById('hint');
joystick.onFirstMove = () => hint.classList.add('gone');
document.getElementById('version').textContent = CONFIG.version;

// Counter at the top: what you carry, and how full your back is.
const pills = [...document.querySelectorAll('#hud .pill[data-type]')];
const hud = {
  load: document.getElementById('load'),
  full: document.getElementById('full'),
  coins: document.getElementById('coins'),
  coinCount: document.getElementById('coinCount'),
};
function showLoad() {
  for (const p of pills) {
    const type = p.dataset.type;
    const n = gatherer.count(type);
    p.lastElementChild.textContent = n;
    // Planks and blocks only show while you carry some, to keep the bar short on a phone.
    if (type === 'plank' || type === 'block') p.classList.toggle('hide', n === 0);
  }
  hud.load.textContent = `${gatherer.carried.length}/${CONFIG.gather.stackMax}`;
  hud.full.classList.toggle('on', gatherer.full);
  if (upgrades) upgrades.refresh();
}
let upgrades = null;
gatherer.onChange = showLoad;

// Build sites, the toast when something is built, and saving.
const sites = new Sites(scene, world, player, gatherer, camera);
const toast = document.getElementById('toast');
let toastTimer = 0;
sites.onBuilt = (s) => {
  toast.textContent = s.def.builds === 'gate' ? 'The north gate is open!' : `${s.def.name} built!`;
  toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('on'), 2200);
  showCoins();
};

// Sawmill, mason and market: they work once built.
const converters = new Converters(scene, player, gatherer, sites, camera);
function showCoins() {
  hud.coinCount.textContent = converters.coins;
  hud.coins.classList.toggle('hide', converters.coins === 0 && !sites.get('market').done);
  if (upgrades) upgrades.refresh();
  if (helpers) helpers.refresh();
}
let helpers = null;
converters.onCoins = showCoins;

// Upgrades shop (tap the coins) and the backpack panel (tap the backpack) to drop pieces.
upgrades = new Upgrades(scene, player, gatherer, converters);

// Helpers: hire them at the Helper lodge; they gather and fill the stockpile.
helpers = new Helpers(scene, world, player, gatherer, sites, converters, camera);
helpers.onOpen = () => joystick.release();

const saved = loadSave();
if (saved) {
  upgrades.restore(saved.upgrades); // first, so a bigger backpack fits the saved stack
  sites.restore(saved.sites);
  converters.restore(saved.converters);
  helpers.restore(saved.helpers);
  gatherer.restore(saved.carried);
  if (Array.isArray(saved.pos)) player.position.set(+saved.pos[0] || 0, 0, +saved.pos[1] || 0);
  hint.classList.add('gone');
}
const saveNow = startSaving(() => ({
  sites: sites.save(),
  converters: converters.save(),
  upgrades: upgrades.save(),
  helpers: helpers.save(),
  carried: gatherer.carried.slice(),
  pos: [+player.position.x.toFixed(2), +player.position.z.toFixed(2)],
}));
showLoad();
showCoins();

// For testing from the browser console.
window.game = { player, gatherer, world, sites, converters, upgrades, helpers, camera, saveNow, reset: resetSave, render: () => renderer.render(scene, camera) };

// Camera starts in place, then follows smoothly.
const offset = new THREE.Vector3(C.offset.x, C.offset.y, C.offset.z);
camera.position.copy(player.position).add(offset);
const look = player.position.clone();
camera.lookAt(look);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // On a tall phone screen, pull the camera back a little so you see enough sideways.
  camera.fov = w < h ? C.fov + 10 : C.fov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Stop iPhone pinch-zoom and long-press menus from getting in the way.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

const clock = new THREE.Clock();
const target = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  const input = joystick.vector;
  player.update(dt, input);
  gatherer.update(dt, input.x !== 0 || input.z !== 0);
  player.carrying = gatherer.carried.length > 0;
  sites.update(dt);
  converters.update(dt);
  upgrades.update(dt);
  helpers.update(dt);
  world.update(dt);

  const k = 1 - Math.exp(-C.follow * dt);
  target.copy(player.position).setY(0).add(offset);
  camera.position.lerp(target, k);
  look.lerp(target.copy(player.position).setY(0.8), k);
  camera.lookAt(look);

  sun.position.copy(player.position).add({ x: 9, y: 15, z: 4 });
  sun.target.position.copy(player.position);

  renderer.render(scene, camera);
});

// Offline support and "Add to Home Screen". Only works over http(s), not when opened as a file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline support not available:', err));
}
