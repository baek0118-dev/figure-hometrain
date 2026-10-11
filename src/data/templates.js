// 고정 세트 — 설계 §2.1, §11.1. 웜업은 장소 무관(모두 서서·조용히), 쿨다운은 장소별.

// 요일 템플릿 — 설계 §5.1. 첫 칸이 그날 집중 블록. 0=일요일(쉬는 날, 원하면 가볍게).
export const WEEK_TEMPLATES = {
  0: ['flex', 'balance'],
  1: ['jump', 'spin', 'balance', 'flex'],
  2: ['balance', 'spin', 'flex', 'flex'],
  3: ['jump', 'balance', 'spin', 'flex'],
  4: ['spin', 'balance', 'flex'],
  5: ['jump', 'spin', 'balance', 'flex'],
  6: ['flex', 'balance', 'spin', 'flex'],
};
export const REST_WEEKDAYS = [0];

// 장소마다 쓸 수 있는 도구 (D4)
export const PLACE_EQUIPMENT = {
  home: ['none', 'mat', 'spinpad', 'wall'],
  park: ['none', 'rope'],
  playground: ['none', 'rope', 'trampoline'],
};

export const WARMUP = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06'];

const STANDING_COOLDOWN = ['C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17'];

// "오늘은 짧게"(엄마가 고른 시간 40분 미만)용 짧은 세트 — 약 3.5분 / 5분
export const WARMUP_SHORT = ['W01', 'W02', 'W03', 'W05'];
export const COOLDOWN_SHORT = {
  home: ['C02', 'C03', 'C05', 'C07'],
  park: ['C11', 'C13', 'C14', 'C17'],
  playground: ['C11', 'C13', 'C14', 'C17'],
};

export const COOLDOWN = {
  home: ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07'],
  park: STANDING_COOLDOWN,
  playground: STANDING_COOLDOWN,
};
