// 스틱맨 순운동학 — 설계 §7. 관절 각도(도) → 관절 좌표. SVG 좌표(아래가 +y), 옆모습은 오른쪽(+x)을 봄.
// 각도: 몸통·머리는 0 = 위, 팔·다리는 0 = 아래. + 는 앞(+x) 쪽으로 돌아감. 모두 절대각(부모와 무관).
// pose = { view:'side'|'front', torso, head, armR:[위팔, 아래팔], armL, legR:[허벅지, 정강이, 발], legL, air?, anchor? }
//  - side: R = 가까운 쪽(진하게), L = 먼 쪽(흐리게). front: R = 화면 오른쪽.

export const SEG = { torso: 60, neck: 8, headR: 13, upper: 32, fore: 30, thigh: 44, shin: 42, foot: 14 };
export const VIEW = 240;
export const FLOOR = 214;
export const CENTER_X = 120;

const rad = d => (d * Math.PI) / 180;
const down = (p, a, len) => [p[0] + len * Math.sin(rad(a)), p[1] + len * Math.cos(rad(a))];
const up = (p, a, len) => [p[0] + len * Math.sin(rad(a)), p[1] - len * Math.cos(rad(a))];

export function joints(pose) {
  const hip = [0, 0];
  const neck = up(hip, pose.torso, SEG.torso);
  const head = up(neck, pose.head ?? pose.torso, SEG.neck + SEG.headR);
  const out = { hip, neck, head };
  for (const s of ['R', 'L']) {
    const [ua, fa] = pose[`arm${s}`];
    const elbow = down(neck, ua, SEG.upper);
    out[`elbow${s}`] = elbow;
    out[`hand${s}`] = down(elbow, fa, SEG.fore);
    const [ta, sa, fta] = pose[`leg${s}`];
    const knee = down(hip, ta, SEG.thigh);
    const ankle = down(knee, sa, SEG.shin);
    out[`knee${s}`] = knee;
    out[`ankle${s}`] = ankle;
    out[`toe${s}`] = down(ankle, fta ?? 90, SEG.foot);
  }
  return out;
}

// 바닥에 놓기: 머리 빼고 가장 낮은 점이 바닥(air 만큼 띄움), x 는 기준점(anchor)을 가운데로.
// anchor: 'ankleR'(기본, 서 있는 자세) | 'center'(누운 자세 등, 전체 가운데) | 관절 이름
export function placed(pose) {
  const j = joints(pose);
  const pts = Object.entries(j).filter(([k]) => k !== 'head').map(([, p]) => p);
  const maxY = Math.max(...pts.map(p => p[1]), j.head[1] + SEG.headR);
  const dy = FLOOR - (pose.air ?? 0) - maxY;
  let ax;
  const anchor = pose.anchor ?? (pose.view === 'front' ? 'center' : 'ankleR');
  if (anchor === 'center') {
    const xs = Object.values(j).map(p => p[0]);
    ax = (Math.min(...xs) + Math.max(...xs)) / 2;
  } else {
    ax = j[anchor][0];
  }
  const dx = CENTER_X - ax;
  return Object.fromEntries(Object.entries(j).map(([k, p]) => [k, [p[0] + dx, p[1] + dy]]));
}

const lerp = (a, b, t) => a + (b - a) * t;
const ANGLE_KEYS = ['torso', 'head'];
const LIMB_KEYS = ['armR', 'armL', 'legR', 'legL'];

export function lerpPose(a, b, t) {
  const out = { ...a };
  for (const k of ANGLE_KEYS) out[k] = lerp(a[k] ?? 0, b[k] ?? 0, t);
  for (const k of LIMB_KEYS) out[k] = a[k].map((v, i) => lerp(v, b[k][i] ?? v, t));
  out.air = lerp(a.air ?? 0, b.air ?? 0, t);
  return out;
}
