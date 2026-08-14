// KEMP service worker — push delivery + click-through only. Registered
// lazily (only once a user opts into push, see src/utils/pushApi.js), not
// eagerly on every page load.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'KEMP', body: event.data.text() };
  }

  const title = payload.title || 'KEMP';
  const options = {
    body: payload.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: { url: payload.url || '/notifications' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
