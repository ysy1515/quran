// Service Worker — Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "القرآن الكريم", body: event.data.text() };
  }

  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/favicon.svg",
    badge: data.badge ?? "/favicon.svg",
    tag: data.tag ?? "quran-reminder",
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
    actions: [
      { action: "open", title: "افتح التطبيق" },
      { action: "dismiss", title: "لاحقاً" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title ?? "القرآن الكريم", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
