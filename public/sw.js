/* EcoScan PWA — minimal worker so install criteria stay reliable.
   Precaching / was failing installs when addAll rejected; Chrome needs an active SW + fetch handler. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
