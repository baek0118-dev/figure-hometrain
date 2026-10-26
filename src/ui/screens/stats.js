// 스탯 화면 — 설계 §4.5. 4대 능력치 + 달력(빈 날은 그냥 빈칸) + 누적 칭찬.
// 메모 2026-10-12-app-flow-ui-design §2.4: 오늘 일지 도장 카드(평가에서 빼고 여기·메뉴로), 세로에서는 위아래로 쌓기.
import { statLevel, monthGrid, praiseLines } from '../../domain/xp.js';
import { CATEGORIES } from '../../domain/validate.js';
import { CAT_KO, CAT_EN, esc, plain } from '../format.js';
import { icon, catDot } from '../icons.js';

const ELEMENTS_KO = { jump: '왈츠 · 살코 · 토룹', spin: '업라이트 스핀', balance: '쓰리턴 · 에지', flex: '스파이럴 · 스플릿' };
const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function mountStats(el, { store, repo, today }) {
  let ym = null; // [year, month]
  let stamped = false; // 방금 도장 받음(축하 한 줄)

  function render() {
    const t = today();
    if (!ym) ym = [Number(t.slice(0, 4)), Number(t.slice(5, 7))];
    const [y, m] = ym;
    const stats = repo.stats();
    const bars = CATEGORIES.map(c => {
      const { level, into, need } = statLevel(stats.xp[c]);
      const pct = Math.round((into / need) * 100);
      return `<div class="py-4 border-t border-line">
        <div class="flex items-center gap-3">${catDot(c, 10)}<div class="text-xl portrait:text-lg font-semibold whitespace-nowrap">${CAT_KO[c]}</div>
          <div class="h-7 px-2.5 rounded-full text-sm font-bold text-accent inline-flex items-center nums" style="background:color-mix(in srgb, var(--accent) 14%, transparent)">Lv ${level}</div><div class="flex-1"></div>
          <div class="text-base font-semibold text-muted nums">${into} / ${need}</div></div>
        <div class="mt-2.5 h-2 rounded-full bg-surface2 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:var(--cat-${c}, var(--accent))"></div></div>
        <div class="mt-1.5 text-sm font-medium text-muted">${ELEMENTS_KO[c]}</div></div>`;
    }).join('');
    const grid = monthGrid(y, m, repo.sessions());
    const cell = c => {
      if (!c) return '<div></div>';
      const isToday = c.date === t;
      const mark = c.state === 'stamp' ? `<span class="text-accent">${icon('medal')}</span>` : c.state === 'done' ? `<span class="text-accent">${icon('check')}</span>` : '';
      return `<div class="h-[54px] rounded-xl flex flex-col items-center justify-center gap-0.5 ${isToday ? 'ring-2 ring-[color:var(--accent)]' : ''} ${c.state !== 'none' ? 'bg-surface2' : ''}">
        <div class="text-[15px] font-semibold ${c.state !== 'none' ? '' : 'text-muted'} leading-none nums">${c.day}</div><div class="text-lg leading-none h-[18px] flex">${mark}</div></div>`;
    };
    const praise = praiseLines(stats, { year: y, month: m });
    const pending = repo.sessions().filter(x => x.date === t && !x.stamp);
    const stampCard = pending.length
      ? `<button data-action="stamp" data-session="${esc(pending.map(x => x.id).join(','))}" class="card shrink-0 mx-6 portrait:mx-3 mt-1 min-h-[64px] rounded-2xl px-5 text-left text-lg font-semibold flex items-center gap-3 border-2 border-accent">
          <span class="text-accent text-2xl">${icon('book')}</span><span class="flex-1">노트에 일지 썼으면 눌러서 도장 받기</span><span class="text-accent text-2xl">${icon('medal')}</span></button>`
      : stamped ? `<div class="shrink-0 mx-6 portrait:mx-3 mt-1 text-2xl font-bold text-accent flex items-center gap-2">${icon('medal')}도장 쾅! 일지까지 최고야</div>` : '';
    el.innerHTML = `
      <header class="h-[76px] shrink-0 px-6 portrait:px-3 flex items-center gap-4">
        <button data-action="back" class="h-12 pl-3 pr-4 rounded-xl text-base font-semibold bg-surface2 flex items-center gap-1.5">${icon('back')}메뉴</button>
        <div class="text-[28px] font-bold tracking-tight">내 스탯</div>
      </header>
      ${stampCard}
      <div class="flex-1 min-h-0 grid grid-cols-2 portrait:grid-cols-1 portrait:scroll-y gap-4 p-6 pt-4 portrait:p-3 portrait:gap-3">
        <section class="card min-h-0 flex flex-col rounded-3xl px-6 py-5">
          <div class="kicker">Skills</div><div class="text-xl font-bold tracking-tight mb-1">4대 능력치</div><div class="[&>div:first-child]:border-t-0">${bars}</div>
        </section>
        <section class="min-h-0 flex flex-col gap-4 portrait:gap-3">
          <div class="card rounded-3xl px-5 py-4">
            <div class="flex items-center gap-3 mb-2">
              <button data-action="prev" class="h-11 w-11 rounded-xl bg-surface2 text-xl flex items-center justify-center" aria-label="이전 달">${icon('chevronLeft')}</button>
              <div class="text-xl font-bold flex-1 text-center nums">${y}년 ${m}월</div>
              <button data-action="next" class="h-11 w-11 rounded-xl bg-surface2 text-xl flex items-center justify-center" aria-label="다음 달">${icon('chevronRight')}</button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-muted mb-1">${WD.map(d => `<div>${d}</div>`).join('')}</div>
            <div data-ref="cal" class="grid grid-cols-7 gap-1">${grid.flat().map(cell).join('')}</div>
          </div>
          <div class="card rounded-3xl px-6 py-5 flex-1 min-h-0">
            <div class="kicker">So far</div><div class="text-xl font-bold tracking-tight mb-2">지금까지 쌓은 노력</div>
            ${praise.map(l => `<div class="text-lg font-semibold leading-relaxed">${esc(plain(l))}</div>`).join('')}
          </div>
        </section>
      </div>`;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const [y, m] = ym;
    if (b.dataset.action === 'back') store.set({ screen: 'menu' });
    if (b.dataset.action === 'stamp') { b.dataset.session.split(',').forEach(id => repo.stampLater(id)); stamped = true; render(); }
    if (b.dataset.action === 'prev') { ym = m === 1 ? [y - 1, 12] : [y, m - 1]; render(); }
    if (b.dataset.action === 'next') { ym = m === 12 ? [y + 1, 1] : [y, m + 1]; render(); }
  });
  store.subscribe((st, prev) => { if (st.screen === 'stats' && prev.screen !== 'stats') { ym = null; stamped = false; render(); } });
  return { render };
}
