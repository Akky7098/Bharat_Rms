import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

import BharatIntelligence from "./components/bharatAi/BharatIntelligence";

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

  return (
    <>
      <AppRoutes />

      <BharatIntelligence />
    </>
  );
}

export default App;