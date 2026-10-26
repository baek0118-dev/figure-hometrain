// 새 사람형 몸(초4 체형, 키 1.4) — 설계 메모 2026-10-25 §4. 파일을 받지 않고 코드로 만든다.
// 10/12 사람형(어른 체형·사실적 얼굴)이 어색했던 것을 피해: 아이 비율, 얼굴은 눈 두 점, 옷은 처음부터 레오타드·레깅스 모양.
// 막대 인형과 달리 팔다리는 굵기가 바뀌는 회전체(허벅지 굵고 무릎 가늘고 종아리 볼록) — 몸 부피·무게 중심이 보이게.
// 뼈 이름·쉬는 자세(T 자세)·좌표는 mannequin.js 와 같다 → rig.js·viewer.js 를 그대로 쓴다.
import * as THREE from 'three';

const SKIN = 0xf5c4b3, TOP = 0xd4537e, LEGGINGS = 0x2f3a62, HAIR = 0x3b3330, EYE = 0x2a2a30, SHOE_R = 0xd85a30, SHOE_L = 0x1d9e75;

// 굵기 표(반지름, 끝 → 끝 다섯 곳)를 부드럽게 이어 회전체로
function profile(radii, len, k, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = t * (radii.length - 1), a = Math.min(radii.length - 2, Math.floor(x)), f = x - a;
    const s = f * f * (3 - 2 * f);
    pts.push(new THREE.Vector2((radii[a] + (radii[a + 1] - radii[a]) * s) * k, t * len));
  }
  pts.unshift(new THREE.Vector2(0, 0)); pts.push(new THREE.Vector2(0, len)); // 끝을 막음
  return new THREE.LatheGeometry(pts, 20);
}

export function createKidBody({ height = 1.4 } = {}) {
  const k = height / 1.4;
  const root = new THREE.Group();
  const bones = {};
  const bone = (name, parent, [x, y, z]) => {
    const b = new THREE.Bone(); b.name = name; b.position.set(x * k, y * k, z * k);
    (parent ? bones[parent] : root).add(b); bones[name] = b; return b;
  };
  const mats = new Map();
  // 부드러운 명암(람버트, 그림자 쪽이 너무 어둡지 않게 자체 빛 30%) — 툰 2단 명암은 굴곡진 몸에서 얼룩처럼 보였다(2026-10-25 화면 확인). 테두리선은 화면(viewer)이 그린다.
  const mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(0.3) })); return mats.get(c); };
  const mesh = (geo, c, parent, pos = [0, 0, 0], scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat(c)); m.position.set(...pos.map(v => v * k)); m.scale.set(...scale); bones[parent].add(m); return m;
  };
  // 뼈 b 에서 v 방향(T 자세 기준)으로 굵기 표대로, 시작 관절에는 같은 굵기 공(굽혀도 끊겨 보이지 않게)
  const limb = (b, v, radii, c) => {
    const dirV = new THREE.Vector3(...v).multiplyScalar(k);
    const m = new THREE.Mesh(profile(radii, dirV.length(), k), mat(c));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirV.clone().normalize());
    bones[b].add(m);
    mesh(new THREE.SphereGeometry(radii[0] * k, 18, 12), c, b);
  };

  bone('hips', null, [0, 0.74, 0]);
  bone('spine', 'hips', [0, 0.08, 0]);
  bone('chest', 'spine', [0, 0.14, 0]);
  bone('neck', 'chest', [0, 0.17, 0]);
  bone('head', 'neck', [0, 0.06, 0]);
  for (const [s, sx] of [['right', -1], ['left', 1]]) {
    bone(`${s}UpperArm`, 'chest', [sx * 0.14, 0.125, 0]);
    bone(`${s}LowerArm`, `${s}UpperArm`, [sx * 0.22, 0, 0]);
    bone(`${s}Hand`, `${s}LowerArm`, [sx * 0.19, 0, 0]);
    bone(`${s}UpperLeg`, 'hips', [sx * 0.075, -0.04, 0]);
    bone(`${s}LowerLeg`, `${s}UpperLeg`, [0, -0.34, 0]);
    bone(`${s}Foot`, `${s}LowerLeg`, [0, -0.32, 0]);
    bone(`${s}Toes`, `${s}Foot`, [0, -0.035, 0.12]);
    // 긴소매 레오타드 팔, 레깅스 다리
    limb(`${s}UpperArm`, [sx * 0.22, 0, 0], [0.038, 0.036, 0.033, 0.03, 0.028], TOP);
    limb(`${s}LowerArm`, [sx * 0.19, 0, 0], [0.033, 0.031, 0.027, 0.022, 0.02], TOP);
    limb(`${s}UpperLeg`, [0, -0.34, 0], [0.07, 0.064, 0.056, 0.048, 0.043], LEGGINGS);
    limb(`${s}LowerLeg`, [0, -0.32, 0], [0.043, 0.047, 0.04, 0.032, 0.027], LEGGINGS);
    // 손: 납작한 공(손바닥 방향 = 아래)
    mesh(new THREE.SphereGeometry(0.036 * k, 14, 10), SKIN, `${s}Hand`, [sx * 0.035, 0, 0], [1.25, 0.6, 0.9]);
    // 운동화: 작게, 둥글게. 오른발 주황·왼발 초록
    const shoe = new THREE.CapsuleGeometry(0.03 * k, 0.1 * k, 6, 12);
    shoe.rotateX(Math.PI / 2);
    mesh(shoe, s === 'right' ? SHOE_R : SHOE_L, `${s}Foot`, [0, -0.03, 0.04], [1.05, 0.8, 1]);
    mesh(new THREE.SphereGeometry(0.03 * k, 12, 8), LEGGINGS, `${s}Foot`); // 발목
  }
  // 몸통: 골반(레깅스)·허리·가슴(레오타드). 앞뒤로 납작하게(0.72)
  const torso = (b, radii, len, y0, c, depth = 0.72) => {
    const m = new THREE.Mesh(profile(radii, len, k), mat(c));
    m.position.y = y0 * k; m.scale.z = depth; bones[b].add(m);
  };
  torso('hips', [0.06, 0.115, 0.128, 0.122, 0.112], 0.16, -0.11, LEGGINGS);
  torso('spine', [0.112, 0.106, 0.104, 0.11, 0.118], 0.16, -0.02, TOP);
  // 가슴: 어깨 높이에서 둥글게 좁아져 목으로(어깨 공을 따로 달면 어깨 뽕처럼 보였음)
  torso('chest', [0.118, 0.126, 0.13, 0.128, 0.11, 0.05], 0.18, -0.02, TOP, 0.68);
  // 목·머리(지름 약 0.2 — 아이 비율로 조금 크게)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * k, 0.034 * k, 0.09 * k, 14), mat(SKIN));
  neck.position.y = 0.03 * k; bones.neck.add(neck);
  mesh(new THREE.SphereGeometry(0.093 * k, 24, 18), SKIN, 'head', [0, 0.09, 0.005], [0.95, 1.1, 1]);
  // 머리카락: 뒤·위를 덮는 모자 + 앞머리 + 번(정면이 어디인지 보이게)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.099 * k, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), mat(HAIR));
  cap.position.set(0, 0.1 * k, -0.006 * k); cap.rotation.x = -0.35; cap.scale.set(0.96, 1.1, 1.04); bones.head.add(cap);
  mesh(new THREE.SphereGeometry(0.05 * k, 14, 10), HAIR, 'head', [0, 0.17, -0.085]);
  // 얼굴: 눈 두 점, 작은 코·귀(따라 하는 아이가 얼굴 방향을 알 수 있을 만큼만)
  for (const ex of [-0.032, 0.032]) mesh(new THREE.SphereGeometry(0.011 * k, 10, 8), EYE, 'head', [ex, 0.095, 0.09], [1, 1.3, 0.6]);
  mesh(new THREE.SphereGeometry(0.012 * k, 10, 8), SKIN, 'head', [0, 0.07, 0.097]);
  for (const ex of [-0.09, 0.09]) mesh(new THREE.SphereGeometry(0.018 * k, 10, 8), SKIN, 'head', [ex, 0.085, 0], [0.5, 1, 0.8]);
  return { root, boneOf: n => bones[n] ?? null };
}
