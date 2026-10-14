// Offline cache for the AIF-C01 study app (PWA)
var CACHE_NAME = "aif-app-cache-v5";
var ASSETS = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./questions-data.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./guide.html",
  "./practice.html"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("message", function (event) {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first for same-origin; fall back to cache when offline.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function (resp) {
      var respClone = resp.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, respClone);
      });
      return resp;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
