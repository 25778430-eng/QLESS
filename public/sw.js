// Qless service worker: shows push notifications and opens the booking when tapped.
self.addEventListener("push", (event) => {
  let data = { title: "Qless", body: "", url: "/bookings" };
  try { data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icons/icon-192.png", badge: "/qmark.png", data: { url: data.url } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/bookings";
  event.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
