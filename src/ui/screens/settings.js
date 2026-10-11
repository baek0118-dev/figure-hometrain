// 설정(엄마용) — 설계 §4.6. 내 영상, 소리, 화면·저소음, 기록(백업·다시 계산·초기화), AI.
import { EXERCISES, byId } from '../../data/exercises.js';
import { CATEGORIES } from '../../domain/validate.js';
import { CAT_KO, esc } from '../format.js';
import { autoTrim } from '../../ai/autotrim.js';
import { MONTHLY_LIMIT_USD } from '../../ai/client.js';

const MB = 1024 * 1024;
const WARN_MB = 100, MAX_MB = 300;
const fmtMB = b => `${(b / MB).toFixed(b < 10 * MB ? 1 : 0)}MB`;

function videoDuration(blob) {
  return new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { res(Number.isFinite(v.duration) ? v.duration : null); URL.revokeObjectURL(v.src); };
    v.onerror = () => { res(null); URL.revokeObjectURL(v.src); };
    v.src = URL.createObjectURL(blob);
  });
}

export function mountSettings(el, { store, repo, local, audio, media, ai, onVideoChanged }) {
  let clips = [], est = null, confirmReset = false, msg = '', previewUrl = null;
  let trimEd = null; // { clipId, url, duration, start, end, by }
  const BY_KO = { ai: 'AI', rule: '자동', parent: '직접' };
  const ex4video = EXERCISES.filter(e => CATEGORIES.includes(e.category));

  async function refreshClips() {
    try {
      const m = await media();
      clips = await m.list();
      est = await m.estimate();
    } catch { clips = []; }
    render();
  }

  const toggle = (key, on, label) => `<button data-action="toggle" data-key="${key}" class="h-14 px-5 rounded-2xl text-xl font-bold ${on ? 'bg-accent text-white' : 'bg-surface2'}">${on ? '✔' : '○'} ${label}</button>`;
  const card = (title, body) => `<section class="rounded-3xl bg-surface p-5 flex flex-col gap-3"><div class="text-2xl font-extrabold">${title}</div>${body}</section>`;

  function videos() {
    const map = repo.settings().videoMap ?? {};
    const byEx = Object.fromEntries(clips.map(c => [c.exerciseId, c]));
    const used = clips.reduce((s, c) => s + c.size, 0);
    const bar = est?.quota ? `<div class="text-lg text-muted">영상 ${fmtMB(used)} · 기기 저장 공간 ${fmtMB(est.usage ?? 0)} / ${fmtMB(est.quota)}</div>` : `<div class="text-lg text-muted">영상 ${fmtMB(used)}</div>`;
    const rows = CATEGORIES.map(cat => `<div class="text-xl font-extrabold mt-2">${CAT_KO[cat]}</div>` +
      ex4video.filter(e => e.category === cat).map(e => {
        const c = byEx[e.id];
        const linked = c && map[e.id] === c.clipId;
        return `<div class="h-16 rounded-2xl bg-surface2 px-4 flex items-center gap-3">
          <div class="flex-1 text-xl font-bold truncate">${esc(e.name)}${linked ? ' <span class="text-base px-2 py-0.5 rounded-full bg-work text-onphase">내 영상</span>' : ''}</div>
          ${linked ? `<div class="text-base text-muted nums">${fmtMB(c.size)}${c.trim ? ` · ✂ ${c.trim.startSec}~${c.trim.endSec}초 ${BY_KO[c.trim.by] ?? ''}` : c.durationSec ? ` · ${Math.round(c.durationSec)}초` : ''}</div>
            <button data-action="trim" data-clip="${c.clipId}" class="h-12 px-4 rounded-xl bg-surface text-lg font-bold">✂ 구간</button>
            <button data-action="preview" data-clip="${c.clipId}" class="h-12 px-4 rounded-xl bg-surface text-lg font-bold">▶ 보기</button>
            <button data-action="delvideo" data-ex="${e.id}" data-clip="${c.clipId}" class="h-12 px-4 rounded-xl bg-surface text-lg font-bold">삭제</button>` : ''}
          <label class="h-12 px-4 rounded-xl bg-accent text-white text-lg font-bold flex items-center cursor-pointer">${linked ? '바꾸기' : '+ 영상 올리기'}
            <input type="file" accept="video/*" data-action="upload" data-ex="${e.id}" class="hidden"></label>
        </div>`;
      }).join('')).join('');
    return card('🎬 운동별 내 시범 영상', `${bar}<div class="text-lg text-muted">30초 안쪽 짧은 영상이 좋아요. 올린 영상은 이 아이패드에만 저장돼요.</div>${rows}`);
  }

  function usageLine() {
    if (!ai) return '';
    const u = ai.usage(), bdg = ai.budget(), q = ai.pending().length;
    return `<div class="text-lg ${bdg.warn ? 'font-extrabold text-[color:var(--prep)]' : 'text-muted'}">이번 달 AI ${u.calls}번 · 약 $${(u.usd ?? 0).toFixed(2)} / 한도 $${MONTHLY_LIMIT_USD}${bdg.blocked ? ' · 한도라 AI 쉬는 중' : ''}${q ? ` · 대기 ${q}건` : ''}</div>`;
  }

  function trimEditor() {
    if (!trimEd) return '';
    const t = trimEd;
    return `<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:color-mix(in srgb, var(--bg) 85%, transparent)">
      <div class="rounded-3xl bg-surface p-5 flex flex-col gap-3 w-[900px]">
        <div class="text-2xl font-extrabold">✂ 시범 구간 고르기 <span class="text-lg text-muted">${t.by ? `(${BY_KO[t.by]}${t.reason ? ` — ${esc(t.reason)}` : ''})` : ''}</span></div>
        <video data-ref="tvideo" src="${t.url}" playsinline muted autoplay class="max-h-[420px] rounded-2xl bg-surface2"></video>
        <div class="flex items-center gap-3 text-xl font-bold nums">시작 <input data-action="tstart" type="range" min="0" max="${t.duration}" step="0.1" value="${t.start}" class="flex-1 h-10"> <span>${t.start.toFixed(1)}초</span></div>
        <div class="flex items-center gap-3 text-xl font-bold nums">끝 <input data-action="tend" type="range" min="0" max="${t.duration}" step="0.1" value="${t.end}" class="flex-1 h-10"> <span>${t.end.toFixed(1)}초</span></div>
        <div class="flex gap-3">
          <button data-action="tsave" class="h-14 px-6 rounded-2xl text-xl font-bold bg-accent text-white">이대로 저장</button>
          <button data-action="tai" class="h-14 px-6 rounded-2xl text-xl font-bold bg-surface2">🤖 AI로 다시 자르기</button>
          <button data-action="tclose" class="h-14 px-6 rounded-2xl text-xl font-bold bg-surface2">닫기</button>
        </div></div></div>`;
  }

  // 편집기 영상은 고른 구간만 반복
  function loopTrimVideo() {
    const v = el.querySelector('[data-ref="tvideo"]');
    if (!v || !trimEd) return;
    v.onloadedmetadata = () => { v.currentTime = trimEd.start; };
    v.ontimeupdate = () => { if (v.currentTime >= trimEd.end || v.currentTime < trimEd.start - 0.3) v.currentTime = trimEd.start; };
  }

  function render() {
    const s = repo.settings();
    const vol = Math.round(s.volume);
    const key = local.get('ai.key');
    el.innerHTML = `
      <header class="h-[76px] shrink-0 px-6 flex items-center gap-3 border-b border-line bg-surface">
        <button data-action="back" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">◀ 메뉴로</button>
        <div class="text-3xl font-extrabold ml-2">설정 (엄마용)</div>
        ${msg ? `<div class="ml-4 text-xl font-bold text-accent">${esc(msg)}</div>` : ''}
      </header>
      <div class="scroll-y flex-1 min-h-0 p-5 grid grid-cols-2 gap-5 content-start">
        <div class="flex flex-col gap-5">
          ${card('🔊 소리', `
            <div class="flex items-center gap-4"><div class="text-xl font-bold w-20">볼륨</div>
              <input data-action="volume" type="range" min="0" max="100" value="${vol}" class="flex-1 h-10"><div class="text-xl nums w-12">${vol}</div></div>
            <div class="flex gap-3 flex-wrap">${toggle('beeps', s.beeps, '3·2·1 비프')}${toggle('chimes', s.chimes, '차임')}
              <button data-action="testsound" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">🔔 소리 시험</button></div>
            <div class="text-base text-muted">무음 모드에서 안 들리면 아이패드 소리를 켜 주세요.</div>`)}
          ${card('🌙 화면·저소음', `
            <div class="flex gap-2 flex-wrap">${['auto', 'day', 'night', 'outdoor'].map(t => `<button data-action="theme" data-value="${t}" class="h-14 px-5 rounded-2xl text-xl font-bold ${s.theme === t ? 'bg-accent text-white' : 'bg-surface2'}">${{ auto: '자동', day: '☀ 낮', night: '🌙 밤', outdoor: '🔆 야외' }[t]}</button>`).join('')}</div>
            <div class="flex gap-3 items-center flex-wrap">${toggle('quietEnabled', s.quietEnabled, '야간 저소음 (아파트)')}
              <div class="text-xl font-bold">시작</div><select data-action="quietFrom" class="h-14 px-3 rounded-2xl bg-surface2 text-xl">${[19, 20, 21, 22].map(h => `<option value="${h}" ${s.quietFromHour === h ? 'selected' : ''}>${h}시</option>`).join('')}</select></div>`)}
          ${card('📦 기록', `
            <div class="flex gap-3 flex-wrap">
              <button data-action="export" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">💾 백업 저장</button>
              <label class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2 flex items-center cursor-pointer">📂 백업 불러오기<input type="file" accept="application/json,.json" data-action="import" class="hidden"></label>
              <button data-action="rebuild" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">🔄 통계 다시 계산</button>
              <button data-action="reset" class="h-14 px-5 rounded-2xl text-xl font-bold ${confirmReset ? 'bg-prep text-onprep' : 'bg-surface2'}">${confirmReset ? '⚠ 한 번 더 누르면 전부 지워요' : '🗑 전체 초기화'}</button>
            </div>
            <div class="text-base text-muted">기록 ${repo.sessions().length}개 · 백업 파일은 '파일' 앱에 저장해 두세요 (영상은 빠져요).</div>`)}
          ${card('🤖 AI 코치', `
            <div class="text-lg">${key ? `키 저장됨: <span class="nums">${esc(String(key).slice(0, 8))}…</span>` : '키가 없으면 규칙 추천만 써요.'}</div>
            <div class="flex gap-3"><input data-ref="aikey" type="password" autocomplete="off" placeholder="sk-ant-… 붙여 넣기" class="flex-1 h-14 px-4 rounded-2xl bg-surface2 text-xl">
              <button data-action="savekey" class="h-14 px-5 rounded-2xl text-xl font-bold bg-accent text-white">저장</button>
              ${key ? '<button data-action="delkey" class="h-14 px-5 rounded-2xl text-xl font-bold bg-surface2">키 지우기</button>' : ''}</div>
            <div class="flex gap-3 items-center"><div class="text-xl font-bold">1급 심사일</div><input data-action="exam" type="date" value="${s.examDate ?? ''}" class="h-14 px-4 rounded-2xl bg-surface2 text-xl"></div>
            <textarea data-action="memo" maxlength="200" rows="2" placeholder="코치 메모·몸 상태 (예: 왼발 착지가 흔들려요) — AI 가 다음 추천에 반영" class="p-3 rounded-2xl bg-surface2 text-lg">${esc(s.parentNote ?? '')}</textarea>
            ${usageLine()}
            <div class="text-base text-muted">키는 이 아이패드에만 저장되고 백업 파일에도 들어가지 않아요.</div>`)}
        </div>
        <div class="flex flex-col gap-5">${videos()}</div>
      </div>
      ${previewUrl ? `<div class="fixed inset-0 z-50 flex items-center justify-center" style="background:color-mix(in srgb, var(--bg) 85%, transparent)">
        <div class="rounded-3xl bg-surface p-5 flex flex-col gap-3 items-center"><video src="${previewUrl}" playsinline muted loop autoplay controls class="max-h-[560px] max-w-[900px] rounded-2xl"></video>
        <button data-action="closepreview" class="h-14 px-8 rounded-2xl text-xl font-bold bg-accent text-white">닫기</button></div></div>` : ''}
      ${trimEditor()}`;
    loopTrimVideo();
  }

  async function openTrim(clipId) {
    const c = await (await media()).getClip(clipId);
    if (!c) return;
    const duration = c.durationSec ?? 30;
    trimEd = { clipId, url: URL.createObjectURL(c.blob), duration: Math.round(duration * 10) / 10,
      start: c.trim?.startSec ?? 0, end: c.trim?.endSec ?? Math.min(duration, 12), by: c.trim?.by, reason: c.trim?.reason };
    render();
  }

  const flash = t => { msg = t; render(); setTimeout(() => { if (msg === t) { msg = ''; render(); } }, 3000); };

  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const s = repo.settings();
    switch (b.dataset.action) {
      case 'back': confirmReset = false; store.set({ screen: 'menu' }); break;
      case 'toggle': repo.saveSettings({ [b.dataset.key]: !s[b.dataset.key] }); render(); break;
      case 'theme': repo.saveSettings({ theme: b.dataset.value }); store.set({ themeTick: Date.now() }); render(); break;
      case 'testsound': await audio.unlock(); audio.play('count'); setTimeout(() => audio.play('go'), 500); setTimeout(() => audio.play('setDone'), 1200); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(repo.exportJson(), null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `yuha-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        repo.saveSettings({ lastBackupAt: new Date().toISOString().slice(0, 10) });
        flash('백업 파일을 만들었어요');
        break;
      }
      case 'rebuild': repo.rebuild(); flash('통계를 다시 계산했어요'); break;
      case 'reset':
        if (!confirmReset) { confirmReset = true; render(); setTimeout(() => { confirmReset = false; render(); }, 4000); break; }
        for (const k of ['sessions', 'sessions.bak', 'progress', 'stats', 'settings']) local.remove(k);
        confirmReset = false; flash('전부 지웠어요'); break;
      case 'savekey': {
        const v = el.querySelector('[data-ref="aikey"]').value.trim();
        if (!/^sk-ant-/.test(v)) { flash('키 모양이 이상해요 (sk-ant- 로 시작)'); break; }
        local.set('ai.key', v); flash('키를 저장했어요'); break;
      }
      case 'delkey': local.remove('ai.key'); flash('키를 지웠어요'); break;
      case 'preview': {
        const c = await (await media()).getClip(b.dataset.clip);
        if (c) { previewUrl = URL.createObjectURL(c.blob); render(); }
        break;
      }
      case 'closepreview': URL.revokeObjectURL(previewUrl); previewUrl = null; render(); break;
      case 'trim': openTrim(b.dataset.clip); break;
      case 'tclose': URL.revokeObjectURL(trimEd.url); trimEd = null; render(); refreshClips(); break;
      case 'tsave':
        await (await media()).setTrim(trimEd.clipId, { startSec: trimEd.start, endSec: trimEd.end, by: 'parent' });
        URL.revokeObjectURL(trimEd.url); trimEd = null; flash('구간을 저장했어요'); refreshClips();
        break;
      case 'tai': {
        flash('AI 가 영상을 보고 있어요…');
        const r = await autoTrim({ media, ai, clipId: trimEd.clipId });
        if (r && trimEd) { Object.assign(trimEd, { start: r.startSec, end: r.endSec, by: r.by, reason: r.reason }); }
        flash(r?.by === 'ai' ? 'AI 가 구간을 골랐어요' : `AI 를 못 써서 움직임으로 골랐어요${r?.aiError ? ` (${r.aiError})` : ''}`);
        break;
      }
      case 'delvideo': {
        await (await media()).deleteClip(b.dataset.clip);
        const map = { ...(s.videoMap ?? {}) }; delete map[b.dataset.ex];
        repo.saveSettings({ videoMap: map });
        onVideoChanged?.();
        flash('영상을 지웠어요'); refreshClips();
        break;
      }
      default: break;
    }
  });

  el.addEventListener('change', async e => {
    const t = e.target;
    const s = repo.settings();
    if (t.dataset.action === 'volume') { repo.saveSettings({ volume: Number(t.value) }); audio.setVolume(Number(t.value) / 100); render(); }
    if (t.dataset.action === 'quietFrom') repo.saveSettings({ quietFromHour: Number(t.value) });
    if (t.dataset.action === 'exam') repo.saveSettings({ examDate: t.value || null });
    if (t.dataset.action === 'memo') { repo.saveSettings({ parentNote: t.value.slice(0, 200) }); flash('메모 저장 — 다음 AI 추천에 반영'); }
    if (t.dataset.action === 'tstart' && trimEd) { trimEd.start = Math.min(Number(t.value), trimEd.end - 1); render(); }
    if (t.dataset.action === 'tend' && trimEd) { trimEd.end = Math.max(Number(t.value), trimEd.start + 1); render(); }
    if (t.dataset.action === 'upload' && t.files?.[0]) {
      const f = t.files[0];
      if (f.size > MAX_MB * MB) { flash(`영상이 너무 커요(${fmtMB(f.size)}). 30초 안쪽으로 잘라 주세요`); return; }
      if (f.size > WARN_MB * MB) flash(`큰 영상이에요(${fmtMB(f.size)}). 짧게 자르면 더 좋아요`);
      const durationSec = await videoDuration(f);
      try {
        const clipId = await (await media()).putClip({ exerciseId: t.dataset.ex, blob: f, durationSec });
        repo.saveSettings({ videoMap: { ...(s.videoMap ?? {}), [t.dataset.ex]: clipId } });
        onVideoChanged?.();
        flash(`${byId(t.dataset.ex).name} 영상 저장! 시범 구간 고르는 중…`);
        autoTrim({ media, ai, clipId }).then(r => { flash(r?.by === 'ai' ? 'AI 가 시범 구간을 골랐어요 ✂' : '움직임으로 시범 구간을 골랐어요 ✂'); refreshClips(); }).catch(() => {});
      } catch {
        flash('저장 공간이 부족해요. 다른 영상을 지워 주세요');
      }
      refreshClips();
    }
    if (t.dataset.action === 'import' && t.files?.[0]) {
      try {
        const r = repo.importJson(JSON.parse(await t.files[0].text()));
        flash(r.ok ? `백업 불러오기 완료 (기록 ${r.sessions}개)` : ({ notOurs: '이 앱 백업 파일이 아니에요', newerVersion: '더 새 버전 앱의 백업이에요', broken: '파일이 깨졌어요' }[r.error] ?? '불러오기 실패'));
      } catch { flash('파일을 읽을 수 없어요'); }
    }
  });

  store.subscribe((st, prev) => { if (st.screen === 'settings' && prev.screen !== 'settings') { render(); refreshClips(); } });
  return { render };
}
