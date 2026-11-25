/* Pétanque Manager – fonctionnement hors connexion. Changer VERSION à chaque mise en ligne pour mettre l'appli à jour. */
const VERSION = "pm-web-1.4.2";
const FICHIERS = [
  "./", "index.html", "app.css?v=2", "moteur.js?v=1", "app.js?v=3", "manifest.webmanifest",
  "icones/icone-192.png", "icones/icone-512.png", "icones/icone-maskable-512.png", "icones/apple-touch-icon.png", "icones/favicon.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Le cache d'abord (ouverture immédiate, même sans réseau), puis mise à jour en arrière-plan pour la fois suivante.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((cache) => {
    const reseau = fetch(e.request).then((r) => {
      if (r && r.ok) { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); }
      return r;
    }).catch(() => cache || caches.match("index.html"));
    if (cache) { e.waitUntil(reseau.catch(() => {})); return cache; }
    return reseau;
  }));
});
