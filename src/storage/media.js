// 사용자 시범 영상 저장 (IndexedDB) — 설계 §3.2, §10.4. 동작당 클립 하나, 원본 Blob 그대로 + 자르기 지점.
// clip = { clipId, exerciseId, blob, mime, size, createdAt, durationSec, trim: {startSec, endSec, by} | null }

const STORE = 'clips';

const req = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = tx.onabort = () => reject(tx.error);
});
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function open(dbName) {
  const r = indexedDB.open(dbName, 1);
  r.onupgradeneeded = () => {
    const s = r.result.createObjectStore(STORE, { keyPath: 'clipId' });
    s.createIndex('byExercise', 'exerciseId', { unique: false });
  };
  return req(r);
}

export async function createMediaStore({ dbName = 'yuha-media', fresh = false } = {}) {
  if (fresh) await req(indexedDB.deleteDatabase(dbName));
  const db = await open(dbName);
  // 다른 탭·새 버전이 DB 를 지우거나 올리려 하면 이 연결을 닫아 막지 않게
  db.onversionchange = () => db.close();

  async function putClip({ exerciseId, blob, durationSec = null, trim = null }) {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    const old = await req(s.index('byExercise').getAllKeys(exerciseId));
    for (const k of old) s.delete(k);
    const clipId = newId();
    s.put({ clipId, exerciseId, blob, mime: blob.type || 'video/mp4', size: blob.size, createdAt: Date.now(), durationSec, trim });
    await done(tx);
    return clipId;
  }

  async function getClip(clipId) {
    return (await req(db.transaction(STORE).objectStore(STORE).get(clipId))) ?? null;
  }

  async function getByExercise(exerciseId) {
    const all = await req(db.transaction(STORE).objectStore(STORE).index('byExercise').getAll(exerciseId));
    return all[0] ?? null;
  }

  async function list() {
    const all = await req(db.transaction(STORE).objectStore(STORE).getAll());
    return all.map(({ blob, ...rest }) => rest);
  }

  async function setTrim(clipId, trim) {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    const c = await req(s.get(clipId));
    if (c) s.put({ ...c, trim });
    await done(tx);
  }

  async function deleteClip(clipId) {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(clipId);
    await done(tx);
  }

  // 저장 공간 (설정 화면 막대)
  async function estimate() {
    return (await navigator.storage?.estimate?.()) ?? { usage: null, quota: null };
  }

  return { putClip, getClip, getByExercise, list, setTrim, deleteClip, estimate };
}
