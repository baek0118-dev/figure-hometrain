// 스탯 화면 — 설계 §4.5. 4대 능력치 + 달력(빈 날은 그냥 빈칸) + 누적 칭찬.
import { statLevel, monthGrid, praiseLines } from '../../domain/xp.js';
import { CATEGORIES } from '../../domain/validate.js';
import { CAT_KO, CAT_ICON, esc } from '../format.js';

const ELEMENTS_KO = { jump: '왈츠 · 살코 · 토룹', spin: '업라이트 스핀', balance: '쓰리턴 · 에지', flex: '스파이럴 · 스플릿' };
const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function mountStats(el, { store, repo, today }) {
  let ym = null; // [year, month]

  function render() {
    const t = today();
    if (!ym) ym = [Number(t.slice(0, 4)), Number(t.slice(5, 7))];
    const [y, m] = ym;
    const stats = repo.stats();
    const bars = CATEGORIES.map(c => {
      const { level, into, need } = statLevel(stats.xp[c]);
      const pct = Math.round((into / need) * 100);
      return `<div class="rounded-2xl bg-surface2 p-4">
        <div class="flex items-baseline gap-3"><div class="text-3xl font-extrabold">${CAT_ICON[c]} ${CAT_KO[c]}</div>
          <div class="text-3xl font-extrabold text-accent">Lv${level}</div><div class="flex-1"></div>
          <div class="text-xl text-muted nums">${into}/${need}</div></div>
        <div class="mt-2 h-6 rounded-full bg-surface overflow-hidden"><div class="h-full rounded-full bg-accent" style="width:${pct}%"></div></div>
        <div class="mt-1 text-lg text-muted">→ ${ELEMENTS_KO[c]}</div></div>`;
    }).join('');
    const grid = monthGrid(y, m, repo.sessions());
    const cell = c => {
      if (!c) return '<div></div>';
      const isToday = c.date === t;
      const mark = c.state === 'stamp' ? '🏅' : c.state === 'done' ? '✓' : '';
      return `<div class="h-[58px] rounded-xl flex flex-col items-center justify-center ${isToday ? 'border-4 border-accent' : ''} ${c.state !== 'none' ? 'bg-surface2' : ''}">
        <div class="text-base text-muted leading-none">${c.day}</div><div class="text-2xl leading-tight">${mark}</div></div>`;
    };
    const praise = praiseLines(stats, { year: y, month: m });
    el.innerHTML = `
      <header class="h-[76px] shrink-0 px-6 flex items-center gap-3 border-b border-line bg-surface">
        <button data-action="back" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">◀ 메뉴로</button>
        <div class="text-3xl font-extrabold ml-2">내 스탯</div>
      </header>
      <div class="flex-1 min-h-0 grid grid-cols-2 gap-5 p-5">
        <section class="min-h-0 flex flex-col gap-3 rounded-3xl bg-surface p-5">
          <div class="text-2xl font-extrabold">4대 능력치</div>${bars}
        </section>
        <section class="min-h-0 flex flex-col gap-3">
          <div class="rounded-3xl bg-surface p-5">
            <div class="flex items-center gap-3 mb-2">
              <button data-action="prev" class="h-12 w-12 rounded-xl bg-surface2 text-2xl" aria-label="이전 달">‹</button>
              <div class="text-2xl font-extrabold flex-1 text-center">${y}년 ${m}월</div>
              <button data-action="next" class="h-12 w-12 rounded-xl bg-surface2 text-2xl" aria-label="다음 달">›</button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center text-lg font-bold text-muted mb-1">${WD.map(d => `<div>${d}</div>`).join('')}</div>
            <div data-ref="cal" class="grid grid-cols-7 gap-1">${grid.flat().map(cell).join('')}</div>
          </div>
          <div class="rounded-3xl bg-surface p-5 flex-1 min-h-0">
            <div class="text-2xl font-extrabold mb-2">지금까지 쌓은 노력</div>
            ${praise.map(l => `<div class="text-2xl font-bold">${esc(l)}</div>`).join('')}
          </div>
        </section>
      </div>`;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const [y, m] = ym;
    if (b.dataset.action === 'back') store.set({ screen: 'menu' });
    if (b.dataset.action === 'prev') { ym = m === 1 ? [y - 1, 12] : [y, m - 1]; render(); }
    if (b.dataset.action === 'next') { ym = m === 12 ? [y + 1, 1] : [y, m + 1]; render(); }
  });
  store.subscribe((st, prev) => { if (st.screen === 'stats' && prev.screen !== 'stats') { ym = null; render(); } });
  return { render };
}
