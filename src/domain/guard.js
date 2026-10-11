// AI 추천 안전 검사 — 설계 §10.3. 규칙 엔진과 같은 상한을 적용한다.
// 항목 단위로 고칠 수 있으면 고치고(fixes 에 기록), 절반 넘게 이상하면 AI 답 전체를 버린다.

import { byId } from '../data/exercises.js';
import {
  candidatesFor, contacts, jumpBlocked, makeItem, summarize, CONTACT_LIMIT, MAIN_RANGE,
} from './planner.js';
import { daysBetween } from './dates.js';
import { LEVEL_MIN, LEVEL_MAX } from './adapt.js';
import { FORBIDDEN_WORDS } from './xp.js';
import { CATEGORIES } from './validate.js';

export const TEXT_LIMITS = { note: 30, focus: 40, cheer: 40, parentNote: 200 };
const DEFAULT_CHEER = '오늘도 멋지게 해 보자! ⛸';
const MIN_MAIN_SEC = 15 * 60;
const LEVEL_UP_COOLDOWN_DAYS = 7;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const cut = (s, n) => [...String(s ?? '')].slice(0, n).join('');
const hasForbidden = s => FORBIDDEN_WORDS.some(w => s.includes(w));

function kidText(s, limit, fallback, name, fixes) {
  let t = String(s ?? '');
  if (hasForbidden(t)) { fixes.push(`${name}: 금지어`); t = fallback; }
  if ([...t].length > limit) { fixes.push(`${name}: ${limit}자 초과`); t = cut(t, limit); }
  return t;
}

export function guardAiPlan(ai, ctx) {
  const { date, places, quiet = false, history = [], progress, rulePlan, settings = {} } = ctx;
  const fixes = [];
  const reject = why => ({ rejected: true, plan: null, fixes: [...fixes, why] });

  if (!ai || ai.forDate !== date) return reject('forDate 불일치');
  if (!Array.isArray(ai.items) || ai.items.length === 0) return reject('본운동 없음');

  const filter = { places, quiet, hidden: settings.hidden ?? [] };
  const noImpact = jumpBlocked(history, date) || rulePlan.mode === 'recovery';
  const slots = rulePlan.slots.map(s => ({ ...s }));
  const slotOf = cat => {
    let k = slots.findIndex(s => s.category === cat);
    if (k < 0) { slots.push({ category: cat, focus: false }); k = slots.length - 1; }
    return k;
  };

  // 1) 항목별 검사
  const main = [];
  let dropped = 0;
  for (const raw of ai.items) {
    const id = raw?.exerciseId;
    const ex = byId(id);
    const drop = why => { dropped++; fixes.push(`${id}: ${why}`); };
    if (!ex || !CATEGORIES.includes(ex.category)) { drop('없는 동작'); continue; }
    if (main.some(i => i.exerciseId === id)) { drop('중복'); continue; }
    if (!candidatesFor(ex.category, filter).some(e => e.id === id)) { drop('장소·소음·도구에 안 맞음'); continue; }
    if (noImpact && ex.impact) { drop('오늘은 강한 착지 쉬는 날'); continue; }

    const cur = progress.levels?.[id] ?? LEVEL_MIN;
    const want = Number.isInteger(raw.level) ? raw.level : cur;
    const level = clamp(want, Math.max(LEVEL_MIN, cur - 1), Math.min(LEVEL_MAX, cur + 1));
    if (level !== want) fixes.push(`${id}: level ${want}→${level}`);

    const item = makeItem(ex, { block: 'main', slot: slotOf(ex.category), level, mode: rulePlan.mode, source: 'ai', progress });
    const lvSets = ex.levels[level - 1].sets;
    const wantSets = Number.isInteger(raw.sets) ? raw.sets : item.sets;
    item.sets = clamp(wantSets, Math.max(1, lvSets - 1), Math.min(5, lvSets + 1));
    if (item.sets !== wantSets) fixes.push(`${id}: sets ${wantSets}→${item.sets}`);
    item.note = kidText(raw.note, TEXT_LIMITS.note, '', `${id} note`, fixes);
    main.push(item);
  }
  if (dropped * 2 > ai.items.length) return reject(`이상한 항목 ${dropped}/${ai.items.length}`);
  if (main.length === 0) return reject('남은 본운동 없음');

  // 블록 순서대로 정렬 (같은 블록은 붙어 있게)
  main.sort((a, b) => a.slot - b.slot);

  // 2) 점프 접촉 상한
  if (contacts(main) > CONTACT_LIMIT) {
    fixes.push(`contacts ${contacts(main)}→≤${CONTACT_LIMIT}`);
    while (contacts(main) > CONTACT_LIMIT) {
      const imp = main.filter(i => byId(i.exerciseId).impact);
      const big = imp.filter(i => i.sets > 1).sort((a, b) => b.sets - a.sets)[0];
      if (big) big.sets -= 1;
      else main.splice(main.indexOf(imp.at(-1)), 1);
    }
  }

  // 3) 시간 상한
  // 규칙 플랜이 쓴 범위("오늘은 짧게" 선택 반영)를 그대로 상한으로
  const hi = rulePlan.mainRange?.[1] ?? MAIN_RANGE[rulePlan.mode][1];
  const plan = {
    ...rulePlan,
    source: 'ai',
    slots: slots.map(({ category, focus }) => ({ category, focus })),
    items: [
      ...rulePlan.items.filter(i => i.block === 'warmup'),
      ...main,
      ...rulePlan.items.filter(i => i.block === 'cooldown'),
    ],
  };
  summarize(plan);
  if (plan.mainSec > hi) fixes.push(`time ${plan.mainSec}→≤${hi}`);
  while (plan.mainSec > hi) {
    const big = main.filter(i => i.sets > 1).sort((a, b) => b.sets - a.sets)[0];
    if (big) big.sets -= 1;
    else if (main.length > 1) plan.items.splice(plan.items.indexOf(main.pop()), 1);
    else break;
    summarize(plan);
  }
  if (plan.mainSec < MIN_MAIN_SEC && !plan.restDay) return reject(`본운동 ${plan.mainSec}초 너무 짧음`);

  // 4) 레벨 변화: ±1, 레벨업 7일 쿨다운, 범위 1~5
  const levelChanges = [];
  for (const lc of ai.levelChanges ?? []) {
    if (!byId(lc.exerciseId) || !CATEGORIES.includes(byId(lc.exerciseId).category)) continue;
    let delta = clamp(Math.trunc(lc.delta) || 0, -1, 1);
    const cur = progress.levels?.[lc.exerciseId] ?? LEVEL_MIN;
    const last = progress.lastLevelUpAt?.[lc.exerciseId];
    if (delta > 0 && last && daysBetween(last, date) < LEVEL_UP_COOLDOWN_DAYS) delta = 0;
    if (cur + delta < LEVEL_MIN || cur + delta > LEVEL_MAX) delta = 0;
    levelChanges.push({ exerciseId: lc.exerciseId, delta, reason: cut(lc.reason, TEXT_LIMITS.note) });
  }

  // 5) 문구
  plan.aiMeta = {
    mode: ai.mode,
    focus: kidText(ai.focus, TEXT_LIMITS.focus, '', 'focus', fixes),
    cheer: kidText(ai.cheer || DEFAULT_CHEER, TEXT_LIMITS.cheer, DEFAULT_CHEER, 'cheer', fixes),
    parentNote: cut(ai.parentNote, TEXT_LIMITS.parentNote),
    levelChanges,
  };
  return { rejected: false, plan, fixes };
}
