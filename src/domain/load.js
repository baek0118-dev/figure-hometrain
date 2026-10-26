// 운동량 안전 — 훈련 내용 검토(docs/specs/2026-10-12-training-content-review.md §115~118), 화면 2차 3단계.
// ① 점프 착지 상한: 처음 4주 45회 → 그 뒤 한 주에 10% 이하로 늘려 60회. 키 크는 시기엔 40회.
// ② 이번 주 빙상 + 앱 운동 합계가 주 10시간(나이만큼)을 넘으면 안내.

import { addDays, daysBetween, weekday } from './dates.js';

export const CONTACT_MAX = 60;
export const CONTACT_START = 45;
export const CONTACT_GROWTH = 40;   // 설정 "요즘 키가 빨리 커요"
const START_WEEKS = 4;
const WEEKLY_GROWTH = 1.1;
const RESTART_GAP_DAYS = 28;        // 이만큼 쉬었다 오면 처음 4주부터 다시
export const WEEKLY_HOURS_LIMIT = 10;

// 지금 이어지는 기간의 시작일: 마지막으로 28일 넘게 비었던 뒤의 첫 기록 (없으면 오늘)
function streakStart(history, date) {
  const days = [...new Set(history.map(s => s.date).filter(d => d && d <= date))].sort();
  let start = date;
  let next = date;
  for (let i = days.length - 1; i >= 0; i--) {
    if (daysBetween(days[i], next) >= RESTART_GAP_DAYS) break;
    start = next = days[i];
  }
  return start;
}

export function contactLimitFor({ history = [], date, settings = {} }) {
  const weeks = Math.floor(daysBetween(streakStart(history, date), date) / 7);
  let limit = CONTACT_START;
  for (let w = START_WEEKS; w <= weeks && limit < CONTACT_MAX; w++) limit = Math.min(CONTACT_MAX, Math.floor(limit * WEEKLY_GROWTH));
  return settings.growthSpurt ? Math.min(limit, CONTACT_GROWTH) : limit;
}

// 월요일 시작
export const weekStartOf = date => addDays(date, -((weekday(date) + 6) % 7));

// 운동한 시간(activeSec, 평가 화면의 '오늘 N분 운동했어요'와 같은 값) — 일시정지·영상 보기 시간은 빼려고 시작~끝 시각은 안 씀
const sessionHours = s => (s.activeSec ?? 0) / 3600;
const round1 = n => Math.round(n * 10) / 10;

// settings.iceWeek = { weekStart: 'YYYY-MM-DD'(월), hours } — 엄마가 설정에서 이번 주 빙상 시간을 적음
export function weeklyLoad({ date, sessions = [], settings = {} }) {
  const start = weekStartOf(date);
  const ice = settings.iceWeek;
  const iceEntered = !!ice && ice.weekStart === start && Number.isFinite(ice.hours);
  const iceHours = iceEntered ? ice.hours : 0;
  const appHours = round1(sessions.filter(s => s.date >= start && s.date <= date).reduce((t, s) => t + sessionHours(s), 0));
  const totalHours = round1(iceHours + appHours);
  return { weekStart: start, iceEntered, iceHours, appHours, totalHours, limit: WEEKLY_HOURS_LIMIT, over: totalHours > WEEKLY_HOURS_LIMIT };
}

export const loadMessage = ({ totalHours, limit }) =>
  `이번 주는 빙상이랑 합쳐서 벌써 ${totalHours}시간! ${limit}시간을 넘었으니 오늘은 가볍게 하거나 쉬어도 좋아.`;
