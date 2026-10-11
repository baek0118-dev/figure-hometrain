// 평가 → 다음 운동 — 설계 §5.2. 체감 강도(RPE) = 내일의 양·종류, 동작 난이도 = 동작 레벨.
// 순수 함수: 입력 progress 를 바꾸지 않고 새 객체를 돌려준다.

import { daysBetween } from './dates.js';

export const LEVEL_MIN = 1;
export const LEVEL_MAX = 5;
const LEVEL_UP_COOLDOWN_DAYS = 7;
const EASY_STREAK_FOR_UP = 2;
const LEVEL_UPS_PER_DAY = 3;         // 사용자 결정 1011

export function emptyProgress() {
  return {
    levels: {},          // exerciseId → 1~5 (없으면 1)
    easyStreak: {},      // 연속 '척척'
    lastLevelUpAt: {},   // exerciseId → 'YYYY-MM-DD'
    removedStreak: {},   // 추천에서 연속으로 뺀 횟수
    lastRemovedAt: {},
    repeatNext: [],      // 헷갈림 → 다음에 다시 추천
    nextMode: 'normal',  // normal | recovery | progress
    hardStreak: 0,       // 완전 지침 연속
    restSuggested: false,
    lastSessionDate: null,
  };
}

const RPE_MODE = { light: 'progress', right: 'normal', hard: 'recovery' };

const clone = p => ({
  ...emptyProgress(),
  ...p,
  levels: { ...p.levels },
  easyStreak: { ...p.easyStreak },
  lastLevelUpAt: { ...p.lastLevelUpAt },
  removedStreak: { ...p.removedStreak },
  lastRemovedAt: { ...p.lastRemovedAt },
  repeatNext: [...(p.repeatNext ?? [])],
});

// 레벨 규칙 대상: 본운동에서 세트를 1개 이상 한 동작
function doneMainIds(session) {
  const main = new Set((session.planned ?? []).filter(i => i.block === 'main').map(i => i.exerciseId));
  return (session.results ?? []).filter(r => r.setsDone > 0 && main.has(r.exerciseId)).map(r => r.exerciseId);
}

function levelUp(p, id, date) {
  const cur = p.levels[id] ?? LEVEL_MIN;
  const last = p.lastLevelUpAt[id];
  if (cur >= LEVEL_MAX) return false;
  if (last && daysBetween(last, date) < LEVEL_UP_COOLDOWN_DAYS) return false;
  p.levels[id] = cur + 1;
  p.lastLevelUpAt[id] = date;
  return true;
}

export function applyEvaluation(progress, session, evaluation) {
  const p = clone(progress);
  const { rpe, difficulty } = evaluation;
  const date = session.date;

  // A. 체감 강도 → 다음 모드
  p.hardStreak = rpe === 'hard' ? p.hardStreak + 1 : 0;
  p.nextMode = RPE_MODE[rpe] ?? 'normal';
  p.restSuggested = p.hardStreak >= 2;

  // B. 난이도 → 레벨
  const done = doneMainIds(session);
  p.repeatNext = p.repeatNext.filter(id => !done.includes(id));
  const ready = [];
  for (const id of done) {
    p.removedStreak[id] = 0;
    if (difficulty === 'hard') {
      p.levels[id] = Math.max(LEVEL_MIN, (p.levels[id] ?? LEVEL_MIN) - 1);
      p.easyStreak[id] = 0;
    } else if (difficulty === 'confusing') {
      if (!p.repeatNext.includes(id)) p.repeatNext.push(id);
    } else if (difficulty === 'easy' && rpe !== 'hard') {
      const streak = (p.easyStreak[id] ?? 0) + 1;
      p.easyStreak[id] = streak;
      if (rpe === 'light' || streak >= EASY_STREAK_FOR_UP) ready.push(id);
    }
    // easy + hard(RPE): 레벨 유지, streak 유지
  }

  // 하루 레벨업은 최대 3개, 집중 블록 동작 먼저. 못 오른 동작은 다음 '척척' 한 번이면 오르게 대기.
  const isFocus = id => {
    const slot = session.planned?.find(i => i.exerciseId === id)?.slot;
    return session.slots ? !!session.slots[slot]?.focus : slot === 0;
  };
  ready.sort((a, b) => Number(isFocus(b)) - Number(isFocus(a)));
  let ups = 0;
  for (const id of ready) {
    if (ups < LEVEL_UPS_PER_DAY && levelUp(p, id, date)) {
      p.easyStreak[id] = 0;
      ups++;
    } else {
      p.easyStreak[id] = Math.max(p.easyStreak[id], EASY_STREAK_FOR_UP - 1);
    }
  }
  p.lastSessionDate = date;
  return p;
}

// 메뉴에서 추천 동작을 뺐을 때 (탓하지 않고 기록만)
export function recordRemovals(progress, ids, date) {
  const p = clone(progress);
  for (const id of ids) {
    p.removedStreak[id] = (p.removedStreak[id] ?? 0) + 1;
    p.lastRemovedAt[id] = date;
  }
  return p;
}
