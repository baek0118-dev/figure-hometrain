// 소리 정의와 타이머 이벤트 → 소리 매핑 — 설계 §3.3. 파일 없이 오실레이터로 만든다(오프라인·용량 0).
// note = { freq(Hz), at(시작 초), dur(초), type(oscillator), gain(0~1) }

const n = (freq, at, dur, type = 'square', gain = 0.5) => ({ freq, at, dur, type, gain });
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, G4 = 392;

export const CUES = {
  count: [n(880, 0, 0.12)],                                     // 3·2·1
  go: [n(1320, 0, 0.35)],                                       // 운동 시작
  rest: [n(660, 0, 0.18, 'sine', 0.6), n(523.25, 0.2, 0.25, 'sine', 0.6)], // 휴식 (내려가는 두 음)
  switch: [n(988, 0, 0.12, 'triangle'), n(988, 0.18, 0.12, 'triangle')],  // 반대쪽
  setDone: [n(C5, 0, 0.12, 'triangle', 0.7), n(E5, 0.12, 0.12, 'triangle', 0.7), n(G5, 0.24, 0.25, 'triangle', 0.7)],
  next: [n(G4, 0, 0.18, 'sine', 0.7), n(C5, 0.2, 0.3, 'sine', 0.7), n(G4, 0.6, 0.18, 'sine', 0.7), n(C5, 0.8, 0.3, 'sine', 0.7)],
  finish: [n(C5, 0, 0.15, 'triangle', 0.7), n(E5, 0.15, 0.15, 'triangle', 0.7), n(G5, 0.3, 0.15, 'triangle', 0.7), n(C6, 0.45, 0.6, 'triangle', 0.7)],
  tap: [n(1500, 0, 0.05, 'sine', 0.4)],                         // NEXT 눌림 확인
};

// beeps: 카운트·시작·휴식·반대쪽 / chimes: 세트 완료·다음 동작·세션 완료
export function cueFor(ev, { beeps = true, chimes = true } = {}) {
  if (ev.silent) return null;
  switch (ev.type) {
    case 'countdown': return beeps ? 'count' : null;
    case 'stepStart': {
      const kind = ev.step?.kind;
      if (kind === 'work') return beeps ? 'go' : null;
      if (kind === 'rest') return beeps ? 'rest' : null;
      if (kind === 'switch') return beeps ? 'switch' : null;
      return null;
    }
    case 'setComplete': return chimes ? 'setDone' : null;
    case 'exerciseChange': return chimes ? 'next' : null;
    case 'done': return chimes ? 'finish' : null;
    default: return null;
  }
}
