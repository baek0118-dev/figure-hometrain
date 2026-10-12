// 3D 모델 목록과 읽기 — 설계 메모 2026-10-12 §2·§4.5. 못 읽으면 인형으로 대체(페이지가 멈추지 않게).
import { createMannequin } from './mannequin.js';
import { guessBoneMap } from './rig.js';

const url = p => new URL(p, import.meta.url).href;

export const MODELS = {
  doll: { label: '인형(임시)', kind: 'code' },
  human: { label: '사람형', kind: 'gltf', url: url('../../../assets/models/human.glb') },
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

const doll = (message) => ({ ...createMannequin(), fallback: !!message, message });

export async function loadModel(id, { loaders = defaultLoaders } = {}) {
  const m = MODELS[id];
  if (!m || m.kind === 'code') return doll();
  try {
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
    return { root: gltf.scene, boneOf: n => byName.get(map[n]) ?? null, fallback: false };
  } catch (e) {
    return doll(m.kind === 'vrm' ? `${m.label}은 준비 중이에요(가족이 만든 캐릭터를 넣으면 보여요)` : `${m.label} 모델을 못 읽었어요(${e.message})`);
  }
}
