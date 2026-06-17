import axios from "axios";

const API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/push-subscriptions";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const getPlatform = () => {
  const ua = navigator.userAgent || "";

  if (/iphone|ipad|ipod/i.test(ua)) return "ios_safari";
  if (/android/i.test(ua)) return "android_chrome";

  return "pwa";
};

export const isPushSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window;
};

export const getPushPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export const getCurrentPushSubscription = async () => {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.register(
    "/service-worker.js"
  );

  return registration.pushManager.getSubscription();
};

export const enablePushNotifications = async () => {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this browser.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not allowed.");
  }

  const registration = await navigator.serviceWorker.register(
    "/service-worker.js"
  );

  const keyResponse = await axios.get(`${API_URL}/public-key`, {
    headers: authHeaders(),
  });

  const publicKey = keyResponse.data?.data?.publicKey;

  if (!publicKey) {
    throw new Error("Push public key not found.");
  }

  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    try {
      await axios.post(
        `${API_URL}/subscribe`,
        {
          subscription,
          platform: getPlatform(),
        },
        {
          headers: authHeaders(),
        }
      );

      return subscription;
    } catch (error) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await axios.post(
    `${API_URL}/subscribe`,
    {
      subscription,
      platform: getPlatform(),
    },
    {
      headers: authHeaders(),
    }
  );

  return subscription;
};

export const disablePushNotifications = async () => {
  if (!isPushSupported()) return true;

  const registration = await navigator.serviceWorker.register(
    "/service-worker.js"
  );

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return true;

  await axios.post(
    `${API_URL}/unsubscribe`,
    {
      endpoint: subscription.endpoint,
    },
    {
      headers: authHeaders(),
    }
  );

  await subscription.unsubscribe();

  return true;
};