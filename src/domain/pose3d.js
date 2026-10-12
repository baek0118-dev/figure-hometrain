// 3D 동작 자료 — 설계 메모 2026-10-12 §4.1. 캐릭터와 무관한 '몸 부위 방향' 자료와 순수 계산.
// 좌표: +Y 위, 캐릭터 정면 +Z, 캐릭터 오른쪽 = -X. 각도(도)는 2D 스틱맨처럼 절대각(부모와 무관).
//  팔다리 [fwd, out]: 0,0 = 아래. fwd + = 앞으로 들어 올림, out + = 몸 바깥(옆)으로 벌림(음수 = 몸 안쪽으로).
//  torso { fwd, side, twist }: 0 = 곧게 위. fwd + = 앞으로 숙임, side + = 오른쪽으로 기울임, twist + = 가슴을 왼쪽으로 돌림.
//  head { fwd, turn }: fwd + = 고개 숙임(절대각), turn + = 왼쪽을 봄.
//  yaw: 몸 전체 방향, 위에서 봐서 반시계 + (= 왼쪽으로 돎). air: 띄움(키에 대한 비율). anchor: 바닥에서 고정할 곳.

const rad = d => (d * Math.PI) / 180;
const rotX = ([x, y, z], d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [x, y * c - z * s, y * s + z * c]; };
const rotY = ([x, y, z], d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [x * c + z * s, y, -x * s + z * c]; };
const rotZ = ([x, y, z], d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [x * c - y * s, x * s + y * c, z]; };

export function limbDir([fwd, out], side) {
  const sx = side === 'R' ? -1 : 1;
  const f = rad(fwd), o = rad(out);
  return [sx * Math.cos(f) * Math.sin(o), -Math.cos(f) * Math.cos(o), Math.sin(f)];
}

const frame = T => ({ up: T([0, 1, 0]), fwd: T([0, 0, 1]) });

export function poseDirs(p) {
  const yaw = p.yaw ?? 0;
  const W = v => rotY(v, yaw);
  const { fwd = 0, side = 0, twist = 0 } = p.torso ?? {};
  const head = p.head ?? {};
  const limb = (s, key, parts) => Object.fromEntries(parts.map(k => [k, W(limbDir(p[key][k], s))]));
  return {
    hips: frame(v => W(rotZ(rotX(v, fwd), side))),
    chest: frame(v => W(rotZ(rotX(rotY(v, twist), fwd), side))),
    head: frame(v => W(rotX(rotY(v, head.turn ?? 0), head.fwd ?? fwd))),
    armR: limb('R', 'armR', ['upper', 'fore']),
    armL: limb('L', 'armL', ['upper', 'fore']),
    legR: limb('R', 'legR', ['thigh', 'shin', 'foot']),
    legL: limb('L', 'legL', ['thigh', 'shin', 'foot']),
  };
}

export const STAND3 = {
  yaw: 0, air: 0, anchor: 'hips',
  torso: { fwd: 0, side: 0, twist: 0 }, head: { fwd: 0, turn: 0 },
  armR: { upper: [4, 8], fore: [8, 8] }, armL: { upper: [4, 8], fore: [8, 8] },
  legR: { thigh: [0, 3], shin: [0, 3], foot: [90, 0] }, legL: { thigh: [0, 3], shin: [0, 3], foot: [90, 0] },
};

// 2D 스틱맨 포즈(kinematics.js 규칙) → 3D. 키 180px(허벅지44+정강이42+몸통60+목8+머리26) 기준으로 air 를 비율로.
const BODY_PX = 180;
const ANCHOR = { ankleR: 'footR', ankleL: 'footL', hip: 'hips', center: 'hips' };
// 2D 발끝 각도는 90 = 앞으로 수평. 90 보다 크면 2D 에서는 발끝이 위로 들리지만 뜻은 '까치발·포인트'라서 아래쪽으로 뒤집는다.
const footFwd = a => (a == null ? 90 : a > 90 && a <= 180 ? 180 - a : a);

export function fromPose2d(p) {
  const base = { yaw: 0, air: (p.air ?? 0) / BODY_PX, anchor: ANCHOR[p.anchor] ?? 'hips' };
  if (p.view === 'front') {
    // 앞모습: 화면 오른쪽(R) = 캐릭터 왼쪽. 각도 + = 화면 오른쪽.
    const outOf = (v, screenRight) => (screenRight ? v : -v);
    const arm = (a, sr) => ({ upper: [0, outOf(a[0], sr)], fore: [0, outOf(a[1], sr)] });
    const leg = (l, sr) => ({ thigh: [0, outOf(l[0], sr)], shin: [0, outOf(l[1], sr)], foot: [90, 0] });
    return {
      ...base,
      torso: { fwd: 0, side: -(p.torso ?? 0), twist: 0 }, head: { fwd: 0, turn: 0 },
      armL: arm(p.armR, true), armR: arm(p.armL, false),
      legL: leg(p.legR, true), legR: leg(p.legL, false),
    };
  }
  const arm = a => ({ upper: [a[0], 0], fore: [a[1], 0] });
  const leg = l => ({ thigh: [l[0], 0], shin: [l[1], 0], foot: [footFwd(l[2]), 0] });
  return {
    ...base,
    torso: { fwd: p.torso ?? 0, side: 0, twist: 0 }, head: { fwd: p.head ?? p.torso ?? 0, turn: 0 },
    armR: arm(p.armR), armL: arm(p.armL), legR: leg(p.legR), legL: leg(p.legL),
  };
}

function lerpAny(a, b, t) {
  if (typeof a === 'number') return a + ((b ?? a) - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => lerpAny(v, b?.[i], t));
  if (a && typeof a === 'object') return Object.fromEntries(Object.keys(a).map(k => [k, lerpAny(a[k], b?.[k], t)]));
  return a;
}
export const lerpPose3 = (a, b, t) => ({ ...lerpAny(a, b, t), anchor: a.anchor });

export const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// 곡선 잇기(캣멀-롬): 장면 위치는 그대로 지나가되 장면에서 멈추지 않고 속도가 이어진다(보통 속도용).
// 앞뒤 이웃 장면: wrap 은 돌아가며, restart 는 끝에서 같은 장면을 한 번 더 쓴다. air 는 0 아래로 내려가지 않게.
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
function splineAny(a, b, c, d, t) {
  if (typeof b === 'number') return cr(a ?? b, b, c ?? b, d ?? c ?? b, t);
  if (Array.isArray(b)) return b.map((v, k) => splineAny(a?.[k], v, c?.[k], d?.[k], t));
  if (b && typeof b === 'object') return Object.fromEntries(Object.keys(b).map(k => [k, splineAny(a?.[k], b[k], c?.[k], d?.[k], t)]));
  return b;
}
export function splinePose3(frames, i, j, t, loop = 'wrap') {
  const n = frames.length;
  const prev = loop === 'wrap' ? (i - 1 + n) % n : Math.max(0, i - 1);
  const next = loop === 'wrap' ? (j + 1) % n : Math.min(n - 1, j + 1);
  const p = splineAny(frames[prev], frames[i], frames[j], frames[next], t);
  return { ...p, anchor: frames[i].anchor, air: Math.max(0, p.air ?? 0) };
}

// 재생 배수(사용자 결정 2026-10-12): 동작 자료는 실제 사람 박자, 기본은 실제의 1/2 속도(시간 2배), 느리게는 1/4 속도(시간 4배).
// 멈춤 없이 같은 곡선을 천천히 지나간다.
export const BASE_FACTOR = 2;
export const SLOW_FACTOR = 4;

// 지금 몇 번째 장면 사이인지. wrap: 마지막→처음으로 이어 움직임. restart: 마지막 장면에서 그 구간만큼 멈춘 뒤 처음으로 순간 이동.
// durations[i] = 장면 i 에서 다음 장면까지 걸리는 시간(없으면 모두 stepMs). 한 바퀴 = cycle 1 증가 → 횟수 동작의 1회.
export function playhead(elapsedMs, n, stepMs, { slow = 1, loop = 'wrap', durations } = {}) {
  const d = (durations ?? Array(n).fill(stepMs)).map(x => x * slow);
  const total = d.reduce((a, b) => a + b, 0);
  const cycle = Math.floor(elapsedMs / total);
  let r = elapsedMs - cycle * total, i = 0;
  while (i < n - 1 && r >= d[i]) { r -= d[i]; i++; }
  if (loop === 'restart' && i === n - 1) return { i, j: i, t: 0, cycle };
  return { i, j: (i + 1) % n, t: r / d[i], cycle };
}
