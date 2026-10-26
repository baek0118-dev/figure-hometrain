// 화면 값·작은 판단 — 설계 메모 2026-10-12-app-flow-ui-design.md.
// 써 보면서 자주 바꿀 값(크기·시간)은 모두 여기 UI 에 모은다(사용자 2026-10-12: "테스트 페이지로 여러 번 써 본 뒤 계속 바뀔 듯").
import { BASE_FACTOR, SLOW_FACTOR } from '../domain/pose3d.js';

export const UI = {
  checkpointMs: 4000,      // 요령 한 줄씩 돌아가는 간격
  videoRepeats: 3,         // 참고 영상 구간 반복 횟수
  videoLoadMs: 8000,       // 이 안에 못 읽으면 영상 창 닫고 버튼 숨김
  wide: { nextH: 140, bigFont: 150, repFont: 110 },  // 가로(아이패드) px
  tall: { nextH: 130, bigFont: 110, repFont: 64 },  // 세로(휴대폰) px
  short: { nextH: 84, bigFont: 84, repFont: 44 },  // 휴대폰 가로(낮은 가로 화면) px
};

// 인형 재생 시간 배수(1 = 실제 박자). 준비·휴식에는 천천히 보여 주고, 운동 중에는 실제 박자로 같이 센다. 🐢 는 언제나 1/4.
export function motionFactor({ kind, slow }) {
  if (slow) return SLOW_FACTOR;
  return kind === 'work' ? 1 : BASE_FACTOR;
}

// 횟수 동작: 인형 한 바퀴 = 1회. 목표에서 멈춘다.
export function repDisplay({ count, target }) {
  const n = Math.min(count, target);
  return { text: `${n} / ${target}`, done: n >= target };
}

// 요령 n 줄 중 지금 보일 줄
export const checkpointAt = (elapsedMs, n) => (n > 0 ? Math.floor(elapsedMs / UI.checkpointMs) % n : 0);

// 영상 버튼은 준비 시간에만, 영상이 있고 인터넷이 되고 이번에 고장 나지 않았을 때
export const showVideoButton = ({ kind, video, online, broken }) => kind === 'prep' && !!video && online && !broken;

// 구간이 n 번째로 끝났을 때
export const videoAfterEnd = plays => (plays < UI.videoRepeats ? 'replay' : 'stop');
