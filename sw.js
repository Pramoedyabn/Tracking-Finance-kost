const CACHE_NAME = "kost-tracker-v2"; // ganti angka ini tiap kali deploy versi baru
const urlsToCache = ["/", "/index.html", "/style.css", "/script.js"];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // langsung aktifin versi baru, gak nunggu tab lama ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)) // hapus cache versi lama
        )
      )
      .then(() => self.clients.claim())
  );
});

// Strategi: NETWORK FIRST -> coba ambil versi terbaru dari internet dulu,
// baru jatuh ke cache kalau lagi offline. Ini yang bikin dulu filter
// kelihatan "gak update" walau udah di-deploy ulang.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
