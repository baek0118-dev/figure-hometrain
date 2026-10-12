// 3D 캐릭터에 동작 자료 입히기 — 설계 메모 2026-10-12 §4.1.
// 모델마다 뼈의 기본 축이 달라도 되게, '쉬는 자세에서 뼈가 가리키던 방향 → 자료의 목표 방향'으로 돌린다.
// 몸통·머리는 위+정면 두 방향으로 전체 자세를, 팔다리는 한 방향(비틀림은 쉬는 자세 그대로)을 맞춘다.
import * as THREE from 'three';
import { poseDirs } from '../../domain/pose3d.js';

export const BONES = ['hips', 'spine', 'chest', 'neck', 'head',
  ...['right', 'left'].flatMap(s => [`${s}UpperArm`, `${s}LowerArm`, `${s}Hand`, `${s}UpperLeg`, `${s}LowerLeg`, `${s}Foot`, `${s}Toes`])];
// [뼈, 방향의 끝 뼈, 목표 고르기]. 끝 뼈가 없으면(발가락) 쉬는 자세 방향 = 앞(+Z).
const SEGS = [
  ['rightUpperArm', 'rightLowerArm', d => d.armR.upper], ['rightLowerArm', 'rightHand', d => d.armR.fore],
  ['leftUpperArm', 'leftLowerArm', d => d.armL.upper], ['leftLowerArm', 'leftHand', d => d.armL.fore],
  ['rightUpperLeg', 'rightLowerLeg', d => d.legR.thigh], ['rightLowerLeg', 'rightFoot', d => d.legR.shin], ['rightFoot', 'rightToes', d => d.legR.foot],
  ['leftUpperLeg', 'leftLowerLeg', d => d.legL.thigh], ['leftLowerLeg', 'leftFoot', d => d.legL.shin], ['leftFoot', 'leftToes', d => d.legL.foot],
];
// [뼈, 쉬는 자세 '위' 방향을 잴 끝 뼈 후보, 목표 고르기]
const FRAMES = [
  ['hips', ['spine', 'chest', 'neck'], d => d.hips], ['spine', ['chest', 'neck'], d => d.chest],
  ['chest', ['neck', 'head'], d => d.chest], ['neck', ['head'], d => d.head], ['head', [], d => d.head],
];

const LOW = [['rightFoot', 'sole'], ['leftFoot', 'sole'], ['rightToes', 0], ['leftToes', 0], ['rightHand', 0], ['leftHand', 0],
  ['rightLowerLeg', 0], ['leftLowerLeg', 0], ['hips', 0], ['chest', 0], ['head', 0]];

const V = a => new THREE.Vector3(...a);
const basis = (up, fwd) => {
  const y = up.clone().normalize();
  const z = fwd.clone().addScaledVector(y, -fwd.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z);
};

export function createRig(root, boneOf) {
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const wq = n => n.getWorldQuaternion(new THREE.Quaternion());
  const wp = n => n.getWorldPosition(new THREE.Vector3());
  const bones = new Map();
  for (const name of BONES) {
    const node = boneOf(name);
    if (node) bones.set(name, { node, local: node.quaternion.clone(), q: wq(node), p: wp(node) });
  }
  const box = new THREE.Box3().setFromObject(root, true); // precise: 회전한 메시도 실제 꼭짓점으로
  const height = box.max.y - box.min.y;
  const footY = Math.min(bones.get('rightFoot').p.y, bones.get('leftFoot').p.y);
  const sole = footY - box.min.y; // 발목 뼈에서 발바닥까지

  const segs = SEGS.filter(([b]) => bones.has(b)).map(([b, end, pick]) => {
    const r = bones.get(b);
    const restDir = bones.has(end) ? bones.get(end).p.clone().sub(r.p).normalize() : new THREE.Vector3(0, 0, 1);
    return { r, restDir, pick };
  });
  const frames = FRAMES.filter(([b]) => bones.has(b)).map(([b, ends, pick]) => {
    const r = bones.get(b);
    const end = ends.find(e => bones.has(e));
    const up = end ? bones.get(end).p.clone().sub(r.p).normalize() : new THREE.Vector3(0, 1, 0);
    return { r, rest: basis(up, new THREE.Vector3(0, 0, 1)), pick };
  });

  const setWorld = (node, q) => {
    const parentQ = node.parent ? node.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    node.quaternion.copy(parentQ.invert().multiply(q));
    node.updateMatrixWorld(true);
  };

  function apply(pose) {
    const d = poseDirs(pose);
    for (const r of bones.values()) r.node.quaternion.copy(r.local);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    for (const f of frames) {
      const t = f.pick(d);
      const rot = new THREE.Matrix4().multiplyMatrices(basis(V(t.up), V(t.fwd)), f.rest.clone().transpose());
      setWorld(f.r.node, new THREE.Quaternion().setFromRotationMatrix(rot).multiply(f.r.q));
    }
    for (const s of segs) {
      const swing = new THREE.Quaternion().setFromUnitVectors(s.restDir, V(s.pick(d)).normalize());
      setWorld(s.r.node, swing.multiply(s.r.q));
    }
    // 바닥 놓기: 발 뼈는 발목에 있으니 발바닥 두께(sole)를 빼고, 나머지는 뼈 위치 그대로. 가장 낮은 곳 = 바닥.
    const minY = Math.min(...LOW.filter(([n]) => bones.has(n)).map(([n, off]) => wp(bones.get(n).node).y - (off === 'sole' ? sole : 0)));
    // 기준점: 골반 / 두 발 가운데 / 한 발 — 이 점의 x·z 를 가운데에 고정(서 있는 발이 미끄러지지 않게)
    const a = pose.anchor === 'feet'
      ? wp(bones.get('rightFoot').node).add(wp(bones.get('leftFoot').node)).multiplyScalar(0.5)
      : wp(bones.get({ footR: 'rightFoot', footL: 'leftFoot' }[pose.anchor] ?? 'hips').node);
    root.position.set(-a.x, -minY + (pose.air ?? 0) * height, -a.z);
    root.updateMatrixWorld(true);
  }

  return { apply, height, sole, bones };
}
