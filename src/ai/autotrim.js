// 영상 올린 뒤 자동 자르기 — 설계 §10.4. 먼저 움직임 규칙으로 자르고, AI 를 쓸 수 있으면 AI 구간으로 바꾼다.
import { extractFrames } from './frames.js';
import { motionWindow, buildTrimRequest, clampTrim } from './trim.js';
import { byId } from '../data/exercises.js';

export async function autoTrim({ media, ai, clipId, useAi = true }) {
  const m = await media();
  const clip = await m.getClip(clipId);
  if (!clip) return null;
  const ex = byId(clip.exerciseId);
  const fr = await extractFrames(clip.blob, { withJpeg: useAi && !!ai, durationHint: clip.durationSec });
  let result = { ...motionWindow(fr.diffs, { step: fr.step, duration: fr.duration }), by: 'rule' };
  await m.setTrim(clipId, result);
  if (useAi && ai) {
    const r = await ai.call(buildTrimRequest({ exerciseName: ex.name, checkpoints: ex.checkpoints, frames: fr.frames, durationSec: fr.duration }));
    const t = r.ok ? clampTrim(r.data, fr.duration) : null;
    if (t) {
      result = { ...t, by: 'ai', confidence: r.data.confidence, reason: String(r.data.reason ?? '').slice(0, 120) };
      await m.setTrim(clipId, result);
    } else {
      result.aiError = r.error ?? 'badtrim';
    }
  }
  return { ...result, duration: fr.duration };
}
