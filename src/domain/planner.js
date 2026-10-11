// 오늘의 메뉴(규칙 추천) — 설계 §5.1, §11.1.
// 본운동 = 요일 템플릿의 블록 3~4개(카테고리), 블록마다 동작 1~4개.

import { EXERCISES, byId } from '../data/exercises.js';
import {
  WARMUP, WARMUP_SHORT, COOLDOWN, COOLDOWN_SHORT, WEEK_TEMPLATES, REST_WEEKDAYS, PLACE_EQUIPMENT,
} from '../data/templates.js';
import { compileSession, estimateSec } from './timeline.js';
import { weekday, addDays, daysBetween } from './dates.js';
import { emptyProgress, LEVEL_MAX } from './adapt.js';

export const MAIN_RANGE = {          // 본운동 목표(초)
  normal: [30 * 60, 35 * 60],
  progress: [30 * 60, 35 * 60],
  recovery: [20 * 60, 25 * 60],
  rest: [15 * 60, 25 * 60],
};
export const CONTACT_LIMIT = 60;     // 세션당 점프 접촉
const SIZE_FROM = { short: 40 * 60, mini: 22 * 60, tooLate: 10 * 60 }; // 고른 시간이 이보다 적으면 한 단계 짧게
const MAX_PER_SLOT = 4;
const START_PER_SLOT = { focus: 3, other: 2 };
const JUMP_DAYS_LIMIT = 3;           // 최근 7일
const RESET_MODE_AFTER_DAYS = 3;     // 이만큼 쉬고 오면 보통 모드
const REMOVED_SKIP_STREAK = 3;
const REMOVED_SKIP_DAYS = 14;
const CONFUSING_PREP_SEC = 20;
const RECOVERY_REST_PLUS = 10;

// ── 요일 템플릿 ──────────────────────────────────────
export function templateFor(date) {
  const wd = weekday(date);
  const cats = WEEK_TEMPLATES[wd];
  return { rest: REST_WEEKDAYS.includes(wd), slots: cats.map((category, i) => ({ category, focus: i === 0 })) };
}

// ── 후보 거르기 ──────────────────────────────────────
function usableAt(ex, place) {
  return ex.places.includes(place) && ex.equipment.every(q => PLACE_EQUIPMENT[place].includes(q));
}

export function candidatesFor(category, { places, quiet = false, hidden = [] }) {
  return EXERCISES.filter(ex =>
    ex.category === category &&
    places.some(p => usableAt(ex, p)) &&
    (!quiet || ex.quiet) &&
    !hidden.includes(ex.id));
}

// ── 로테이션 ─────────────────────────────────────────
const doneIds = s => (s.results ?? []).filter(r => r.setsDone > 0).map(r => r.exerciseId);

function lastDoneMap(history) {
  const m = {};
  for (const s of history) for (const id of doneIds(s)) if (!m[id] || m[id] < s.date) m[id] = s.date;
  return m;
}

function recentElementCounts(history, date) {
  const counts = {};
  for (const s of history) {
    const d = daysBetween(s.date, date);
    if (d < 1 || d > 7) continue;
    for (const id of doneIds(s)) for (const el of byId(id)?.elements ?? []) counts[el] = (counts[el] ?? 0) + 1;
  }
  return counts;
}

export function rankCandidates(cands, { history = [], date, progress = emptyProgress() }) {
  const last = lastDoneMap(history);
  const elCount = recentElementCounts(history, date);
  const tier = ex => {
    if (progress.repeatNext?.includes(ex.id)) return 0;
    const streak = progress.removedStreak?.[ex.id] ?? 0;
    const at = progress.lastRemovedAt?.[ex.id];
    if (streak >= REMOVED_SKIP_STREAK && at && daysBetween(at, date) < REMOVED_SKIP_DAYS) return 2;
    return 1;
  };
  const coverage = ex => ex.elements.reduce((s, el) => s + (elCount[el] ?? 0), 0);
  return [...cands].sort((a, b) =>
    tier(a) - tier(b) ||
    (last[a.id] ?? '').localeCompare(last[b.id] ?? '') ||
    coverage(a) - coverage(b) ||
    a.id.localeCompare(b.id));
}

// ── 점프 안전 ────────────────────────────────────────
const hadImpact = s => doneIds(s).some(id => byId(id)?.impact);

export function jumpBlocked(history, date) {
  const yesterday = addDays(date, -1);
  if (history.some(s => s.date === yesterday && hadImpact(s))) return true;
  const days = new Set(history.filter(s => {
    const d = daysBetween(s.date, date);
    return d >= 1 && d <= 7 && hadImpact(s);
  }).map(s => s.date));
  return days.size >= JUMP_DAYS_LIMIT;
}

export function contacts(items) {
  return items.reduce((sum, it) => {
    const ex = byId(it.exerciseId);
    return ex?.impact ? sum + it.sets * (it.reps ?? 0) * ex.contactsPerRep : sum;
  }, 0);
}

// ── 아이템 만들기 ────────────────────────────────────
function levelValues(ex, level) {
  const l = ex.levels[Math.min(level, ex.levels.length) - 1];
  return ex.mode === 'reps' ? { reps: l.reps } : { workSec: l.workSec };
}

export function makeItem(ex, { block, slot, level = 1, mode = 'normal', source = 'recommended', progress }) {
  const l = ex.levels[level - 1] ?? ex.levels[0];
  const item = {
    exerciseId: ex.id, block, category: ex.category, level, source,
    sets: l.sets, restSec: l.restSec, ...levelValues(ex, level),
  };
  if (block === 'main') {
    item.slot = slot;
    if (mode === 'recovery') {
      item.sets = Math.max(1, item.sets - 1);
      item.restSec += RECOVERY_REST_PLUS;
    }
    if (progress?.repeatNext?.includes(ex.id)) item.prepSec = CONFUSING_PREP_SEC;
  }
  return item;
}

const fixedItems = (ids, block) => ids.map(id => makeItem(byId(id), { block, level: 1 }));

const cooldownPlace = places => (places.length === 1 && places[0] === 'home' ? 'home' : 'park');

export function summarize(plan) {
  const main = plan.items.filter(i => i.block === 'main');
  plan.mainSec = estimateSec(compileSession(main));
  plan.totalSec = estimateSec(compileSession(plan.items));
  plan.jumpContacts = contacts(plan.items);
  plan.overTime = plan.totalSec > 50 * 60;
  return plan;
}

// 시간 맞추기로 늘릴 수 있는 세트: 레벨 세트 +2, 최대 5 (공원처럼 고를 동작이 적은 곳 대비)
const maxSets = (item) => Math.min(5, item.baseSets + 2);

// ── 시간 맞추기 ──────────────────────────────────────
function fitTime(main, pools, slots, range, ctx) {
  const [lo, hi] = range;
  const est = () => estimateSec(compileSession(main));
  const slotItems = k => main.filter(i => i.slot === k);
  const canAddContacts = (item) => contacts([...main, item]) <= CONTACT_LIMIT;

  // 세트 +1 (현재 레벨 세트 + extra 까지, 최대 5). 집중 블록·세트 적은 것 먼저.
  function growSets(extra) {
    const grow = main
      .filter(i => i.sets < Math.min(maxSets(i), i.baseSets + extra))
      .sort((a, b) => Number(slots[b.slot].focus) - Number(slots[a.slot].focus) || a.sets - b.sets);
    for (const i of grow) {
      i.sets += 1;
      if (est() <= hi && contacts(main) <= CONTACT_LIMIT) return true;
      i.sets -= 1;
    }
    return false;
  }

  // 동작 추가: 동작 수가 적은 블록부터 (동률이면 집중 블록), 블록당 cap 개까지
  function addExercise(cap) {
    const order = slots.map((s, k) => k)
      .filter(k => slotItems(k).length < cap && pools[k].length > 0)
      .sort((a, b) => slotItems(a).length - slotItems(b).length || Number(slots[b].focus) - Number(slots[a].focus));
    for (const k of order) {
      for (let j = 0; j < pools[k].length; j++) {
        const ex = pools[k][j];
        if (main.some(i => i.exerciseId === ex.id)) continue;
        const item = ctx.make(ex, k);
        if (!canAddContacts(item)) continue;
        const insertAt = main.lastIndexOf(slotItems(k).at(-1)) + 1;
        main.splice(insertAt, 0, item);
        if (est() > hi) { main.splice(insertAt, 1); continue; }
        pools[k].splice(j, 1);
        return true;
      }
    }
    return false;
  }

  for (let guard = 0; guard < 80; guard++) {
    const cur = est();
    if (cur >= lo && cur <= hi) return;

    if (cur < lo) {
      // 가짓수·반복 균형: 세트 +1 → 동작 추가(블록당 3) → 동작 추가(블록당 4) → 세트 +2
      const grew =
        growSets(1) ||
        addExercise(3) ||
        addExercise(MAX_PER_SLOT) ||
        growSets(2);
      if (!grew) return;
      continue;
    }

    // cur > hi: 1) 비집중 세트 -1  2) 비집중 동작 빼기  3) 집중 세트 -1(바닥까지)
    const shrink = [...main]
      .filter(i => !slots[i.slot].focus && i.sets > 1)
      .sort((a, b) => b.sets - a.sets);
    if (shrink.length) { shrink[0].sets -= 1; continue; }
    const removable = [...main].reverse().find(i => !slots[i.slot].focus && slotItems(i.slot).length > 1);
    if (removable) { main.splice(main.indexOf(removable), 1); continue; }
    const focusShrink = main.filter(i => slots[i.slot].focus && i.sets > Math.max(1, i.floorSets ?? 1))
      .sort((a, b) => b.sets - a.sets);
    if (focusShrink.length) { focusShrink[0].sets -= 1; continue; }
    const focusRemovable = [...main].reverse().find(i => slotItems(i.slot).length > 1);
    if (focusRemovable) { main.splice(main.indexOf(focusRemovable), 1); continue; }
    return;
  }
}

function effectiveMode(progress, history, date) {
  const last = history.map(s => s.date).filter(d => d < date).sort().at(-1) ?? progress.lastSessionDate;
  if (!last || daysBetween(last, date) >= RESET_MODE_AFTER_DAYS) return 'normal';
  return progress.nextMode ?? 'normal';
}

// ── 오늘의 메뉴 ──────────────────────────────────────
export function buildRulePlan({ date, places = ['home'], quiet = false, history = [], progress = emptyProgress(), settings = {}, maxTotalSec = null }) {
  const tpl = templateFor(date);
  const mode = tpl.rest ? 'rest' : effectiveMode(progress, history, date);
  const notes = [];
  let slots = tpl.slots.map(s => ({ ...s }));

  // "오늘은 짧게"(엄마가 직접 고름, 시간으로 자동 판단 안 함 — 사용자 결정 1011): full → short(짧은 웜업·쿨다운) → mini(블록 하나) → tooLate(스트레칭만)
  const limit = maxTotalSec ?? Infinity;
  const size = limit >= SIZE_FROM.short ? 'full' : limit >= SIZE_FROM.mini ? 'short'
    : limit >= SIZE_FROM.tooLate ? 'mini' : 'tooLate';
  const fixedWarm = size === 'full' ? WARMUP : WARMUP_SHORT;
  const fixedCool = (size === 'full' ? COOLDOWN : COOLDOWN_SHORT)[cooldownPlace(places)];
  if (size !== 'full') notes.push(size);
  if (size === 'tooLate') {
    return summarize({
      date, places, quiet, mode, restDay: tpl.rest, tooLate: true, slots: [], notes,
      restSuggested: !!progress.restSuggested, items: fixedItems(fixedCool, 'cooldown'),
    });
  }
  if (size === 'mini') slots = slots.slice(0, 1);
  const fixedSec = estimateSec(compileSession([...fixedItems(fixedWarm, 'warmup'), ...fixedItems(fixedCool, 'cooldown')]));
  let range = MAIN_RANGE[mode];
  if (limit < Infinity) {
    const hi = Math.min(range[1], limit - fixedSec);
    const lo = Math.max(2 * 60, Math.min(range[0], hi - (size === 'mini' ? 4 : 5) * 60));
    range = [lo, hi];
  }

  // 점프 블록 대체: 회복 모드 또는 안전 규칙. 이날은 다른 블록의 강한 착지도 뺀다.
  const noImpact = mode === 'recovery' || jumpBlocked(history, date);
  if (mode === 'recovery') notes.push('recovery');
  if (noImpact && slots.some(s => s.category === 'jump')) {
    slots = slots.map(s => {
      if (s.category !== 'jump') return s;
      const has = c => slots.some(x => x.category === c);
      const to = mode === 'recovery' && has('balance') ? 'flex' : 'balance';
      return { ...s, category: to, replaced: 'jump' };
    });
    if (mode !== 'recovery') notes.push('jumpRest');
  }

  const filter = { places, quiet, hidden: settings.hidden ?? [] };
  let pools = slots.map(s => {
    const ranked = rankCandidates(candidatesFor(s.category, filter), { history, date, progress });
    if (s.replaced === 'jump' && s.category === 'balance') {
      const b02 = ranked.findIndex(e => e.id === 'B02');
      if (b02 > 0) ranked.unshift(...ranked.splice(b02, 1));
    }
    return noImpact ? ranked.filter(e => !e.impact) : ranked;
  });

  const make = (ex, k) => {
    const item = makeItem(ex, { block: 'main', slot: k, level: progress.levels?.[ex.id] ?? 1, mode, progress });
    item.baseSets = item.sets;
    if (mode === 'progress' && slots[k].focus) {
      const lvSets = ex.levels[item.level - 1].sets;
      if (lvSets < ex.levels[LEVEL_MAX - 1].sets || lvSets < 5) {
        item.sets = Math.min(5, lvSets + 1);
        item.floorSets = item.sets;
      }
    }
    return item;
  };

  // 처음 채우기: 집중 3개, 나머지 2개 (같은 날 중복 없음, 접촉 상한 지킴)
  const main = [];
  slots.forEach((s, k) => {
    const want = s.focus ? START_PER_SLOT.focus : START_PER_SLOT.other;
    let n = 0;
    while (n < want && pools[k].length) {
      const ex = pools[k].shift();
      if (main.some(i => i.exerciseId === ex.id)) continue;
      const item = make(ex, k);
      if (contacts([...main, item]) > CONTACT_LIMIT) continue;
      main.push(item);
      n++;
    }
  });

  // 같은 카테고리 블록이 둘인데 동작이 모자라 빈 블록이 생기면 시간 맞추기 전에 뺀다
  const keep = slots.map((s, k) => k).filter(k => main.some(i => i.slot === k));
  if (keep.length < slots.length) {
    const newIndex = new Map(keep.map((k, n) => [k, n]));
    for (const i of main) i.slot = newIndex.get(i.slot);
    slots = keep.map(k => slots[k]);
    pools = keep.map(k => pools[k]);
  }

  fitTime(main, pools, slots, range, { make });
  for (const i of main) { delete i.baseSets; delete i.floorSets; }

  const plan = {
    date, places, quiet, mode,
    restDay: tpl.rest,
    slots: slots.map(({ category, focus }) => ({ category, focus })),
    notes,
    restSuggested: !!progress.restSuggested,
    mainRange: range,
    items: [...fixedItems(fixedWarm, 'warmup'), ...main, ...fixedItems(fixedCool, 'cooldown')],
  };
  return summarize(plan);
}
