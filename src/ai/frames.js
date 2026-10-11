// 영상 → 프레임 사진(AI 용 JPEG)과 움직임 값(규칙 자르기용) — 설계 §10.4. 브라우저 전용.
import { pickFrameTimes } from './trim.js';

const LONG_SIDE = 384;      // AI 로 보낼 사진 긴 변
const TINY = [32, 24];      // 움직임 계산용 아주 작은 흑백

function seek(v, t) {
  return new Promise((res, rej) => {
    const done = () => { v.removeEventListener('seeked', done); res(); };
    v.addEventListener('seeked', done);
    v.addEventListener('error', rej, { once: true });
    v.currentTime = t;
  });
}

async function loadVideo(blob) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = URL.createObjectURL(blob);
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; });
  // webm 녹화본은 길이가 Infinity 인 경우가 있어 끝으로 한 번 보내 길이를 얻는다
  if (!Number.isFinite(v.duration)) { v.currentTime = 1e7; await new Promise(r => { v.ondurationchange = r; setTimeout(r, 1500); }); }
  return v;
}

// 반환: { duration, step, frames:[{t, base64}], diffs:[...] }
export async function extractFrames(blob, { withJpeg = true, durationHint = null } = {}) {
  const v = await loadVideo(blob);
  const duration = Number.isFinite(v.duration) ? v.duration : (durationHint ?? 0);
  const times = pickFrameTimes(duration);
  const step = times.length > 1 ? times[1] - times[0] : duration;
  const w = v.videoWidth || 320, h = v.videoHeight || 240;
  const scale = LONG_SIDE / Math.max(w, h);
  const big = Object.assign(document.createElement('canvas'), { width: Math.round(w * scale), height: Math.round(h * scale) });
  const tiny = Object.assign(document.createElement('canvas'), { width: TINY[0], height: TINY[1] });
  const bg = big.getContext('2d'), tg = tiny.getContext('2d', { willReadFrequently: true });
  const frames = [], grays = [];
  for (const t of times) {
    await seek(v, Math.min(t, Math.max(0, duration - 0.05)));
    tg.drawImage(v, 0, 0, TINY[0], TINY[1]);
    const px = tg.getImageData(0, 0, TINY[0], TINY[1]).data;
    const g = new Float32Array(TINY[0] * TINY[1]);
    for (let i = 0; i < g.length; i++) g[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) / 255;
    grays.push(g);
    if (withJpeg) {
      bg.drawImage(v, 0, 0, big.width, big.height);
      frames.push({ t, base64: big.toDataURL('image/jpeg', 0.7).split(',')[1] });
    }
  }
  URL.revokeObjectURL(v.src);
  const diffs = grays.slice(1).map((g, i) => {
    let s = 0;
    for (let k = 0; k < g.length; k++) s += Math.abs(g[k] - grays[i][k]);
    return s / g.length;
  });
  return { duration, step, frames, diffs };
}
