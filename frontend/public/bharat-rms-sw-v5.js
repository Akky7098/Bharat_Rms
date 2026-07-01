/* ============================================================
   Bharat RMS Service Worker
   Version : v8
============================================================ */

const CACHE_NAME = "bharat-rms-v8";

const APP_SHELL = [
  "/index.html",
  "/manifest.json",
  "/bharat-rms-icon-12-06-2026.png",
];

/* INSTALL */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

/* ACTIVATE */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );

      await self.clients.claim();
    })()
  );
});

/* FETCH */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Never touch backend/API/socket requests
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io") ||
    url.hostname.includes("bharatspecialsteels.bharatspecialsteels.com")
  ) {
    return;
  }

  // SPA navigation fallback only
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Cache only same-origin static assets
  if (url.origin !== self.location.origin) return;

  const allowedDestinations = ["script", "style", "image", "font"];

  if (!allowedDestinations.includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        fetch(request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== "opaque"
            ) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== "opaque"
        ) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }

        return networkResponse;
      });
    })
  );
});

/* PUSH */
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Bharat RMS",
      body: "New Notification",
    };
  }

  const options = {
    body: data.body || "",

    icon:
      data.icon ||
      "/bharat-rms-icon-12-06-2026.png",

    badge:
      data.badge ||
      "/bharat-rms-icon-12-06-2026.png",

    image: data.image,

    vibrate: [300, 100, 300],

    requireInteraction: true,

    renotify: true,

    silent: false,

    tag:
      data.notificationId ||
      Date.now().toString(),

    timestamp: Date.now(),

    data: {
      url: data.url || "/dashboard",
      notificationId: data.notificationId || "",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Bharat RMS",
      options
    )
  );
});

/* NOTIFICATION CLICK */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.includes(
              "dashboard.bharatspecialsteels.com"
            )
          ) {
            if ("navigate" in client) {
              client.navigate(url);
            }

            return client.focus();
          }
        }

        return clients.openWindow(url);
      })
  );
});