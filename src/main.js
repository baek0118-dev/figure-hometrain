// 앱 시작 — 저장소·소리·화면을 묶는다.
import { createStore } from './app/store.js';
import { createLocalStore } from './storage/local.js';
import { createRepo } from './storage/repo.js';
import { createAudio } from './engine/audio.js';
import { createWakeLock } from './engine/wakelock.js';
import { autoTheme, clockOf, isQuietTime } from './domain/modes.js';
import { localDate } from './domain/dates.js';
import { buildRulePlan } from './domain/planner.js';
import { mountStart } from './ui/screens/start.js';
import { mountMenu } from './ui/screens/menu.js';
import { mountPlayer } from './ui/screens/player.js';
import { mountEvaluate } from './ui/screens/evaluate.js';
import { mountStats } from './ui/screens/stats.js';
import { mountSettings } from './ui/screens/settings.js';
import { createMediaStore } from './storage/media.js';
import { createAiClient } from './ai/client.js';
import { createCoachFlow } from './ai/flow.js';

const params = new URLSearchParams(location.search);
// 디버그: ?now=2026-10-12T20:30 (시각 고정), ?speed=10 (타이머 배속), ?sandbox=1 (시험 모드: 기록을 따로 — review/ui.html)
const fixedNow = params.get('now') ? new Date(params.get('now')) : null;
const speed = Number(params.get('speed')) || 1;
const nowDate = () => fixedNow ?? new Date();
const today = () => localDate(nowDate());

const sandbox = params.get('sandbox') === '1';
const local = createLocalStore(globalThis.localStorage, sandbox ? { prefix: 'yuha-test.' } : {});
if (sandbox) document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;right:6px;bottom:6px;z-index:99;padding:2px 8px;border-radius:8px;background:#7e22ce;color:#fff;font:700 13px sans-serif;pointer-events:none">🧪 시험 모드</div>');
const repo = createRepo(local);
const audio = createAudio();
const wake = createWakeLock();
// AI (설계 §10): SDK 는 필요할 때만 불러온다. 키는 이 기기에만(local 'ai.key').
let sdkP = null;
const loadSdk = () => (sdkP ??= import('../vendor/anthropic-sdk-0.133.0.js'));
const ai = createAiClient({
  createSdk: key => ({ beta: { messages: { create: async params => {
    const { Anthropic } = await loadSdk();
    return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true }).beta.messages.create(params);
  } } } }),
  getKey: () => local.get('ai.key'),
  isOnline: () => navigator.onLine !== false,
  store: local,
});
const coach = createCoachFlow({ ai, repo, local });

const store = createStore({
  screen: 'start', places: repo.settings().places, short: null,
  plan: null, removed: [], libTab: 'jump', restDismissed: false, useRule: false, aiAvailable: false, restStretch: false,
});

const screens = Object.fromEntries([...document.querySelectorAll('[data-screen]')].map(el => [el.dataset.screen, el]));

function applyTheme() {
  const theme = autoTheme(clockOf(nowDate()), store.get().places, repo.settings());
  document.body.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--bg').trim());
}

function showScreen(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
}

store.subscribe((st, prev) => {
  if (st.screen !== prev.screen) showScreen(st.screen);
  if (st.places !== prev.places || st.themeTick !== prev.themeTick) applyTheme();
});

// 소리가 끊겼으면(화면 잠금 뒤 등) 다음 터치에서 다시 켬
document.addEventListener('pointerdown', () => { if (store.get().screen !== 'start' && audio.needsUnlock()) audio.unlock(); }, { capture: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') applyTheme(); });

// 오늘의 메뉴 (규칙 추천). 시간은 메뉴 길이를 자동으로 바꾸지 않고, 엄마가 고른 '짧게'만 반영.
function rebuildPlan() {
  // '스트레칭만'·안내 닫기는 그날만 (앱을 켜 둔 채 날짜가 바뀌면 지움)
  if (store.get().flagsDate !== today()) store.set({ flagsDate: today(), restStretch: false, restDismissed: false, loadDismissed: false, iceDismissed: false });
  const { places, short, restStretch } = store.get();
  const settings = repo.settings();
  const plan = buildRulePlan({
    date: today(), places,
    quiet: isQuietTime(clockOf(nowDate()), places, settings),
    history: repo.sessions(), progress: repo.progress(), settings,
    maxTotalSec: short ?? null, restStretch,
  });
  // AI 추천이 있으면(그리고 '규칙 추천으로 보기'가 아니면) 지금 조건으로 안전 검사 후 사용
  const aiPlan = coach.planFor({ date: plan.date, places, quiet: plan.quiet, history: repo.sessions(), progress: repo.progress(), settings, rulePlan: plan });
  store.set({ plan: aiPlan && !store.get().useRule ? aiPlan : plan, aiAvailable: !!aiPlan, removed: [] });
}

mountStart(screens.start, {
  store, repo, today,
  onStart: async () => {
    await audio.unlock();
    rebuildPlan();
    store.set({ screen: 'menu' });
  },
});

let mediaP = null;
const media = () => (mediaP ??= createMediaStore(sandbox ? { dbName: 'yuha-test-media' } : {}));

const evaluate = mountEvaluate(document.getElementById('modal'), {
  repo,
  onEvaluated: session => { coach.afterSession(session).then(r => store.set({ aiStatus: r.status })).catch(() => {}); },
  onDone: () => { rebuildPlan(); store.set({ screen: 'stats' }); },
});

const player = mountPlayer(screens.player, {
  store, repo, audio, wake, media, today, speed,
  onFinish: session => {
    store.set({ lastSession: session, screen: 'menu' });
    evaluate.open(session);
  },
});

mountMenu(screens.menu, {
  store, repo, today, rebuildPlan,
  onStart: () => {
    store.set({ screen: 'player' });
    player.begin(store.get().plan);
  },
});

mountStats(screens.stats, { store, repo, today });
mountSettings(screens.settings, { store, repo, local, audio, media, ai, today, rebuildPlan });

// 공원에서 끝낸 운동의 AI 추천: 앱을 열 때·인터넷이 돌아올 때 처리
const drainAi = () => coach.drain().then(() => { if (store.get().plan) rebuildPlan(); }).catch(() => {});
window.addEventListener('online', drainAi);
setTimeout(drainAi, 1500);
audio.setVolume(repo.settings().volume / 100);

applyTheme();
showScreen(store.get().screen);

// 오프라인(PWA): 서비스 워커 등록, 새 버전은 메뉴에서 '새로고침'으로 (운동 중엔 안 바뀜)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => store.set({ updateReady: w });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => {});
  // 처음 설치(clients.claim)도 controllerchange 를 일으킨다 → 원래 관리받던 페이지일 때(=업데이트)만 새로고침
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) { reloading = true; location.reload(); }
  });
}
// 기록이 지워지지 않게 저장소 유지 요청 (홈 화면 앱이면 대개 허용)
navigator.storage?.persist?.().then(ok => store.set({ persisted: ok })).catch(() => {});

// 디버그·검증용 손잡이
window.__app = { store, repo, local, audio, wake, today, player, evaluate, ai, coach };
