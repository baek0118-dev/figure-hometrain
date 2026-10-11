// 운동 중 화면 꺼짐 방지 — 설계 §3.4. 앱 전환 뒤 돌아오면 다시 요청. 미지원이면 'unsupported'(설정 안내 카드).

export function createWakeLock({ nav = globalThis.navigator, doc = globalThis.document } = {}) {
  let sentinel = null;
  let wanted = false;
  let status = nav?.wakeLock ? 'idle' : 'unsupported';

  async function request() {
    if (!nav?.wakeLock) return status;
    try {
      sentinel = await nav.wakeLock.request('screen');
      status = 'active';
      sentinel.addEventListener?.('release', () => { if (status === 'active') status = 'released'; });
    } catch {
      status = 'failed';
    }
    return status;
  }

  async function onVisible() {
    if (wanted && doc.visibilityState === 'visible' && status !== 'active') await request();
  }
  doc?.addEventListener?.('visibilitychange', onVisible);

  async function acquire() { wanted = true; return request(); }

  async function release() {
    wanted = false;
    try { await sentinel?.release(); } catch { /* 무시 */ }
    sentinel = null;
    if (status !== 'unsupported') status = 'idle';
    return status;
  }

  return { acquire, release, state: () => status };
}
