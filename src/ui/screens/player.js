// 플레이어 — 설계 메모 2026-10-12-app-flow-ui-design §2.2. 인형이 주인공(가운데 크게), 숫자는 옆, NEXT 는 아래 전체 폭.
// 가로(아이패드)·세로(휴대폰) 둘 다: 배치는 아래 CSS 의 @media (orientation: portrait) 로만 바꾼다. 크기 값은 uiconfig.UI.
import { byId } from '../../data/exercises.js';
import { referenceVideo } from '../../data/videos.js';
import { compileSession } from '../../domain/timeline.js';
import { createTimer } from '../../engine/timer.js';
import { cueFor } from '../../engine/cues.js';
import { STICKMAN_CSS } from '../components/stickman.js';
import { createFigure } from '../components/figure.js';
import { openVideo } from '../components/videobox.js';
import { UI, motionFactor, repDisplay, checkpointAt, showVideoButton } from '../uiconfig.js';
import { esc, CAT_EN } from '../format.js';
import { icon } from '../icons.js';

const PHASE = {
  prep: { label: '준비', color: 'var(--prep)', on: 'var(--on-prep)' },
  work: { label: '운동 중', color: 'var(--work)', on: 'var(--on-phase)' },
  rest: { label: '휴식', color: 'var(--rest)', on: 'var(--on-phase)' },
  switch: { label: '반대쪽', color: 'var(--switch)', on: 'var(--on-phase)' },
};
const RING_R = 140;
const RING_C = 2 * Math.PI * RING_R;
const QUIT_HOLD_MS = 1000;
const REPS_NUDGE_SEC = 120;
const TICK_MS = 100; // rAF 대신 interval: 화면이 가려져도·사파리가 rAF 를 줄여도 시간·소리는 정확히

// 디자인 A 클린 라이트(2026-10-26): 흰 카드 두 장(인형·숫자), 아래 짙은 NEXT. 가로·세로·휴대폰 가로.
const LAYOUT_CSS = `
  .pl-main { flex: 1; min-height: 0; display: grid; gap: 16px; padding: 4px 24px 0;
    grid-template-columns: 1fr 360px; grid-template-rows: auto 1fr; grid-template-areas: "title side" "stage side"; }
  .pl-title { grid-area: title; } .pl-stage { grid-area: stage; } .pl-side { grid-area: side; }
  .pl-side { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
  .pl-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 22px 24px; }
  .pl-num { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
  .pl-num svg { height: 100%; max-height: 290px; aspect-ratio: 1; transform: rotate(-90deg); }
  .pl-big { font-size: ${UI.wide.bigFont}px; font-weight: 700; letter-spacing: -0.05em; } .pl-big.is-reps { font-size: ${UI.wide.repFont}px; }
  .pl-big em { font-style: normal; font-weight: 500; color: var(--muted); font-size: .55em; letter-spacing: -0.02em; margin-left: .08em; }
  .pl-next { height: ${UI.wide.nextH}px; }
  .pl-check { font-size: 24px; }
  @media (orientation: portrait) {
    .pl-main { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; grid-template-areas: "title" "stage" "side"; gap: 10px; padding: 4px 12px 0; }
    .pl-side { flex-direction: row; align-items: stretch; gap: 10px; }
    .pl-panel { flex-direction: row; align-items: center; gap: 10px; padding: 12px; }
    .pl-num { flex: 0 0 ${UI.tall.bigFont * 1.5}px; height: ${UI.tall.bigFont * 1.5}px; }
    .pl-num svg { max-height: ${UI.tall.bigFont * 1.5}px; }
    .pl-big { font-size: ${UI.tall.bigFont}px; } .pl-big.is-reps { font-size: ${UI.tall.repFont}px; }
    .pl-next { height: ${UI.tall.nextH}px; }
    .pl-check { font-size: 19px; }
    .pl-wide-only { display: none; }
  }
  /* 휴대폰 가로(낮은 가로 화면): 숫자·NEXT 를 줄여 인형 자리를 남긴다 */
  @media (orientation: landscape) and (max-height: 520px) {
    .pl-main { grid-template-columns: 1fr 250px; gap: 8px; padding: 2px 10px 0; }
    .pl-panel { padding: 10px 12px; gap: 2px; }
    .pl-num svg { max-height: 150px; }
    .pl-big { font-size: ${UI.short.bigFont}px; } .pl-big.is-reps { font-size: ${UI.short.repFont}px; }
    .pl-next { height: ${UI.short.nextH}px; }
    .pl-check { font-size: 16px; min-height: 0; }
    .pl-short-hide { display: none; }
  }`;

export function mountPlayer(el, { store, repo, audio, wake, media, today, speed = 1, onFinish }) {
  let timer = null, steps = [], ticker = null, session = null, figure = null;
  let lastShownSec = null, lastIndex = -1, videoUrl = null, quitTimer = null, bannerUntil = 0;
  let clipToken = 0;
  let slow = false, reps = 0, figKey = '', stepShownAt = 0, shownCheck = -1, videoOpen = false;
  const brokenVideos = new Set();
  const now = () => performance.now() * speed;

  el.innerHTML = `
    <style>${STICKMAN_CSS}${LAYOUT_CSS}</style>
    <div class="h-16 short:h-12 shrink-0 px-6 portrait:px-3 short:px-3 flex items-center gap-4 portrait:gap-3">
      <button data-action="pause" class="h-12 short:h-10 w-12 shrink-0 rounded-xl bg-surface2 text-xl flex items-center justify-center" aria-label="일시정지">${icon('pause')}</button>
      <div class="flex-1 min-w-[40px] h-1.5 rounded-full bg-[color:var(--line)] overflow-hidden"><div data-ref="bar" class="h-full rounded-full bg-accent" style="width:0%"></div></div>
      <div data-ref="where" class="text-[15px] font-semibold text-muted nums whitespace-nowrap truncate"></div>
      <button data-action="quit" class="h-11 short:h-10 px-3.5 shrink-0 rounded-xl bg-surface2 text-[15px] font-semibold text-muted select-none whitespace-nowrap flex items-center gap-1.5" aria-label="그만하기 (길게 누르기)">${icon('x')}<span data-ref="quitT">길게 눌러 끝내기</span></button>
    </div>
    <div data-ref="banner" class="hidden mx-6 portrait:mx-3 mb-2 px-4 py-2 short:py-1 rounded-xl text-base short:text-sm font-semibold bg-prep text-onprep text-center"></div>
    <div class="pl-main">
      <div class="pl-title min-w-0 flex flex-col">
        <div data-ref="kicker" class="kicker short:hidden"></div>
        <div class="flex items-baseline gap-3 min-w-0">
          <div data-ref="name" class="text-[40px] portrait:text-[30px] short:text-[24px] leading-tight font-bold tracking-tight truncate"></div>
          <div data-ref="side" class="text-2xl portrait:text-xl short:text-lg font-bold text-accent whitespace-nowrap"></div>
        </div>
      </div>
      <section class="pl-stage card relative min-h-0 rounded-3xl overflow-hidden" style="background:var(--stage, var(--surface))">
        <div data-ref="visual" class="absolute inset-0"></div>
        <div data-ref="clip" class="absolute inset-0 hidden"></div>
        <button data-action="video" class="hidden absolute left-4 bottom-4 portrait:left-3 portrait:bottom-3 short:left-2 short:bottom-2 z-10 h-14 px-4 portrait:h-12 portrait:px-3 portrait:text-base short:h-10 short:px-3 short:text-sm rounded-2xl text-lg font-semibold flex items-center gap-2 shadow-sm bg-surface ring-1 ring-[color:var(--line)]">${icon('video')}영상으로 보기</button>
        <button data-action="slow" class="absolute right-4 bottom-4 portrait:right-3 portrait:bottom-3 short:right-2 short:bottom-2 z-10 h-14 px-4 portrait:h-12 portrait:px-3 portrait:text-base short:h-10 short:px-3 short:text-sm rounded-2xl text-lg font-semibold flex items-center gap-2 shadow-sm bg-surface ring-1 ring-[color:var(--line)]">${icon('slow')}천천히</button>
        <div data-ref="videohost"></div>
      </section>
      <section class="pl-side">
        <div class="pl-panel card rounded-3xl">
          <div class="shrink-0 flex items-center justify-between gap-3 portrait:flex-col portrait:items-start portrait:justify-center portrait:order-2 portrait:flex-1 portrait:min-w-0">
            <div data-ref="phase" class="h-9 short:h-8 px-3.5 rounded-full text-lg short:text-base font-bold inline-flex items-center whitespace-nowrap"></div>
            <div data-ref="setinfo" class="text-base short:text-sm font-semibold text-muted nums whitespace-nowrap"></div>
            <div data-ref="checkT" class="hidden portrait:block pl-check font-semibold leading-snug"></div>
          </div>
          <div class="pl-num">
            <svg viewBox="0 0 320 320">
              <circle cx="160" cy="160" r="${RING_R}" fill="none" stroke="var(--surface2)" stroke-width="16"/>
              <circle data-ref="ring" cx="160" cy="160" r="${RING_R}" fill="none" stroke="var(--work)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="0" style="transition:stroke-dashoffset .1s linear"/>
            </svg>
            <div data-ref="big" class="pl-big absolute inset-0 flex items-center justify-center nums leading-none"></div>
          </div>
        </div>
        <div class="pl-wide-only card rounded-3xl px-5 py-4 short:px-3 short:py-2 flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div data-ref="check" class="pl-check font-semibold leading-snug tracking-tight min-h-[62px] short:min-h-0"></div>
            <div data-ref="next" class="pl-short-hide mt-1 text-sm font-semibold text-muted truncate"></div>
          </div>
        </div>
      </section>
    </div>
    <div class="shrink-0 px-6 pt-4 pb-6 portrait:px-3 portrait:pt-3 portrait:pb-3 short:px-2 short:pt-2 short:pb-2">
      <button data-action="next" class="pl-next relative w-full rounded-[28px] bg-ink text-bg flex items-center justify-center gap-5 portrait:flex-col portrait:gap-1 active:scale-[.99] transition-transform">
        <div class="flex items-center gap-4 portrait:gap-3">
          <div class="text-[44px] portrait:text-[38px] short:text-[30px] font-bold tracking-tight leading-none">다 했어요</div>
          <div class="text-xl short:text-base font-bold tracking-[.14em] opacity-60">NEXT</div>
          <div class="text-[36px] short:text-[26px] leading-none flex">${icon('arrowRight')}</div>
        </div>
        <div data-ref="nudge" class="absolute bottom-3 inset-x-0 portrait:static short:inset-x-auto short:bottom-auto short:right-5 short:top-1/2 short:-translate-y-1/2 text-center text-xl short:text-base font-semibold opacity-0 pointer-events-none">다 했으면 눌러요</div>
      </button>
    </div>
    <div data-ref="paused" class="hidden absolute inset-0 z-30 flex flex-col items-center justify-center gap-8" style="background:color-mix(in srgb, var(--bg) 94%, transparent)">
      <div class="kicker">Paused</div>
      <div class="text-6xl portrait:text-5xl font-bold tracking-tight">잠깐 쉬는 중</div>
      <button data-action="resume" class="h-24 px-14 rounded-[28px] bg-ink text-bg text-4xl font-bold flex items-center gap-4">${icon('play')}계속하기</button>
    </div>`;
  const $ = r => el.querySelector(`[data-ref="${r}"]`);
  const btn = a => el.querySelector(`[data-action="${a}"]`);

  function banner(text, ms = 5000) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('hidden');
    bannerUntil = performance.now() + ms;
  }

  const online = () => globalThis.navigator?.onLine !== false;
  const isReps3d = s => s.kind === 'work' && s.reps != null && figure?.will3d(byId(s.exerciseId)) && !clipOn;
  let clipOn = false;

  // 엄마가 올린 내 영상이 있으면 그것, 없으면 인형
  async function showClip(exId) {
    const my = ++clipToken;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
    const box = $('clip');
    clipOn = false;
    box.classList.add('hidden'); box.innerHTML = '';
    const clipId = repo.settings().videoMap?.[exId];
    const clip = clipId && media ? await media().then(m => m.getClip(clipId)).catch(() => null) : null;
    if (my !== clipToken) return null; // 그사이 다음 동작으로 넘어감
    if (!clip?.blob) return false;
    clipOn = true;
    figure?.stop();
    videoUrl = URL.createObjectURL(clip.blob);
    box.innerHTML = `<video playsinline muted loop autoplay class="w-full h-full object-contain" src="${videoUrl}"></video>`;
    box.classList.remove('hidden');
    const v = box.firstElementChild;
    const { startSec = 0, endSec = null } = clip.trim ?? {};
    v.addEventListener('loadedmetadata', () => { v.currentTime = startSec; });
    v.addEventListener('timeupdate', () => { if (endSec != null && v.currentTime >= endSec) v.currentTime = startSec; });
    v.addEventListener('error', () => { banner('영상 재생이 안 돼서 그림으로 보여 줄게요'); clipOn = false; box.classList.add('hidden'); figKey = ''; playFigure(); }, { once: true });
    v.play?.().catch(() => {});
    return true;
  }

  function setSlowBtn() {
    const b = btn('slow');
    b.innerHTML = `${icon('slow')}${slow ? '천천히 켬' : '천천히'}`;
    b.className = `absolute right-4 bottom-4 portrait:right-3 portrait:bottom-3 short:right-2 short:bottom-2 z-10 h-14 px-4 portrait:h-12 portrait:px-3 portrait:text-base short:h-10 short:px-3 short:text-sm rounded-2xl text-lg font-semibold flex items-center gap-2 shadow-sm ${slow ? 'bg-accent text-white' : 'bg-surface ring-1 ring-[color:var(--line)]'}`;
    b.classList.toggle('hidden', clipOn);
  }

  function showBig() {
    const st = timer?.state();
    if (!st || st.done) return;
    const s = st.step;
    const big = $('big');
    if (st.remainingSec == null) {
      big.classList.add('is-reps');
      if (isReps3d(s)) {
        const [n, t] = repDisplay({ count: reps, target: s.reps }).text.split(' / ');
        big.innerHTML = `${n}<em>/ ${t}</em>`;
      } else big.innerHTML = `${s.reps}<em>회</em>`;
      lastShownSec = 'reps';
    }
  }

  // 인형을 지금 단계에 맞는 속도로. 같은 동작·같은 속도면 다시 시작하지 않는다.
  function playFigure(force = false) {
    const st = timer?.state();
    if (!st || st.done || st.paused || videoOpen || !figure || clipOn) return;
    const s = st.step;
    const ex = byId(s.exerciseId);
    const factor = motionFactor({ kind: s.kind, slow });
    const counting = isReps3d(s);
    // 같은 동작·같은 속도면 이어 보여 준다. 세는 중이면 세트(단계)마다 새로.
    const key = `${s.exerciseId}|${factor}|${counting ? st.index : '-'}`;
    if (key === figKey && !force) return;
    const sameSet = counting && figKey.endsWith(`|${st.index}`) && figKey.startsWith(`${s.exerciseId}|`);
    figKey = key;
    // 일시정지·🐢 로 다시 그려도 센 숫자는 이어서. 이미 다 셌으면 멈춘 채로 둔다.
    const base = sameSet ? reps : 0;
    reps = base;
    showBig();
    if (counting && repDisplay({ count: reps, target: s.reps }).done) { figure.stop(); $('nudge').style.opacity = '1'; return; }
    figure.show(ex, {
      factor,
      onCycle: counting ? n => {
        reps = base + n;
        audio.play('rep');
        const d = repDisplay({ count: reps, target: s.reps });
        showBig();
        if (d.done) { figure.stop(); $('nudge').style.opacity = '1'; }
      } : undefined,
    });
  }

  function nextName(i) {
    const cur = steps[i];
    const n = steps.slice(i + 1).find(s => s.itemIndex !== cur.itemIndex);
    return n ? byId(n.exerciseId)?.name : null;
  }

  function renderCheck(ex) {
    const n = ex.checkpoints.length;
    const k = checkpointAt(performance.now() - stepShownAt, n);
    if (k === shownCheck) return;
    shownCheck = k;
    const t = n ? `<span class="text-muted font-bold mr-1.5 nums">${k + 1}</span>${esc(ex.checkpoints[k])}` : '';
    $('check').innerHTML = t;
    $('checkT').innerHTML = t;
  }

  function renderVideoBtn(s) {
    const v = referenceVideo(s.exerciseId);
    btn('video').classList.toggle('hidden', videoOpen || clipOn || !showVideoButton({ kind: s.kind, video: v, online: online(), broken: brokenVideos.has(s.exerciseId) }));
  }

  function renderStep(st) {
    const s = st.step;
    const ex = byId(s.exerciseId);
    if (st.index !== lastIndex) {
      const exChanged = lastIndex < 0 || steps[lastIndex]?.itemIndex !== s.itemIndex;
      lastIndex = st.index;
      if (exChanged) {
        slow = false; // 동작이 바뀌면 기본 속도로
        stepShownAt = performance.now(); shownCheck = -1;
        showClip(s.exerciseId).then(on => { if (on === null) return; setSlowBtn(); if (!on) playFigure(); });
      }
      $('name').textContent = ex.name;
      const nn = nextName(st.index);
      $('next').textContent = nn ? `다음 · ${nn}` : '마지막 동작이에요!';
      const ph = PHASE[s.kind];
      const phaseEl = $('phase');
      // 색 글자는 흰 바탕에서 안 보여서(준비 주황 2:1) 색 칩 + 대비 글자로
      phaseEl.style.background = ph.color; phaseEl.style.color = ph.on;
      phaseEl.textContent = s.kind === 'prep' ? (s.block === 'main' ? '준비' : s.block === 'warmup' ? '웜업' : '쿨다운') : ph.label;
      $('kicker').textContent = CAT_EN[s.block === 'main' ? ex.category : s.block] ?? '';
      $('ring').setAttribute('stroke', `var(--${s.kind === 'switch' ? 'switch' : s.kind})`);
      $('side').textContent = s.side === 'L' ? '왼쪽' : s.side === 'R' ? '오른쪽' : s.kind === 'switch' ? '반대쪽으로!' : '';
      $('setinfo').textContent = s.sets > 1 ? `세트 ${s.set} / ${s.sets}` : '';
      $('nudge').style.opacity = '0';
      lastShownSec = null;
      setSlowBtn();
      if (!exChanged) playFigure();
    }
    renderCheck(ex);
    renderVideoBtn(s);
    // 큰 숫자: 초가 바뀔 때만
    const big = $('big');
    if (st.remainingSec == null) {
      if (lastShownSec !== 'reps') showBig();
      $('ring').setAttribute('stroke-dashoffset', '0');
      if (!isReps3d(s) || !repDisplay({ count: reps, target: s.reps }).done) {
        $('nudge').style.opacity = st.elapsedSec > REPS_NUDGE_SEC ? (Math.floor(st.elapsedSec) % 2 ? '1' : '0.3') : '0';
      }
    } else {
      const sec = Math.max(0, Math.ceil(st.remainingSec));
      if (sec !== lastShownSec) { big.classList.remove('is-reps'); big.textContent = String(sec); lastShownSec = sec; }
      const frac = Math.max(0, st.remainingSec / s.durationSec);
      $('ring').setAttribute('stroke-dashoffset', String(RING_C * (1 - frac)));
      $('nudge').style.opacity = '0';
    }
    $('bar').style.width = `${(st.progress * 100).toFixed(1)}%`;
    // 지금 위치: 웜업 2/6 · 약 40분 남음 / 본운동 3/12 / 쿨다운 1/7
    const count = blk => new Set(steps.filter(x => x.block === blk).map(x => x.itemIndex)).size;
    const nth = blk => new Set(steps.filter(x => x.block === blk && x.itemIndex <= s.itemIndex).map(x => x.itemIndex)).size;
    const tall = globalThis.matchMedia?.('(orientation: portrait)').matches;
    const itemNo = s.block === 'warmup' ? `웜업 ${nth('warmup')}/${count('warmup')}`
      : s.block === 'main' ? `본운동 ${nth('main')}/${count('main')}` : `쿨다운 ${nth('cooldown')}/${count('cooldown')}`;
    const leftMin = Math.max(0, Math.round((1 - st.progress) * total() / 60));
    $('where').textContent = tall ? itemNo : `${itemNo} · ${leftMin}분 남음`;
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
    figure?.stop();
    $('videohost').innerHTML = ''; videoOpen = false;
    wake.release();
    repo.saveSession(session);
    onFinish(session);
  }

  async function begin(plan) {
    steps = compileSession(plan.items);
    totalSec = steps.reduce((s, x) => s + (x.durationSec ?? (x.reps ?? 0) * (byId(x.exerciseId)?.secPerRep ?? 3)), 0);
    session = buildSession(plan);
    lastIndex = -1; figKey = ''; slow = false;
    figure ??= createFigure($('visual'), { onFallback: () => {
      banner('이 기기에서는 3D 대신 막대 그림으로 보여 줄게요');
      figKey = ''; lastShownSec = null; showBig(); // '0 / N' 대신 'N회'
    } });
    figure.setTheme(document.body.dataset.theme);
    audio.setQuiet(!!plan.quiet); // 아파트 야간: 소리 0.6배
    timer = createTimer(steps, { now, secPerRep: id => byId(id)?.secPerRep ?? 3 });
    $('paused').classList.add('hidden');
    handle(timer.start());
    renderStep(timer.state());
    ticker = setInterval(loop, TICK_MS);
    const w = await wake.acquire();
    if (w !== 'active') banner('화면이 꺼지지 않게: 설정 › 디스플레이 › 자동 잠금 › 안 함', 7000);
    if (audio.needsUnlock()) banner('화면을 한 번 탭하면 소리가 나요', 6000);
  }

  function openRefVideo() {
    const st = timer?.state();
    if (!st || st.done) return;
    const exId = st.step.exerciseId;
    const v = referenceVideo(exId);
    if (!v) return;
    timer.pause();
    videoOpen = true;
    btn('video').classList.add('hidden');
    const back = () => { videoOpen = false; if (timer) { timer.resume(); playFigure(true); } };
    figure?.stop();
    openVideo($('videohost'), v, {
      onDone: back,
      onFail: () => { brokenVideos.add(exId); banner('지금은 영상을 못 틀어서 그림으로 보여 줄게요'); back(); },
    });
  }

  // NEXT: 누르는 순간 반응 (pointerdown), 디바운스는 타이머가
  el.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-action]');
    if (!b || !timer || videoOpen) return;
    const act = b.dataset.action;
    if (act === 'next') {
      const evs = timer.next();
      if (evs.length) {
        audio.play('tap');
        b.animate?.([{ filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 250 });
        handle(evs);
      }
    } else if (act === 'quit') {
      $('quitT').textContent = '계속 누르면 끝나요…';
      quitTimer = setTimeout(() => finish('partial'), QUIT_HOLD_MS);
    }
  });
  const cancelQuit = () => {
    if (quitTimer) { clearTimeout(quitTimer); quitTimer = null; }
    const q = $('quitT');
    if (q) q.textContent = '길게 눌러 끝내기';
  };
  el.addEventListener('pointerup', cancelQuit);
  el.addEventListener('pointercancel', cancelQuit);
  el.addEventListener('pointerleave', cancelQuit);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || !timer) return;
    const act = b.dataset.action;
    if (act === 'pause' && !videoOpen) { timer.pause(); figure?.stop(); $('paused').classList.remove('hidden'); }
    if (act === 'resume') { timer.resume(); $('paused').classList.add('hidden'); playFigure(true); }
    if (act === 'slow') { slow = !slow; setSlowBtn(); playFigure(); }
    if (act === 'video') openRefVideo();
  });

  // 앱 전환 뒤 돌아오면 소리 다시 켜기 시도
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && timer && audio.needsUnlock()) banner('화면을 한 번 탭하면 소리가 나요', 6000); });

  return { begin, isRunning: () => !!timer, debug: () => ({ state: timer?.state(), session, reps, slow, figure: figure?.mode() }) };
}
