// もも帳 service worker: 電波がなくても開けるように、画面の部品を手元に置いておく
const CACHE = "momocho-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firebase の通信（ログインと同期）は触らない
  const h = url.hostname;
  const isFont = h === "fonts.googleapis.com" || h === "fonts.gstatic.com";
  if (!isFont && (h.endsWith("googleapis.com") || h.endsWith("firebaseapp.com") || h.endsWith("google.com") || h.endsWith("firebaseio.com"))) return;
  // アプリの画面：まず最新を取りに行き、だめなら手元のもの（共有で ?text= が付いていても同じ画面）
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return res; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // それ以外（アイコン、フォント、Firebase の部品など）：手元にあればそれを使い、裏で新しくしておく
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
