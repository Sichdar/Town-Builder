// Starts the game: scene, lights, camera, the villager, and the frame loop.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Joystick } from './joystick.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd4f0);
scene.fog = new THREE.Fog(0x9fd4f0, 30, 60);

scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7a3a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const S = 14;
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 50 });
scene.add(sun, sun.target);

const C = CONFIG.camera;
const camera = new THREE.PerspectiveCamera(C.fov, 1, 0.1, 200);

const world = buildWorld(scene);
const player = new Player(scene, world);
const joystick = new Joystick(document.getElementById('stick'), document.getElementById('knob'));

const hint = document.getElementById('hint');
joystick.onFirstMove = () => hint.classList.add('gone');
document.getElementById('version').textContent = CONFIG.version;

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

  player.update(dt, joystick.vector);

  const k = 1 - Math.exp(-C.follow * dt);
  target.copy(player.position).setY(0).add(offset);
  camera.position.lerp(target, k);
  look.lerp(target.copy(player.position).setY(0.8), k);
  camera.lookAt(look);

  sun.position.copy(player.position).add({ x: 8, y: 16, z: 6 });
  sun.target.position.copy(player.position);

  renderer.render(scene, camera);
});

// Offline support and "Add to Home Screen". Only works over http(s), not when opened as a file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline support not available:', err));
}
