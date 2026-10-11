// 완료 평가 모달 — 설계 §4.4. ① 몸 ② 동작 ③ 일지 → 오늘 요약·내일 예고. 버튼은 원거리 원터치(≥300×260).
import { byId } from '../../data/exercises.js';
import { sessionXp, rebuildStats } from '../../domain/xp.js';
import { milestones, partialMessage } from '../../domain/cheer.js';
import { CAT_KO, CAT_ICON, esc, minutes } from '../format.js';

const RPE = [['light', '🪶', '깃털처럼 가벼움'], ['right', '🎯', '딱 적당했어!'], ['hard', '🌋', '땀 뻘뻘 완전 지침']];
const DIF = [['easy', '👍', '혼자서도 척척!'], ['confusing', '🤔', '조금 헷갈렸음'], ['hard', '😵', '아직 너무 어려워']];
const NEXT_MODE = { progress: '내일은 ⬆ 레벨업 데이!', recovery: '내일은 🌿 회복 데이 — 몸을 풀어 주자', normal: '내일도 지금처럼 즐겁게 ⛸' };

export function mountEvaluate(el, { repo, onDone, onEvaluated }) {
  let session = null, step = 1, rpe = null, journal = false, before = null, levelsBefore = {};

  const bigBtn = (action, value, icon, label) => `
    <button data-action="${action}" data-value="${value}" class="w-[300px] h-[260px] rounded-[32px] bg-surface2 border-4 border-transparent flex flex-col items-center justify-center gap-4 active:border-accent">
      <div class="text-[96px] leading-none">${icon}</div><div class="text-3xl font-extrabold">${label}</div></button>`;

  function summary() {
    const xp = sessionXp(session);
    const after = repo.stats();
    const ms = milestones(before, after);
    const p = repo.progress();
    const ups = Object.entries(p.levels).filter(([id, lv]) => lv > (levelsBefore[id] ?? 1)).map(([id, lv]) => `${byId(id).name} Lv${lv}`);
    const downs = Object.entries(p.levels).filter(([id, lv]) => lv < (levelsBefore[id] ?? 1)).map(([id]) => byId(id).name);
    const xpLine = Object.entries(xp).filter(([, v]) => v > 0).map(([c, v]) => `${CAT_ICON[c]} ${CAT_KO[c]} +${v}`).join(' · ');
    return `
      <div class="text-3xl font-extrabold">오늘 ${session.activeSec >= 60 ? `${minutes(session.activeSec)}분` : '잠깐'} 운동했어요 ✨</div>
      ${xpLine ? `<div class="text-2xl font-bold">${xpLine}</div>` : ''}
      ${ms.map(m => `<div class="text-2xl font-extrabold text-accent">${esc(m)}</div>`).join('')}
      <div class="text-2xl font-bold mt-2">${p.restSuggested ? '내일은 쉬어도 괜찮아 😴 몸도 쉬어야 커!' : NEXT_MODE[p.nextMode] ?? ''}</div>
      ${ups.length ? `<div class="text-2xl font-bold">⬆ 다음엔 ${esc(ups.join(', '))} 도전!</div>` : ''}
      ${downs.length ? `<div class="text-xl text-muted">${esc(downs.join(', '))} 은(는) 조금 쉽게 다시 해 보자 🙂</div>` : ''}`;
  }

  function render() {
    if (!session) { el.innerHTML = ''; return; }
    let body = '';
    const head = session.status === 'partial'
      ? `<div class="text-2xl font-bold text-muted">${esc(partialMessage({ date: session.date }))}</div>` : '';
    if (step === 1) {
      body = `${head}<div class="text-5xl font-extrabold">① 오늘 몸은 어땠어?</div>
        <div class="flex gap-6">${RPE.map(([v, i, l]) => bigBtn('rpe', v, i, l)).join('')}</div>`;
    } else if (step === 2) {
      body = `<div class="text-5xl font-extrabold">② 동작은 어땠어?</div>
        <div class="flex gap-6">${DIF.map(([v, i, l]) => bigBtn('dif', v, i, l)).join('')}</div>`;
    } else if (step === 3) {
      body = `<div class="text-5xl font-extrabold">③ 📔 오늘 실제 노트에 연필로 운동일지를 적었나요?</div>
        <button data-action="journal" class="h-24 px-10 rounded-3xl text-4xl font-extrabold border-4 ${journal ? 'bg-work text-onphase border-work' : 'bg-surface2 border-line'}">${journal ? '☑' : '☐'} 네, 적었어요</button>
        <div class="flex gap-4">
          <button data-action="stamp" ${journal ? '' : 'disabled'} class="h-24 px-12 rounded-3xl text-4xl font-extrabold ${journal ? 'bg-accent text-white' : 'bg-surface2 text-muted'}">🏅 도장 받기</button>
          <button data-action="later" class="h-24 px-8 rounded-3xl text-3xl font-bold bg-surface2">나중에 적을게</button>
        </div>`;
    } else {
      body = `${session.stamp ? '<div class="text-[120px] leading-none">🏅</div><div class="text-4xl font-extrabold">도장 쾅! 일지까지 최고야</div>' : '<div class="text-4xl font-extrabold">기록 저장 완료! 일지 쓰면 메뉴에서 도장 받을 수 있어 📔</div>'}
        ${summary()}
        <button data-action="close" class="mt-4 h-24 px-16 rounded-3xl text-4xl font-extrabold bg-accent text-white">📊 내 스탯 보기</button>`;
    }
    el.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:color-mix(in srgb, var(--bg) 85%, transparent)">
        <div class="relative w-[1100px] max-w-[96vw] min-h-[620px] rounded-[40px] bg-surface shadow-2xl p-10 flex flex-col items-center justify-center gap-8 text-center">
          ${step > 1 && step < 4 ? '<button data-action="back" class="absolute left-6 top-6 h-16 w-16 rounded-2xl bg-surface2 text-3xl" aria-label="뒤로">◀</button>' : ''}
          ${body}
        </div>
      </div>`;
  }

  function open(s) {
    session = { ...s };
    step = 1; rpe = null; journal = false;
    const others = repo.sessions().filter(x => x.id !== s.id);
    before = rebuildStats(others);
    levelsBefore = { ...repo.progress().levels };
    render();
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled || !session) return;
    switch (b.dataset.action) {
      case 'rpe': rpe = b.dataset.value; step = 2; break;
      case 'dif':
        session = { ...session, evaluation: { rpe, difficulty: b.dataset.value, at: Date.now() } };
        repo.saveSession(session);
        onEvaluated?.(session);
        step = 3;
        break;
      case 'back': step -= 1; break;
      case 'journal': journal = !journal; break;
      case 'stamp':
        session = { ...session, journalChecked: true, stamp: true };
        repo.saveSession(session);
        step = 4;
        break;
      case 'later': step = 4; break;
      case 'close': { const s = session; session = null; render(); onDone(s); return; }
      default: break;
    }
    render();
  });

  return { open, isOpen: () => !!session };
}
