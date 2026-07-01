import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration) {
            registration.update();

            console.log(
              "Checking for latest Bharat RMS service worker..."
            );
          }
        });
    }
  }, []);

  return <AppRoutes />;
}

export default App;