const API_URL = "http://localhost:5000/api/push";

// Web Push subscription payloads are base64url — the browser API needs raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// 'unsupported' | 'not-subscribed' | 'subscribed'
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'not-subscribed';
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'subscribed' : 'not-subscribed';
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported on this device/browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const keyRes = await fetch(`${API_URL}/vapid-public-key`);
  const keyData = await keyRes.json();
  if (!keyRes.ok) throw new Error(keyData.message || 'Push notifications are not available right now.');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
  });

  const token = localStorage.getItem('token');
  const subJson = subscription.toJSON();
  const res = await fetch(`${API_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save push subscription.');
}

export async function disablePushNotifications() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ endpoint })
  }).catch(() => {});
}
