// 3D 동작 화면 — 설계 메모 2026-10-12 §4.3. 툰 + 테두리선 + 바닥 그림자 원, 카메라 3방향, 테마 3가지, 거울(화면 좌우 뒤집기).
// 약 30fps 타이머(rAF 대신, 스틱맨과 같은 이유). 탭이 숨으면 멈추고 돌아오면 이어서.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { createRig, addFootMarkers } from './rig.js';
import { playhead, lerpPose3, ease } from '../../domain/pose3d.js';

const FRAME_MS = 33;
const THEMES = {
  day: { bg: 0xeef0f7, floor: 0xb4b2a9, light: 1.0 },
  night: { bg: 0x0b0b10, floor: 0x3a3a44, light: 0.75 },
  sun: { bg: 0xffffff, floor: 0x888780, light: 1.1 },
};
const CAMERA_DEG = { side: -90, front: 0, diag: -45 }; // 위에서 봐서 캐릭터 정면(+Z)에서 몇 도 — 음수 = 캐릭터 오른쪽

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  const outline = new OutlineEffect(renderer, { defaultThickness: 0.006, defaultColor: [0.08, 0.08, 0.1] });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(2, 4, 3);
  scene.add(hemi, sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), new THREE.MeshBasicMaterial({ color: 0xb4b2a9, transparent: true, opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  let model = null, rig = null, timer = null, cameraName = 'side', playing = null;

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    frameCamera();
  }
  function frameCamera() {
    const H = rig?.height ?? 1.4;
    const a = THREE.MathUtils.degToRad(CAMERA_DEG[cameraName]);
    const dist = (H * 1.35 / 2) / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(1, camera.aspect);
    camera.position.set(Math.sin(a) * dist, H * 0.62, Math.cos(a) * dist);
    camera.lookAt(0, H * 0.5, 0);
    floor.scale.setScalar(H / 1.4);
  }
  const render = () => outline.render(scene, camera);

  function setModel(m) {
    if (model) scene.remove(model.root);
    model = m; scene.add(m.root);
    rig = createRig(m.root, m.boneOf);
    addFootMarkers(rig, m.boneOf);
    resize();
    if (playing) show(playing.motion, playing.opts); else render();
  }

  function show(motion, opts = {}) {
    stop();
    playing = { motion, opts };
    const { slow = 1, still = false, onCycle, onStep } = opts;
    const { frames, ms, loop } = motion;
    if (!rig) return;
    const draw = (pose, dt) => { rig.apply(pose); model.update?.(dt); render(); };
    if (still || frames.length < 2) { draw(frames[still ? frames.length - 1 : 0], 0); return; }
    let t0 = performance.now(), last = t0, lastCycle = 0, lastStep = -1, pausedAt = null;
    const tick = () => {
      if (document.hidden) { pausedAt ??= performance.now(); timer = setTimeout(tick, 250); return; }
      if (pausedAt != null) { t0 += performance.now() - pausedAt; pausedAt = null; }
      const now = performance.now();
      const h = playhead(now - t0, frames.length, ms, { slow, loop });
      draw(lerpPose3(frames[h.i], frames[h.j], ease(h.t)), (now - last) / 1000);
      last = now;
      if (h.cycle !== lastCycle) { lastCycle = h.cycle; onCycle?.(h.cycle); }
      const step = h.t > 0.5 ? h.j : h.i;
      if (step !== lastStep) { lastStep = step; onStep?.(step); }
      timer = setTimeout(tick, FRAME_MS);
    };
    timer = setTimeout(tick, 0);
  }

  function stop() { if (timer) clearTimeout(timer); timer = null; }
  function setCamera(name) { cameraName = name; frameCamera(); if (!timer) render(); }
  function setMirror(on) { renderer.domElement.style.transform = on ? 'scaleX(-1)' : ''; }
  function setTheme(name) {
    const t = THEMES[name] ?? THEMES.day;
    scene.background = new THREE.Color(t.bg); floor.material.color.setHex(t.floor);
    hemi.intensity = 0.9 * t.light; sun.intensity = 0.8 * t.light;
    if (!timer) render();
  }
  function dispose() { stop(); renderer.dispose(); container.innerHTML = ''; }

  setTheme('day');
  globalThis.addEventListener?.('resize', resize);
  return { setModel, show, setCamera, setMirror, setTheme, stop, dispose, get rig() { return rig; } };
}
