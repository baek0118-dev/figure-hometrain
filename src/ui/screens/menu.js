// 메뉴 화면 — 설계 메모 2026-10-12-app-flow-ui-design §2.3. 유하 혼자 쓰는 한 화면:
// 위 장소·짧게, 가운데 블록 카드(누르면 그 블록 바꾸기 창), 아래 큰 시작. 가로·세로(portrait:) 둘 다.
// 모양은 디자인 A 클린 라이트(2026-10-26): 흰 카드·색 점·선 아이콘, 굵기 낮춤.
import { byId } from '../../data/exercises.js';
import { candidatesFor, makeItem } from '../../domain/planner.js';
import { removeItem, addItem, trimToFit, blockItems } from '../../domain/cart.js';
import { CAT_KO, CAT_EN, PLACE_KO, MODE_BADGE, esc, amountText, minutes } from '../format.js';
import { weekday } from '../../domain/dates.js';
import { icon, catDot } from '../icons.js';
import { weeklyLoad, loadMessage } from '../../domain/load.js';

const SHORT_OPTIONS = [[null, '평소'], [25 * 60, '25분'], [15 * 60, '15분']];
const ERR_KO = { full: '오늘은 이 정도면 충분해!', duplicate: '이미 담겨 있어요', unknown: '담을 수 없는 동작이에요' };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const dateLine = date => { const [, m, d] = date.split('-').map(Number); return `${m}월 ${d}일 ${WD[weekday(date)]}요일`; };

export function mountMenu(el, { store, repo, today, rebuildPlan, onStart }) {
  let toast = '';
  let toastTimer = null;
  let editSlot = null; // 바꾸기 창이 열린 블록
  const flash = msg => {
    toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast = ''; render(); }, 2200);
  };

  function header(st) {
    const placeBtn = p => `<button data-action="place" data-place="${p}" class="h-11 px-4 short:h-9 short:px-3 text-lg short:text-base ${st.places.includes(p) ? 'on' : ''}">${PLACE_KO[p]}</button>`;
    const shortBtn = ([v, label]) => `<button data-action="short" data-short="${v ?? ''}" class="h-11 px-4 short:h-9 short:px-3 text-lg short:text-base nums ${(st.short ?? null) === v ? 'on' : ''}">${label}</button>`;
    const iconBtn = (action, name, label) => `<button data-action="${action}" class="h-14 w-14 portrait:h-12 portrait:w-12 short:h-11 short:w-11 rounded-2xl bg-surface2 text-2xl flex items-center justify-center" aria-label="${label}">${icon(name)}</button>`;
    return `
      <header class="shrink-0 px-7 portrait:px-4 short:px-3 pt-4 pb-2 short:py-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div class="mr-auto min-w-0">
          <div class="text-base short:text-sm font-semibold text-muted">${dateLine(today())}</div>
          <div class="text-[26px] portrait:text-2xl short:text-xl font-bold tracking-tight truncate">${st.plan?.restDay ? '오늘은 푹 쉬자' : '오늘도 해 볼까?'}</div>
        </div>
        <div class="seg">${['home', 'park', 'playground'].map(placeBtn).join('')}</div>
        <div class="seg">${SHORT_OPTIONS.map(shortBtn).join('')}</div>
        ${iconBtn('stats', 'chart', '내 스탯')}${iconBtn('settings', 'gear', '설정')}
      </header>`;
  }

  function badges(plan) {
    const b = [];
    if (MODE_BADGE[plan.mode]) b.push([MODE_BADGE[plan.mode], true]);
    if (plan.quiet) b.push(['저소음']);
    if (plan.notes.includes('jumpRest')) b.push(['오늘은 점프 쉬는 날']);
    if (plan.source === 'ai') b.push(['AI 코치 추천', true]);
    return b.map(([t, hl]) => `<span class="h-8 px-3 rounded-full inline-flex items-center text-[15px] font-semibold ${hl ? 'text-accent' : 'text-muted bg-surface2'}" ${hl ? 'style="background:color-mix(in srgb, var(--accent) 14%, transparent)"' : ''}>${esc(t)}</span>`).join('');
  }

  const notice = (text, actions = '') => `<div class="card rounded-2xl px-5 py-3 short:px-3 short:py-1.5 flex flex-wrap items-center gap-3 short:gap-2"><div class="text-lg short:text-base font-semibold flex-1 min-w-0">${text}</div>${actions}</div>`;
  const small = (action, label, primary = false) => `<button data-action="${action}" class="h-12 px-4 short:h-9 short:px-3 rounded-xl text-base short:text-sm font-bold ${primary ? 'bg-accent text-white' : 'bg-surface2'}">${label}</button>`;

  function topCards(st) {
    const cards = [];
    const plan = st.plan;
    if (plan.restSuggested && !st.restDismissed) {
      cards.push(notice('오늘은 쉬어도 괜찮아. 몸도 쉬어야 커!', small('restLight', '스트레칭만', true) + small('restDismiss', '그래도 운동')));
    }
    // 이번 주 빙상 + 앱 운동이 주 10시간을 넘으면 (화면 2차 3단계). 쉬는 날·스트레칭만인 날은 안 띄움.
    const load = weeklyLoad({ date: today(), sessions: repo.sessions(), settings: repo.settings() });
    if (!plan.restDay && !plan.stretchOnly && load.over && !st.loadDismissed && !st.restDismissed) {
      cards.push(notice(esc(loadMessage(load)), small('restLight', '스트레칭만', true) + small('loadDismiss', '그래도 운동')));
    } else if (!plan.restDay && !plan.stretchOnly && !load.iceEntered && !st.iceDismissed) {
      cards.push(notice('이번 주 빙상 시간을 적어 주세요 <span class="text-muted font-medium">(엄마 · 설정)</span>', small('settings', '적으러 가기', true) + small('iceLater', '다음에')));
    }
    if (st.updateReady) {
      cards.push(`<button data-action="update" class="w-full rounded-2xl px-5 py-3 bg-accent text-white text-left text-lg font-bold flex items-center gap-3">${icon('sparkle')}새 버전이 있어요 — 눌러서 새로고침</button>`);
    }
    if (backupDue() && !st.backupDismissed) {
      cards.push(notice('이번 주 기록을 백업해 둘까요? (엄마)', small('settings', '백업하러 가기', true) + small('backupLater', '다음에')));
    }
    const pending = repo.sessions().filter(s => s.date === today() && !s.stamp);
    if (pending.length) {
      cards.push(`<button data-action="stamp" data-session="${esc(pending.map(x => x.id).join(','))}" class="card w-full min-h-[64px] rounded-2xl px-5 py-3 text-left text-lg font-semibold flex items-center gap-3 border-2 border-accent">
        <span class="text-accent text-2xl">${icon('book')}</span><span class="flex-1">노트에 일지 썼으면 눌러서 도장 받기</span><span class="text-accent text-2xl">${icon('medal')}</span></button>`);
    }
    if (plan.aiMeta?.cheer) cards.push(`<div class="text-lg font-semibold">${esc(plan.aiMeta.cheer)}</div>`);
    return cards.join('');
  }

  // 기록 3개 이상인데 백업한 지 7일 넘었으면 (설계 §3.1)
  function backupDue() {
    const n = repo.sessions().length;
    const last = repo.settings().lastBackupAt;
    return n >= 3 && (!last || Date.parse(today()) - Date.parse(last) >= 7 * 86400000);
  }

  // 블록 카드: 영어 작은 제목·블록 이름·동작(이름 + 양)·바꾸기. 카드 전체가 버튼.
  // 넓은 화면(아이패드 가로·세로)은 세로로 쌓은 카드, 휴대폰 세로(narrow)·가로(short)는 한 줄짜리 카드.
  function card(plan, s, k) {
    const list = blockItems(plan, k);
    const names = list.map(({ item }) => {
      const ex = byId(item.exerciseId);
      return `<div class="flex items-baseline justify-between gap-2 py-3 border-t border-line">
        <div class="min-w-0 text-[19px] font-semibold leading-snug">${esc(ex.name)}${item.level > 1 ? ` <span class="text-xs px-1.5 py-0.5 rounded-full bg-accent text-white align-middle">Lv${item.level}</span>` : ''}</div>
        <div class="shrink-0 text-[15px] font-semibold text-muted nums whitespace-nowrap">${amountText(item)}</div></div>`;
    }).join('') || '<div class="text-lg text-muted py-3 border-t border-line">비어 있어요</div>';
    const inline = list.map(({ item }) => esc(byId(item.exerciseId).name)).join(' · ') || '비어 있어요';
    const kicker = `<div class="kicker flex items-center gap-2">${catDot(s.category, 8)}${CAT_EN[s.category] ?? ''}</div>`;
    const focusTag = s.focus ? '<span class="shrink-0 h-6 px-2.5 rounded-full bg-accent text-white text-xs font-bold inline-flex items-center">오늘 집중</span>' : '';
    return `<button data-action="edit" data-slot="${k}" class="card relative flex flex-col narrow:flex-row narrow:items-center short:flex-row short:items-center text-left rounded-3xl p-5 narrow:p-4 short:p-3 gap-2 narrow:gap-3 short:gap-2 border-2 ${s.focus ? 'border-accent' : 'border-transparent'}">
      <div class="w-full flex items-center justify-between gap-2 narrow:hidden short:hidden">${kicker}${focusTag}</div>
      <div class="shrink-0 text-[22px] font-bold tracking-tight narrow:hidden short:hidden">${CAT_KO[s.category]}</div>
      <div class="flex-1 min-h-0 w-full flex flex-col mt-1 narrow:hidden short:hidden">${names}</div>
      <div class="hidden narrow:block short:block flex-1 min-w-0">
        <div class="flex items-center gap-2">${catDot(s.category, 8)}<span class="text-lg short:text-base font-bold truncate">${CAT_KO[s.category]}</span>${focusTag}</div>
        <div class="text-base short:text-sm font-medium text-muted leading-snug line-clamp-2 mt-0.5">${inline}</div></div>
      <div class="shrink-0 w-full narrow:w-auto short:w-auto h-12 narrow:h-12 narrow:px-4 short:h-10 short:px-3 rounded-xl bg-surface2 flex items-center justify-center gap-2 text-base font-semibold whitespace-nowrap">${icon('edit')}<span class="narrow:hidden short:hidden">바꾸기</span><span class="hidden narrow:inline short:inline nums">${list.length}개</span></div>
    </button>`;
  }

  // 바꾸기 창: 이 블록 동작 빼기 + 같은 종류 보관함에서 담기
  function editSheet(st) {
    const plan = st.plan;
    const s = plan.slots[editSlot];
    if (!s) return '';
    const settings = repo.settings();
    const progress = repo.progress();
    const inPlan = new Set(plan.items.map(i => i.exerciseId));
    const row = (name, sub, button) => `<div class="min-h-[72px] rounded-2xl bg-surface2 px-4 py-2 flex items-center gap-3">
      <div class="flex-1 min-w-0"><div class="text-xl font-semibold truncate">${esc(name)}</div><div class="text-base text-muted nums">${sub}</div></div>${button}</div>`;
    const rows = blockItems(plan, editSlot).map(({ item, idx }) => {
      const ex = byId(item.exerciseId);
      return row(ex.name, amountText(item), `<button data-action="remove" data-idx="${idx}" class="h-14 px-5 shrink-0 rounded-xl bg-surface text-lg font-semibold flex items-center gap-1.5" aria-label="${esc(ex.name)} 빼기">${icon('minus')}빼기</button>`);
    }).join('') || '<div class="text-lg text-muted p-2">아래에서 담아 보자!</div>';
    const lib = candidatesFor(s.category, { places: st.places, quiet: plan.quiet, hidden: settings.hidden })
      .filter(ex => !inPlan.has(ex.id))
      .map(ex => {
        const it = makeItem(ex, { block: 'main', level: progress.levels?.[ex.id] ?? 1 });
        return row(ex.name, `${amountText(it)}${it.level > 1 ? ` · Lv${it.level}` : ''}${ex.impact ? ' · 강한 착지' : ''}`,
          `<button data-action="add" data-id="${ex.id}" class="h-14 px-5 shrink-0 rounded-xl bg-accent text-white text-lg font-semibold flex items-center gap-1.5">${icon('plus')}담기</button>`);
      }).join('') || '<div class="text-base text-muted p-2">이 장소에서 더 담을 동작이 없어요</div>';
    return `<div class="fixed inset-0 z-40 flex items-center justify-center p-3" style="background:color-mix(in srgb, var(--text) 28%, transparent)">
      <div class="w-[860px] max-w-full max-h-full flex flex-col rounded-[28px] bg-surface shadow-2xl p-6 portrait:p-4 gap-3">
        <div class="shrink-0 flex items-center gap-3">
          <div class="flex-1 min-w-0"><div class="kicker flex items-center gap-2">${catDot(s.category, 8)}${CAT_EN[s.category] ?? ''}</div>
            <div class="text-2xl font-bold tracking-tight">${CAT_KO[s.category]}</div></div>
          <button data-action="closeEdit" class="h-14 px-6 rounded-2xl bg-ink text-bg text-lg font-bold flex items-center gap-2">${icon('check')}다 했어</button>
        </div>
        <div class="scroll-y min-h-0 flex flex-col gap-2 pr-1">
          <div class="kicker mt-1">오늘 할 것</div>${rows}
          <div class="kicker mt-4">더 담을 수 있는 것</div>${lib}
        </div>
      </div></div>`;
  }

  // 본운동 없이 스트레칭만인 날(일요일 '스트레칭만', 너무 늦은 시간): 할 동작 목록 카드 하나
  function stretchCard(plan) {
    const rows = plan.items.map(item => `<div class="flex items-baseline justify-between gap-3 py-3 border-t border-line first:border-t-0">
      <div class="min-w-0 text-[19px] font-semibold leading-snug">${esc(byId(item.exerciseId).name)}</div>
      <div class="shrink-0 text-[15px] font-semibold text-muted nums whitespace-nowrap">${amountText(item)}</div></div>`).join('');
    return `<div class="card scroll-y flex-1 min-h-0 rounded-3xl p-5 narrow:p-4 short:p-3 flex flex-col">
      <div class="kicker flex items-center gap-2 mb-1">${catDot('flex', 8)}${CAT_EN.cooldown}</div><div>${rows}</div></div>`;
  }

  // 일요일 완전 휴식 (훈련 내용 검토 §116·132): 메뉴 대신 쉬는 날 카드 + 작은 '스트레칭만' 버튼
  function restView(st) {
    const tops = topCards(st);
    return `${header(st)}
      <div class="flex-1 min-h-0 scroll-y flex flex-col items-center justify-center gap-3 px-7 portrait:px-4 short:px-3 py-4 short:py-2">
        ${tops ? `<div class="w-[640px] max-w-full flex flex-col gap-2">${tops}</div>` : ''}
        <div class="card rounded-[28px] w-[640px] max-w-full px-10 py-10 portrait:px-6 portrait:py-8 short:py-5 flex flex-col items-center text-center gap-3 short:gap-2">
          <div class="w-16 h-16 short:w-12 short:h-12 rounded-full flex items-center justify-center text-3xl short:text-2xl text-accent" style="background:color-mix(in srgb, var(--accent) 14%, transparent)">${icon('bed')}</div>
          <div class="kicker">Rest Day</div>
          <div class="text-[32px] portrait:text-[28px] short:text-2xl font-bold tracking-tight leading-tight">오늘은 쉬는 날</div>
          <div class="text-lg short:text-base font-medium text-muted leading-relaxed">일요일은 빙상도 지상도 모두 쉬어요.<br>푹 쉬어야 몸이 크고 점프도 튼튼해져요.</div>
          <button data-action="restStretch" class="mt-3 short:mt-1 h-12 px-5 rounded-xl bg-surface2 text-base font-semibold flex items-center gap-2">${icon('sparkle')}가볍게 스트레칭만 할래요</button>
        </div>
      </div>`;
  }

  function render() {
    const st = store.get();
    if (!st.plan) return;
    const plan = st.plan;
    if (plan.fullRest) { el.innerHTML = restView(st); return; }
    const over = plan.overTime;
    const warm = plan.items.filter(i => i.block === 'warmup').length;
    const cool = plan.items.filter(i => i.block === 'cooldown').length;
    const main = plan.items.filter(i => i.block === 'main').length;
    const n = Math.min(4, Math.max(1, plan.slots.length));
    const tops = topCards(st);
    const stat = (v, label, warn = false) => `<div class="flex flex-col"><div class="text-[22px] short:text-lg font-bold nums leading-tight ${warn ? 'text-[color:var(--prep)]' : ''}">${v}</div><div class="text-[13px] font-semibold text-muted">${label}</div></div>`;
    const line = '<i class="inline-block w-6 h-px bg-[color:var(--muted)] opacity-40"></i>';
    el.innerHTML = `
      ${header(st)}
      <div class="flex-1 min-h-0 flex flex-col gap-3 short:gap-2 px-7 portrait:px-4 short:px-3 pt-2 short:pt-1">
        <div class="shrink-0 flex items-end gap-6 short:gap-4 flex-wrap">
          <div class="text-[32px] portrait:text-[28px] short:text-2xl font-bold tracking-tight leading-none">오늘의 운동</div>
          ${stat(`${minutes(plan.totalSec)}분`, '예상 시간', over)}
          ${stat(`${plan.jumpContacts}<span class="text-muted font-semibold">/${plan.contactLimit ?? 60}</span>`, '착지')}
          <div class="flex-1"></div>
          <div class="flex items-center gap-2 flex-wrap">${badges(plan)}
            ${over ? '<button data-action="trim" class="h-10 px-4 rounded-xl bg-prep text-onprep text-base font-bold">50분 넘어요 · 세트 줄일까?</button>' : ''}
            ${st.aiAvailable ? `<button data-action="toggleAi" class="h-10 px-4 rounded-xl bg-surface2 text-base font-semibold">${st.useRule ? 'AI 추천 보기' : '규칙 추천 보기'}</button>` : ''}</div>
        </div>
        ${plan.aiMeta?.focus ? `<div class="text-lg font-semibold text-muted shrink-0">이번 주 초점 · ${esc(plan.aiMeta.focus)}</div>` : ''}
        ${tops ? `<div class="shrink-0 flex flex-col gap-2">${tops}</div>` : ''}
        ${plan.tooLate ? '<div class="shrink-0 text-xl font-semibold">오늘은 푹 자는 것도 훈련이야. 스트레칭만 하고 자자!</div>' : ''}
        ${plan.stretchOnly ? `<div class="shrink-0 flex items-center gap-3 flex-wrap"><div class="text-xl font-semibold">${plan.restDay ? '쉬는 날이라' : '오늘은'} 스트레칭만 가볍게 해요.</div><button data-action="restBack" class="h-11 px-4 rounded-xl bg-surface ring-1 ring-[color:var(--line)] text-base font-semibold">${plan.restDay ? '그냥 쉴래요' : '운동 메뉴 보기'}</button></div>` : ''}
        ${plan.slots.length ? '' : stretchCard(plan)}
        <div data-ref="cards" class="${plan.slots.length ? '' : 'hidden '}scroll-y flex-1 min-h-0 grid gap-3.5 grid-cols-${n} tallwide:grid-cols-2 narrow:grid-cols-1 short:grid-cols-2 auto-rows-[minmax(min-content,1fr)] p-0.5">${plan.slots.map((s, k) => card(plan, s, k)).join('')}</div>
        <div class="shrink-0 flex items-center gap-2.5 text-[15px] font-semibold text-muted nums short:hidden">${warm ? `<span>웜업 ${warm}</span>${line}` : ''}<span class="text-ink">본운동 ${main}</span>${cool ? `${line}<span>쿨다운 ${cool}</span>` : ''}</div>
      </div>
      <div class="shrink-0 px-7 portrait:px-4 short:px-3 pt-3 pb-6 portrait:pb-4 short:pt-1 short:pb-2">
        <button data-action="start" class="w-full h-[84px] short:h-14 rounded-[22px] bg-ink text-bg text-[26px] short:text-xl font-bold tracking-tight flex items-center justify-center gap-3">${icon('play')}시작하기 <span class="text-lg font-semibold opacity-60 nums">${minutes(plan.totalSec)}분</span></button>
      </div>
      ${editSlot != null ? editSheet(st) : ''}
      ${toast ? `<div class="fixed z-50 left-1/2 -translate-x-1/2 bottom-32 px-6 py-4 rounded-2xl bg-ink text-bg text-xl font-semibold">${esc(toast)}</div>` : ''}`;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const st = store.get();
    switch (b.dataset.action) {
      case 'place': {
        const p = b.dataset.place;
        let places;
        if (p === 'home') places = ['home'];
        else {
          const out = st.places.filter(x => x !== 'home');
          places = out.includes(p) ? out.filter(x => x !== p) : [...out, p];
          if (!places.length) places = ['home'];
        }
        editSlot = null;
        repo.saveSettings({ places });
        store.set({ places });
        rebuildPlan();
        break;
      }
      case 'short':
        editSlot = null;
        store.set({ short: b.dataset.short ? Number(b.dataset.short) : null });
        rebuildPlan();
        break;
      case 'remove': {
        const r = removeItem(st.plan, Number(b.dataset.idx));
        if (r.error === 'last') flash('하나는 남겨 두자!');
        else if (!r.error) store.set({ plan: r.plan, removed: [...st.removed, r.removedId] });
        break;
      }
      case 'add': {
        const r = addItem(st.plan, b.dataset.id, { progress: repo.progress() });
        if (r.error) flash(r.error === 'contacts' ? `점프는 오늘 ${st.plan.contactLimit ?? 60}번까지만!` : ERR_KO[r.error] ?? r.error);
        else store.set({ plan: r.plan });
        break;
      }
      case 'edit': editSlot = Number(b.dataset.slot); render(); break;
      case 'closeEdit': editSlot = null; render(); break;
      case 'trim': store.set({ plan: trimToFit(st.plan) }); break;
      case 'restLight': store.set({ restStretch: true, restDismissed: true, loadDismissed: true }); rebuildPlan(); break;
      case 'restDismiss': store.set({ restDismissed: true }); break;
      case 'loadDismiss': store.set({ loadDismissed: true }); render(); break;
      case 'iceLater': store.set({ iceDismissed: true }); render(); break;
      case 'restStretch': store.set({ restStretch: true }); rebuildPlan(); break;
      case 'restBack': store.set({ restStretch: false }); rebuildPlan(); break;
      case 'backupLater': store.set({ backupDismissed: true }); break;
      case 'toggleAi': editSlot = null; store.set({ useRule: !st.useRule }); rebuildPlan(); break;
      case 'update': st.updateReady?.postMessage('skipWaiting'); break;
      case 'stamp': b.dataset.session.split(',').forEach(id => repo.stampLater(id)); flash('도장 쾅! 일지까지 최고야'); break;
      case 'stats': store.set({ screen: 'stats' }); break;
      case 'settings': store.set({ screen: 'settings' }); break;
      case 'start': editSlot = null; onStart(); break;
      default: break;
    }
  });

  store.subscribe((st, prev) => {
    if (st.screen === 'menu' && (st.plan !== prev.plan || st.places !== prev.places ||
      st.short !== prev.short || st.restDismissed !== prev.restDismissed || st.screen !== prev.screen ||
      st.updateReady !== prev.updateReady || st.backupDismissed !== prev.backupDismissed)) render();
  });
  return { render };
}
