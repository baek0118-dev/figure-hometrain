// 화면 표시용 글자 도우미
import { byId } from '../data/exercises.js';
import { weekday } from '../domain/dates.js';

export const CAT_KO = { jump: '점프 탄력', spin: '스핀 코어', balance: '한발 밸런스', flex: '유연성', warmup: '웜업', cooldown: '쿨다운' };
// 디자인 A(2026-10-26): 이모지 대신 영어 작은 제목 + 색 점(icons.js catDot)
export const CAT_EN = { jump: 'Jump', spin: 'Spin', balance: 'Balance', flex: 'Flexibility', warmup: 'Warm-up', cooldown: 'Cool-down' };
export const PLACE_KO = { home: '집', park: '공원', playground: '놀이터' };
export const MODE_BADGE = {
  normal: null,
  progress: '레벨업 데이',
  recovery: '회복 데이',
  rest: '쉬는 날 · 가볍게',
};
const WD = ['일', '월', '화', '수', '목', '금', '토'];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function dateKo(date) {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${WD[weekday(date)]})`;
}

export function amountText(item) {
  const ex = byId(item.exerciseId);
  const one = item.reps != null ? `${item.reps}회` : `${item.workSec}초`;
  return `${item.sets}×${one}${ex?.perSide ? ' 좌우' : ''}`;
}

export const minutes = sec => Math.round(sec / 60);

// 응원 글(domain/cheer·xp)의 이모지를 화면에서는 빼고 글만 — 디자인 A(2026-10-26)
export const plain = s => String(s ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
