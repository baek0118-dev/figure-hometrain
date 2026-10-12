// 3D 모델 목록과 읽기 — 설계 메모 2026-10-12 §2·§4.5. 못 읽으면 인형으로 대체(페이지가 멈추지 않게).
import * as THREE from 'three';
import { createMannequin } from './mannequin.js';
import { guessBoneMap } from './rig.js';

const url = p => new URL(p, import.meta.url).href;

export const MODELS = {
  doll: { label: '인형(임시)', kind: 'code' },
  human: { label: '사람형', kind: 'gltf', url: url('../../../assets/models/human.glb'), hair: url('../../../assets/models/human-hair.glb'),
    // 무료판 몸은 속옷 차림 어른 체형 → 연습복을 칠하고, 머리를 키우고 키를 140cm 로(아이 비율에 가깝게)
    dress: ['Superhero_Female'], headScale: 1.15, height: 1.4 },
  vroid: { label: '캐릭터형', kind: 'vrm', url: url('../../../assets/models/yuha.vrm') },
};

// 브라우저 기본 읽기(테스트에서는 loaders 로 바꿔 끼운다)
const defaultLoaders = {
  async gltf(u) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    return new GLTFLoader().loadAsync(u);
  },
  async vrm(u) {
    const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('@pixiv/three-vrm')]);
    const loader = new GLTFLoader();
    loader.register(p => new VRMLoaderPlugin(p));
    const gltf = await loader.loadAsync(u);
    const vrm = gltf.userData.vrm;
    VRMUtils.rotateVRM0(vrm); // VRM 0.x 는 뒤(-Z)를 봄 → 정면 +Z 로
    return { scene: vrm.scene, vrm };
  },
};

// 연습복 색 — 뼈 이름(UE 방식)으로 부위를 나눈다. 좌우 신발은 오른쪽 주황·왼쪽 초록(설계 메모 §4.3).
export const OUTFIT = { leotard: 0xd4537e, leggings: 0x3c3489, skin: 0xe9b99b, shoeR: 0xd85a30, shoeL: 0x1d9e75, hair: 0x3a2a22 };
export function outfitColor(bone) {
  const b = bone.toLowerCase();
  if (/^(foot|ball)/.test(b)) return b.endsWith('_l') ? OUTFIT.shoeL : OUTFIT.shoeR;
  if (/^calf/.test(b)) return OUTFIT.leggings;
  if (/^(pelvis|spine|thigh|upperarm|clavicle|root)/.test(b)) return OUTFIT.leotard;
  return OUTFIT.skin;
}

// 이름이 names 에 든 스킨 메시의 텍스처를 버리고, 꼭짓점마다 가장 많이 묶인 뼈의 연습복 색을 칠한다(툰 재질).
export function dressUp(root, names) {
  const meshes = [];
  root.traverse(o => { if (o.isSkinnedMesh && names.includes(o.name)) meshes.push(o); });
  for (const o of meshes) {
    const g = o.geometry, idx = g.getAttribute('skinIndex'), w = g.getAttribute('skinWeight');
    const colors = new Float32Array(idx.count * 3);
    const cache = new Map();
    const c = new THREE.Color();
    for (let i = 0; i < idx.count; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const wk = w.getComponent(i, k); if (wk > bw) { bw = wk; best = idx.getComponent(i, k); } }
      const name = o.skeleton.bones[best]?.name ?? '';
      if (!cache.has(name)) cache.set(name, outfitColor(name));
      c.setHex(cache.get(name));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    o.material = new THREE.MeshToonMaterial({ vertexColors: true });
  }
}

// 나머지 재질도 툰으로(텍스처는 유지)
function toonify(root, skip) {
  root.traverse(o => {
    if (!o.isMesh || skip.includes(o.name)) return;
    const m = o.material;
    // 머리카락·눈썹은 진한 갈색 한 가지 색(텍스처가 회색이라 2m 에서 머리가 흐려 보임)
    if (/^(hair|eyebrow)/i.test(o.name)) { o.material = new THREE.MeshToonMaterial({ color: OUTFIT.hair }); return; }
    o.material = new THREE.MeshToonMaterial({ map: m.map ?? null, color: m.color ?? 0xffffff, transparent: m.transparent, alphaTest: m.alphaTest });
  });
}

// 따로 받은 머리카락(같은 이름의 뼈대로 스키닝됨)을 몸의 뼈에 다시 묶어 몸 장면에 붙인다
async function attachHair(root, byName, hair) {
  const { Skeleton } = await import('three');
  const meshes = [];
  hair.scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const o of meshes) {
    const bones = o.skeleton.bones.map(b => byName.get(b.name) ?? b);
    o.bind(new Skeleton(bones, o.skeleton.boneInverses), o.bindMatrix);
    root.add(o);
  }
}

const doll = (message) => ({ ...createMannequin(), fallback: !!message, message });

// 한 번 읽은 모델은 다시 쓴다(다시 해석하면 텍스처가 새로 생겨 아이패드 메모리가 쌓임)
const cache = new Map();
export const clearModelCache = () => cache.clear();
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function loadModel(id, { loaders = defaultLoaders, timeoutMs = 15000 } = {}) {
  const m = MODELS[id];
  if (!m || m.kind === 'code') return doll();
  if (cache.has(id)) return cache.get(id);
  try {
    const got = await withTimeout(readModel(m, loaders), timeoutMs);
    if (!got.fallback) cache.set(id, got);
    return got;
  } catch (e) {
    if (e.message === 'timeout') return doll(`${m.label} 모델을 읽는 데 너무 오래 걸려요 — 인형으로 보여 줘요`);
    return doll(m.kind === 'vrm' ? `${m.label}은 준비 중이에요(가족이 만든 캐릭터를 넣으면 보여요)` : `${m.label} 모델을 못 읽었어요(${e.message})`);
  }
}

async function readModel(m, loaders) {
  if (m.kind === 'vrm') {
    const { scene, vrm } = await loaders.vrm(m.url);
    return { root: scene, boneOf: n => vrm.humanoid.getNormalizedBoneNode(n) ?? null, update: dt => vrm.update(dt), fallback: false };
  }
  const gltf = await loaders.gltf(m.url);
  const names = [];
  gltf.scene.traverse(o => { if (o.isBone || o.type === 'Bone') names.push(o.name); });
  const { map, missing } = guessBoneMap(names);
  if (missing.length) return doll(`${m.label} 모델의 뼈를 못 찾았어요: ${missing.join(', ')}`);
  const byName = new Map();
  gltf.scene.traverse(o => { if (o.name) byName.set(o.name, o); });
  if (m.hair) await attachHair(gltf.scene, byName, await loaders.gltf(m.hair));
  if (m.dress) { dressUp(gltf.scene, m.dress); toonify(gltf.scene, m.dress); }
  if (m.headScale) byName.get(map.head)?.scale.multiplyScalar(m.headScale);
  if (m.height) {
    const box = new THREE.Box3().setFromObject(gltf.scene, true);
    gltf.scene.scale.multiplyScalar(m.height / (box.max.y - box.min.y));
  }
  return { root: gltf.scene, boneOf: n => byName.get(map[n]) ?? null, fallback: false };
}
