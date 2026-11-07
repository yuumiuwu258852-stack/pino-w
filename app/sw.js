/* PINO-W en terreno: la app queda guardada en el teléfono y abre sin esperar a internet.
   Se entrega lo guardado al tiro y se trae la versión nueva por detrás (la próxima vez que
   se abra, ya está). Lo del servidor (otra dirección) no pasa por acá: nunca se guarda. */

var CACHE = "pinow-app-1";
var ARCHIVOS = ["./", "index.html", "app.css", "app.js", "legal.js", "legal.css", "manifest.webmanifest", "icono-192.png", "icono-512.png"];

self.addEventListener("install", function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(caches.keys().then(function (nombres) {
    return Promise.all(nombres.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (ev) {
  var url = new URL(ev.request.url);
  if (ev.request.method !== "GET" || url.origin !== self.location.origin) { return; }
  ev.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(ev.request, { ignoreSearch: true }).then(function (guardado) {
      var fresco = fetch(ev.request).then(function (r) {
        if (r && r.ok) { c.put(ev.request, r.clone()); }
        return r;
      }).catch(function () { return guardado; });
      return guardado || fresco;
    });
  }));
});
