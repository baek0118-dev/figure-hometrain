// 격려 문구 — 사용자 결정 1011: "하기로 했는데 안 했다고 실망하지 말고, 듀오링고처럼 더 격려".
// 쉰 날을 세거나 탓하지 않는다. 다시 온 것 자체를 크게 반긴다. (금지어 검사: tests/cheer.test.js)

import { daysBetween } from './dates.js';
import { statLevel } from './xp.js';
import { CATEGORIES } from './validate.js';

const W = {
  first: [
    ['첫 훈련, 시작해 볼까? ⛸', '오늘이 1급으로 가는 첫 걸음이야!'],
  ],
  again: [
    ['한 번 더?! 열정 최고 🔥', '짧게 해도 다 쌓여!'],
    ['또 왔네! 오늘 컨디션 좋은가 봐 ✨', '무리하지 말고 즐겁게!'],
  ],
  streak: [
    ['어제에 이어 오늘도! 💫', '차곡차곡 쌓이는 중이야.'],
    ['또 만났다! 🙌', '몸이 점점 가벼워지고 있을 거야.'],
    ['오늘도 반짝반짝 ⛸', '꾸준함이 제일 센 기술이야.'],
  ],
  back: [
    ['다시 만나서 반가워! 🌱', '오늘 한 걸음이면 충분해.'],
    ['기다리고 있었어! 😊', '쉬고 온 몸은 더 잘 움직여.'],
    ['짠! 다시 시작 🎈', '오늘 할 수 있는 만큼만 해 보자.'],
  ],
  comeback: [
    ['돌아온 챔피언! 🏆', '다시 오는 게 제일 멋진 기술이야.'],
    ['와, 왔구나! 🎉', '몸이 다 기억하고 있을 거야.'],
    ['다시 시작하는 너, 진짜 멋져 🌈', '오늘은 가볍게 몸 풀기부터!'],
  ],
};
const SHORT_HINT = '오늘은 짧게 해도 좋아. 15분 메뉴로 시작해 볼까?';

const PARTIAL = [
  '여기까지 한 것도 훌륭해! 기록에 남겼어 📝',
  '오늘 한 만큼 다 경험치가 됐어 ✨',
  '멈출 때를 아는 것도 실력이야 👍',
];
const TOO_LATE = [
  '오늘은 푹 자는 것도 훈련이야 😴 스트레칭만 하고 자자!',
  '키 크는 시간이야 🌙 가볍게 늘이고 잘 자!',
];

// 같은 날엔 같은 문구 (날짜 문자열로 고르기)
const pick = (list, seed) => list[[...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];

export function welcomeMessage({ today, lastSessionDate }) {
  let kind;
  if (!lastSessionDate) kind = 'first';
  else {
    const gap = daysBetween(lastSessionDate, today);
    kind = gap <= 0 ? 'again' : gap === 1 ? 'streak' : gap <= 3 ? 'back' : 'comeback';
  }
  const [title, body] = pick(W[kind], today);
  const msg = { kind, title, body };
  if (kind === 'comeback') {
    msg.badge = 'comeback';
    if (daysBetween(lastSessionDate, today) >= 7) {
      msg.suggestShort = true;
      msg.body = `${body} ${SHORT_HINT}`;
    }
  }
  return msg;
}

export const partialMessage = ({ date }) => pick(PARTIAL, date);
export const tooLateMessage = date => pick(TOO_LATE, date);

// ── 이정표 축하 ─────────────────────────────────────
const SESSION_MARKS = [1, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200];
const HOUR_MARKS = [1, 3, 5, 10, 20, 30, 50, 100];
const STAMP_MARKS = [1, 3, 7, 14, 30, 50, 100];
const CAT_KO = { jump: '점프 탄력', spin: '스핀 코어', balance: '한발 밸런스', flex: '유연성' };
const crossed = (marks, a, b) => marks.filter(m => a < m && b >= m);

const sessionMark = n => (n === 1 ? '🎉 첫 훈련 완료! 시작이 반이야' : `🎉 벌써 ${n}번째 훈련!`);

export function milestones(before, after) {
  const out = [];
  for (const n of crossed(SESSION_MARKS, before.totalSessions, after.totalSessions)) out.push(sessionMark(n));
  for (const h of crossed(HOUR_MARKS, before.totalActiveSec / 3600, after.totalActiveSec / 3600)) out.push(`⏱ 누적 ${h}시간 돌파!`);
  for (const s of crossed(STAMP_MARKS, before.totalStamps, after.totalStamps)) out.push(`🏅 일지 도장 ${s}개 모았어!`);
  for (const c of CATEGORIES) {
    const a = statLevel(before.xp?.[c] ?? 0).level, b = statLevel(after.xp?.[c] ?? 0).level;
    if (b > a) out.push(`⬆ ${CAT_KO[c]} Lv${b} 달성!`);
  }
  return out;
}

export const ALL_MESSAGES = [
  ...Object.values(W).flat(2), SHORT_HINT, ...PARTIAL, ...TOO_LATE,
  ...SESSION_MARKS.map(sessionMark),
];
