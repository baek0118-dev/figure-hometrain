// 야간 저소음·화면 테마 자동 판단 — 설계 §11.2. 시각은 {hour, minute} 로 받는다(테스트용 주입).
// 시간은 메뉴 길이를 정하는 데 쓰지 않는다(사용자 결정 1011). 짧게 하고 싶으면 엄마가 직접 고른다.

const MORNING_HOUR = 6;
const DEFAULT_QUIET_FROM = 21;
const NIGHT_THEME_FROM = 19;
const OUTDOOR_DARK_FROM = 18;   // 해가 짧아져 18시면 어두움 → 밖이어도 야간 테마

const isNight = (hour, from) => hour >= from || hour < MORNING_HOUR;
const indoorOnly = places => places.length > 0 && places.every(p => p === 'home');

export function isQuietTime({ hour }, places, settings = {}) {
  if (settings.quietEnabled === false || !indoorOnly(places)) return false;
  return isNight(hour, settings.quietFromHour ?? DEFAULT_QUIET_FROM);
}

// 'day' | 'night' | 'outdoor'. settings.theme 가 'auto' 가 아니면 그 값.
export function autoTheme({ hour }, places, settings = {}) {
  if (settings.theme && settings.theme !== 'auto') return settings.theme;
  if (!indoorOnly(places)) return isNight(hour, OUTDOOR_DARK_FROM) ? 'night' : 'outdoor';
  return isNight(hour, NIGHT_THEME_FROM) ? 'night' : 'day';
}

export const clockOf = (d = new Date()) => ({ hour: d.getHours(), minute: d.getMinutes() });
