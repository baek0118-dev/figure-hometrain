// 동작 그림 — 플레이어의 주인공(설계 메모 2026-10-12-app-flow-ui-design §2.2).
// 영상에서 뽑은 동작(1순위, 설계 2026-10-25 §10)이나 손으로 다듬은 3D 동작이 있으면 3D 인형(mannequin), 아니면·3D 를 못 그리는 기기면 2D 스틱맨을 같은 자리에.
// 3D 모듈은 동적 import(import map·WebGL 실패 때 2D 로 가기 위해). src/ui/three/* 는 읽어 쓰기만(그래픽 세션 몫).
import { motion3dFor } from '../../data/motions3d.js';
import { videoMotionFor } from '../../data/motions-video.js';
import { createStickman } from './stickman.js';

// 인형이 보여 줄 동작: 영상에서 뽑은 것 → 손으로 다듬은 것. 자동 변환 초안은 null(2D 로).
export function figureMotion(poseId) {
  const hand = motion3dFor(poseId);
  return videoMotionFor(poseId) ?? (hand?.source === 'hand' ? hand : null);
}
export const has3d = poseId => !!figureMotion(poseId);
export const viewerTheme = t => ({ night: 'night', outdoor: 'sun' })[t] ?? 'day';

let libP = null;
const load3d = () => (libP ??= Promise.all([import('../three/viewer.js'), import('../three/mannequin.js')])
  .then(([v, m]) => ({ createViewer: v.createViewer, createMannequin: m.createMannequin })));

export function createFigure(box, { onFallback } = {}) {
  box.innerHTML = '<div data-fig="3d" class="absolute inset-0 hidden"></div><div data-fig="2d" class="absolute inset-0 hidden flex items-center justify-center"><div class="w-full h-full max-w-[520px] p-2"></div></div>';
  const el3 = box.querySelector('[data-fig="3d"]');
  const el2 = box.querySelector('[data-fig="2d"]');
  const stick = createStickman(el2.firstElementChild);
  let viewer = null, broken = false, token = 0, theme = 'day', mode = null;

  async function getViewer() {
    if (viewer || broken) return viewer;
    try {
      const { createViewer, createMannequin } = await load3d();
      el3.classList.remove('hidden'); // 크기를 재야 해서 먼저 보이게
      viewer = createViewer(el3);
      viewer.setModel(createMannequin());
      viewer.setTheme(viewerTheme(theme));
    } catch (e) {
      broken = true;
      el3.classList.add('hidden');
      onFallback?.(e);
    }
    return viewer;
  }

  function show2d(ex, { factor }) {
    viewer?.stop();
    el3.classList.add('hidden');
    el2.classList.remove('hidden');
    mode = '2d';
    stick.show(ex.poseId, { slow: factor });
  }

  // factor = 시간 배수(1 = 실제 박자). onCycle(n) = 3D 인형이 n 바퀴째(횟수 세기) — 2D 에서는 부르지 않는다.
  async function show(ex, { factor = 2, onCycle } = {}) {
    const my = ++token;
    if (!has3d(ex.poseId)) { show2d(ex, { factor }); return mode; }
    stick.stop();
    const v = await getViewer();
    if (my !== token) return mode; // 그사이 다른 동작으로 바뀜
    if (!v) { show2d(ex, { factor }); return mode; }
    el2.classList.add('hidden');
    el3.classList.remove('hidden');
    mode = '3d';
    const motion = figureMotion(ex.poseId);
    v.setCamera(motion.camera ?? 'side');
    v.show(motion, { slow: factor, onCycle });
    return mode;
  }

  function stop() { token++; stick.stop(); viewer?.stop(); }
  function setTheme(t) { theme = t; viewer?.setTheme(viewerTheme(t)); }

  return { show, stop, setTheme, mode: () => mode, will3d: ex => has3d(ex.poseId) && !broken };
}
