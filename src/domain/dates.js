// 'YYYY-MM-DD' 로컬 날짜 문자열 계산 (UTC 자정으로 계산해 시간대 영향 없음)

const toUtc = s => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = ms => new Date(ms).toISOString().slice(0, 10);
const DAY_MS = 86400000;

export const weekday = s => new Date(toUtc(s)).getUTCDay(); // 0=일
export const addDays = (s, n) => fromUtc(toUtc(s) + n * DAY_MS);
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS); // b - a

// 기기 로컬 시각 → 'YYYY-MM-DD'
export function localDate(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
