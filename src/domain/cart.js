// 오늘의 메뉴 장바구니 편집 — 설계 §4.2. 순수 함수: 새 plan 을 돌려준다.

import { byId } from '../data/exercises.js';
import { makeItem, summarize, contacts, CONTACT_LIMIT } from './planner.js';

export const MAX_MAIN = 14;
export const MAX_TOTAL_SEC = 50 * 60;

const copy = plan => ({ ...plan, slots: plan.slots.map(s => ({ ...s })), items: plan.items.map(i => ({ ...i })) });
const mains = plan => plan.items.filter(i => i.block === 'main');

export function removeItem(plan, index) {
  const it = plan.items[index];
  if (!it || it.block !== 'main') return { plan, error: 'fixed' };
  if (mains(plan).length <= 1) return { plan, error: 'last' };
  const next = copy(plan);
  next.items.splice(index, 1);
  return { plan: summarize(next), removedId: it.exerciseId };
}

export function addItem(plan, exerciseId, { progress } = {}) {
  const ex = byId(exerciseId);
  if (!ex || !['jump', 'spin', 'balance', 'flex'].includes(ex.category)) return { plan, error: 'unknown' };
  if (mains(plan).length >= MAX_MAIN) return { plan, error: 'full' };
  if (plan.items.some(i => i.exerciseId === exerciseId)) return { plan, error: 'duplicate' };

  const next = copy(plan);
  let slot = next.slots.findIndex(s => s.category === ex.category);
  if (slot < 0) {
    next.slots.push({ category: ex.category, focus: false });
    slot = next.slots.length - 1;
  }
  const item = makeItem(ex, { block: 'main', slot, level: progress?.levels?.[exerciseId] ?? 1, source: 'added', progress });
  if (contacts([...next.items, item]) > CONTACT_LIMIT) return { plan, error: 'contacts' };

  const lastInSlot = next.items.findLastIndex(i => i.block === 'main' && i.slot === slot);
  const lastMain = next.items.findLastIndex(i => i.block === 'main');
  next.items.splice((lastInSlot >= 0 ? lastInSlot : lastMain) + 1, 0, item);
  return { plan: summarize(next) };
}

export function moveItem(plan, from, to) {
  const a = plan.items[from], b = plan.items[to];
  if (!a || !b || a.block !== 'main' || b.block !== 'main') return { plan, error: 'fixed' };
  const next = copy(plan);
  const [moved] = next.items.splice(from, 1);
  moved.slot = b.slot; // 다른 블록으로 옮기면 그 블록 소속
  next.items.splice(to, 0, moved);
  return { plan: summarize(next) };
}

// "세트를 줄일까?" 원터치: 세트 많은 것부터 1씩, 그래도 넘치면 직접 담은 것부터 빼기
export function trimToFit(plan, limit = MAX_TOTAL_SEC) {
  let next = summarize(copy(plan));
  for (let guard = 0; guard < 100 && next.totalSec > limit; guard++) {
    const m = mains(next).filter(i => i.sets > 1).sort((a, b) => b.sets - a.sets);
    if (m.length) {
      m[0].sets -= 1;
      next = summarize(next);
      continue;
    }
    const idx = next.items.findLastIndex(i => i.block === 'main' && i.source === 'added');
    const any = idx >= 0 ? idx : next.items.findLastIndex(i => i.block === 'main');
    if (mains(next).length <= 1) break;
    next.items.splice(any, 1);
    next = summarize(next);
  }
  return next;
}
