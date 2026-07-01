export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/bharat-rms-sw-v5.js",
        {
          scope: "/",
        }
      );

      console.log(
        "Bharat RMS Service Worker Registered",
        registration
      );
    } catch (err) {
      console.error(
        "Service Worker Registration Failed",
        err
      );
    }
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}