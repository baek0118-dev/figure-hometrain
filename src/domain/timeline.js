// 플랜 → 단계(step) 목록, 시간 추정 — 설계 §5.1, §6.
// step = { kind: 'prep'|'work'|'switch'|'rest', exerciseId, block, itemIndex, set, sets, side, durationSec, reps }
//  - reps 동작의 work 는 durationSec=null (NEXT 로 끝냄), 시간 추정은 reps × secPerRep.

import { byId } from '../data/exercises.js';

const SWITCH_SEC = 5;
const DEFAULT_SEC_PER_REP = 3;
export const PREP_SEC = { fixed: 5, slotFirst: 15, slotNext: 10 };

export function compileItem(item, { prepSec, itemIndex = 0 } = {}) {
  const ex = byId(item.exerciseId);
  const base = { exerciseId: item.exerciseId, block: item.block, itemIndex, sets: item.sets };
  const isReps = ex?.mode === 'reps';
  const work = side => ({
    ...base, kind: 'work', side,
    durationSec: isReps ? null : item.workSec,
    ...(isReps ? { reps: item.reps } : {}),
  });

  const steps = [{ ...base, kind: 'prep', set: 1, side: null, durationSec: prepSec }];
  for (let set = 1; set <= item.sets; set++) {
    if (ex?.perSide) {
      steps.push({ ...work('L'), set });
      steps.push({ ...base, kind: 'switch', set, side: null, durationSec: SWITCH_SEC });
      steps.push({ ...work('R'), set });
    } else {
      steps.push({ ...work(null), set });
    }
    if (set < item.sets && item.restSec > 0) {
      steps.push({ ...base, kind: 'rest', set, side: null, durationSec: item.restSec });
    }
  }
  return steps;
}

function defaultPrep(items, i) {
  const item = items[i];
  if (item.block !== 'main') return PREP_SEC.fixed;
  const prev = items[i - 1];
  return prev && prev.block === 'main' && prev.slot === item.slot ? PREP_SEC.slotNext : PREP_SEC.slotFirst;
}

export function compileSession(items) {
  return items.flatMap((item, i) =>
    compileItem(item, { prepSec: item.prepSec ?? defaultPrep(items, i), itemIndex: i }));
}

export function stepSec(step) {
  if (step.durationSec != null) return step.durationSec;
  const per = byId(step.exerciseId)?.secPerRep ?? DEFAULT_SEC_PER_REP;
  return (step.reps ?? 0) * per;
}

export const estimateSec = steps => steps.reduce((s, st) => s + stepSec(st), 0);
