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
const WALTZ_READY = P({ armR: { upper: [10, 30], fore: [15, 30] }, armL: { upper: [10, 30], fore: [15, 30] } });
const SPIN_READY = P({ armR: { upper: [60, 60], fore: [70, 70] }, armL: { upper: [60, 60], fore: [70, 70] } });
const armsChest = { armR: { upper: [35, 25], fore: [25, -80] }, armL: { upper: [35, 25], fore: [25, -80] } };

// durations[i] = 장면 i 에서 다음 장면까지 걸리는 시간(ms), 실제 사람 박자(느리게 보기는 3배). restart 동작의 마지막 값은 끝에서 머무는 시간.
// restart 동작은 끝 자세 다음에 '처음 자세로 돌아오기' 장면을 둬서(왈츠는 같은 쪽으로 더 돌아 yaw 360) 처음으로 돌아갈 때 순간 이동이 없다.
// 동작마다 기준점 하나(바닥에서 고정할 곳). 장면마다 바뀌면 순간 이동하므로 동작 전체에 같은 값을 넣는다.
const anchored = (m, anchor) => ({ ...m, frames: m.frames.map(f => ({ ...f, anchor })) });

const RAW = {
  // J03 오프아이스 왈츠 점프: 왼발 앞으로 디디며 출발 → 반 바퀴(반시계) → 오른발 착지, 왼다리 뒤로 쭉
  waltzJump: {
    camera: 'diag', loop: 'restart', props: [],
    note: '참고: iCoachSkating 왈츠 점프 강의 요약(R. Tebby·F. Carroll — 도약 때 팔 앞으로·프리 무릎 들기, 머리 들고 진행 방향, 착지 때 팔 벌려 회전 멈춤), 2026-10-12 확인',
    durations: [800, 500, 250, 220, 220, 300, 1200, 900, 200],
    frames: [
      WALTZ_READY,
      P({ torso: { fwd: 10 }, armR: { upper: [-40, 15], fore: [-30, 15] }, armL: { upper: [-40, 15], fore: [-30, 15] },
        legL: { thigh: [30, 0], shin: [0, 0], foot: [90, 0] }, legR: { thigh: [-30, 0], shin: [-45, 0], foot: [40, 0] } }),
      P({ yaw: 30, air: 0.05, armR: { upper: [100, 15], fore: [110, 15] }, armL: { upper: [100, 15], fore: [110, 15] },
        legL: { thigh: [-5, 0], shin: [-5, 0], foot: [30, 0] }, legR: { thigh: [70, 0], shin: [40, 0], foot: [60, 0] } }),
      P({ yaw: 80, air: 0.13, armR: { upper: [60, 25], fore: [80, -30] }, armL: { upper: [60, 25], fore: [80, -30] },
        legL: { thigh: [0, 0], shin: [0, 0], foot: [30, 0] }, legR: { thigh: [30, 0], shin: [10, 0], foot: [40, 0] } }),
      P({ yaw: 150, air: 0.12, ...armsChest,
        legR: { thigh: [5, 0], shin: [0, 0], foot: [30, 0] }, legL: { thigh: [10, -5], shin: [0, -5], foot: [30, 0] } }),
      P({ yaw: 180, torso: { fwd: 8 }, armR: { upper: [20, 60], fore: [20, 65] }, armL: { upper: [20, 60], fore: [20, 65] },
        legR: { thigh: [15, 0], shin: [-5, 0], foot: [70, 0] }, legL: { thigh: [-25, 8], shin: [-30, 8], foot: [-40, 8] } }),
      P({ yaw: 180, torso: { fwd: 15 }, armR: { upper: [20, 80], fore: [20, 85] }, armL: { upper: [20, 80], fore: [20, 85] },
        legR: { thigh: [20, 0], shin: [-15, 0], foot: [90, 0] }, legL: { thigh: [-40, 10], shin: [-40, 10], foot: [-60, 10] } }),
      P({ yaw: 270, armR: { upper: [10, 30], fore: [15, 30] }, armL: { upper: [10, 30], fore: [15, 30] } }),  // 몸을 돌려 제자리로
      { ...WALTZ_READY, yaw: 360 },
    ],
  },
  // J01 스쿼트 점프: 무릎은 발끝 방향 → 팔 휘둘러 높이 → 무릎 굽혀 사뿐히 착지
  // 무릎을 바깥으로 벌린 만큼 정강이는 안쪽으로 — 발이 옆으로 미끄러지지 않게(발 너비 그대로)
  squatJump: {
    camera: 'side', loop: 'wrap', props: [],
    note: '참고: 연습 체크포인트(무릎은 발끝 방향·팔 휘둘러·무릎 굽혀 착지) 그대로, 2026-10-12 확인',
    durations: [700, 250, 250, 300, 250, 700],
    frames: [
      P({}),
      P({ torso: { fwd: 35 }, head: { fwd: 15 }, armR: { upper: [-45, 10], fore: [-35, 10] }, armL: { upper: [-45, 10], fore: [-35, 10] },
        legR: { thigh: [80, 8], shin: [-15, 5], foot: [90, 0] }, legL: { thigh: [80, 8], shin: [-15, 5], foot: [90, 0] } }),
      P({ air: 0.02, torso: { fwd: 15 }, armR: { upper: [95, 10], fore: [105, 10] }, armL: { upper: [95, 10], fore: [105, 10] },
        legR: { thigh: [30, 3], shin: [-10, 3], foot: [50, 0] }, legL: { thigh: [30, 3], shin: [-10, 3], foot: [50, 0] } }),
      P({ air: 0.12, armR: { upper: [165, 10], fore: [170, 10] }, armL: { upper: [165, 10], fore: [170, 10] },
        legR: { thigh: [0, 3], shin: [0, 3], foot: [30, 0] }, legL: { thigh: [0, 3], shin: [0, 3], foot: [30, 0] } }),
      P({ torso: { fwd: 10 }, armR: { upper: [110, 10], fore: [115, 10] }, armL: { upper: [110, 10], fore: [115, 10] },
        legR: { thigh: [25, 3], shin: [-10, 3], foot: [70, 0] }, legL: { thigh: [25, 3], shin: [-10, 3], foot: [70, 0] } }),
      P({ torso: { fwd: 30 }, head: { fwd: 10 }, armR: { upper: [70, 10], fore: [80, 10] }, armL: { upper: [70, 10], fore: [80, 10] },
        legR: { thigh: [75, 8], shin: [-15, 4], foot: [90, 0] }, legL: { thigh: [75, 8], shin: [-15, 4], foot: [90, 0] } }),
    ],
  },
  // S05 업라이트 스핀 축 자세(버티기): 팔 벌려 준비 → 팔 모으며 무릎 들기 → 팔 가슴 앞, 프리 발(왼발)은 오른 무릎 옆에서 버티기
  spinAxis: {
    camera: 'front', loop: 'restart', props: [],
    note: '참고: iCoachSkating 오프아이스 스핀 수업 요약(K. Ryan — 팔 모아 가슴 앞, 배꼽을 등 쪽으로, 시선 위), 2026-10-12 확인',
    durations: [1000, 700, 2000, 900, 200],
    frames: [
      SPIN_READY,
      P({ armR: { upper: [45, 40], fore: [60, 20] }, armL: { upper: [45, 40], fore: [60, 20] },
        legL: { thigh: [25, 15], shin: [-10, -15], foot: [40, -10] } }),
      P({ ...armsChest, legR: { thigh: [0, 2], shin: [0, 2], foot: [90, 0] },
        legL: { thigh: [45, 25], shin: [-30, -40], foot: [20, -20] } }),
      P({ armR: { upper: [45, 40], fore: [60, 20] }, armL: { upper: [45, 40], fore: [60, 20] },
        legL: { thigh: [30, 12], shin: [-15, -12], foot: [70, -5] } }),  // 발 내리며 팔 풀기(발끝이 딛는 발보다 먼저 닿지 않게)
      SPIN_READY,
    ],
  },
};

export const MOTIONS3D = {
  waltzJump: anchored(RAW.waltzJump, 'feet'),
  squatJump: anchored(RAW.squatJump, 'feet'),
  spinAxis: anchored(RAW.spinAxis, 'footR'), // 딛는 오른발 고정
};

export function motion3dFor(poseId) {
  if (MOTIONS3D[poseId]) return { ...MOTIONS3D[poseId], source: 'hand' };
  const p = POSES[poseId];
  if (!p) return null;
  const frames = framesOf(p);
  return {
    frames: frames.map(fromPose2d), durations: frames.map(() => p.ms ?? 700), loop: 'wrap',
    camera: frames[0].view === 'front' ? 'front' : 'side', props: propsOf(p), note: '2D 그림 자동 변환(초안)', source: 'auto',
  };
}
