// 코드로 만든 3D 인형 — 시험판의 기본 모습(사용자 결정 2026-10-12: 사람형보다 몰입감이 낫다). 쉬는 자세 = T 자세.
// 좌표: +Y 위, 정면 +Z, 캐릭터 오른쪽 = -X. 뼈 이름은 rig.js 의 BONES(VRM 이름).
import * as THREE from 'three';

const SKIN = 0xf5c4b3, BODY = 0xd4537e, HAIR = 0x444441, SHOE_R = 0xd85a30, SHOE_L = 0x1d9e75;

export function createMannequin({ height = 1.4 } = {}) {
  const k = height / 1.4;
  const root = new THREE.Group();
  const bones = {};
  const bone = (name, parent, [x, y, z]) => {
    const b = new THREE.Bone(); b.name = name; b.position.set(x * k, y * k, z * k);
    (parent ? bones[parent] : root).add(b); bones[name] = b; return b;
  };
  const mat = c => new THREE.MeshToonMaterial({ color: c });
  // 뼈 b 에서 자식 방향(dir, 길이 len)으로 원통
  const seg = (b, [dx, dy, dz], r, c) => {
    const v = new THREE.Vector3(dx, dy, dz).multiplyScalar(k);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * k * 0.85, r * k, v.length(), 14), mat(c));
    m.position.copy(v.clone().multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    b.add(m);
    const j = new THREE.Mesh(new THREE.SphereGeometry(r * k * 1.05, 14, 10), mat(c)); b.add(j);
  };

  bone('hips', null, [0, 0.78, 0]);
  bone('spine', 'hips', [0, 0.1, 0]);
  bone('chest', 'spine', [0, 0.14, 0]);
  bone('neck', 'chest', [0, 0.16, 0]);
  bone('head', 'neck', [0, 0.05, 0]);
  for (const [s, sx] of [['right', -1], ['left', 1]]) {
    bone(`${s}UpperArm`, 'chest', [sx * 0.16, 0.13, 0]);
    bone(`${s}LowerArm`, `${s}UpperArm`, [sx * 0.24, 0, 0]);
    bone(`${s}Hand`, `${s}LowerArm`, [sx * 0.22, 0, 0]);
    bone(`${s}UpperLeg`, 'hips', [sx * 0.08, -0.03, 0]);
    bone(`${s}LowerLeg`, `${s}UpperLeg`, [0, -0.36, 0]);
    bone(`${s}Foot`, `${s}LowerLeg`, [0, -0.35, 0]);
    bone(`${s}Toes`, `${s}Foot`, [0, -0.03, 0.13]);
    seg(bones[`${s}UpperArm`], [sx * 0.24, 0, 0], 0.035, BODY);
    seg(bones[`${s}LowerArm`], [sx * 0.22, 0, 0], 0.03, SKIN);
    seg(bones[`${s}UpperLeg`], [0, -0.36, 0], 0.05, BODY);
    seg(bones[`${s}LowerLeg`], [0, -0.35, 0], 0.04, SKIN);
    // 신발: 작게(발이 커 보인다는 의견 2026-10-12), 좌우 색 = 오른발 주황·왼발 초록(발목 공 대신)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.055 * k, 0.04 * k, 0.12 * k), mat(s === 'right' ? SHOE_R : SHOE_L));
    foot.position.set(0, -0.02 * k, 0.035 * k); bones[`${s}Foot`].add(foot);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035 * k, 12, 10), mat(SKIN)); bones[`${s}Hand`].add(hand);
  }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * k, 0.14 * k, 0.4 * k, 18), mat(BODY));
  torso.position.y = 0.12 * k; bones.spine.add(torso);
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.12 * k, 18, 12), mat(BODY)); hip.scale.set(1.2, 0.8, 0.9); bones.hips.add(hip);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1 * k, 20, 16), mat(SKIN)); head.position.y = 0.08 * k; bones.head.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.105 * k, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(HAIR));
  hair.position.y = 0.09 * k; hair.rotation.x = -0.4; bones.head.add(hair);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045 * k, 14, 10), mat(HAIR)); bun.position.set(0, 0.15 * k, -0.09 * k); bones.head.add(bun);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016 * k, 10, 8), mat(SKIN)); nose.position.set(0, 0.07 * k, 0.1 * k); bones.head.add(nose);
  return { root, boneOf: n => bones[n] ?? null };
}
