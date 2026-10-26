// 영상에서 뽑은 관절(MediaPipe Pose 33점) → 3D 동작 자료 — 설계 메모 2026-10-25 §3.
// 결과는 리그가 받는 '몸 부위 방향'(pose3d.js poseDirs 와 같은 모양) 그대로라 각도로 바꾸지 않는다(비틀림·대각선 보존).
// 앱 좌표: +Y 위, 캐릭터 정면 +Z, 캐릭터 오른쪽 = -X. MediaPipe 세계 좌표: x 화면 오른쪽, y 아래, z 카메라에서 멀어짐.
// 순수 계산만(브라우저·three 없음) — 뽑기 도구(tools/)와 시험에서 같이 쓴다.

// MediaPipe 이름의 left/right 는 '찍힌 사람의' 왼쪽·오른쪽
export const LM = {
  nose: 0, earL: 7, earR: 8, shoulderL: 11, shoulderR: 12, elbowL: 13, elbowR: 14, wristL: 15, wristR: 16,
  hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankleL: 27, ankleR: 28, heelL: 29, heelR: 30, toeL: 31, toeR: 32,
};

// x축으로 180° 돌림(두 축을 뒤집음 = 거울 아님). 영상 카메라 = 앱의 '앞' 카메라 쪽(+Z).
export const toApp = ([x, y, z]) => [x, -y, -z];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const dir = (from, to) => norm(sub(to, from));
// v 를 축 k(단위 벡터) 둘레로 deg 만큼(오른손 법칙) — 로드리게스
// 길이는 그대로 두는 회전(단위 축 k) — 발목 차이처럼 길이가 뜻 있는 벡터도 돌리므로 정규화하지 않음(코덱스 검토 2026-10-26)
function tilt(v, k, deg) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const kv = cross(k, v), kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  return v.map((x, i) => x * c + kv[i] * s + k[i] * kd * (1 - c));
}

// 뼈대 하나(33점) → 몸 부위 방향. app: true 면 이미 앱 좌표.
// 골반·가슴은 '위'(어깨 가운데 − 엉덩이 가운데)와 '왼쪽'(왼 − 오른)으로 정면 = 왼쪽 × 위. 머리는 코 − 두 귀 가운데가 정면.
export function dirsOf(points, { app = false } = {}) {
  const p = app ? points : points.map(toApp);
  const P = k => p[LM[k]];
  const up = dir(mid(P('hipL'), P('hipR')), mid(P('shoulderL'), P('shoulderR')));
  const frameOf = (u, left) => ({ up: u, fwd: norm(cross(left, u)) });
  // 엉덩이 좌우 폭은 짧고 깊이(z)가 흔들려서 어깨 선과 반씩 섞는다(검토 2026-10-25)
  const hipLeft = norm(sub(P('hipL'), P('hipR'))), shLeft = norm(sub(P('shoulderL'), P('shoulderR')));
  // 머리: '귀 가운데→코'. 코·귀 높이 차이는 사람·모델마다 달라서 levelHead 로 동작 첫머리 기준으로 맞춘다.
  const headLeft = norm(sub(P('earL'), P('earR')));
  const headFwd = dir(mid(P('earL'), P('earR')), P('nose'));
  const headUp = norm(cross(headFwd, headLeft));
  const limb = s => ({
    arm: { upper: dir(P(`shoulder${s}`), P(`elbow${s}`)), fore: dir(P(`elbow${s}`), P(`wrist${s}`)) },
    leg: { thigh: dir(P(`hip${s}`), P(`knee${s}`)), shin: dir(P(`knee${s}`), P(`ankle${s}`)), foot: dir(P(`heel${s}`), P(`toe${s}`)) },
  });
  const R = limb('R'), L = limb('L');
  return {
    hips: frameOf(up, norm(hipLeft.map((v, i) => v + shLeft[i]))),
    chest: frameOf(up, shLeft),
    head: { up: headUp, fwd: headFwd },
    armR: R.arm, armL: L.arm, legR: R.leg, legL: L.leg,
  };
}

// 고개 끄덕임 기준 맞추기: 동작 첫 n 장면에서 '가슴 정면 대비 고개 숙임'의 가운데 값을 0(앞을 봄)으로 본다.
// 귀·코 위치로 잰 고개 각도는 얼굴 생김새만큼 치우쳐 있어서(시험 영상에서 약 20°) 그대로 쓰면 늘 위나 아래를 본다.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const pitchOf = d => (Math.asin(Math.max(-1, Math.min(1, dot(d.head.fwd, d.chest.up)))) * 180) / Math.PI; // + = 위를 봄
export function levelHead(frames, n = 10) {
  const s = frames.slice(0, n).map(pitchOf).sort((a, b) => a - b);
  const off = s[Math.floor(s.length / 2)] ?? 0;
  return frames.map(d => {
    const left = norm(cross(d.head.up, d.head.fwd));
    const fwd = tilt(d.head.fwd, left, off), up = tilt(d.head.up, left, off); // 왼쪽 축 + 회전 = 고개 숙임
    return { ...d, head: { up, fwd } };
  });
}

// 깊이 고치기: MediaPipe 는 카메라 쪽으로 뻗은 팔다리의 깊이(z)를 작게 잡는다(시험 영상에서 팔 25~35° 차이).
// 구간 전체에서 마디 길이(95% 지점)를 그 마디의 진짜 길이로 보고, 짧게 잡힌 장면은 화면 방향(x·y)은 두고 z 만 늘려 길이를 맞춘다(z 부호는 그대로).
const CHAINS = [
  [LM.shoulderL, LM.elbowL, LM.wristL], [LM.shoulderR, LM.elbowR, LM.wristR],
  [LM.hipL, LM.kneeL, LM.ankleL], [LM.hipR, LM.kneeR, LM.ankleR],
];
const FOLLOW = { [LM.ankleL]: [LM.heelL, LM.toeL], [LM.ankleR]: [LM.heelR, LM.toeR], [LM.wristL]: [17, 19, 21], [LM.wristR]: [18, 20, 22] };
export function fixDepth(worlds) {
  const lens = new Map();
  for (const ch of CHAINS) for (let s = 0; s < 2; s++) {
    const ls = worlds.filter(Boolean).map(w => Math.hypot(...sub(w[ch[s + 1]], w[ch[s]])));
    lens.set(`${ch[s]}-${ch[s + 1]}`, pct(ls, 0.95));
  }
  const lastSign = new Map(); // 마디마다 앞 장면에서 고른 깊이 방향
  const move = (p, i, d) => { p[i] = [p[i][0] + d[0], p[i][1] + d[1], p[i][2] + d[2]]; };
  return worlds.map(w => {
    if (!w) return w;
    const p = w.map(v => [...v]);
    for (const ch of CHAINS) for (let s = 0; s < 2; s++) {
      const a = ch[s], b = ch[s + 1], L = lens.get(`${a}-${b}`);
      const v = sub(w[b], w[a]); // 원래 마디(고치기 전)
      const xy = v[0] ** 2 + v[1] ** 2;
      const key = `${a}-${b}`;
      // z 가 0 가까이면 부호도 흔들림이라(검토 2026-10-25) 앞 장면에서 고른 쪽을 따른다
      // 믿을 만한 깊이(|z| ≥ 0.15·L)일 때만 기억한다 — 0 근처 장면으로 기억을 만들면 그 뒤가 거꾸로 꺾임(Codex 리뷰)
      const reliable = Math.abs(v[2]) >= 0.15 * L;
      if (reliable) lastSign.set(key, Math.sign(v[2]));
      const sign = reliable ? Math.sign(v[2]) : (lastSign.get(key) ?? (Math.sign(v[2]) || 1));
      const short = xy + v[2] ** 2 < (0.98 * L) ** 2; // 2% 안쪽은 흔들림으로 보고 그대로
      if (!short || xy >= L * L) continue; // 아래 마디는 위 마디를 옮길 때 같이 옮겨 둠
      const z = sign * Math.sqrt(L * L - xy);
      const nb = [p[a][0] + v[0], p[a][1] + v[1], p[a][2] + z];
      const shift = sub(nb, p[b]);
      p[b] = nb;
      // 옮긴 관절 아래로 달린 점(손끝·뒤꿈치·발끝, 첫 마디면 손목·발목과 그 아래까지)을 같이 옮김
      const below = s === 0 ? [...(FOLLOW[b] ?? []), ch[2], ...(FOLLOW[ch[2]] ?? [])] : (FOLLOW[b] ?? []);
      for (const i of below) move(p, i, shift);
    }
    return p;
  });
}

// 몸 방향: 위에서 봐서 정면(+Z)에서 반시계로 몇 도(pose3d 의 yaw 와 같은 뜻)
export const facingYaw = d => (Math.atan2(d.hips.fwd[0], d.hips.fwd[2]) * 180) / Math.PI;

const mapVecs = (d, f) => Object.fromEntries(Object.entries(d).map(([k, part]) => [k, Object.fromEntries(Object.entries(part).map(([n, v]) => [n, f(v)]))]));

export function rotateDirs(d, deg) {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  return mapVecs(d, ([x, y, z]) => [x * c + z * s, y, -x * s + z * c]);
}

// 똑바로 세우기: MediaPipe 세계 좌표는 카메라 기준이라 카메라가 위·아래로 기울면 몸 전체가 기운다(J03 녹화에서 약 20°).
// 동작 첫 n 장면(서 있는 준비 자세)에서 '두 발목 가운데 → 두 어깨 가운데' 평균 방향이 바로 위(+Y)가 되게 동작 전체를 돌린다.
export function levelUp(worlds, n = 15) {
  const s = [0, 0, 0];
  for (const w of worlds.slice(0, n)) {
    const p = w.map(toApp);
    const u = dir(mid(p[LM.ankleL], p[LM.ankleR]), mid(p[LM.shoulderL], p[LM.shoulderR]));
    for (let i = 0; i < 3; i++) s[i] += u[i];
  }
  const u = norm(s), axis = cross(u, [0, 1, 0]), sin = Math.hypot(...axis);
  if (sin < 1e-6) return d => d;
  const k = norm(axis), deg = (Math.atan2(sin, u[1]) * 180) / Math.PI;
  return d => mapVecs(d, v => tilt(v, k, deg));
}

// 첫 장면이 정면을 보게 동작 전체를 돌린다(카메라 버튼 앞·옆·비스듬히가 캐릭터 기준이 되게)
export const faceFront = frames => { const y0 = facingYaw(frames[0]); return frames.map(d => rotateDirs(d, -y0)); };

// 좌우 뒤집기(거울): X 를 뒤집고 오른쪽 ↔ 왼쪽 자료를 바꾼다. 회전 방향도 반대가 된다.
export function mirrorDirs(d) {
  const m = mapVecs(d, ([x, y, z]) => [-x, y, z]);
  return { ...m, armR: m.armL, armL: m.armR, legR: m.legL, legL: m.legR };
}

// 누적 회전(도, 반시계 +). 장면 사이 180° 넘게 건너뛰지 않는다고 본다.
export function turnOf(frames) {
  let total = 0;
  for (let k = 1; k < frames.length; k++) {
    let dy = facingYaw(frames[k]) - facingYaw(frames[k - 1]);
    dy -= 360 * Math.round(dy / 360);
    total += dy;
  }
  return total;
}

// 점프 높이(키에 대한 비율). image = 장면마다 화면 좌표 33점([x, y], 0~1, y 아래).
// 바닥선 = '가장 낮은 발' 높이의 위쪽 10% 지점(대부분 장면은 땅에 있음), 키 = 귀~발바닥 길이 ÷ 0.93(귀 높이 ≈ 키의 93%).
const FOOT = ['ankleL', 'ankleR', 'heelL', 'heelR', 'toeL', 'toeR'].map(k => LM[k]);
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
// 바닥선은 장면마다 앞뒤 ±1초 창 안의 같은 10% 지점(사람이 천천히 다가오거나 편집 컷으로 위치가 바뀌어도 따라감 — 2026-10-26).
export function airOf(image, { minAir = 0.015, fps = 30 } = {}) {
  const low = image.map(pts => Math.max(...FOOT.map(i => pts[i][1])));
  const top = image.map(pts => Math.min(pts[LM.earL][1], pts[LM.earR][1]));
  const height = pct(low.map((l, k) => l - top[k]), 0.9) / 0.93;
  const w = Math.round(fps);
  return low.map((l, k) => { const a = (pct(low.slice(Math.max(0, k - w), k + w + 1), 0.9) - l) / height; return a < minAir ? 0 : a; });
}

// 점프 높이를 체공 시간으로(카메라가 움직이거나 사람이 다가와도 흔들리지 않음 — 검토 2026-10-25).
// 뜬 구간 [첫 장면, 끝 장면] 마다 앞뒤 한 장면씩 넓혀 체공 시간 T, 높이 = g·t·(T − t)/2 (포물선), 키 height(m) 로 나눔.
const G = 9.8;
export function airFromFlights(n, runs, fps, { height = 1.4 } = {}) {
  const out = Array(n).fill(0);
  for (const [k, e] of runs) {
    const a = k - 1, T = (e + 1 - a) / fps; // a·e+1 = 땅에 있던 마지막·처음 장면
    for (let j = Math.max(0, k); j <= Math.min(n - 1, e); j++) { const t = (j - a) / fps; out[j] = (G * t * (T - t)) / 2 / height; }
  }
  return out;
}
const runsOf = flags => {
  const runs = [];
  for (let k = 0; k < flags.length; k++) {
    if (!flags[k]) continue;
    let e = k; while (e + 1 < flags.length && flags[e + 1]) e++;
    runs.push([k, e]); k = e;
  }
  return runs;
};
// 체공 시간 T 가 maxFlight(초) 를 넘는 구간은 점프가 아니라 사람 위치 변화로 보고 0.
export function flightAir(imageAir, fps, { height = 1.4, maxFlight = 0.55 } = {}) {
  const runs = runsOf(imageAir.map(a => a > 0)).filter(([k, e]) => (e + 2 - k) / fps <= maxFlight);
  return airFromFlights(imageAir.length, runs, fps, { height });
}

// 뜬 구간 찾기(화면 좌표) — 실제 녹화에서 잰 원인(2026-10-26):
//  · 발이 화면 아래로 잘리면(y > 0.98) MediaPipe 가 발 위치를 짐작해 흔들림 → 그런 장면은 판정하지 않음(S05 가짜 점프).
//  · 옆모습에서 발끝·뒤꿈치가 장면마다 키의 2~5% 흔들림 → 4% 넘게, 그리고 골반도 같이 올라가야 점프(J01 잘게 쪼개짐).
//  · 카메라가 따라 움직이면 바닥선이 바뀜 → 바닥선·키는 장면마다 ±1초 창으로.
// 그래도 카메라가 크게 움직이는 영상은 놓칠 수 있어서 motion-from-video 에서 --flights 로 직접 줄 수 있다.
export function flightsOf(image, { fps = 30, minAir = 0.04, liftOff = 0.01, minFlight = 0.15, maxFlight = 0.6 } = {}) {
  const low = image.map(pts => Math.max(...FOOT.map(i => pts[i][1])));
  const top = image.map(pts => Math.min(pts[LM.earL][1], pts[LM.earR][1]));
  const hip = image.map(pts => (pts[LM.hipL][1] + pts[LM.hipR][1]) / 2);
  const ok = low.map(l => l <= 0.98);
  const w = Math.round(fps);
  const win = (xs, k, keep = () => true) => xs.slice(Math.max(0, k - w), k + w + 1).filter((_, j) => keep(Math.max(0, k - w) + j));
  const rise = low.map((l, k) => {
    if (!ok[k]) return 0;
    const floor = pct(win(low, k, j => ok[j]), 0.9);
    const h = pct(win(low.map((x, j) => x - top[j]), k, j => ok[j]), 0.9) / 0.93;
    return (floor - l) / h;
  });
  // minAir(4%)는 점프인지 확인하는 데만 쓰고, 체공 시간은 실제 이륙·착지(발이 키의 1% 아래로 내려온 곳)까지 넓혀서 잼
  // — 4% 넘는 장면만 세면 0.3초 점프가 짧게 잡혀 높이가 반쯤으로 나왔다(코덱스 검토 2026-10-26).
  const grow = ([k, e]) => {
    while (k > 0 && ok[k - 1] && rise[k - 1] > liftOff) k--;
    while (e + 1 < rise.length && ok[e + 1] && rise[e + 1] > liftOff) e++;
    return [k, e];
  };
  return runsOf(rise.map(r => r > minAir)).map(grow).filter(([k, e], i, all) => i === 0 || k > all[i - 1][1]).filter(([k, e]) => {
    const T = (e + 2 - k) / fps;
    if (T < minFlight || T > maxFlight) return false;
    const h = pct(win(low.map((x, j) => x - top[j]), k, j => ok[j]), 0.9) / 0.93;
    const edge = Math.min(hip[Math.max(0, k - 1)], hip[Math.min(hip.length - 1, e + 1)]);
    const peak = Math.min(...hip.slice(k, e + 1));
    const footRise = Math.max(...low.slice(Math.max(0, k - 1), e + 2)) - Math.min(...low.slice(k, e + 1));
    return (edge - peak) > 0.5 * footRise && (edge - peak) / h > minAir / 2; // 골반도 올라감
  });
}

// MediaPipe 가 왼쪽·오른쪽 이름을 바꿔 붙이는 장면 고치기(특히 돌거나 옆모습일 때 — 검토 2026-10-25).
// 팔·다리·머리 묶음마다, 바로 앞 장면과 비교해 좌우를 바꾼 쪽이 확실히(거리² 40% 아래) 더 가까우면 바꾼다. 흔들림 줄이기 전에.
// 기준이 느슨하면(70%) 옆모습을 지날 때 잘못 바꿔 회전이 180° 더 나왔다(시험 영상, 2026-10-25).
const PAIRS = {
  head: [[1, 4], [2, 5], [3, 6], [7, 8], [9, 10]],
  arms: [[11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22]],
  legs: [[23, 24], [25, 26], [27, 28], [29, 30], [31, 32]],
};
const dist2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
export function fixSwaps(frames, { margin = 0.4 } = {}) {
  let prev = null;
  return frames.map(f => {
    if (!f.world) return f;
    let world = f.world.map(v => [...v]), image = f.image?.map(v => [...v]);
    for (const pairs of prev ? Object.values(PAIRS) : []) {
      let same = 0, swapped = 0;
      for (const [l, r] of pairs) {
        same += dist2(world[l], prev.world[l]) + dist2(world[r], prev.world[r]);
        swapped += dist2(world[r], prev.world[l]) + dist2(world[l], prev.world[r]);
      }
      if (swapped < same * margin) {
        for (const [l, r] of pairs) {
          [world[l], world[r]] = [world[r], world[l]];
          if (image) [image[l], image[r]] = [image[r], image[l]];
        }
      }
    }
    // 몸이 어깨와 반대로 90° 넘게 비틀릴 수는 없다 → 엉덩이(다리 묶음)·귀(머리 묶음)의 좌우가 어깨와 반대면 그 묶음을 바꾼다.
    // 어깨 폭이 가장 넓어 가장 믿을 만하다(바로 앞 장면 비교만으로는 돌 때 이름이 통째로 뒤집혀 남는 일이 있었음).
    const sh = sub(world[LM.shoulderL], world[LM.shoulderR]);
    for (const [group, [l, r]] of [['legs', [LM.hipL, LM.hipR]], ['head', [LM.earL, LM.earR]]]) {
      const v = sub(world[l], world[r]);
      // 머리는 스팟팅으로 어깨보다 많이 돌 수 있어 여유(−0.3)를 둔다
      const lim = group === 'head' ? -0.3 * Math.hypot(...v) * Math.hypot(...sh) : 0;
      if (v[0] * sh[0] + v[1] * sh[1] + v[2] * sh[2] < lim) {
        for (const [a, b] of PAIRS[group]) {
          [world[a], world[b]] = [world[b], world[a]];
          if (image) [image[a], image[b]] = [image[b], image[a]];
        }
      }
    }
    prev = { ...f, world, image };
    return prev;
  });
}

// 가우스로 흔들림 줄이기(sigma = 장면 수). 같은 모양의 중첩 숫자 배열이 장면마다 하나.
export function smoothSeries(series, sigma) {
  if (!(sigma > 0)) return series;
  const r = Math.ceil(sigma * 3);
  const w = Array.from({ length: 2 * r + 1 }, (_, k) => Math.exp(-((k - r) ** 2) / (2 * sigma * sigma)));
  const at = (path, k) => path.reduce((v, i) => v[i], series[k]);
  return series.map((frame, k) => {
    const lo = Math.max(0, k - r), hi = Math.min(series.length - 1, k + r);
    const go = (node, path) => {
      if (Array.isArray(node)) return node.map((v, i) => go(v, [...path, i]));
      let s = 0, ws = 0;
      for (let j = lo; j <= hi; j++) { s += w[j - k + r] * at(path, j); ws += w[j - k + r]; }
      return s / ws;
    };
    return go(frame, []);
  });
}

// 장면 수 줄이기(가까운 장면). 흔들림을 먼저 줄이면 계단이 생기지 않는다.
export function resample(items, fromFps, toFps) {
  const n = Math.max(1, Math.round((items.length * toFps) / fromFps));
  return Array.from({ length: n }, (_, k) => items[Math.min(items.length - 1, Math.round((k * fromFps) / toFps))]);
}

export function roundDeep(v, digits = 3) {
  const f = 10 ** digits;
  if (typeof v === 'number') { const r = Math.round(v * f) / f; return Object.is(r, -0) ? 0 : r; }
  if (Array.isArray(v)) return v.map(x => roundDeep(x, digits));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x, digits)]));
  return v;
}

// 뽑은 원자료 → 앱 동작 자료.
// raw = { fps, frames: [{ world: 33×[x,y,z] | null, image: 33×[x,y] | null }] } (뽑기 도구 결과)
// opts: start·end(초), mirror, fps(저장 장면 수, 기본 30 — 회전이 빨라 장면 사이가 너무 벌어지지 않게), sigma(흔들림 줄이기, 원자료 장면 수 기준), camera·anchor·loop
export function buildMotion(raw, opts = {}) {
  const { start = 0, end = Infinity, mirror = false, fps = 30, sigma = 1.5, camera = 'front', anchor = 'feet', loop = 'wrap', bodyHeight = 1.4, flights = null } = opts;
  const a = Math.max(0, Math.round(start * raw.fps)), b = Math.min(raw.frames.length, Math.round(end * raw.fps));
  // 사람을 놓친 장면은 바로 앞(없으면 바로 뒤) 장면으로 메운다
  const seg = raw.frames.slice(a, b);
  const firstOk = seg.findIndex(f => f.world && f.image);
  if (firstOk < 0) throw new Error('구간 안에서 사람을 한 번도 찾지 못했어요');
  const fixed = fixSwaps(seg);
  let prev = fixed[firstOk];
  const filled = fixed.map(f => (f.world && f.image ? (prev = f) : prev));
  const world = smoothSeries(fixDepth(filled.map(f => f.world)), sigma);
  const image = smoothSeries(filled.map(f => f.image), sigma);
  const level = levelUp(world);
  let dirs = levelHead(faceFront(world.map(w => level(dirsOf(w)))));
  if (mirror) dirs = dirs.map(mirrorDirs);
  // 뜬 구간: flights([[시작 초, 끝 초], …], 원자료 시각)를 주면 그대로, 아니면 화면에서 찾음
  const runs = flights
    ? flights.map(([t0, t1]) => [Math.round(t0 * raw.fps) - a, Math.round(t1 * raw.fps) - a]).filter(([k, e]) => e >= 0 && k < image.length)
    : flightsOf(image, { fps: raw.fps });
  const air = airFromFlights(image.length, runs, raw.fps, { height: bodyHeight });
  // 주로 디딘 발: 한 발이 3cm 넘게 더 낮은 장면 수로(세계 좌표 y 는 아래가 +). 뒤집었으면 반대 발.
  let r = 0, l = 0;
  // 바로 세운 뒤의 높이로 센다(카메라가 기울면 앞뒤 깊이 차이가 높이 차이처럼 보임 — 검토 2026-10-26)
  for (const w of world) {
    const v = level({ x: { d: sub(toApp(w[LM.ankleR]), toApp(w[LM.ankleL])) } }).x.d; // 앱 좌표: y 위가 +
    if (v[1] < -0.03) r++; else if (v[1] > 0.03) l++;
  }
  const stance = r === l ? null : (r > l) !== mirror ? 'R' : 'L';
  const picked = resample(dirs.map((d, k) => ({ dirs: d, air: air[k], anchor })), raw.fps, fps);
  return {
    camera, loop, props: [],
    frames: roundDeep(picked, 3),
    durations: picked.map(() => 1000 / fps),
    turn: Math.round(turnOf(picked.map(f => f.dirs))),
    stance, oneFoot: Math.max(r, l) / world.length, // 한 발로 선 장면 비율
    flights: runs.map(([k, e]) => [(k + a) / raw.fps, (e + a) / raw.fps]), // 뜬 구간(원자료 시각, 초)
  };
}
