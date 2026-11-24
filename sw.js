const CACHE = "science4-v9";
const CORE = [
  "./", "./index.html", "./offline.html", "./styles.css", "./app.js",
  "./manifest.webmanifest", "./supabase-config.js",
  "./assets/science4-icon.svg", "./assets/science4-icon-192.svg",
  "./assets/science4-icon-512.svg", "./assets/cours-illustration.svg",
  "./assets/exetat-illustration.svg", "./assets/entraide-illustration.svg"
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(async path => {
      try { await cache.add(path); } catch (error) { console.warn("Cache ignoré :", path); }
    }));
  })());
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
  ));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("./index.html", copy));
      return response;
    }).catch(async () => (await caches.match("./offline.html")) || (await caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});