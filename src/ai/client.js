// Claude API 호출 래퍼 — 설계 §10.2, §10.5. SDK·키·온라인 여부·저장소·시계는 주입(테스트에선 가짜).
// 실제 앱: createSdk = key => new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })

export const MONTHLY_LIMIT_USD = 20;   // 이 앱 자체 월 한도 (D6: 크레딧은 다른 일과 같이 씀)
const WARN_RATIO = 0.8;
const MAX_ATTEMPTS = 3;
const USAGE_KEY = 'yuha.ai.usage';
const QUEUE_KEY = 'yuha.ai.queue';

// claude-opus-5-5, 100만 토큰당 USD (캐시 쓰기 = 입력 × 1.25)
const PRICE = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 };

export function costUsd(u = {}) {
  return ((u.input_tokens ?? 0) * PRICE.input +
    (u.output_tokens ?? 0) * PRICE.output +
    (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
    (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1e6;
}

export function parseJsonResponse(resp) {
  if (resp?.stop_reason === 'refusal') return { ok: false, error: 'refusal' };
  if (resp?.stop_reason === 'max_tokens') return { ok: false, error: 'truncated' };
  const text = resp?.content?.find(b => b.type === 'text')?.text;
  if (typeof text !== 'string') return { ok: false, error: 'badjson' };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'badjson' };
  }
}

function classify(err) {
  const s = err?.status;
  if (s === 401 || s === 403) return 'auth';
  if (s === 429) return 'rate';
  if (typeof s === 'number' && s >= 500) return 'server';
  if (typeof s === 'number') return 'request';
  return 'offline'; // 상태 코드 없음 = 연결 실패
}
const RETRYABLE = new Set(['offline', 'rate', 'server', 'budget']);

export function createAiClient({ createSdk, getKey, isOnline, store, now = () => new Date() }) {
  const monthOf = () => {
    const d = now();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  function usage() {
    const u = store.get(USAGE_KEY);
    return u && u.month === monthOf() ? u : { month: monthOf(), calls: 0, usd: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  }

  function addUsage(u) {
    const cur = usage();
    store.set(USAGE_KEY, {
      ...cur,
      calls: cur.calls + 1,
      usd: (cur.usd ?? 0) + costUsd(u),
      input: (cur.input ?? 0) + (u?.input_tokens ?? 0),
      output: (cur.output ?? 0) + (u?.output_tokens ?? 0),
      cacheRead: (cur.cacheRead ?? 0) + (u?.cache_read_input_tokens ?? 0),
      cacheWrite: (cur.cacheWrite ?? 0) + (u?.cache_creation_input_tokens ?? 0),
    });
  }

  function budget() {
    const usd = usage().usd ?? 0;
    return { usd, limit: MONTHLY_LIMIT_USD, warn: usd >= MONTHLY_LIMIT_USD * WARN_RATIO, blocked: usd >= MONTHLY_LIMIT_USD };
  }

  async function call(params) {
    const key = getKey();
    if (!key) return { ok: false, error: 'nokey' };
    if (!isOnline()) return { ok: false, error: 'offline' };
    if (budget().blocked) return { ok: false, error: 'budget' };
    let resp;
    try {
      resp = await createSdk(key).beta.messages.create(params);
    } catch (err) {
      return { ok: false, error: classify(err), status: err?.status };
    }
    if (resp?.usage) addUsage(resp.usage);
    const parsed = parseJsonResponse(resp);
    return parsed.ok ? { ...parsed, usage: resp.usage } : parsed;
  }

  // ── 대기열 (오프라인에서 끝난 운동 → 다음에 온라인일 때 AI 추천) ──
  const pending = () => store.get(QUEUE_KEY) ?? [];

  function enqueue(job) {
    const q = pending().filter(j => j.id !== job.id);
    q.push({ ...job, attempts: 0 });
    store.set(QUEUE_KEY, q);
  }

  // buildParams: 저장은 작게(id·payload), 요청은 처리할 때 만든다
  async function drain(handler, buildParams = job => job.params) {
    if (!getKey() || !isOnline()) return;
    const q = pending();
    const keep = [];
    for (const job of q) {
      const result = await call(await buildParams(job));
      if (result.ok) { await handler(job, result); continue; }
      const attempts = job.attempts + 1;
      if (RETRYABLE.has(result.error) && attempts < MAX_ATTEMPTS) keep.push({ ...job, attempts });
      else await handler(job, result);
    }
    store.set(QUEUE_KEY, keep);
  }

  return { call, usage, budget, enqueue, pending, drain };
}
