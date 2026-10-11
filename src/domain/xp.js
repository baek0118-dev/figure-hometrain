// XP·스탯·달력·칭찬 — 설계 §4.5, §5.3. 세션 기록이 원본, 여기 값은 모두 다시 계산 가능.

import { byId } from '../data/exercises.js';
import { CATEGORIES } from './validate.js';

const COOLDOWN_XP = 3;
const emptyXp = () => Object.fromEntries(CATEGORIES.map(c => [c, 0]));

// 세트 하나(perSide 는 양쪽 다) 완료 XP
export function xpForSet(exerciseId, level = 1) {
  const ex = byId(exerciseId);
  if (!ex || ex.category === 'warmup') return { category: null, xp: 0 };
  if (ex.category === 'cooldown') return { category: 'flex', xp: COOLDOWN_XP };
  return { category: ex.category, xp: Math.round(10 * (1 + 0.1 * (level - 1))) };
}

export function sessionXp(session) {
  const xp = emptyXp();
  const levelOf = id => session.planned?.find(p => p.exerciseId === id)?.level ?? 1;
  for (const r of session.results ?? []) {
    const { category, xp: per } = xpForSet(r.exerciseId, levelOf(r.exerciseId));
    if (category) xp[category] += per * (r.setsDone ?? 0);
  }
  return xp;
}

export function rebuildStats(sessions) {
  const xp = emptyXp();
  let totalActiveSec = 0;
  let totalStamps = 0;
  const dates = new Set();
  for (const s of sessions) {
    const sx = sessionXp(s);
    for (const c of CATEGORIES) xp[c] += sx[c];
    totalActiveSec += s.activeSec ?? 0;
    if (s.stamp) totalStamps++;
    dates.add(s.date);
  }
  return { xp, totalActiveSec, totalSessions: sessions.length, totalStamps, trainedDates: [...dates].sort() };
}

// Lv1→2 100, 이후 +50 씩 (100, 150, 200, 250 …)
export function statLevel(xp) {
  let level = 1, need = 100, floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level++;
    need += 50;
  }
  return { level, into: xp - floor, need };
}

// 달력: 'stamp' 도장 / 'done' 운동했지만 일지 전 / 'none' 빈칸 (빠진 날 개념 없음)
export function monthGrid(year, month, sessions) {
  const p = n => String(n).padStart(2, '0');
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const state = {};
  for (const s of sessions) {
    if (s.stamp) state[s.date] = 'stamp';
    else if (!state[s.date]) state[s.date] = 'done';
  }
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${p(month)}-${p(d)}`;
    cells.push({ date, day: d, state: state[date] ?? 'none' });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 탓하는 말 금지 — 문구는 누적만 칭찬
export const FORBIDDEN_WORDS = ['빠졌', '빠진', '끊', '못 했', '안 했', '못했', '안했', '실패', '게으', '실망', '아쉽'];

export function praiseLines(stats, { year, month }) {
  const p = n => String(n).padStart(2, '0');
  const prefix = `${year}-${p(month)}`;
  const thisMonth = stats.trainedDates.filter(d => d.startsWith(prefix)).length;
  const h = Math.floor(stats.totalActiveSec / 3600);
  const m = Math.floor((stats.totalActiveSec % 3600) / 60);
  const lines = [`벌써 ${stats.totalSessions}번째 훈련!`];
  if (thisMonth > 0) lines.push(`이번 달 ${thisMonth}번 했어요 ⛸`);
  lines.push(`지금까지 ${h > 0 ? `${h}시간 ` : ''}${m}분 쌓았어요`);
  if (stats.totalStamps > 0) lines.push(`일지 도장 ${stats.totalStamps}개 🏅`);
  return lines;
}
