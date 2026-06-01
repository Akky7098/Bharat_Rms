export function registerServiceWorker() {
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Bharat RMS service worker registered:", registration);
        })
        .catch((error) => {
          console.error("Bharat RMS service worker failed:", error);
        });
    });
  }
}