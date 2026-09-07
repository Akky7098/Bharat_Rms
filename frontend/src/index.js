import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

/* =========================================================
   GLOBAL AUTH SESSION INTERCEPTOR

   IMPORTANT:
   Must load before App so all Axios requests can detect:
   - expired session
   - invalid token
   - missing token
   - deleted user session

   and automatically return the user to login.
========================================================= */

import "./services/axiosAuthInterceptor";

import App from "./App";

import reportWebVitals from "./reportWebVitals";

import {
  registerServiceWorker,
} from "./serviceWorkerRegistration";

/* =========================================================
   REACT ROOT
========================================================= */

const root =
  ReactDOM.createRoot(
    document.getElementById(
      "root"
    )
  );

/* =========================================================
   RENDER APPLICATION
========================================================= */

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* =========================================================
   PWA SERVICE WORKER
========================================================= */

registerServiceWorker();

/* =========================================================
   WEB VITALS
========================================================= */

reportWebVitals();