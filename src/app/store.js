// 작은 상태 저장소 (pub/sub). 화면은 구독해서 다시 그린다.

export function createStore(initial = {}) {
  let state = { ...initial };
  const subs = new Set();

  const get = () => state;

  function set(patch) {
    const p = typeof patch === 'function' ? patch(state) : patch;
    const changed = Object.keys(p).some(k => !Object.is(state[k], p[k]));
    if (!changed) return;
    const prev = state;
    state = { ...state, ...p };
    for (const fn of subs) {
      try { fn(state, prev); } catch (e) { console.error(e); }
    }
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  return { get, set, subscribe };
}
