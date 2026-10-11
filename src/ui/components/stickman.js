// 스틱맨 SVG — 설계 §7. 먼 쪽 팔다리는 흐리게, 가까운 쪽은 진하게. 키프레임 사이를 각도로 보간해 움직인다.
import { placed, lerpPose, FLOOR, VIEW } from '../../domain/kinematics.js';
import { POSES, framesOf, propsOf } from '../../data/poses.js';

const W_NEAR = 10, W_FAR = 8;

const line = (a, b, cls) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" class="${cls}"/>`;
const limb = (pts, cls) => pts.slice(1).map((p, i) => line(pts[i], p, cls)).join('');

function propsSvg(props, j) {
  const out = [];
  for (const pr of props) {
    if (pr === 'wall') {
      const x = Math.min(VIEW - 6, Math.max(j.handR[0], j.handL[0]) + 6);
      out.push(`<line x1="${x}" y1="40" x2="${x}" y2="${FLOOR}" class="sm-prop" stroke-dasharray="6 6"/>`);
    } else if (pr === 'bench') {
      const x = j.ankleR[0], y = j.ankleR[1] + 4;
      out.push(`<rect x="${x - 26}" y="${y}" width="52" height="${FLOOR - y}" rx="4" class="sm-prop-fill"/>`);
    } else if (pr === 'rope') {
      const top = j.head[1] - 22, mid = (top + FLOOR) / 2;
      out.push(`<ellipse cx="${j.hip[0]}" cy="${mid}" rx="62" ry="${(FLOOR - top) / 2 + 4}" class="sm-prop" stroke-dasharray="4 7"/>`);
    } else if (pr === 'pad') {
      out.push(`<ellipse cx="${j.ankleR[0] + 6}" cy="${FLOOR + 3}" rx="24" ry="5" class="sm-prop-fill"/>`);
    } else if (pr === 'tramp') {
      out.push(`<rect x="40" y="${FLOOR + 1}" width="160" height="7" rx="3" class="sm-prop-fill"/>`);
    } else if (pr === 'spin') {
      const cx = j.hip[0], cy = (j.hip[1] + j.neck[1]) / 2;
      out.push(`<path d="M ${cx - 34} ${cy} A 34 12 0 1 0 ${cx + 30} ${cy - 6}" class="sm-spin"/><path d="M ${cx + 30} ${cy - 6} l -9 -3 l 3 9 z" class="sm-spin-head"/>`);
    }
  }
  return out.join('');
}

export function poseSvg(pose, props = []) {
  const j = placed(pose);
  const front = pose.view === 'front';
  const far = front ? 'sm-near' : 'sm-far';
  return `
    <line x1="8" y1="${FLOOR + 2}" x2="${VIEW - 8}" y2="${FLOOR + 2}" class="sm-floor"/>
    ${propsSvg(props, j)}
    ${limb([j.hip, j.kneeL, j.ankleL, j.toeL], far)}
    ${limb([j.neck, j.elbowL, j.handL], far)}
    ${line(j.hip, j.neck, 'sm-near')}
    ${limb([j.hip, j.kneeR, j.ankleR, j.toeR], 'sm-near')}
    ${limb([j.neck, j.elbowR, j.handR], 'sm-near')}
    <circle cx="${j.head[0].toFixed(1)}" cy="${j.head[1].toFixed(1)}" r="13" class="sm-head"/>`;
}

export const STICKMAN_CSS = `
  .sm-near { stroke: var(--text); stroke-width: ${W_NEAR}; stroke-linecap: round; }
  .sm-far { stroke: var(--muted); stroke-width: ${W_FAR}; stroke-linecap: round; opacity: .55; }
  .sm-head { fill: none; stroke: var(--text); stroke-width: 8; }
  .sm-floor { stroke: var(--line); stroke-width: 4; stroke-linecap: round; }
  .sm-prop { fill: none; stroke: var(--muted); stroke-width: 4; }
  .sm-prop-fill { fill: var(--surface2); stroke: var(--muted); stroke-width: 3; }
  .sm-spin { fill: none; stroke: var(--accent); stroke-width: 4; }
  .sm-spin-head { fill: var(--accent); }`;

// rAF 대신 타이머(약 30fps): 카톡 등 앱 안 브라우저·절전 모드에서 rAF 가 멈추는 경우 대비 (플레이어와 같은 이유)
const FRAME_MS = 33;

const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// container 에 svg 를 만들고 움직인다. 화면을 떠나면 stop() 으로 멈춘다.
export function createStickman(container, { reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches } = {}) {
  let raf = null;
  let current = null;
  container.innerHTML = `<svg viewBox="0 0 ${VIEW} ${VIEW}" class="w-full h-full" role="img" aria-label="동작 그림"></svg>`;
  const svg = container.firstElementChild;

  function draw(pose, props) { svg.innerHTML = poseSvg(pose, props); }

  // opts: still(멈춘 그림만) · slow(느리게 배수, 각 단계 자세에서 잠깐 멈춤) · onStep(i)(지금 단계)
  function show(poseId, { still = false, slow = 1, onStep } = {}) {
    stop();
    current = POSES[poseId];
    if (!current) { svg.innerHTML = ''; return; }
    const frames = framesOf(current);
    const props = propsOf(current);
    draw(frames[0], props);
    onStep?.(0);
    if (frames.length < 2 || reduceMotion || still) return;
    const ms = (current.ms ?? 700) * slow;
    const hold = slow > 1 ? 0.4 : 0;   // 느리게 볼 땐 각 자세에서 40% 동안 멈춤
    const t0 = performance.now();
    let lastStep = 0;
    const loop = () => {
      const now = performance.now();
      const pos = ((now - t0) / ms) % frames.length;
      const i = Math.floor(pos);
      const a = frames[i], b = frames[(i + 1) % frames.length];
      const t = Math.max(0, (pos - i - hold) / (1 - hold));
      draw(lerpPose(a, b, ease(t)), props);
      const step = t > 0.5 ? (i + 1) % frames.length : i;
      if (step !== lastStep) { lastStep = step; onStep?.(step); }
      raf = setTimeout(loop, FRAME_MS);
    };
    raf = setTimeout(loop, 0);
  }

  function stop() { if (raf) clearTimeout(raf); raf = null; }

  return { show, stop, svg };
}
