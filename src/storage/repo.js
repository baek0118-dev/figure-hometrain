// 기록·설정 저장소 — 설계 §2.2~2.5. 세션 기록이 원본, 진도(progress)·통계(stats)는 다시 계산 가능한 캐시.
// AI 키('ai.key')는 여기서 다루지 않고, 내보내기에도 절대 넣지 않는다.

import { SCHEMA_VERSION } from './local.js';
import { emptyProgress, applyEvaluation, recordRemovals } from '../domain/adapt.js';
import { rebuildStats } from '../domain/xp.js';

const APP = 'yuha-figure-hometrain';

export const DEFAULT_SETTINGS = {
  volume: 80,
  beeps: true,
  chimes: true,
  theme: 'auto',          // auto | day | night | outdoor
  quietEnabled: true,     // 아파트 야간 저소음 (D5)
  quietFromHour: 21,
  places: ['home'],       // 마지막으로 고른 장소
  hidden: [],             // 보관함에서 숨긴 동작
  videoMap: {},           // exerciseId → clipId (IndexedDB)
  examDate: null,         // 'YYYY-MM-DD' 심사일 (AI 입력용)
  growthSpurt: false,     // "요즘 키가 빨리 커요" → 점프 착지 상한 40 (domain/load.js)
  iceWeek: null,          // { weekStart: 월요일, hours } 이번 주 빙상 시간 (엄마가 설정에서)
};

const byTime = (a, b) => a.date.localeCompare(b.date) || (a.startedAt ?? 0) - (b.startedAt ?? 0);

// 기록을 처음부터 다시 돌려 진도 계산 (빼기 기록 → 평가 순)
export function replayProgress(sessions) {
  let p = emptyProgress();
  for (const s of [...sessions].sort(byTime)) {
    if (s.removed?.length) p = recordRemovals(p, s.removed, s.date);
    if (s.evaluation) p = applyEvaluation(p, s, s.evaluation);
  }
  return p;
}

export function createRepo(store) {
  const sessions = () => store.get('sessions', []);

  function refreshCaches(list) {
    store.set('progress', replayProgress(list));
    store.set('stats', rebuildStats(list));
  }

  function writeSessions(list) {
    const r = store.set('sessions', list, { backup: true });
    if (r.ok) refreshCaches(list);
    return r;
  }

  function saveSession(session) {
    const list = sessions().filter(s => s.id !== session.id);
    list.push(session);
    list.sort(byTime);
    return writeSessions(list);
  }

  function stampLater(sessionId) {
    const list = sessions().map(s => (s.id === sessionId ? { ...s, journalChecked: true, stamp: true } : s));
    return writeSessions(list);
  }

  const progress = () => store.get('progress') ?? replayProgress(sessions());
  const stats = () => store.get('stats') ?? rebuildStats(sessions());
  const settings = () => ({ ...DEFAULT_SETTINGS, ...store.get('settings', {}) });
  const saveSettings = patch => store.set('settings', { ...store.get('settings', {}), ...patch });

  function exportJson() {
    return {
      app: APP,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      sessions: sessions(),
      settings: store.get('settings', {}),
    };
  }

  function importJson(obj) {
    if (obj?.app !== APP) return { ok: false, error: 'notOurs' };
    if (!(obj.schemaVersion <= SCHEMA_VERSION)) return { ok: false, error: 'newerVersion' };
    if (!Array.isArray(obj.sessions) || (obj.settings != null && typeof obj.settings !== 'object')) {
      return { ok: false, error: 'broken' };
    }
    const r = writeSessions([...obj.sessions].sort(byTime));
    if (!r.ok) return r;
    store.set('settings', obj.settings ?? {});
    return { ok: true, sessions: obj.sessions.length };
  }

  const rebuild = () => refreshCaches(sessions());

  return { sessions, saveSession, stampLater, progress, stats, settings, saveSettings, exportJson, importJson, rebuild };
}
