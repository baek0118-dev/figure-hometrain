// 참고 영상 창 — 참고 영상 메모 §3. 유튜브 공식 퍼가기(youtube-nocookie)로 정답 구간만 반복하고 멈춘다.
// 내려받지 않는다. IFrame API 는 인터넷이 될 때 처음 열 때만 불러온다. 못 읽거나 오류면 onFail.
import { UI, videoAfterEnd } from '../uiconfig.js';
import { esc } from '../format.js';

let apiP = null;
function loadApi() {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  return (apiP ??= new Promise((resolve, reject) => {
    const prev = globalThis.onYouTubeIframeAPIReady;
    globalThis.onYouTubeIframeAPIReady = () => { prev?.(); resolve(globalThis.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiP = null; reject(new Error('api')); };
    document.head.appendChild(s);
  }));
}

// host 위에 덮는 창. onDone = [연습 시작], onFail = 못 틀었음(버튼 숨기기)
export function openVideo(host, video, { onDone, onFail }) {
  host.innerHTML = `
    <div class="absolute inset-0 z-20 flex flex-col gap-2 p-2 rounded-2xl bg-surface">
      <div class="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black">
        <div data-v="player" class="absolute inset-0"></div>
        <div data-v="wait" class="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">영상 불러오는 중…</div>
        ${video.mirror ? '<div class="absolute left-2 top-2 px-3 py-1 rounded-lg bg-prep text-onprep text-xl font-bold">좌우 반대로 보기</div>' : ''}
      </div>
      <div class="shrink-0 flex flex-wrap items-center gap-2">
        <button data-v="slow" class="h-14 px-5 rounded-2xl bg-surface2 text-xl font-semibold">천천히 0.5배</button>
        <button data-v="again" class="hidden h-14 px-5 rounded-2xl bg-surface2 text-xl font-semibold">다시 보기</button>
        <div class="flex-1 text-base text-muted truncate">${esc(video.channel ?? '')}</div>
        <button data-v="done" class="h-14 px-6 rounded-2xl bg-ink text-bg text-xl font-bold">연습 시작</button>
      </div>
    </div>`;
  const $ = k => host.querySelector(`[data-v="${k}"]`);
  let player = null, plays = 0, slow = false, closed = false;
  const abort = new AbortController();
  const close = () => { closed = true; abort.abort(); clearTimeout(timeout); try { player?.destroy(); } catch {} host.innerHTML = ''; };
  const fail = () => { if (closed) return; close(); onFail?.(); };
  const timeout = setTimeout(() => { if (!player?.__ready) fail(); }, UI.videoLoadMs);

  loadApi().then(YT => {
    if (closed) return;
    player = new YT.Player($('player'), {
      host: 'https://www.youtube-nocookie.com', videoId: video.videoId, width: '100%', height: '100%',
      playerVars: { start: video.start, end: video.end, rel: 0, playsinline: 1, modestbranding: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, mute: 1 },
      events: {
        onReady: e => { player.__ready = true; $('wait')?.remove(); e.target.mute(); e.target.playVideo(); },
        onError: fail,
        onStateChange: e => {
          if (e.data !== YT.PlayerState.ENDED) return;
          plays++;
          if (videoAfterEnd(plays) === 'replay') { e.target.seekTo(video.start, true); e.target.playVideo(); } else $('again')?.classList.remove('hidden');
        },
      },
    });
  }).catch(fail);

  host.addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (!b || closed) return;
    if (b.dataset.v === 'done') { close(); onDone?.(); }
    if (b.dataset.v === 'slow' && player?.__ready) { slow = !slow; player.setPlaybackRate(slow ? 0.5 : 1); b.textContent = slow ? '천천히 0.5배 켬' : '천천히 0.5배'; b.classList.toggle('bg-accent', slow); b.classList.toggle('text-white', slow); }
    if (b.dataset.v === 'again' && player?.__ready) { plays = 0; b.classList.add('hidden'); player.seekTo(video.start, true); player.playVideo(); }
  }, { signal: abort.signal });
  return { close };
}
