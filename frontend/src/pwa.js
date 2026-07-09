/*
  StreamX PWA Registration
  Add this as: frontend/src/pwa.js
  Import and call registerPWA() in your main App.jsx
*/

export async function registerPWA() {
  // Register service worker
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("[PWA] Service worker registered:", reg.scope);
    } catch(e) {
      console.log("[PWA] Service worker failed:", e);
    }
  }
}

// Ask user to install the app (shows "Add to Home Screen" prompt)
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
});

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return result.outcome === "accepted";
}

export function canInstall() {
  return !!deferredPrompt;
}

// Subscribe to push notifications
export async function subscribeToPush(backendUrl, token) {
  try {
    const reg = await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const keyRes = await fetch(`${backendUrl}/api/push/vapid-key`);
    const keyData = await keyRes.json();
    if (!keyData.success) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(keyData.data.publicKey),
    });

    // Send subscription to backend
    await fetch(`${backendUrl}/api/push/subscribe`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({ subscription: sub }),
    });

    return true;
  } catch(e) {
    console.log("[PWA] Push subscribe failed:", e);
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
