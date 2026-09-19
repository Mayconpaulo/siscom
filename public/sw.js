const CACHE = "siscom-static-v0.2.0";
const STATIC_SHELL = ["/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableStaticAsset(request, url) {
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) return true;
  return ["font", "image", "style", "script"].includes(request.destination)
    && !url.pathname.startsWith("/api/")
    && !url.pathname.startsWith("/dashboard");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isCacheableStaticAsset(request, url)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response.ok || response.type === "opaque" || response.headers.has("set-cookie")) return response;
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      return response;
    })),
  );
});
