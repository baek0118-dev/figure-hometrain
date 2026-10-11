// 첫 화면 — "탭해서 시작" (오디오 언락이 이 터치 안에서 일어난다) + 듀오링고식 인사
import { welcomeMessage } from '../../domain/cheer.js';

const isStandalone = () =>
  globalThis.navigator?.standalone === true || globalThis.matchMedia?.('(display-mode: standalone)').matches;

export function mountStart(el, { store, repo, today, onStart }) {
  function render() {
    const sessions = repo.sessions();
    const last = sessions.at(-1)?.date ?? null;
    const msg = welcomeMessage({ today: today(), lastSessionDate: last });
    el.innerHTML = `
      <button data-action="start" class="flex-1 w-full flex flex-col items-center justify-center gap-6 bg-bg text-ink">
        <div class="text-[96px] leading-none">⛸</div>
        <div class="text-5xl font-extrabold">${msg.title}</div>
        <div class="text-2xl text-muted">${msg.body}</div>
        ${msg.badge === 'comeback' ? '<div class="text-xl px-5 py-2 rounded-full bg-accent text-white font-bold">🏆 돌아온 챔피언 배지 획득!</div>' : ''}
        <div class="mt-6 text-4xl font-extrabold px-14 py-8 rounded-[32px] bg-accent text-white shadow-lg">👆 탭해서 시작</div>
        ${isStandalone() ? '' : '<div class="text-lg text-muted mt-2">홈 화면 아이콘으로 쓰면 기록이 안전해요 · 공유 › 홈 화면에 추가</div>'}
      </button>`;
  }
  el.addEventListener('pointerup', e => {
    if (e.target.closest('[data-action="start"]')) onStart();
  });
  render();
  return { render };
}
