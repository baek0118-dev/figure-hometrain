// 3D 동작 — 설계 메모 2026-10-12 §4.1·§5. 손으로 다듬은 시험 동작 3개 + 나머지는 2D 포즈 자동 변환(초안).
// 각도 규칙은 domain/pose3d.js. 참고 자료(영상·글)는 note 에 이름만 남기고 앱에는 넣지 않는다.
// 유하: 오른발 착지, 반시계(왼쪽으로) 회전.
import { STAND3, fromPose2d } from '../domain/pose3d.js';
import { POSES, framesOf, propsOf } from './poses.js';

const P = o => ({
  ...STAND3, ...o,
  torso: { ...STAND3.torso, ...o.torso }, head: { ...STAND3.head, ...o.head },
  armR: { ...STAND3.armR, ...o.armR }, armL: { ...STAND3.armL, ...o.armL },
  legR: { ...STAND3.legR, ...o.legR }, legL: { ...STAND3.legL, ...o.legL },
});
// 아래팔이 가슴 앞을 가로지름: fwd 를 90 으로 하면 out 이 효과가 없어서(정면 수평에서 겹침) 25 로 두고 안쪽(-80)으로
const armsChest = { armR: { upper: [35, 25], fore: [25, -80] }, armL: { upper: [35, 25], fore: [25, -80] } };

export const MOTIONS3D = {
  // J03 오프아이스 왈츠 점프: 왼발 앞으로 디디며 출발 → 반 바퀴(반시계) → 오른발 착지, 왼다리 뒤로 쭉
  waltzJump: {
    camera: 'diag', loop: 'restart', ms: 650, props: [],
    note: '참고: iCoachSkating 왈츠 점프 강의 요약(R. Tebby·F. Carroll — 도약 때 팔 앞으로·프리 무릎 들기, 머리 들고 진행 방향, 착지 때 팔 벌려 회전 멈춤), 2026-10-12 확인',
    frames: [
      P({ torso: { fwd: 10 }, armR: { upper: [-40, 15], fore: [-30, 15] }, armL: { upper: [-40, 15], fore: [-30, 15] },
        legL: { thigh: [30, 0], shin: [0, 0], foot: [90, 0] }, legR: { thigh: [-30, 0], shin: [-45, 0], foot: [40, 0] } }),
      P({ yaw: 30, air: 0.05, armR: { upper: [100, 15], fore: [110, 15] }, armL: { upper: [100, 15], fore: [110, 15] },
        legL: { thigh: [-5, 0], shin: [-5, 0], foot: [30, 0] }, legR: { thigh: [70, 0], shin: [40, 0], foot: [60, 0] } }),
      P({ yaw: 110, air: 0.14, ...armsChest,
        legR: { thigh: [5, 0], shin: [0, 0], foot: [30, 0] }, legL: { thigh: [10, -5], shin: [0, -5], foot: [30, 0] } }),
      P({ yaw: 180, torso: { fwd: 15 }, armR: { upper: [20, 80], fore: [20, 85] }, armL: { upper: [20, 80], fore: [20, 85] },
        legR: { thigh: [20, 0], shin: [-15, 0], foot: [90, 0] }, legL: { thigh: [-40, 10], shin: [-40, 10], foot: [-60, 10] } }),
    ],
  },
  // J01 스쿼트 점프: 무릎은 발끝 방향 → 팔 휘둘러 높이 → 무릎 굽혀 사뿐히 착지
  squatJump: {
    camera: 'side', loop: 'wrap', ms: 550, props: [],
    note: '참고: 연습 체크포인트(무릎은 발끝 방향·팔 휘둘러·무릎 굽혀 착지) 그대로, 2026-10-12 확인',
    frames: [
      P({ torso: { fwd: 35 }, head: { fwd: 15 }, armR: { upper: [-45, 10], fore: [-35, 10] }, armL: { upper: [-45, 10], fore: [-35, 10] },
        legR: { thigh: [80, 8], shin: [-15, 8], foot: [90, 0] }, legL: { thigh: [80, 8], shin: [-15, 8], foot: [90, 0] } }),
      P({ air: 0.12, armR: { upper: [165, 10], fore: [170, 10] }, armL: { upper: [165, 10], fore: [170, 10] },
        legR: { thigh: [0, 4], shin: [0, 4], foot: [30, 0] }, legL: { thigh: [0, 4], shin: [0, 4], foot: [30, 0] } }),
      P({ torso: { fwd: 30 }, head: { fwd: 10 }, armR: { upper: [70, 10], fore: [80, 10] }, armL: { upper: [70, 10], fore: [80, 10] },
        legR: { thigh: [75, 8], shin: [-15, 8], foot: [90, 0] }, legL: { thigh: [75, 8], shin: [-15, 8], foot: [90, 0] } }),
    ],
  },
  // S05 업라이트 스핀 축 자세(버티기): 팔 벌려 준비 → 팔 가슴 앞, 프리 발(왼발)은 오른 무릎 옆에서 버티기
  spinAxis: {
    camera: 'front', loop: 'restart', ms: 900, props: [],
    note: '참고: iCoachSkating 오프아이스 스핀 수업 요약(K. Ryan — 팔 모아 가슴 앞, 배꼽을 등 쪽으로, 시선 위), 2026-10-12 확인',
    frames: [
      P({ armR: { upper: [60, 60], fore: [70, 70] }, armL: { upper: [60, 60], fore: [70, 70] } }),
      P({ ...armsChest, legR: { thigh: [0, 2], shin: [0, 2], foot: [90, 0] },
        legL: { thigh: [45, 25], shin: [-30, -40], foot: [20, -20] } }),
    ],
  },
};

export function motion3dFor(poseId) {
  if (MOTIONS3D[poseId]) return { ...MOTIONS3D[poseId], source: 'hand' };
  const p = POSES[poseId];
  if (!p) return null;
  const frames = framesOf(p);
  return {
    frames: frames.map(fromPose2d), ms: p.ms ?? 700, loop: 'wrap',
    camera: frames[0].view === 'front' ? 'front' : 'side', props: propsOf(p), note: '2D 그림 자동 변환(초안)', source: 'auto',
  };
}
