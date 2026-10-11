// 메뉴 화면 — 설계 §4.2. 왼쪽 오늘의 메뉴(블록별), 오른쪽 운동 보관함, 아래 시작 버튼.
import { byId } from '../../data/exercises.js';
import { candidatesFor, makeItem } from '../../domain/planner.js';
import { removeItem, addItem, trimToFit } from '../../domain/cart.js';
import { CATEGORIES } from '../../domain/validate.js';
import { CAT_KO, CAT_ICON, PLACE_KO, MODE_BADGE, esc, dateKo, amountText, minutes } from '../format.js';

const SHORT_OPTIONS = [[null, '평소'], [25 * 60, '25분'], [15 * 60, '15분']];
const ERR_KO = { full: '오늘은 이 정도면 충분해! 💪', duplicate: '이미 담겨 있어요', contacts: '점프는 오늘 60번까지만! 🦘', unknown: '담을 수 없는 동작이에요' };

export function mountMenu(el, { store, repo, today, rebuildPlan, onStart }) {
  let toast = '';
  let toastTimer = null;
  const flash = msg => {
    toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast = ''; render(); }, 2200);
  };

  function header(st) {
    const placeBtn = p => {
      const on = st.places.includes(p);
      return `<button data-action="place" data-place="${p}" class="h-14 px-5 rounded-2xl text-xl font-bold border-2 ${on ? 'bg-accent text-white border-accent' : 'bg-surface border-line text-ink'}">${PLACE_KO[p]}</button>`;
    };
    const shortBtn = ([v, label]) => {
      const on = (st.short ?? null) === v;
      return `<button data-action="short" data-short="${v ?? ''}" class="h-12 px-4 rounded-xl text-lg font-bold ${on ? 'bg-ink text-bg' : 'bg-surface2 text-muted'}">${label}</button>`;
    };
    return `
      <header class="h-[76px] shrink-0 px-6 flex items-center gap-3 border-b border-line bg-surface">
        <div class="text-2xl font-extrabold mr-2 whitespace-nowrap">${dateKo(today())}</div>
        ${['home', 'park', 'playground'].map(placeBtn).join('')}
        <div class="ml-3 flex items-center gap-1 text-muted text-lg">⏱ ${SHORT_OPTIONS.map(shortBtn).join('')}</div>
        <div class="flex-1"></div>
        <button data-action="stats" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">📊 내 스탯</button>
        <button data-action="settings" class="h-14 w-14 rounded-2xl text-2xl bg-surface2" aria-label="설정">⚙</button>
      </header>`;
  }

  function badges(plan) {
    const b = [];
    if (MODE_BADGE[plan.mode]) b.push(MODE_BADGE[plan.mode]);
    if (plan.quiet) b.push('🌙 저소음');
    if (plan.notes.includes('jumpRest')) b.push('🦘 오늘은 점프 쉬는 날');
    if (plan.source === 'ai') b.push('🤖 AI 코치 추천');
    return b.map(t => `<span class="px-3 py-1 rounded-full bg-surface2 text-lg font-bold">${esc(t)}</span>`).join('');
  }

  function topCards(st) {
    const cards = [];
    const plan = st.plan;
    if (plan.restSuggested && !st.restDismissed) {
      cards.push(`<div class="rounded-2xl p-4 bg-surface2 flex items-center gap-3">
        <div class="text-xl font-bold flex-1">😴 오늘은 쉬어도 괜찮아. 몸도 쉬어야 커!</div>
        <button data-action="restLight" class="h-12 px-4 rounded-xl bg-accent text-white text-lg font-bold">스트레칭만</button>
        <button data-action="restDismiss" class="h-12 px-4 rounded-xl bg-surface text-lg font-bold">그래도 운동</button></div>`);
    }
    if (st.updateReady) {
      cards.push(`<button data-action="update" class="w-full rounded-2xl p-4 bg-accent text-white text-left text-xl font-bold">✨ 새 버전이 있어요 — 눌러서 새로고침</button>`);
    }
    if (backupDue() && !st.backupDismissed) {
      cards.push(`<div class="rounded-2xl p-4 bg-surface2 flex items-center gap-3"><div class="text-xl font-bold flex-1">💾 이번 주 기록을 백업해 둘까요? (엄마)</div>
        <button data-action="settings" class="h-12 px-4 rounded-xl bg-accent text-white text-lg font-bold">백업하러 가기</button>
        <button data-action="backupLater" class="h-12 px-4 rounded-xl bg-surface text-lg font-bold">다음에</button></div>`);
    }
    const pending = repo.sessions().filter(s => s.date === today() && !s.stamp);
    if (pending.length) {
      cards.push(`<button data-action="stamp" data-session="${esc(pending.at(-1).id)}" class="w-full rounded-2xl p-4 bg-surface2 text-left text-xl font-bold">📔 노트에 일지 썼으면 눌러서 도장 받기 🏅</button>`);
    }
    if (plan.aiMeta?.cheer) cards.push(`<div class="text-xl font-bold">💬 ${esc(plan.aiMeta.cheer)}</div>`);
    return cards.join('');
  }

  // 기록 3개 이상인데 백업한 지 7일 넘었으면 (설계 §3.1)
  function backupDue() {
    const n = repo.sessions().length;
    const last = repo.settings().lastBackupAt;
    return n >= 3 && (!last || Date.parse(today()) - Date.parse(last) >= 7 * 86400000);
  }

  function itemRow(item, idx, removable) {
    const ex = byId(item.exerciseId);
    return `<div class="h-16 shrink-0 rounded-2xl bg-surface2 px-4 flex items-center gap-3">
      <div class="text-xl font-bold flex-1 truncate">${esc(ex.name)}${item.level > 1 ? ` <span class="text-base px-2 py-0.5 rounded-full bg-accent text-white align-middle">Lv${item.level}</span>` : ''}${item.source === 'added' ? ' <span class="text-base text-muted">담음</span>' : ''}</div>
      <div class="text-lg text-muted nums whitespace-nowrap">${amountText(item)}</div>
      ${removable ? `<button data-action="remove" data-idx="${idx}" class="h-12 w-12 rounded-xl bg-surface text-2xl" aria-label="${esc(ex.name)} 빼기">✕</button>` : ''}
    </div>`;
  }

  function planList(plan) {
    const out = [];
    const warm = plan.items.filter(i => i.block === 'warmup');
    const cool = plan.items.filter(i => i.block === 'cooldown');
    const fixedRow = (label, list) => `<div class="h-14 shrink-0 rounded-2xl border-2 border-dashed border-line px-4 flex items-center text-lg text-muted font-bold">${label} · ${list.length}동작 (고정)</div>`;
    if (warm.length) out.push(fixedRow('🔥 웜업', warm));
    plan.slots.forEach((s, k) => {
      out.push(`<div class="mt-2 text-xl font-extrabold">${s.focus ? '⭐ ' : ''}${CAT_ICON[s.category]} ${CAT_KO[s.category]}</div>`);
      plan.items.forEach((it, idx) => { if (it.block === 'main' && it.slot === k) out.push(itemRow(it, idx, true)); });
    });
    if (plan.tooLate) out.push('<div class="text-2xl font-bold p-4">오늘은 푹 자는 것도 훈련이야 😴 스트레칭만 하고 자자!</div>');
    if (cool.length) out.push(fixedRow('🌙 쿨다운', cool));
    return out.join('');
  }

  function library(st) {
    const cat = st.libTab ?? 'jump';
    const settings = repo.settings();
    const list = candidatesFor(cat, { places: st.places, quiet: st.plan.quiet, hidden: settings.hidden });
    const inPlan = new Set(st.plan.items.map(i => i.exerciseId));
    const progress = repo.progress();
    const tabs = CATEGORIES.map(c => `<button data-action="tab" data-cat="${c}" class="flex-1 h-14 rounded-xl text-lg font-bold ${c === cat ? 'bg-accent text-white' : 'bg-surface2'}">${CAT_ICON[c]} ${CAT_KO[c].split(' ')[0]}</button>`).join('');
    const cards = list.map(ex => {
      const it = makeItem(ex, { block: 'main', level: progress.levels?.[ex.id] ?? 1 });
      const has = inPlan.has(ex.id);
      return `<div class="rounded-2xl bg-surface2 p-3 flex items-center gap-3">
        <div class="flex-1 min-w-0"><div class="text-xl font-bold truncate">${esc(ex.name)}</div>
          <div class="text-base text-muted nums">${amountText(it)}${it.level > 1 ? ` · Lv${it.level}` : ''}${ex.impact ? ' · 강한 착지' : ''}</div></div>
        <button data-action="add" data-id="${ex.id}" ${has ? 'disabled' : ''} class="h-12 px-4 rounded-xl text-lg font-bold ${has ? 'bg-surface text-muted' : 'bg-accent text-white'}">${has ? '담김' : '+ 담기'}</button>
      </div>`;
    }).join('') || '<div class="text-lg text-muted p-4">이 장소에서 할 수 있는 동작이 없어요</div>';
    return `<div class="flex gap-2 shrink-0">${tabs}</div><div class="scroll-y flex-1 min-h-0 flex flex-col gap-2 mt-3 pr-1">${cards}</div>`;
  }

  function render() {
    const st = store.get();
    if (!st.plan) return;
    const plan = st.plan;
    const over = plan.overTime;
    el.innerHTML = `
      ${header(st)}
      <div class="flex-1 min-h-0 grid grid-cols-[3fr_2fr] gap-5 p-5">
        <section class="min-h-0 flex flex-col rounded-3xl bg-surface p-5 gap-3">
          <div class="flex items-center gap-2 flex-wrap shrink-0"><div class="text-2xl font-extrabold mr-2">오늘의 메뉴</div>${badges(plan)}
            ${st.aiAvailable ? `<button data-action="toggleAi" class="ml-auto h-11 px-4 rounded-xl bg-surface2 text-lg font-bold">${st.useRule ? '🤖 AI 추천 보기' : '📋 규칙 추천 보기'}</button>` : ''}</div>
          ${plan.aiMeta?.focus ? `<div class="text-xl font-bold text-muted shrink-0">🎯 이번 주 초점: ${esc(plan.aiMeta.focus)}</div>` : ''}
          ${topCards(st)}
          <div class="scroll-y flex-1 min-h-0 flex flex-col gap-2 pr-1">${planList(plan)}</div>
          <div class="shrink-0 flex items-center gap-3 text-xl font-bold nums ${over ? 'text-[color:var(--prep)]' : 'text-muted'}">
            ⏱ 예상 ${minutes(plan.totalSec)}분 · 🦘 점프 ${plan.jumpContacts}/60회
            ${over ? '<button data-action="trim" class="h-12 px-4 rounded-xl bg-prep text-onprep">50분 넘어요 · 세트 줄일까?</button>' : ''}
          </div>
        </section>
        <section class="min-h-0 flex flex-col rounded-3xl bg-surface p-5">
          <div class="text-2xl font-extrabold mb-3 shrink-0">운동 보관함</div>
          ${library(st)}
        </section>
      </div>
      <div class="shrink-0 px-5 pb-5">
        <button data-action="start" class="w-full h-[96px] rounded-3xl bg-work text-onphase text-4xl font-extrabold shadow-lg">▶ 시작하기 (${minutes(plan.totalSec)}분)</button>
      </div>
      ${toast ? `<div class="fixed left-1/2 -translate-x-1/2 bottom-32 px-6 py-4 rounded-2xl bg-ink text-bg text-2xl font-bold">${esc(toast)}</div>` : ''}`;
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
        repo.saveSettings({ places });
        store.set({ places });
        rebuildPlan();
        break;
      }
      case 'short':
        store.set({ short: b.dataset.short ? Number(b.dataset.short) : null });
        rebuildPlan();
        break;
      case 'remove': {
        const r = removeItem(st.plan, Number(b.dataset.idx));
        if (r.error === 'last') flash('하나는 남겨 두자! 🙂');
        else if (!r.error) store.set({ plan: r.plan, removed: [...st.removed, r.removedId] });
        break;
      }
      case 'add': {
        const r = addItem(st.plan, b.dataset.id, { progress: repo.progress() });
        if (r.error) flash(ERR_KO[r.error] ?? r.error);
        else store.set({ plan: r.plan });
        break;
      }
      case 'trim': store.set({ plan: trimToFit(st.plan) }); break;
      case 'tab': store.set({ libTab: b.dataset.cat }); break;
      case 'restLight': store.set({ short: 15 * 60, restDismissed: true }); rebuildPlan(); break;
      case 'restDismiss': store.set({ restDismissed: true }); break;
      case 'backupLater': store.set({ backupDismissed: true }); break;
      case 'toggleAi': store.set({ useRule: !st.useRule }); rebuildPlan(); break;
      case 'update': st.updateReady?.postMessage('skipWaiting'); break;
      case 'stamp': repo.stampLater(b.dataset.session); flash('🏅 도장 쾅! 일지까지 최고야'); break;
      case 'stats': store.set({ screen: 'stats' }); break;
      case 'settings': store.set({ screen: 'settings' }); break;
      case 'start': onStart(); break;
      default: break;
    }
  });

  store.subscribe((st, prev) => {
    if (st.screen === 'menu' && (st.plan !== prev.plan || st.libTab !== prev.libTab || st.places !== prev.places ||
      st.short !== prev.short || st.restDismissed !== prev.restDismissed || st.screen !== prev.screen ||
      st.updateReady !== prev.updateReady || st.backupDismissed !== prev.backupDismissed)) render();
  });
  return { render };
}
