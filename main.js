import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Настройки ----------
const ROOM = { x: 4, z: 3.2 };
const GRAB_RADIUS = 0.22;
const ITEM_SIZE = 0.16;
const MAX_ITEMS = 14;
const SPAWN_EVERY = 4; // секунд
const SAVE_KEY = 'vr-store-save-v1';

const PRODUCTS = [
  { name: 'Сок', color: 0xff9f43, price: 3 },
  { name: 'Чипсы', color: 0xfeca57, price: 2 },
  { name: 'Молоко', color: 0xdff9fb, price: 4 },
  { name: 'Шоколад', color: 0x8d5524, price: 5 },
];

// ---------- Сохранение ----------
const save = { money: 0, sold: 0 };
try {
  Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
} catch (_) { /* нет доступа к storage — играем без сохранения */ }
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
}

// ---------- Рендер и сцена ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f2a);

scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(2, 4, 3);
scene.add(sun);

// Рига игрока: камера и контроллеры лежат внутри, чтобы двигать всех сразу
const rig = new THREE.Group();
scene.add(rig);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 50);
rig.add(camera);

// Превью на компьютере (без шлема): орбитальная камера, риг в нуле
const DESKTOP_CAM = new THREE.Vector3(0, 1.8, 3.2);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.copy(DESKTOP_CAM);
controls.target.set(0, 1.0, -2.0);
controls.update();

// ---------- Вспомогательные функции ----------
function addBox(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Поверхности, на которые можно класть товары
const surfaces = [];
function addSurface(cx, cz, w, d, top, extra = {}) {
  surfaces.push({
    minX: cx - w / 2, maxX: cx + w / 2,
    minZ: cz - d / 2, maxZ: cz + d / 2,
    top, ...extra,
  });
}

// ---------- Магазин ----------
// Пол и стены
addBox(ROOM.x * 2, 0.1, ROOM.z * 2, 0x3a3f52, 0, -0.05, 0);
addBox(ROOM.x * 2, 3, 0.1, 0x2b3042, 0, 1.5, -ROOM.z);
addBox(0.1, 3, ROOM.z * 2, 0x2b3042, -ROOM.x, 1.5, 0);
addBox(0.1, 3, ROOM.z * 2, 0x2b3042, ROOM.x, 1.5, 0);

// Стеллаж (слева): 3 полки
const SHELF = { cx: -1.6, cz: -2.7, w: 2.2, d: 0.55 };
[0.5, 1.0, 1.5].forEach((y) => {
  addBox(SHELF.w, 0.04, SHELF.d, 0x9c6b3f, SHELF.cx, y, SHELF.cz);
  addSurface(SHELF.cx, SHELF.cz, SHELF.w, SHELF.d, y + 0.02, { shelf: true });
});
[-1, 1].forEach((s) => addBox(0.05, 1.7, SHELF.d, 0x7a5230, SHELF.cx + s * (SHELF.w / 2), 0.85, SHELF.cz));
addBox(SHELF.w, 1.7, 0.03, 0x6b4627, SHELF.cx, 0.85, SHELF.cz - SHELF.d / 2);

// Стол поставки (справа)
const TABLE = { cx: 1.8, cz: -2.4, w: 1.4, d: 0.7, top: 0.8 };
addBox(TABLE.w, 0.06, TABLE.d, 0x5b4636, TABLE.cx, TABLE.top - 0.03, TABLE.cz);
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
  addBox(0.06, TABLE.top, 0.06, 0x3d2f24, TABLE.cx + sx * (TABLE.w / 2 - 0.05), TABLE.top / 2, TABLE.cz + sz * (TABLE.d / 2 - 0.05))
);
addSurface(TABLE.cx, TABLE.cz, TABLE.w, TABLE.d, TABLE.top);
const supply = addBox(0.9, 0.01, 0.45, 0x2e86de, TABLE.cx, TABLE.top + 0.005, TABLE.cz);
supply.material.transparent = true;
supply.material.opacity = 0.6;

// Касса (справа у стены)
const COUNTER = { cx: 2.7, cz: 0.4, w: 0.8, d: 1.6, top: 0.95 };
addBox(COUNTER.w, COUNTER.top, COUNTER.d, 0xd8d8e0, COUNTER.cx, COUNTER.top / 2, COUNTER.cz);
addSurface(COUNTER.cx, COUNTER.cz, COUNTER.w, COUNTER.d, COUNTER.top);
// зелёная зона продажи
const PAD = { cx: COUNTER.cx, cz: COUNTER.cz + 0.3, w: 0.6, d: 0.7 };
const pad = addBox(PAD.w, 0.01, PAD.d, 0x2ecc71, PAD.cx, COUNTER.top + 0.005, PAD.cz);
pad.material.transparent = true;
pad.material.opacity = 0.7;
addSurface(PAD.cx, PAD.cz, PAD.w, PAD.d, COUNTER.top + 0.01, { sell: true });
// «кассовый аппарат»
addBox(0.3, 0.2, 0.3, 0x2d3436, COUNTER.cx, COUNTER.top + 0.1, COUNTER.cz - 0.5);

// ---------- Табло (деньги / статистика) ----------
const hudCanvas = document.createElement('canvas');
hudCanvas.width = 768;
hudCanvas.height = 384;
const hudCtx = hudCanvas.getContext('2d');
const hudTexture = new THREE.CanvasTexture(hudCanvas);
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(1.8, 0.9),
  new THREE.MeshBasicMaterial({ map: hudTexture })
);
hud.position.set(0, 2.0, -ROOM.z + 0.07);
scene.add(hud);

let lastHud = '';
function drawHud(onShelves) {
  const key = `${save.money}|${save.sold}|${onShelves}`;
  if (key === lastHud) return;
  lastHud = key;
  hudCtx.fillStyle = '#11141c';
  hudCtx.fillRect(0, 0, 768, 384);
  hudCtx.fillStyle = '#7ee0a1';
  hudCtx.font = 'bold 64px sans-serif';
  hudCtx.fillText('Магазин VR', 40, 90);
  hudCtx.fillStyle = '#ffffff';
  hudCtx.font = '52px sans-serif';
  hudCtx.fillText(`Деньги: ${save.money} $`, 40, 190);
  hudCtx.fillText(`Продано: ${save.sold}`, 40, 260);
  hudCtx.fillText(`На полках: ${onShelves}`, 40, 330);
  hudTexture.needsUpdate = true;
}

// ---------- Товары ----------
const items = [];
const itemGeo = new THREE.BoxGeometry(ITEM_SIZE, ITEM_SIZE, ITEM_SIZE);
const itemMats = PRODUCTS.map((p) => new THREE.MeshLambertMaterial({ color: p.color }));

function spawnItem(type, x, y, z) {
  const mesh = new THREE.Mesh(itemGeo, itemMats[type]);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.random() * Math.PI;
  mesh.userData = {
    type,
    price: PRODUCTS[type].price,
    vel: new THREE.Vector3(),
    held: null,
    surf: null,
  };
  scene.add(mesh);
  items.push(mesh);
  return mesh;
}

function spawnRandom() {
  if (items.length >= MAX_ITEMS) return;
  const type = Math.floor(Math.random() * PRODUCTS.length);
  spawnItem(
    type,
    TABLE.cx + (Math.random() - 0.5) * 0.7,
    TABLE.top + 0.5,
    TABLE.cz + (Math.random() - 0.5) * 0.3
  );
}
for (let i = 0; i < 4; i++) spawnRandom();

function removeItem(it) {
  scene.remove(it);
  const i = items.indexOf(it);
  if (i >= 0) items.splice(i, 1);
}

// Простая физика: гравитация + опора на поверхности
function stepItem(it, dt) {
  const u = it.userData;
  if (u.held) return;
  const half = ITEM_SIZE / 2;
  const prevBottom = it.position.y - half;

  u.vel.y -= 9.8 * dt;
  it.position.addScaledVector(u.vel, dt);
  it.position.x = clamp(it.position.x, -ROOM.x + 0.2, ROOM.x - 0.2);
  it.position.z = clamp(it.position.z, -ROOM.z + 0.2, ROOM.z - 0.2);

  const bottom = it.position.y - half;
  let top = 0;
  let surf = null;
  for (const s of surfaces) {
    if (
      it.position.x >= s.minX && it.position.x <= s.maxX &&
      it.position.z >= s.minZ && it.position.z <= s.maxZ &&
      prevBottom >= s.top - 0.03 && bottom <= s.top && s.top > top
    ) {
      top = s.top;
      surf = s;
    }
  }

  if (bottom <= top) {
    it.position.y = top + half;
    if (u.vel.y < -1.5) u.vel.y = -u.vel.y * 0.2;
    else u.vel.y = 0;
    u.vel.x *= 0.8;
    u.vel.z *= 0.8;
    it.rotation.x *= 0.8;
    it.rotation.z *= 0.8;
    u.surf = surf;
  } else {
    u.surf = null;
  }
}

// ---------- Контроллеры ----------
const modelFactory = new XRControllerModelFactory();
const tmpV = new THREE.Vector3();
const controllerList = [];

function setupController(index) {
  const controller = renderer.xr.getController(index);
  controller.userData = {
    held: null,
    gamepad: null,
    hand: '',
    prevPos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    turnReady: true,
  };
  rig.add(controller);

  const grip = renderer.xr.getControllerGrip(index);
  grip.add(modelFactory.createControllerModel(grip));
  rig.add(grip);

  controller.addEventListener('connected', (e) => {
    controller.userData.gamepad = e.data.gamepad || null;
    controller.userData.hand = e.data.handedness;
  });
  controller.addEventListener('disconnected', () => {
    controller.userData.gamepad = null;
  });

  const grab = () => tryGrab(controller);
  const release = () => drop(controller);
  controller.addEventListener('selectstart', grab);
  controller.addEventListener('squeezestart', grab);
  controller.addEventListener('selectend', release);
  controller.addEventListener('squeezeend', release);

  controllerList.push(controller);
}
setupController(0);
setupController(1);

function tryGrab(controller) {
  const u = controller.userData;
  if (u.held) return;
  controller.getWorldPosition(tmpV);
  let best = null;
  let bestDist = GRAB_RADIUS;
  for (const it of items) {
    if (it.userData.held) continue;
    const d = it.position.distanceTo(tmpV);
    if (d < bestDist) { bestDist = d; best = it; }
  }
  if (!best) return;
  controller.attach(best); // сохраняет мировую позицию
  best.userData.held = controller;
  best.userData.vel.set(0, 0, 0);
  best.userData.surf = null;
  u.held = best;
}

function drop(controller) {
  const u = controller.userData;
  const it = u.held;
  if (!it) return;
  scene.attach(it);
  it.userData.held = null;
  it.userData.vel.copy(u.vel).multiplyScalar(1.2); // бросок
  u.held = null;
}

// ---------- Перемещение ----------
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const head = new THREE.Vector3();

function locomotion(dt) {
  const xrCam = renderer.xr.getCamera();
  for (const c of controllerList) {
    const gp = c.userData.gamepad;
    if (!gp || !gp.axes || gp.axes.length < 4) continue;
    const ax = gp.axes[2];
    const ay = gp.axes[3];

    if (c.userData.hand === 'left') {
      if (Math.abs(ax) < 0.15 && Math.abs(ay) < 0.15) continue;
      xrCam.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, Y_AXIS);
      rig.position.addScaledVector(fwd, -ay * 2.0 * dt);
      rig.position.addScaledVector(right, ax * 2.0 * dt);
      rig.position.x = clamp(rig.position.x, -ROOM.x + 0.4, ROOM.x - 0.4);
      rig.position.z = clamp(rig.position.z, -ROOM.z + 0.4, ROOM.z - 0.4);
    } else if (c.userData.hand === 'right') {
      if (Math.abs(ax) < 0.6) { c.userData.turnReady = true; continue; }
      if (!c.userData.turnReady) continue;
      c.userData.turnReady = false;
      const angle = -Math.sign(ax) * (Math.PI / 6); // 30°
      xrCam.getWorldPosition(head);
      rig.position.sub(head);
      rig.position.applyAxisAngle(Y_AXIS, angle);
      rig.position.add(head);
      rig.rotation.y += angle;
    }
  }
}

// ---------- Основной цикл ----------
const clock = new THREE.Clock();
let spawnTimer = 0;

renderer.xr.addEventListener('sessionstart', () => {
  controls.enabled = false;
  rig.position.set(0, 0, 1.6);
  rig.rotation.set(0, 0, 0);
  camera.position.set(0, 0, 0); // высоту головы задаёт шлем
});
renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  camera.position.copy(DESKTOP_CAM);
  camera.rotation.set(0, 0, 0);
  controls.update();
});

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  // скорость рук для броска
  for (const c of controllerList) {
    c.getWorldPosition(tmpV);
    c.userData.vel.lerp(tmpV.clone().sub(c.userData.prevPos).divideScalar(Math.max(dt, 1e-3)), 0.4);
    c.userData.prevPos.copy(tmpV);
  }

  if (renderer.xr.isPresenting) locomotion(dt);
  else controls.update();

  // физика и продажа
  let onShelves = 0;
  for (const it of [...items]) {
    stepItem(it, dt);
    const s = it.userData.surf;
    if (s && s.sell) {
      save.money += it.userData.price;
      save.sold += 1;
      persist();
      removeItem(it);
    } else if (s && s.shelf) {
      onShelves += 1;
    }
  }

  // новые поставки
  spawnTimer += dt;
  if (spawnTimer >= SPAWN_EVERY) {
    spawnTimer = 0;
    spawnRandom();
  }

  drawHud(onShelves);
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
