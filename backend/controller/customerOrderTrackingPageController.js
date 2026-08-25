/* =========================================================
   CUSTOMER ORDER TRACKING PAGE CONTROLLER

   Public standalone customer UI.

   IMPORTANT:
   - No RMS login
   - No dashboard frontend
   - No React dependency
   - No internal/admin information
   - Page loads tracking data through secure token API
========================================================= */

const COMPANY_LOGO_URL =
  process.env.COMPANY_LOGO_URL ||
  "https://dashboard.bharatspecialsteels.com/logo.png";


/* =========================================================
   HTML PAGE
========================================================= */

const renderCustomerOrderTrackingPage = (
  req,
  res
) => {
  try {
    const token =
      String(
        req.params.token || ""
      ).trim();


    /*
     * Our token is generated using:
     *
     * crypto.randomBytes(32).toString("hex")
     *
     * therefore 64 hexadecimal characters.
     */
    if (
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res
        .status(404)
        .send(
          buildInvalidPage()
        );
    }


    /*
     * Prevent search engine indexing.
     */
    res.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive"
    );

    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.set(
      "Pragma",
      "no-cache"
    );


    return res
      .status(200)
      .send(
        buildTrackingPage(token)
      );
  } catch (error) {
    console.log(
      "CUSTOMER TRACKING PAGE ERROR =>",
      error.message
    );

    return res
      .status(500)
      .send(
        buildErrorPage()
      );
  }
};


/* =========================================================
   TRACKING PAGE
========================================================= */

const buildTrackingPage = (
  token
) => {
  /*
   * JSON.stringify safely injects token into JS string.
   */
  const safeToken =
    JSON.stringify(token);

  return `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
/>

<meta
  name="robots"
  content="noindex,nofollow,noarchive"
/>

<meta
  name="theme-color"
  content="#071827"
/>

<title>
  Track Your Order | Bharat Special Steels
</title>


<style>

/* =========================================================
   RESET
========================================================= */

* {
  box-sizing:
    border-box;
}

html {
  margin:
    0;

  padding:
    0;

  background:
    #f4f7fb;
}

body {
  margin:
    0;

  min-height:
    100vh;

  background:
    radial-gradient(
      circle at 7% 0%,
      rgba(37,99,235,.08),
      transparent 27%
    ),
    radial-gradient(
      circle at 96% 8%,
      rgba(22,163,74,.07),
      transparent 29%
    ),
    linear-gradient(
      180deg,
      #f8fafc 0%,
      #f3f6fa 100%
    );

  color:
    #172033;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;

  -webkit-font-smoothing:
    antialiased;
}


/* =========================================================
   HEADER
========================================================= */

.track-header {
  position:
    sticky;

  top:
    0;

  z-index:
    50;

  width:
    100%;

  background:
    linear-gradient(
      135deg,
      #071827 0%,
      #093b32 58%,
      #147247 100%
    );

  box-shadow:
    0 10px 32px
    rgba(15,23,42,.16);
}


.track-header-inner {
  width:
    100%;

  max-width:
    1160px;

  min-height:
    82px;

  margin:
    0 auto;

  padding:
    13px 24px;

  display:
    grid;

  grid-template-columns:
    58px
    minmax(0,1fr)
    auto;

  gap:
    14px;

  align-items:
    center;
}


.track-logo-box {
  width:
    56px;

  height:
    56px;

  padding:
    6px;

  display:
    grid;

  place-items:
    center;

  overflow:
    hidden;

  border-radius:
    14px;

  background:
    #fff;

  box-shadow:
    0 6px 18px
    rgba(0,0,0,.14);
}


.track-logo-box img {
  width:
    100%;

  height:
    100%;

  object-fit:
    contain;
}


.track-brand {
  min-width:
    0;
}


.track-brand span {
  display:
    block;

  color:
    #8de3b1;

  font-size:
    9px;

  font-weight:
    900;

  letter-spacing:
    .13em;

  text-transform:
    uppercase;
}


.track-brand strong {
  display:
    block;

  margin-top:
    4px;

  color:
    #fff;

  font-size:
    19px;

  line-height:
    1.15;

  font-weight:
    800;
}


.refresh-btn {
  min-height:
    40px;

  padding:
    0 15px;

  border:
    1px solid
    rgba(255,255,255,.18);

  border-radius:
    11px;

  background:
    rgba(255,255,255,.12);

  color:
    #fff;

  font-size:
    11px;

  font-weight:
    750;

  cursor:
    pointer;

  backdrop-filter:
    blur(8px);
}


.refresh-btn:disabled {
  opacity:
    .55;

  cursor:
    wait;
}


/* =========================================================
   MAIN SHELL
========================================================= */

.track-shell {
  width:
    100%;

  max-width:
    1160px;

  margin:
    0 auto;

  padding:
    30px 24px 52px;
}


/* =========================================================
   HERO
========================================================= */

.order-hero {
  padding:
    32px;

  display:
    grid;

  grid-template-columns:
    minmax(0,1.35fr)
    minmax(280px,.65fr);

  gap:
    28px;

  align-items:
    center;

  overflow:
    hidden;

  border:
    1px solid
    #e1e8f1;

  border-radius:
    25px;

  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(37,99,235,.09),
      transparent 35%
    ),
    linear-gradient(
      145deg,
      #fff,
      #fafcff
    );

  box-shadow:
    0 16px 48px
    rgba(15,23,42,.065);
}


.hero-eyebrow {
  color:
    #15803d;

  font-size:
    10px;

  font-weight:
    900;

  letter-spacing:
    .12em;

  text-transform:
    uppercase;
}


.order-hero h1 {
  margin:
    9px 0 0;

  color:
    #0f172a;

  font-size:
    clamp(
      31px,
      4vw,
      45px
    );

  line-height:
    1.05;

  font-weight:
    850;

  letter-spacing:
    -.04em;
}


.order-hero p {
  max-width:
    670px;

  margin:
    15px 0 0;

  color:
    #64748b;

  font-size:
    14px;

  line-height:
    1.72;

  font-weight:
    500;
}


.order-identity {
  display:
    grid;

  gap:
    10px;
}


.identity-item {
  padding:
    15px 17px;

  border:
    1px solid
    #e4eaf1;

  border-radius:
    14px;

  background:
    rgba(255,255,255,.88);
}


.identity-item span {
  display:
    block;

  color:
    #8290a3;

  font-size:
    8px;

  font-weight:
    900;

  letter-spacing:
    .08em;

  text-transform:
    uppercase;
}


.identity-item strong {
  display:
    block;

  margin-top:
    5px;

  color:
    #182235;

  font-size:
    13px;

  line-height:
    1.4;

  font-weight:
    800;

  overflow-wrap:
    anywhere;
}


/* =========================================================
   CURRENT STATUS
========================================================= */

.current-card {
  margin-top:
    17px;

  padding:
    18px 20px;

  display:
    grid;

  grid-template-columns:
    50px
    minmax(0,1fr)
    auto;

  gap:
    14px;

  align-items:
    center;

  border:
    1px solid
    #cfe0ff;

  border-radius:
    18px;

  background:
    linear-gradient(
      135deg,
      #fff,
      #f6f9ff
    );

  box-shadow:
    0 8px 24px
    rgba(37,99,235,.05);
}


.current-icon {
  width:
    50px;

  height:
    50px;

  display:
    grid;

  place-items:
    center;

  border-radius:
    14px;

  background:
    #eaf2ff;

  color:
    #1769e0;

  font-size:
    22px;
}


.current-copy span {
  display:
    block;

  color:
    #76859a;

  font-size:
    8px;

  font-weight:
    900;

  letter-spacing:
    .08em;
}


.current-copy strong {
  display:
    block;

  margin-top:
    5px;

  color:
    #0f172a;

  font-size:
    19px;

  line-height:
    1.25;

  font-weight:
    850;
}


.current-copy p {
  margin:
    5px 0 0;

  color:
    #78869a;

  font-size:
    10px;

  line-height:
    1.45;
}


.progress-value {
  text-align:
    right;
}


.progress-value strong {
  display:
    block;

  color:
    #0f172a;

  font-size:
    27px;

  line-height:
    1;

  font-weight:
    900;
}


.progress-value span {
  display:
    block;

  margin-top:
    4px;

  color:
    #8491a3;

  font-size:
    8px;

  font-weight:
    750;
}


.progress-track {
  height:
    8px;

  margin:
    10px 7px 0;

  overflow:
    hidden;

  border-radius:
    999px;

  background:
    #e4eaf2;
}


.progress-fill {
  width:
    0%;

  height:
    100%;

  border-radius:
    inherit;

  background:
    linear-gradient(
      90deg,
      #1769e0,
      #20a56b
    );

  transition:
    width .35s ease;
}


/* =========================================================
   ESTIMATES
========================================================= */

.estimate-grid {
  display:
    grid;

  grid-template-columns:
    repeat(4,minmax(0,1fr));

  gap:
    12px;

  margin-top:
    19px;
}


.estimate-card {
  min-width:
    0;

  padding:
    18px;

  border:
    1px solid
    #e2e8f0;

  border-radius:
    17px;

  background:
    #fff;

  box-shadow:
    0 7px 22px
    rgba(15,23,42,.04);
}


.estimate-card.delivery {
  border-color:
    #bde4cf;

  background:
    linear-gradient(
      145deg,
      #fff,
      #f4fbf7
    );
}


.estimate-icon {
  width:
    35px;

  height:
    35px;

  display:
    grid;

  place-items:
    center;

  margin-bottom:
    12px;

  border-radius:
    10px;

  background:
    #eef4ff;

  font-size:
    17px;
}


.estimate-card.delivery
.estimate-icon {
  background:
    #e4f7ec;
}


.estimate-card span {
  display:
    block;

  color:
    #7e8b9e;

  font-size:
    8px;

  font-weight:
    900;

  letter-spacing:
    .06em;

  text-transform:
    uppercase;
}


.estimate-card strong {
  display:
    block;

  margin-top:
    7px;

  color:
    #172033;

  font-size:
    14px;

  line-height:
    1.3;

  font-weight:
    850;
}


/* =========================================================
   TIMELINE
========================================================= */

.journey-card {
  margin-top:
    19px;

  overflow:
    hidden;

  border:
    1px solid
    #e1e7ef;

  border-radius:
    21px;

  background:
    #fff;

  box-shadow:
    0 10px 32px
    rgba(15,23,42,.05);
}


.journey-head {
  padding:
    21px 23px;

  border-bottom:
    1px solid
    #e6ebf2;

  background:
    linear-gradient(
      180deg,
      #fff,
      #fafbfd
    );
}


.journey-head span {
  color:
    #1769e0;

  font-size:
    9px;

  font-weight:
    900;

  letter-spacing:
    .11em;
}


.journey-head h2 {
  margin:
    6px 0 0;

  color:
    #111827;

  font-size:
    21px;

  font-weight:
    850;
}


.journey-head p {
  margin:
    6px 0 0;

  color:
    #78869a;

  font-size:
    11px;

  line-height:
    1.5;
}


.timeline {
  padding:
    23px;
}


.timeline-step {
  display:
    grid;

  grid-template-columns:
    43px
    minmax(0,1fr);

  gap:
    12px;
}


.step-marker {
  position:
    relative;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;
}


.step-dot {
  position:
    relative;

  z-index:
    2;

  width:
    35px;

  height:
    35px;

  display:
    grid;

  place-items:
    center;

  border:
    2px solid
    #dce3ed;

  border-radius:
    50%;

  background:
    #fff;

  color:
    #8c98aa;

  font-size:
    11px;

  font-weight:
    900;
}


.step-line {
  width:
    2px;

  min-height:
    78px;

  flex:
    1;

  background:
    #e5eaf1;
}


.step-card {
  margin-bottom:
    11px;

  padding:
    15px 17px;

  display:
    grid;

  grid-template-columns:
    minmax(0,1fr)
    auto;

  gap:
    14px;

  align-items:
    center;

  border:
    1px solid
    #e6ebf1;

  border-radius:
    14px;

  background:
    #fbfcfe;
}


.step-name {
  color:
    #293549;

  font-size:
    13px;

  line-height:
    1.3;

  font-weight:
    800;
}


.step-current-badge {
  display:
    none;

  width:
    max-content;

  margin-top:
    7px;

  padding:
    4px 8px;

  border-radius:
    999px;

  background:
    #eaf2ff;

  color:
    #1769e0;

  font-size:
    7px;

  font-weight:
    900;

  text-transform:
    uppercase;
}


.step-date {
  min-width:
    135px;

  text-align:
    right;
}


.step-date span {
  display:
    block;

  color:
    #8794a6;

  font-size:
    7px;

  font-weight:
    900;

  text-transform:
    uppercase;
}


.step-date strong {
  display:
    block;

  margin-top:
    5px;

  color:
    #26354b;

  font-size:
    12px;

  font-weight:
    800;
}


/* COMPLETE */

.timeline-step.completed
.step-dot {
  border-color:
    #20a56b;

  background:
    #20a56b;

  color:
    #fff;
}


.timeline-step.completed
.step-line {
  background:
    #9cd9bd;
}


.timeline-step.completed
.step-card {
  border-color:
    #d3eadf;

  background:
    #f8fcfa;
}


/* CURRENT */

.timeline-step.current
.step-dot {
  border-color:
    #1769e0;

  background:
    #1769e0;

  color:
    #fff;

  box-shadow:
    0 0 0 5px
    rgba(23,105,224,.10);
}


.timeline-step.current
.step-card {
  border-color:
    #bcd2fa;

  background:
    linear-gradient(
      145deg,
      #f5f9ff,
      #fff
    );

  box-shadow:
    0 7px 18px
    rgba(23,105,224,.05);
}


.timeline-step.current
.step-current-badge {
  display:
    inline-flex;
}


/* =========================================================
   SUPPORT
========================================================= */

.support-card {
  margin-top:
    19px;

  padding:
    21px 23px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    20px;

  border:
    1px solid
    #dbe8df;

  border-radius:
    19px;

  background:
    linear-gradient(
      145deg,
      #fff,
      #f6fbf8
    );
}


.support-card span {
  color:
    #6e7c90;

  font-size:
    8px;

  font-weight:
    900;

  letter-spacing:
    .08em;
}


.support-card strong {
  display:
    block;

  margin-top:
    5px;

  color:
    #163226;

  font-size:
    17px;

  font-weight:
    850;
}


.support-card p {
  max-width:
    680px;

  margin:
    7px 0 0;

  color:
    #6b788a;

  font-size:
    10px;

  line-height:
    1.55;
}


.support-card img {
  width:
    72px;

  height:
    72px;

  padding:
    7px;

  object-fit:
    contain;

  border:
    1px solid
    #e4e9ef;

  border-radius:
    14px;

  background:
    #fff;
}


/* =========================================================
   LOADING / ERROR
========================================================= */

.state-card {
  width:
    100%;

  max-width:
    460px;

  margin:
    80px auto;

  padding:
    38px;

  text-align:
    center;

  border:
    1px solid
    #e1e7ef;

  border-radius:
    23px;

  background:
    #fff;

  box-shadow:
    0 15px 45px
    rgba(15,23,42,.08);
}


.state-card img {
  width:
    75px;

  margin-bottom:
    20px;
}


.state-card h2 {
  margin:
    0;

  color:
    #172033;

  font-size:
    22px;
}


.state-card p {
  margin:
    10px 0 0;

  color:
    #718095;

  font-size:
    12px;

  line-height:
    1.65;
}


.loader {
  width:
    31px;

  height:
    31px;

  margin:
    18px auto 0;

  border:
    3px solid
    #dbe4f0;

  border-top-color:
    #1769e0;

  border-radius:
    50%;

  animation:
    spin .8s linear infinite;
}


@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}


/* =========================================================
   FOOTER
========================================================= */

.track-footer {
  padding:
    28px 0 4px;

  color:
    #8b98aa;

  font-size:
    9px;

  text-align:
    center;
}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width:700px) {

  .track-header-inner {
    min-height:
      70px;

    padding:
      calc(
        9px +
        env(safe-area-inset-top)
      )
      13px
      9px;

    grid-template-columns:
      45px
      minmax(0,1fr)
      auto;

    gap:
      9px;
  }


  .track-logo-box {
    width:
      44px;

    height:
      44px;

    border-radius:
      11px;
  }


  .track-brand span {
    font-size:
      7px;
  }


  .track-brand strong {
    font-size:
      15px;
  }


  .refresh-btn {
    min-height:
      35px;

    padding:
      0 10px;

    font-size:
      9px;
  }


  .track-shell {
    padding:
      14px
      11px
      calc(
        32px +
        env(safe-area-inset-bottom)
      );
  }


  .order-hero {
    padding:
      21px 16px;

    grid-template-columns:
      1fr;

    gap:
      18px;

    border-radius:
      20px;
  }


  .order-hero h1 {
    font-size:
      29px;
  }


  .order-hero p {
    font-size:
      12px;

    line-height:
      1.65;
  }


  .order-identity {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }


  .identity-item {
    padding:
      12px;
  }


  .identity-item strong {
    font-size:
      11px;
  }


  .current-card {
    grid-template-columns:
      42px
      minmax(0,1fr)
      auto;

    gap:
      10px;

    padding:
      14px;

    border-radius:
      15px;
  }


  .current-icon {
    width:
      42px;

    height:
      42px;
  }


  .current-copy strong {
    font-size:
      14px;
  }


  .current-copy p {
    font-size:
      8px;
  }


  .progress-value strong {
    font-size:
      20px;
  }


  .estimate-grid {
    grid-template-columns:
      repeat(2,minmax(0,1fr));

    gap:
      9px;

    margin-top:
      14px;
  }


  .estimate-card {
    padding:
      13px;
  }


  .estimate-card strong {
    font-size:
      12px;
  }


  .journey-card {
    margin-top:
      14px;

    border-radius:
      17px;
  }


  .journey-head {
    padding:
      16px;
  }


  .journey-head h2 {
    font-size:
      17px;
  }


  .journey-head p {
    font-size:
      9px;
  }


  .timeline {
    padding:
      15px 12px;
  }


  .timeline-step {
    grid-template-columns:
      34px
      minmax(0,1fr);

    gap:
      8px;
  }


  .step-dot {
    width:
      30px;

    height:
      30px;
  }


  .step-card {
    padding:
      12px;

    grid-template-columns:
      minmax(0,1fr)
      auto;

    gap:
      7px;

    border-radius:
      11px;
  }


  .step-name {
    font-size:
      11px;
  }


  .step-date {
    min-width:
      92px;
  }


  .step-date strong {
    font-size:
      10px;
  }


  .support-card {
    padding:
      16px;

    align-items:
      flex-start;
  }


  .support-card strong {
    font-size:
      14px;
  }


  .support-card img {
    width:
      52px;

    height:
      52px;
  }
}


@media (max-width:390px) {

  .order-identity {
    grid-template-columns:
      1fr;
  }


  .current-copy p {
    display:
      none;
  }


  .step-card {
    grid-template-columns:
      1fr;
  }


  .step-date {
    min-width:
      0;

    text-align:
      left;
  }
}

</style>

</head>


<body>


<header class="track-header">

  <div class="track-header-inner">

    <div class="track-logo-box">

      <img
        src="${COMPANY_LOGO_URL}"
        alt="Bharat Special Steels"
      />

    </div>


    <div class="track-brand">

      <span>
        BHARAT SPECIAL STEELS
      </span>

      <strong>
        Order Tracking
      </strong>

    </div>


    <button
      id="refreshButton"
      class="refresh-btn"
      type="button"
    >
      Refresh
    </button>

  </div>

</header>


<main
  id="pageRoot"
  class="track-shell"
>

  <div class="state-card">

    <img
      src="${COMPANY_LOGO_URL}"
      alt="Bharat Special Steels"
    />

    <h2>
      Loading your order journey
    </h2>

    <p>
      Fetching the latest production and
      delivery plan.
    </p>

    <div class="loader"></div>

  </div>

</main>


<script>

(function () {

  "use strict";


  const TOKEN =
    ${safeToken};


  const API_URL =
    "/api/customer-order-tracking/" +
    encodeURIComponent(
      TOKEN
    );


  const root =
    document.getElementById(
      "pageRoot"
    );


  const refreshButton =
    document.getElementById(
      "refreshButton"
    );


  /* =======================================================
     SAFE HTML
  ======================================================= */

  function escapeHtml(value) {

    return String(
      value == null
        ? ""
        : value
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  /* =======================================================
     DATE
  ======================================================= */

  function formatDate(value) {

    if (!value) {
      return "To be updated";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "To be updated";
    }


    return date
      .toLocaleDateString(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric"
        }
      );
  }


  /* =======================================================
     PERCENT
  ======================================================= */

  function safeProgress(value) {

    const number =
      Number(value || 0);


    if (
      !Number.isFinite(number)
    ) {
      return 0;
    }


    return Math.max(
      0,
      Math.min(
        number,
        100
      )
    );
  }


  /* =======================================================
     RENDER ERROR
  ======================================================= */

  function renderError(message) {

    root.innerHTML =
      \`
        <div class="state-card">

          <img
            src="${COMPANY_LOGO_URL}"
            alt="Bharat Special Steels"
          />

          <h2>
            Tracking link unavailable
          </h2>

          <p>
            \${escapeHtml(
              message ||
              "We could not load your order tracking."
            )}
          </p>

        </div>
      \`;
  }


  /* =======================================================
     RENDER WAITING
  ======================================================= */

  function renderWaiting(data) {

    const order =
      data.order || {};


    root.innerHTML =
      \`

      <section class="order-hero">

        <div>

          <div class="hero-eyebrow">
            ORDER CONFIRMED
          </div>

          <h1>
            Hello
            \${escapeHtml(
              order.contactPersonName ||
              "there"
            )}
          </h1>

          <p>
            Your order has been approved and
            moved into execution. Our operations
            team is currently preparing the
            detailed production timeline.
          </p>

        </div>


        <div class="order-identity">

          <div class="identity-item">

            <span>
              PURCHASE ORDER
            </span>

            <strong>
              \${escapeHtml(
                order.poNumber ||
                "—"
              )}
            </strong>

          </div>


          <div class="identity-item">

            <span>
              SALES ORDER
            </span>

            <strong>
              \${escapeHtml(
                order.salesOrderNo ||
                "—"
              )}
            </strong>

          </div>

        </div>

      </section>


      <section class="current-card">

        <div class="current-icon">
          ◷
        </div>


        <div class="current-copy">

          <span>
            CURRENT STATUS
          </span>

          <strong>
            Order Confirmed
          </strong>

          <p>
            Estimated milestone dates will
            appear here shortly.
          </p>

        </div>


        <div class="progress-value">

          <strong>
            0%
          </strong>

          <span>
            completed
          </span>

        </div>

      </section>


      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:0%"
        ></div>

      </div>

      \`;
  }


  /* =======================================================
     RENDER TRACKING
  ======================================================= */

  function renderTracking(data) {

    const order =
      data.order || {};


    const tracking =
      data.tracking || {};


    const milestones =
      Array.isArray(
        tracking.milestones
      )
        ? tracking.milestones
        : [];


    const progress =
      safeProgress(
        tracking
          .progressPercentage
      );


    const timelineHtml =
      milestones
        .map(
          function (
            milestone,
            index
          ) {

            const completed =
              milestone.status ===
              "completed";


            const current =
              milestone.isCurrent ===
              true;


            const classes = [
              "timeline-step"
            ];


            if (completed) {
              classes.push(
                "completed"
              );
            }


            if (current) {
              classes.push(
                "current"
              );
            }


            const shownDate =
              completed
                ? (
                    milestone.actualDate ||
                    milestone.estimatedDate
                  )
                : milestone
                    .estimatedDate;


            return \`

            <div
              class="\${classes.join(" ")}"
            >

              <div class="step-marker">

                <div class="step-dot">

                  \${
                    completed
                      ? "✓"
                      : escapeHtml(
                          milestone.sequence ||
                          index + 1
                        )
                  }

                </div>


                \${
                  index <
                  milestones.length - 1

                    ? '<div class="step-line"></div>'

                    : ''
                }

              </div>


              <div class="step-card">

                <div>

                  <div class="step-name">

                    \${escapeHtml(
                      milestone.label ||
                      "Order Stage"
                    )}

                  </div>


                  <div
                    class="step-current-badge"
                  >
                    Current Stage
                  </div>

                </div>


                <div class="step-date">

                  <span>

                    \${
                      completed
                        ? "COMPLETED"
                        : "ESTIMATED"
                    }

                  </span>

                  <strong>

                    \${escapeHtml(
                      formatDate(
                        shownDate
                      )
                    )}

                  </strong>

                </div>

              </div>

            </div>

            \`;
          }
        )
        .join("");


    root.innerHTML =
      \`

      <!-- =================================================
           HERO
      ================================================= -->

      <section class="order-hero">

        <div>

          <div class="hero-eyebrow">
            LIVE ORDER TRACKING
          </div>


          <h1>

            Hello
            \${escapeHtml(
              order.contactPersonName ||
              "there"
            )}

          </h1>


          <p>
            Your order with Bharat Special Steels
            is in process. This page shows the latest
            production and delivery estimates directly
            from our operations team.
          </p>

        </div>


        <div class="order-identity">

          <div class="identity-item">

            <span>
              COMPANY
            </span>

            <strong>
              \${escapeHtml(
                order.companyName ||
                "—"
              )}
            </strong>

          </div>


          <div class="identity-item">

            <span>
              PURCHASE ORDER
            </span>

            <strong>
              \${escapeHtml(
                order.poNumber ||
                "—"
              )}
            </strong>

          </div>


          <div class="identity-item">

            <span>
              SALES ORDER
            </span>

            <strong>
              \${escapeHtml(
                order.salesOrderNo ||
                "—"
              )}
            </strong>

          </div>

        </div>

      </section>


      <!-- =================================================
           CURRENT
      ================================================= -->

      <section class="current-card">

        <div class="current-icon">
          ◎
        </div>


        <div class="current-copy">

          <span>
            CURRENT STATUS
          </span>


          <strong>

            \${escapeHtml(
              tracking
                .currentStatusLabel ||
              "In Process"
            )}

          </strong>


          <p>
            Live status from Bharat Special
            Steels order management.
          </p>

        </div>


        <div class="progress-value">

          <strong>
            \${progress}%
          </strong>

          <span>
            completed
          </span>

        </div>

      </section>


      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:\${progress}%"
        ></div>

      </div>


      <!-- =================================================
           ESTIMATED DATES
      ================================================= -->

      <section class="estimate-grid">

        <article class="estimate-card">

          <div class="estimate-icon">
            ◷
          </div>

          <span>
            ESTIMATED READY
          </span>

          <strong>
            \${escapeHtml(
              formatDate(
                tracking
                  .estimatedReadyDate
              )
            )}
          </strong>

        </article>


        <article class="estimate-card">

          <div class="estimate-icon">
            ▣
          </div>

          <span>
            ESTIMATED LOADING
          </span>

          <strong>
            \${escapeHtml(
              formatDate(
                tracking
                  .estimatedLoadingDate
              )
            )}
          </strong>

        </article>


        <article class="estimate-card">

          <div class="estimate-icon">
            ➜
          </div>

          <span>
            ESTIMATED DISPATCH
          </span>

          <strong>
            \${escapeHtml(
              formatDate(
                tracking
                  .estimatedShipDate
              )
            )}
          </strong>

        </article>


        <article
          class="estimate-card delivery"
        >

          <div class="estimate-icon">
            ✓
          </div>

          <span>
            ESTIMATED DELIVERY
          </span>

          <strong>
            \${escapeHtml(
              formatDate(
                tracking
                  .estimatedDeliveryDate
              )
            )}
          </strong>

        </article>

      </section>


      <!-- =================================================
           JOURNEY
      ================================================= -->

      <section class="journey-card">

        <div class="journey-head">

          <span>
            YOUR ORDER JOURNEY
          </span>

          <h2>
            Production to delivery
          </h2>

          <p>
            Estimated dates automatically reflect
            the latest plan updated by our
            operations team.
          </p>

        </div>


        <div class="timeline">

          \${timelineHtml}

        </div>

      </section>


      <!-- =================================================
           CONTACT
      ================================================= -->

      <section class="support-card">

        <div>

          <span>
            YOUR BHARAT CONTACT
          </span>

          <strong>

            \${escapeHtml(
              order.salesPersonName ||
              "Bharat Special Steels Team"
            )}

          </strong>

          <p>
            For commercial or technical clarification,
            please continue coordinating with your
            Bharat representative.
          </p>

        </div>


        <img
          src="${COMPANY_LOGO_URL}"
          alt="Bharat Special Steels"
        />

      </section>


      <footer class="track-footer">

        © Bharat Special Steels.
        Secure customer order tracking.

      </footer>

      \`;
  }


  /* =======================================================
     LOAD
  ======================================================= */

  async function loadTracking() {

    try {

      refreshButton.disabled =
        true;


      refreshButton.textContent =
        "Refreshing...";


      const response =
        await fetch(
          API_URL,
          {
            method:
              "GET",

            headers: {
              "Accept":
                "application/json"
            },

            cache:
              "no-store"
          }
        );


      const json =
        await response.json();


      if (
        !response.ok ||
        json.success === false
      ) {
        throw new Error(
          json.message ||
          "Unable to load your order tracking."
        );
      }


      const data =
        json.data || {};


      if (
        data.trackingAvailable
      ) {
        renderTracking(
          data
        );
      } else {
        renderWaiting(
          data
        );
      }

    } catch (error) {

      renderError(
        error.message
      );

    } finally {

      refreshButton.disabled =
        false;


      refreshButton.textContent =
        "Refresh";

    }
  }


  refreshButton
    .addEventListener(
      "click",
      loadTracking
    );


  /*
   * Initial load.
   */
  loadTracking();


  /*
   * Refresh every 5 minutes only
   * while customer has page visible.
   */
  window.setInterval(
    function () {

      if (
        document.visibilityState ===
        "visible"
      ) {
        loadTracking();
      }

    },

    5 * 60 * 1000
  );


})();

</script>


</body>

</html>
`;
};


/* =========================================================
   INVALID LINK PAGE
========================================================= */

const buildInvalidPage = () => {
  return `
<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>
  Tracking Link Unavailable
</title>

<style>

body {
  margin:0;

  min-height:100vh;

  display:grid;

  place-items:center;

  padding:20px;

  background:#f4f7fb;

  color:#172033;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.card {
  width:100%;
  max-width:440px;

  padding:36px;

  text-align:center;

  border:1px solid #e2e8f0;

  border-radius:22px;

  background:#fff;

  box-shadow:
    0 15px 45px
    rgba(15,23,42,.08);
}

img {
  width:75px;
}

h1 {
  margin:18px 0 0;

  font-size:23px;
}

p {
  color:#718095;

  font-size:13px;

  line-height:1.6;
}

</style>

</head>


<body>

<div class="card">

  <img
    src="${COMPANY_LOGO_URL}"
    alt="Bharat Special Steels"
  />

  <h1>
    Tracking link unavailable
  </h1>

  <p>
    This order tracking link is invalid
    or incomplete. Please contact your
    Bharat Special Steels representative.
  </p>

</div>

</body>

</html>
`;
};


/* =========================================================
   SERVER ERROR PAGE
========================================================= */

const buildErrorPage = () => {
  return `
<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>
  Order Tracking
</title>

</head>

<body
  style="
    margin:0;
    min-height:100vh;
    display:grid;
    place-items:center;
    background:#f4f7fb;
    font-family:Arial,sans-serif;
  "
>

<div
  style="
    max-width:420px;
    padding:34px;
    text-align:center;
    border-radius:20px;
    background:#fff;
    box-shadow:0 14px 40px rgba(15,23,42,.08);
  "
>

  <h2>
    Temporarily unavailable
  </h2>

  <p
    style="
      color:#718095;
      line-height:1.6;
    "
  >
    We could not load order tracking
    right now. Please try again shortly.
  </p>

</div>

</body>

</html>
`;
};


module.exports = {
  renderCustomerOrderTrackingPage,
};