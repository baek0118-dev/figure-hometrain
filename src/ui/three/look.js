// 사람형 꾸미기 값 — 시험 페이지 '🎨 꾸미기'(사용자 요청 2026-10-12). 신발 좌우 색은 꾸미기에서 바꾸지 않는다(좌우 구분용).
export const HAIRS = { Buns: '번 머리', Long: '긴 머리', SimpleParted: '가르마 단발', BuzzedFemale: '아주 짧은 머리' };
export const DEFAULT_LOOK = { hair: 'Buns', hairColor: '#3a2a22', skin: '#e9b99b', leotard: '#d4537e', leggings: '#3c3489' };
export const LOOK_LABELS = { hairColor: '머리색', skin: '피부', leotard: '레오타드', leggings: '레깅스' };

const HEX = /^#[0-9a-f]{6}$/i;

// 저장값·붙여 넣은 값을 믿지 않고 하나씩 확인 — 이상하면 그 칸만 기본값
export function parseLook(o) {
  const out = { ...DEFAULT_LOOK };
  if (!o || typeof o !== 'object') return out;
  if (typeof o.hair === 'string' && o.hair in HAIRS) out.hair = o.hair;
  for (const k of Object.keys(LOOK_LABELS)) if (typeof o[k] === 'string' && HEX.test(o[k])) out[k] = o[k].toLowerCase();
  return out;
}

export const lookToText = l => [`머리:${l.hair}`, ...Object.entries(LOOK_LABELS).map(([k, label]) => `${label}:${l[k]}`)].join(' ');
