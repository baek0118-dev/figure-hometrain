// LocalStorage 래퍼 — 설계 §2.5. 키 접두사 'yuha.', 스키마 버전, 백업, 오류는 던지지 않고 돌려준다.
// iPad 사파리: 개인정보 보호 모드·저장소 막힘이면 접근 자체가 예외 → 'unavailable'.

export const SCHEMA_VERSION = 1;
const PREFIX = 'yuha.';

export function createLocalStore(backend = globalThis.localStorage, { now = () => Date.now() } = {}) {
  const k = key => PREFIX + key;

  function rawGet(key) {
    try { return backend.getItem(k(key)); } catch { return null; }
  }

  function parse(text) {
    if (text == null) return { ok: false };
    try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false, broken: true }; }
  }

  function get(key, fallback = null) {
    const main = parse(rawGet(key));
    if (main.ok) return main.value;
    if (main.broken) {
      const bak = parse(rawGet(`${key}.bak`));
      if (bak.ok) return bak.value;
    }
    return fallback;
  }

  function set(key, value, { backup = false } = {}) {
    try {
      if (backup) {
        const prev = rawGet(key);
        if (prev != null && parse(prev).ok) backend.setItem(k(`${key}.bak`), prev);
      }
      backend.setItem(k(key), JSON.stringify(value));
      return { ok: true };
    } catch (e) {
      const quota = e?.name === 'QuotaExceededError' || /quota/i.test(e?.message ?? '');
      return { ok: false, error: quota ? 'quota' : 'unavailable' };
    }
  }

  function remove(key) {
    try { backend.removeItem(k(key)); } catch { /* 무시 */ }
  }

  // 처음 열 때 스키마 버전 기록 (나중에 버전이 오르면 여기서 마이그레이션)
  const meta = get('meta');
  if (!meta) set('meta', { schemaVersion: SCHEMA_VERSION, createdAt: now() });

  return { get, set, remove };
}
