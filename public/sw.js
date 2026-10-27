// 설치형 앱(홈 화면 앱)으로 쓰기 위한 서비스 워커.
// 아무것도 저장해 두지 않는다 — 늘 새 버전을 받고, 페이지 이동만 거쳐 인터넷이 끊겼을 때 안내한다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    fetch(e.request).catch(
      () =>
        new Response('<meta charset="utf-8"><meta name="viewport" content="width=device-width"><p style="font:16px sans-serif;padding:24px">인터넷에 연결되지 않았어요. 연결되면 다시 열어 주세요.</p>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
    ),
  );
});
