// 플레이어 — 설계 §4.3. 왼쪽 동작(스틱맨/내 영상·체크포인트), 오른쪽 큰 타이머 링·NEXT 영역.
import { byId } from '../../data/exercises.js';
import { compileSession } from '../../domain/timeline.js';
import { createTimer } from '../../engine/timer.js';
import { cueFor } from '../../engine/cues.js';
import { createStickman, STICKMAN_CSS } from '../components/stickman.js';
import { esc } from '../format.js';

const PHASE = {
  prep: { label: '준비', cls: 'bg-prep text-onprep' },
  work: { label: '운동', cls: 'bg-work text-onphase' },
  rest: { label: '휴식', cls: 'bg-rest text-onphase' },
  switch: { label: '반대쪽', cls: 'bg-switch text-onphase' },
};
const RING_R = 140;
const RING_C = 2 * Math.PI * RING_R;
const QUIT_HOLD_MS = 1000;
const REPS_NUDGE_SEC = 120;
const TICK_MS = 100; // rAF 대신 interval: 화면이 가려져도·사파리가 rAF 를 줄여도 시간·소리는 정확히

export function mountPlayer(el, { store, repo, audio, wake, media, today, speed = 1, onFinish }) {
  let timer = null, steps = [], ticker = null, session = null, stick = null;
  let lastShownSec = null, lastIndex = -1, videoUrl = null, quitTimer = null, bannerUntil = 0;
  const now = () => performance.now() * speed;

  el.innerHTML = `
    <style>${STICKMAN_CSS}</style>
    <div class="h-16 shrink-0 px-4 flex items-center gap-4 bg-surface border-b border-line">
      <button data-action="pause" class="h-12 w-16 rounded-xl bg-surface2 text-2xl" aria-label="일시정지">⏸</button>
      <div class="flex-1 h-4 rounded-full bg-surface2 overflow-hidden"><div data-ref="bar" class="h-full bg-accent" style="width:0%"></div></div>
      <div data-ref="where" class="text-xl font-bold nums whitespace-nowrap"></div>
      <button data-action="quit" class="h-12 px-4 rounded-xl bg-surface2 text-lg font-bold select-none" aria-label="그만하기 (길게 누르기)">✕ 길게 누르기</button>
    </div>
    <div data-ref="banner" class="hidden px-4 py-2 text-lg font-bold bg-prep text-onprep text-center"></div>
    <div class="flex-1 min-h-0 grid grid-cols-[1fr_540px] gap-4 p-4">
      <section class="min-h-0 flex flex-col rounded-3xl bg-surface p-4 gap-2">
        <div data-ref="visual" class="flex-1 min-h-0 rounded-2xl bg-surface2 flex items-center justify-center overflow-hidden"></div>
        <div class="flex items-baseline gap-3 shrink-0"><div data-ref="name" class="text-[52px] leading-tight font-extrabold truncate"></div><div data-ref="side" class="text-4xl font-extrabold text-accent"></div></div>
        <ol data-ref="checks" class="shrink-0 text-[32px] leading-snug font-bold"></ol>
        <div data-ref="next" class="shrink-0 text-2xl text-muted"></div>
      </section>
      <section class="min-h-0 flex flex-col gap-3">
        <div class="shrink-0 flex items-center gap-3">
          <div data-ref="phase" class="h-16 px-6 rounded-2xl text-4xl font-extrabold flex items-center"></div>
          <div data-ref="setinfo" class="text-3xl font-extrabold nums"></div>
        </div>
        <div class="flex-1 min-h-0 relative flex items-center justify-center">
          <svg viewBox="0 0 320 320" class="h-full max-h-[300px] aspect-square -rotate-90">
            <circle cx="160" cy="160" r="${RING_R}" fill="none" stroke="var(--surface2)" stroke-width="18"/>
            <circle data-ref="ring" cx="160" cy="160" r="${RING_R}" fill="none" stroke="var(--work)" stroke-width="18" stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="0" style="transition:stroke-dashoffset .1s linear"/>
          </svg>
          <div data-ref="big" class="absolute inset-0 flex items-center justify-center font-extrabold nums leading-none" style="font-size:200px"></div>
        </div>
        <button data-action="next" class="h-[360px] shrink-0 rounded-3xl bg-accent text-white flex flex-col items-center justify-center gap-2 active:scale-[.99] transition-transform">
          <div class="text-[64px] font-extrabold leading-none">👋 다 했어!</div>
          <div class="text-4xl font-extrabold opacity-90">NEXT</div>
          <div data-ref="nudge" class="text-2xl font-bold opacity-0">다 했으면 NEXT!</div>
        </button>
      </section>
    </div>
    <div data-ref="paused" class="hidden absolute inset-0 flex flex-col items-center justify-center gap-6" style="background:color-mix(in srgb, var(--bg) 93%, transparent)">
      <div class="text-7xl font-extrabold">⏸ 잠깐 쉬는 중</div>
      <button data-action="resume" class="h-28 px-16 rounded-3xl bg-work text-onphase text-5xl font-extrabold">▶ 계속하기</button>
    </div>`;
  const $ = r => el.querySelector(`[data-ref="${r}"]`);

  function banner(text, ms = 5000) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('hidden');
    bannerUntil = performance.now() + ms;
  }

  async function showVisual(exId) {
    stick?.stop();
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
    const box = $('visual');
    const clipId = repo.settings().videoMap?.[exId];
    const clip = clipId && media ? await media().then(m => m.getClip(clipId)).catch(() => null) : null;
    if (clip?.blob) {
      videoUrl = URL.createObjectURL(clip.blob);
      box.innerHTML = `<video playsinline muted loop autoplay class="w-full h-full object-contain" src="${videoUrl}"></video>`;
      const v = box.firstElementChild;
      const { startSec = 0, endSec = null } = clip.trim ?? {};
      v.addEventListener('loadedmetadata', () => { v.currentTime = startSec; });
      v.addEventListener('timeupdate', () => { if (endSec != null && v.currentTime >= endSec) v.currentTime = startSec; });
      v.addEventListener('error', () => { banner('영상 재생이 안 돼서 그림으로 보여 줄게요'); showStick(exId); }, { once: true });
      v.play?.().catch(() => {});
      return;
    }
    showStick(exId);
  }

  function showStick(exId) {
    const box = $('visual');
    box.innerHTML = '<div class="w-full h-full max-w-[460px] p-2"></div>';
    stick = createStickman(box.firstElementChild);
    stick.show(byId(exId)?.poseId);
  }

  function nextName(i) {
    const cur = steps[i];
    const n = steps.slice(i + 1).find(s => s.itemIndex !== cur.itemIndex);
    return n ? byId(n.exerciseId)?.name : null;
  }

  function renderStep(st) {
    const s = st.step;
    const ex = byId(s.exerciseId);
    if (st.index !== lastIndex) {
      const exChanged = lastIndex < 0 || steps[lastIndex]?.itemIndex !== s.itemIndex;
      lastIndex = st.index;
      if (exChanged) showVisual(s.exerciseId);
      $('name').textContent = ex.name;
      $('checks').innerHTML = ex.checkpoints.map((c, i) => `<li>${'①②③'[i]} ${esc(c)}</li>`).join('');
      const nn = nextName(st.index);
      $('next').textContent = nn ? `다음: ${nn}` : '마지막 동작이에요! 💪';
      const ph = PHASE[s.kind];
      const phaseEl = $('phase');
      phaseEl.className = `h-16 px-6 rounded-2xl text-4xl font-extrabold flex items-center ${ph.cls}`;
      phaseEl.textContent = s.kind === 'prep' ? (s.block === 'main' ? '준비' : s.block === 'warmup' ? '웜업' : '쿨다운') : ph.label;
      $('ring').setAttribute('stroke', `var(--${s.kind === 'switch' ? 'switch' : s.kind})`);
      $('side').textContent = s.side === 'L' ? '왼쪽' : s.side === 'R' ? '오른쪽' : s.kind === 'switch' ? '반대쪽으로!' : '';
      $('setinfo').textContent = s.sets > 1 ? `${s.set} / ${s.sets} 세트` : '';
      lastShownSec = null;
    }
    // 큰 숫자: 초가 바뀔 때만
    const big = $('big');
    if (st.remainingSec == null) {
      if (lastShownSec !== 'reps') { big.style.fontSize = '150px'; big.textContent = `${s.reps}회`; lastShownSec = 'reps'; }
      $('ring').setAttribute('stroke-dashoffset', '0');
      $('nudge').style.opacity = st.elapsedSec > REPS_NUDGE_SEC ? (Math.floor(st.elapsedSec) % 2 ? '1' : '0.3') : '0';
    } else {
      const sec = Math.max(0, Math.ceil(st.remainingSec));
      if (sec !== lastShownSec) { big.style.fontSize = '200px'; big.textContent = String(sec); lastShownSec = sec; }
      const frac = Math.max(0, st.remainingSec / s.durationSec);
      $('ring').setAttribute('stroke-dashoffset', String(RING_C * (1 - frac)));
      $('nudge').style.opacity = '0';
    }
    $('bar').style.width = `${(st.progress * 100).toFixed(1)}%`;
    const itemNo = s.block === 'main' ? `${new Set(steps.filter(x => x.block === 'main' && x.itemIndex <= s.itemIndex).map(x => x.itemIndex)).size}/${new Set(steps.filter(x => x.block === 'main').map(x => x.itemIndex)).size} 동작` : (s.block === 'warmup' ? '웜업' : '쿨다운');
    const leftMin = Math.max(0, Math.round((1 - st.progress) * total() / 60));
    $('where').textContent = `${itemNo} · 약 ${leftMin}분 남음`;
    if (bannerUntil && performance.now() > bannerUntil) { $('banner').classList.add('hidden'); bannerUntil = 0; }
  }

  let totalSec = 0;
  const total = () => totalSec;

  function handle(events) {
    const settings = repo.settings();
    for (const ev of events) {
      const cue = cueFor(ev, settings);
      if (cue) audio.play(cue);
      if (ev.type === 'done') finish('completed');
    }
  }

  function loop() {
    if (!timer) return;
    handle(timer.tick());
    if (!timer) return;
    const st = timer.state();
    if (!st.done) renderStep(st);
  }

  function buildSession(plan) {
    const date = today();
    const n = repo.sessions().filter(s => s.date === date).length + 1;
    return {
      id: `S-${date}-${n}`, date, startedAt: Date.now(), endedAt: null,
      places: plan.places, mode: plan.mode, source: plan.source ?? 'rule', quiet: !!plan.quiet,
      slots: plan.slots,
      planned: plan.items.map(i => ({ exerciseId: i.exerciseId, block: i.block, slot: i.slot, level: i.level, sets: i.sets, workSec: i.workSec, reps: i.reps, restSec: i.restSec, source: i.source })),
      removed: store.get().removed ?? [],
      results: [], activeSec: 0, status: 'partial', evaluation: null, journalChecked: false, stamp: false,
    };
  }

  function collectResults() {
    const res = timer.results();
    session.results = res.map(r => ({ exerciseId: r.exerciseId, setsDone: r.setsDone, setsPlanned: r.setsPlanned, activeSec: Math.round(r.activeSec) }));
    session.activeSec = Math.round(res.reduce((s, r) => s + r.activeSec, 0) / speed);
  }

  function finish(status) {
    if (!timer) return;
    collectResults();
    session.status = status;
    session.endedAt = Date.now();
    clearInterval(ticker);
    timer = null;
    stick?.stop();
    wake.release();
    repo.saveSession(session);
    onFinish(session);
  }

  async function begin(plan) {
    steps = compileSession(plan.items);
    totalSec = steps.reduce((s, x) => s + (x.durationSec ?? (x.reps ?? 0) * (byId(x.exerciseId)?.secPerRep ?? 3)), 0);
    session = buildSession(plan);
    lastIndex = -1;
    audio.setQuiet(!!plan.quiet); // 아파트 야간: 소리 0.6배
    timer = createTimer(steps, { now, secPerRep: id => byId(id)?.secPerRep ?? 3 });
    $('paused').classList.add('hidden');
    handle(timer.start());
    renderStep(timer.state());
    ticker = setInterval(loop, TICK_MS);
    const w = await wake.acquire();
    if (w !== 'active') banner('화면이 꺼지지 않게: 설정 › 디스플레이 › 자동 잠금 › 안 함', 7000);
    if (audio.needsUnlock()) banner('🔇 화면을 한 번 탭하면 소리가 나요', 6000);
  }

  // NEXT: 누르는 순간 반응 (pointerdown), 디바운스는 타이머가
  el.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-action]');
    if (!b || !timer) return;
    const act = b.dataset.action;
    if (act === 'next') {
      const evs = timer.next();
      if (evs.length) {
        audio.play('tap');
        b.animate?.([{ filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 250 });
        handle(evs);
      }
    } else if (act === 'quit') {
      b.textContent = '계속 누르면 그만해요…';
      quitTimer = setTimeout(() => finish('partial'), QUIT_HOLD_MS);
    }
  });
  const cancelQuit = () => {
    if (quitTimer) { clearTimeout(quitTimer); quitTimer = null; }
    const q = el.querySelector('[data-action="quit"]');
    if (q) q.textContent = '✕ 길게 누르기';
  };
  el.addEventListener('pointerup', cancelQuit);
  el.addEventListener('pointercancel', cancelQuit);
  el.addEventListener('pointerleave', cancelQuit);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || !timer) return;
    if (b.dataset.action === 'pause') { timer.pause(); $('paused').classList.remove('hidden'); }
    if (b.dataset.action === 'resume') { timer.resume(); $('paused').classList.add('hidden'); }
  });

  // 앱 전환 뒤 돌아오면 소리 다시 켜기 시도
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && timer && audio.needsUnlock()) banner('🔇 화면을 한 번 탭하면 소리가 나요', 6000); });

  return { begin, isRunning: () => !!timer, debug: () => ({ state: timer?.state(), session }) };
}
