// 첫 화면 — "탭해서 시작" (오디오 언락이 이 터치 안에서 일어난다) + 듀오링고식 인사
import { welcomeMessage } from '../../domain/cheer.js';
import { plain } from '../format.js';
import { icon } from '../icons.js';

const isStandalone = () =>
  globalThis.navigator?.standalone === true || globalThis.matchMedia?.('(display-mode: standalone)').matches;

export function mountStart(el, { store, repo, today, onStart }) {
  function render() {
    const sessions = repo.sessions();
    const last = sessions.at(-1)?.date ?? null;
    const msg = welcomeMessage({ today: today(), lastSessionDate: last });
    // 디자인 A(2026-10-26): 앱 이름·인사·큰 시작 버튼, 이모지 없이
    el.innerHTML = `
      <button data-action="start" class="flex-1 w-full flex flex-col items-center justify-center gap-5 bg-bg text-ink px-6">
        <div class="kicker">Figure Home Training</div>
        <div class="text-5xl portrait:text-4xl font-bold tracking-tight text-center leading-tight">${plain(msg.title)}</div>
        <div class="text-xl portrait:text-lg font-medium text-muted text-center">${plain(msg.body)}</div>
        ${msg.badge === 'comeback' ? `<div class="h-10 px-4 rounded-full text-base font-bold text-accent inline-flex items-center gap-2" style="background:color-mix(in srgb, var(--accent) 14%, transparent)">${icon('medal')}돌아온 챔피언 배지 획득!</div>` : ''}
        <div class="mt-6 h-[88px] px-14 rounded-[26px] bg-ink text-bg text-3xl font-bold tracking-tight flex items-center gap-4">${icon('play')}탭해서 시작</div>
        ${isStandalone() ? '' : '<div class="text-base text-muted mt-2 text-center">홈 화면 아이콘으로 쓰면 기록이 안전해요 · 공유 › 홈 화면에 추가</div>'}
      </button>`;
  }
  el.addEventListener('pointerup', e => {
    if (e.target.closest('[data-action="start"]')) onStart();
  });
  render();
  return { render };
}
