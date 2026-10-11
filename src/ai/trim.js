// 영상 알맞은 길이로 자르기 — 설계 §10.4. 원본은 그대로, 시작·끝 지점만 정한다(비파괴).
//  - 오프라인: 프레임 차이(움직임)로 가장 활발한 구간 → motionWindow
//  - 온라인: 프레임 사진들을 Claude 에 보내 "시범이 가장 깔끔한 한 번" 구간 → buildTrimRequest / clampTrim

export const TRIM_MODEL = 'claude-opus-5-5';
export const TRIM_RANGE = { minSec: 3, maxSec: 12 };
const PAD_SEC = 0.5;
const MAX_FRAMES = 32;
const FRAME_STEP = 0.5;
const r1 = x => Math.round(x * 10) / 10;

export function pickFrameTimes(duration, step = FRAME_STEP, max = MAX_FRAMES) {
  const s = duration / step <= max ? step : duration / max;
  const out = [];
  for (let t = 0; t < duration - 1e-9 && out.length < max; t += s) out.push(r1(t));
  return out;
}

// diffs[i] = 시각 i*step ~ (i+1)*step 사이 움직임
export function motionWindow(diffs, { step, duration, minSec = TRIM_RANGE.minSec, maxSec = TRIM_RANGE.maxSec }) {
  if (duration <= minSec) return { startSec: 0, endSec: r1(duration) };
  const max = Math.max(0, ...diffs);
  if (max < 0.02) return { startSec: 0, endSec: r1(Math.min(duration, maxSec)) };

  // 1) 활발한 구간들 (1초 이하 끊김은 이어 붙임) → 합이 가장 큰 구간
  const on = diffs.map(d => d >= 0.3 * max);
  const gap = Math.round(1 / step);
  const runs = [];
  let s = -1, lastOn = -Infinity;
  on.forEach((v, i) => {
    if (!v) return;
    if (s < 0) s = i;
    else if (i - lastOn > gap + 1) { runs.push([s, lastOn]); s = i; }
    lastOn = i;
  });
  if (s >= 0) runs.push([s, lastOn]);
  const sum = (a, b) => diffs.slice(a, b + 1).reduce((x, y) => x + y, 0);
  const [i0, i1] = runs.sort((a, b) => sum(b[0], b[1]) - sum(a[0], a[1]))[0];

  let start = Math.max(0, i0 * step - PAD_SEC);
  let end = Math.min(duration, (i1 + 1) * step + PAD_SEC);

  // 2) 너무 길면 그 안에서 가장 활발한 maxSec
  if (end - start > maxSec) {
    const n = Math.round(maxSec / step);
    const a = Math.floor(start / step), b = Math.ceil(end / step) - n;
    let best = a, bestSum = -1;
    for (let k = a; k <= b; k++) {
      const v = sum(k, k + n - 1);
      if (v > bestSum) { bestSum = v; best = k; }
    }
    start = best * step;
    end = start + maxSec;
  }
  // 3) 너무 짧으면 가운데 기준으로 minSec 까지 넓힘
  if (end - start < minSec) {
    const c = (start + end) / 2;
    start = Math.max(0, c - minSec / 2);
    end = Math.min(duration, start + minSec);
    start = Math.max(0, end - minSec);
  }
  return { startSec: r1(start), endSec: r1(end) };
}

export function clampTrim(t, duration, { maxSec = TRIM_RANGE.maxSec } = {}) {
  if (!t || !Number.isFinite(t.startSec) || !Number.isFinite(t.endSec)) return null;
  const start = Math.max(0, t.startSec);
  let end = Math.min(duration, t.endSec);
  if (end - start < 1) return null;
  if (end - start > maxSec) end = start + maxSec;
  return { startSec: r1(start), endSec: r1(end) };
}

export const TRIM_SCHEMA = {
  type: 'object',
  properties: {
    startSec: { type: 'number' },
    endSec: { type: 'number' },
    confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
    reason: { type: 'string' },
  },
  required: ['startSec', 'endSec', 'confidence', 'reason'],
  additionalProperties: false,
};

// frames = [{ t, base64 (jpeg, 긴 변 384px) }]
export function buildTrimRequest({ exerciseName, checkpoints, frames, durationSec }) {
  const content = [{
    type: 'text',
    text: `초등학생 피겨 선수가 집에서 찍은 지상훈련 시범 영상(${durationSec.toFixed(1)}초)의 프레임들입니다.
동작: ${exerciseName} / 체크포인트: ${checkpoints.join(', ')}
이 동작의 시범이 가장 깔끔하게 한 번 나오는 구간을 골라 주세요. 앞뒤 준비·정리 시간은 0.5초 정도만 남기고, 길이는 ${TRIM_RANGE.minSec}~${TRIM_RANGE.maxSec}초.
각 사진 앞의 t=…s 가 영상 속 시각입니다. 자세가 불분명하면 confidence 를 low 로. reason 은 엄마가 읽을 한 문장(한국어).`,
  }];
  for (const f of frames) {
    content.push({ type: 'text', text: `t=${f.t}s` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.base64 } });
  }
  return {
    model: TRIM_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TRIM_SCHEMA } },
    messages: [{ role: 'user', content }],
  };
}
