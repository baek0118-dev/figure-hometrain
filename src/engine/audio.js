// Web Audio 소리 재생 — 설계 §3.3. iOS: 첫 터치 안에서 AudioContext 생성·resume·무음 버퍼(언락),
// 화면 잠금·앱 전환 뒤엔 'suspended'/'interrupted' → 다음 터치·visibilitychange 에서 다시 resume.

import { CUES } from './cues.js';

const QUIET_FACTOR = 0.6;   // 야간 저소음 (아파트)
const MASTER = 0.9;

export function createAudio({ win = globalThis } = {}) {
  let ctx = null;
  let master = null;
  let volume = 0.8;
  let quiet = false;
  const log = [];            // 디버그·검증용: 재생한 소리 이름

  const Ctx = win.AudioContext ?? win.webkitAudioContext;

  function applyGain() {
    if (master) master.gain.value = volume * MASTER * (quiet ? QUIET_FACTOR : 1);
  }

  // 반드시 사용자 터치 핸들러 안에서 부른다
  async function unlock() {
    if (!Ctx) return 'unsupported';
    if (!ctx) {
      ctx = new Ctx();
      master = ctx.createGain();
      master.connect(ctx.destination);
      applyGain();
      // 무음 모드에서도 소리 (Safari Audio Session API, 지원할 때만)
      try { if (win.navigator?.audioSession) win.navigator.audioSession.type = 'playback'; } catch { /* 무시 */ }
    }
    try { await ctx.resume(); } catch { /* 무시 */ }
    // iOS 언락: 무음 버퍼 한 번
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.state;
  }

  const state = () => (ctx ? ctx.state : 'none');
  const needsUnlock = () => !ctx || ctx.state !== 'running';

  function play(name) {
    const notes = CUES[name];
    if (!notes || !ctx || ctx.state !== 'running') return 0;
    const t0 = ctx.currentTime + 0.01;
    for (const nt of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = nt.type;
      osc.frequency.value = nt.freq;
      // 딸깍 소리 없게 짧은 페이드
      g.gain.setValueAtTime(0, t0 + nt.at);
      g.gain.linearRampToValueAtTime(nt.gain, t0 + nt.at + 0.01);
      g.gain.setValueAtTime(nt.gain, t0 + nt.at + nt.dur - 0.03);
      g.gain.linearRampToValueAtTime(0, t0 + nt.at + nt.dur);
      osc.connect(g).connect(master);
      osc.start(t0 + nt.at);
      osc.stop(t0 + nt.at + nt.dur + 0.02);
    }
    log.push(name);
    if (log.length > 200) log.shift();
    return notes.length;
  }

  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); applyGain(); }
  function setQuiet(q) { quiet = !!q; applyGain(); }
  const gain = () => (master ? master.gain.value : null);

  return { unlock, state, needsUnlock, play, setVolume, setQuiet, gain, log };
}
