// 인터벌 타이머 상태기계 — 설계 §6. 시계(now, ms)를 주입받는 순수 로직: 화면·소리는 이벤트를 보고 반응한다.
// 이벤트: stepStart · countdown(n=3,2,1) · setComplete · exerciseChange · done
//  - 한 번의 tick 에 단계 경계를 2개 이상 넘으면(백그라운드 복귀) 그 이벤트는 모두 silent, countdown 없음.

export const NEXT_DEBOUNCE_MS = 700;
const COUNTDOWN = [3, 2, 1];
const DEFAULT_SEC_PER_REP = 3;

export function createTimer(steps, { now = () => performance.now(), secPerRep = () => DEFAULT_SEC_PER_REP } = {}) {
  let index = -1;
  let active = 0;          // 일시정지 뺀 누적 시간(ms)
  let lastNow = null;      // 마지막으로 시계를 읽은 시각
  let paused = false;
  let done = false;
  let stepStartActive = 0;
  let lastRemaining = null;
  let lastNextAt = -Infinity;
  const results = new Map(); // itemIndex → {exerciseId, setsDone, setsPlanned, activeSec}

  const estSec = s => s.durationSec ?? (s.reps ?? 0) * secPerRep(s.exerciseId);
  const totalSec = steps.reduce((sum, s) => sum + estSec(s), 0);
  const startOffsets = steps.reduce((acc, s, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + estSec(steps[i - 1])); return acc; }, []);

  for (const s of steps) {
    if (!results.has(s.itemIndex)) {
      results.set(s.itemIndex, { itemIndex: s.itemIndex, exerciseId: s.exerciseId, setsDone: 0, setsPlanned: s.sets ?? 0, activeSec: 0 });
    }
  }

  const step = () => steps[index];
  const elapsedMs = () => active - stepStartActive;
  const remainingOf = () => (step()?.durationSec == null ? null : step().durationSec - elapsedMs() / 1000);

  function advanceClock() {
    const t = now();
    if (lastNow != null && !paused) active += t - lastNow;
    lastNow = t;
  }

  // 현재 단계를 끝내고 다음으로. endMs = 이 단계가 끝난 누적 시각(시간 만료면 정확한 끝, NEXT 면 지금)
  function finishStep(endMs, events, silent) {
    const s = step();
    if (s.kind === 'work') {
      const r = results.get(s.itemIndex);
      const spent = (endMs - stepStartActive) / 1000;
      r.activeSec += s.durationSec == null ? spent : Math.min(spent, s.durationSec);
      if (s.side !== 'L') {
        r.setsDone += 1;
        events.push({ type: 'setComplete', exerciseId: s.exerciseId, set: s.set, itemIndex: s.itemIndex, ...(silent && { silent }) });
      }
    }
    index += 1;
    stepStartActive = endMs;
    lastRemaining = step()?.durationSec ?? null;
    if (index >= steps.length) {
      done = true;
      events.push({ type: 'done', ...(silent && { silent }) });
      return;
    }
    if (steps[index].itemIndex !== s.itemIndex) {
      events.push({ type: 'exerciseChange', from: s.exerciseId, to: steps[index].exerciseId, ...(silent && { silent }) });
    }
  }

  function start() {
    index = 0;
    lastNow = now();
    stepStartActive = active;
    lastRemaining = steps[0]?.durationSec ?? null;
    return [{ type: 'stepStart', index, step: step() }];
  }

  function tick() {
    if (done || index < 0) return [];
    advanceClock();
    const events = [];
    const from = index;
    // 시간이 다 된 단계들을 넘긴다
    while (!done && step().durationSec != null && elapsedMs() >= step().durationSec * 1000) {
      finishStep(stepStartActive + step().durationSec * 1000, events, false);
    }
    const crossed = index - from;
    if (crossed >= 2) {
      for (const e of events) e.silent = true;
      if (!done) events.push({ type: 'stepStart', index, step: step(), skipped: crossed - 1, silent: true });
      lastRemaining = remainingOf();
      return events;
    }
    if (crossed === 1 && !done) events.push({ type: 'stepStart', index, step: step() });
    // 카운트다운: 이번 tick 에 넘은 3·2·1
    const rem = remainingOf();
    if (!done && rem != null) {
      for (const n of COUNTDOWN) {
        if (lastRemaining > n && rem <= n && step().durationSec > n) events.push({ type: 'countdown', n, index });
      }
      lastRemaining = rem;
    }
    return events;
  }

  function next() {
    if (done || paused || index < 0) return [];
    const t = now();
    if (t - lastNextAt < NEXT_DEBOUNCE_MS) return [];
    lastNextAt = t;
    advanceClock();
    const events = [];
    finishStep(active, events, false);
    if (!done) events.push({ type: 'stepStart', index, step: step() });
    return events;
  }

  function pause() { if (!paused) { advanceClock(); paused = true; } }
  function resume() { if (paused) { lastNow = now(); paused = false; } }

  function state() {
    const s = step();
    const elapsedSec = elapsedMs() / 1000;
    const doneSec = done ? totalSec : (startOffsets[index] ?? 0) + Math.min(elapsedSec, s ? estSec(s) : 0);
    return {
      index, step: s, paused, done,
      elapsedSec,
      remainingSec: s && s.durationSec != null ? s.durationSec - elapsedSec : null,
      progress: totalSec > 0 ? doneSec / totalSec : 0,
    };
  }

  const resultsList = () => [...results.values()].map(r => ({ ...r }));

  return { start, tick, next, pause, resume, state, results: resultsList };
}
