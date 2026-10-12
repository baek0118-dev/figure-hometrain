// 서비스 워커 — 설계 §1.1, §3.1. 앱 파일 전부를 미리 저장(오프라인: 공원·놀이터), 같은 주소 요청은 캐시 먼저.
// FILES·VERSION 은 tools/update-sw.mjs 가 채운다. 새 버전은 기다렸다가 앱이 "새로고침"을 보내면 바뀐다.
const VERSION = 'v-647a876751fc';
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "review/motion3d.html",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "vendor/anthropic-sdk-0.133.0.js",
  "vendor/tailwind-3.4.17.js",
  "vendor/three/addons/effects/OutlineEffect.js",
  "vendor/three/addons/loaders/GLTFLoader.js",
  "vendor/three/addons/utils/BufferGeometryUtils.js",
  "vendor/three/three.core.min.js",
  "vendor/three/three.module.min.js",
  "vendor/three-vrm/three-vrm.module.min.js",
  "src/ai/autotrim.js",
  "src/ai/client.js",
  "src/ai/coach.js",
  "src/ai/flow.js",
  "src/ai/frames.js",
  "src/ai/trim.js",
  "src/app/store.js",
  "src/data/exercises.js",
  "src/data/motions3d.js",
  "src/data/poses.js",
  "src/data/templates.js",
  "src/domain/adapt.js",
  "src/domain/cart.js",
  "src/domain/cheer.js",
  "src/domain/dates.js",
  "src/domain/guard.js",
  "src/domain/kinematics.js",
  "src/domain/modes.js",
  "src/domain/planner.js",
  "src/domain/pose3d.js",
  "src/domain/timeline.js",
  "src/domain/validate.js",
  "src/domain/xp.js",
  "src/engine/audio.js",
  "src/engine/cues.js",
  "src/engine/timer.js",
  "src/engine/wakelock.js",
  "src/main.js",
  "src/storage/local.js",
  "src/storage/media.js",
  "src/storage/repo.js",
  "src/ui/components/stickman.js",
  "src/ui/format.js",
  "src/ui/screens/evaluate.js",
  "src/ui/screens/menu.js",
  "src/ui/screens/player.js",
  "src/ui/screens/settings.js",
  "src/ui/screens/start.js",
  "src/ui/screens/stats.js",
  "src/ui/three/mannequin.js",
  "src/ui/three/models.js",
  "src/ui/three/rig.js",
  "src/ui/three/viewer.js"
];
const CACHE = `yuha-${VERSION}`;

self.addEventListener('install', e => {
  // cache:'reload' — 브라우저 HTTP 캐시(GitHub Pages 10분)에 남은 옛 파일을 새 버전에 담지 않게
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('yuha-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // AI API 등 외부 요청은 그대로
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // 앱 화면(./, index.html)만 캐시에서. 다른 페이지(확인용 tests/browser/*.html 등)는 그대로 네트워크.
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate' && url.pathname.endsWith('/')) return (await cache.match('index.html')) ?? fetch(req);
    return fetch(req);
  })());
});
