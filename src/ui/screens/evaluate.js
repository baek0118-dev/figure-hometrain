// 완료 평가 모달 — 설계 §4.4 + 메모 2026-10-12-app-flow-ui-design §2.4: ① 몸 ② 동작 두 단계 → 요약 3줄.
// 일지·도장은 여기서 묻지 않고 메뉴·스탯의 카드로(그날 자정까지). 버튼은 원거리 원터치(≥300×260), 세로에서는 쌓기.
import { byId } from '../../data/exercises.js';
import { sessionXp, rebuildStats } from '../../domain/xp.js';
import { milestones, partialMessage } from '../../domain/cheer.js';
import { CAT_KO, esc, minutes, plain } from '../format.js';
import { icon, catDot } from '../icons.js';

const RPE = [['light', '🪶', '깃털처럼 가벼움'], ['right', '🎯', '딱 적당했어!'], ['hard', '🌋', '땀 뻘뻘 완전 지침']];
const DIF = [['easy', '👍', '혼자서도 척척!'], ['confusing', '🤔', '조금 헷갈렸음'], ['hard', '😵', '아직 너무 어려워']];
const NEXT_MODE = { progress: '내일은 레벨업 데이!', recovery: '내일은 회복 데이 — 몸을 풀어 주자', normal: '내일도 지금처럼 즐겁게' };

export function mountEvaluate(el, { repo, onDone, onEvaluated }) {
  let session = null, step = 1, rpe = null, before = null, levelsBefore = {};

  // 고르기 버튼: 표정 그림은 둥근 바탕 안에 작게(디자인 A, 2026-10-26), 원거리 원터치 크기는 그대로
  const bigBtn = (action, value, face, label) => `
    <button data-action="${action}" data-value="${value}" class="w-[290px] h-[250px] portrait:w-full portrait:h-[120px] portrait:flex-row portrait:justify-start portrait:px-6 short:w-[210px] short:h-[140px] short:gap-2 rounded-[28px] bg-surface2 border-2 border-transparent flex flex-col items-center justify-center gap-4 active:border-accent">
      <div class="w-24 h-24 portrait:w-[72px] portrait:h-[72px] short:w-14 short:h-14 rounded-full bg-surface flex items-center justify-center text-[52px] portrait:text-[40px] short:text-[30px] leading-none">${face}</div>
      <div class="text-2xl short:text-xl font-semibold tracking-tight">${label}</div></button>`;

  function summary() {
    const xp = sessionXp(session);
    const after = repo.stats();
    const ms = milestones(before, after);
    const p = repo.progress();
    const ups = Object.entries(p.levels).filter(([id, lv]) => lv > (levelsBefore[id] ?? 1)).map(([id, lv]) => `${byId(id).name} Lv${lv}`);
    const downs = Object.entries(p.levels).filter(([id, lv]) => lv < (levelsBefore[id] ?? 1)).map(([id]) => byId(id).name);
    const xpChips = Object.entries(xp).filter(([, v]) => v > 0).map(([c, v]) => `<span class="h-9 px-3 rounded-full bg-surface2 inline-flex items-center gap-2 text-base font-semibold">${catDot(c, 8)}${CAT_KO[c]} <span class="nums text-accent">+${v}</span></span>`).join('');
    const line2 = ms[0] != null ? plain(ms[0]) : (ups.length ? `다음엔 ${ups.join(', ')} 도전!` : '');
    const next = p.restSuggested ? '내일은 쉬어도 괜찮아. 몸도 쉬어야 커!' : NEXT_MODE[p.nextMode] ?? '';
    return `
      <div class="kicker">Today</div>
      <div class="text-[44px] portrait:text-3xl short:text-3xl font-bold tracking-tight leading-tight -mt-4 short:-mt-2">오늘 <span class="text-accent nums">${session.activeSec >= 60 ? `${minutes(session.activeSec)}분` : '잠깐'}</span> 운동했어요</div>
      ${line2 ? `<div class="text-2xl portrait:text-xl short:text-lg font-semibold">${esc(line2)}</div>` : ''}
      ${xpChips ? `<div class="flex flex-wrap justify-center gap-2">${xpChips}</div>` : ''}
      ${next ? `<div class="text-xl short:text-lg font-semibold text-muted">${esc(next)}</div>` : ''}
      ${downs.length ? `<div class="text-lg text-muted">${esc(downs.join(', '))} 은(는) 조금 쉽게 다시 해 보자</div>` : ''}`;
  }

  function render() {
    if (!session) { el.innerHTML = ''; return; }
    let body = '';
    const head = session.status === 'partial'
      ? `<div class="text-xl short:text-base font-semibold text-muted">${esc(plain(partialMessage({ date: session.date })))}</div>` : '';
    if (step === 1) {
      body = `${head}<div class="flex flex-col items-center gap-1"><div class="kicker">1 / 2</div><div class="text-[40px] portrait:text-3xl short:text-2xl font-bold tracking-tight">오늘 몸은 어땠어?</div></div>
        <div class="flex gap-5 short:gap-3 portrait:flex-col portrait:w-full portrait:gap-3">${RPE.map(([v, i, l]) => bigBtn('rpe', v, i, l)).join('')}</div>`;
    } else if (step === 2) {
      body = `<div class="flex flex-col items-center gap-1"><div class="kicker">2 / 2</div><div class="text-[40px] portrait:text-3xl short:text-2xl font-bold tracking-tight">동작은 어땠어?</div></div>
        <div class="flex gap-5 short:gap-3 portrait:flex-col portrait:w-full portrait:gap-3">${DIF.map(([v, i, l]) => bigBtn('dif', v, i, l)).join('')}</div>`;
    } else {
      body = `${summary()}
        <div class="text-base text-muted flex items-center gap-2">${icon('book')}노트에 일지 쓰면 메뉴에서 도장 받을 수 있어</div>
        <button data-action="close" class="mt-2 h-20 short:h-14 px-12 portrait:px-8 whitespace-nowrap rounded-[22px] text-2xl short:text-xl font-bold bg-ink text-bg flex items-center gap-3">${icon('chart')}내 스탯 보기</button>`;
    }
    el.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3" style="background:color-mix(in srgb, var(--text) 30%, transparent)">
        <div class="relative w-[1060px] max-w-[96vw] min-h-[600px] portrait:min-h-0 short:min-h-0 max-h-[96%] overflow-y-auto rounded-[36px] bg-surface shadow-2xl p-10 portrait:p-5 portrait:pt-20 short:p-4 short:pt-4 flex flex-col items-center justify-center gap-8 short:gap-3 text-center">
          ${step === 2 ? `<button data-action="back" class="absolute left-6 top-6 short:left-3 short:top-3 h-14 w-14 short:h-11 short:w-11 rounded-2xl bg-surface2 text-2xl flex items-center justify-center" aria-label="뒤로">${icon('back')}</button>` : ''}
          ${body}
        </div>
      </div>`;
  }

  function open(s) {
    session = { ...s };
    step = 1; rpe = null;
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
        step = 3; // 요약
        break;
      case 'back': step -= 1; break;
      case 'close': { const s = session; session = null; render(); onDone(s); return; }
      default: break;
    }
    render();
  });

  return { open, isOpen: () => !!session };
}
