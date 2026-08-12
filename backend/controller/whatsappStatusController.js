const QRCode = require("qrcode");

const {
  forceCheckWhatsappStatus,
  restartWhatsappClient,
} = require("../util/whatsappClient");

/* =========================================================
   WHATSAPP STATUS API

   IMPORTANT:
   STATUS CHECK MUST NEVER START CHROMIUM.
========================================================= */

const getWhatsappStatus = async (req, res) => {
  try {
    const status = await forceCheckWhatsappStatus();

    return res.json({
      success: true,
      ready: status.ready,
      state: status.state,
      error: status.error || "",
      hasQr: Boolean(status.qr),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   WHATSAPP STATUS / QR PAGE

   IMPORTANT:
   PAGE REFRESH MUST NEVER START CHROMIUM.
========================================================= */

const showWhatsappQrPage = async (req, res) => {
  try {
    const status =
      await forceCheckWhatsappStatus();

    const qr = status.qr || null;

    /* =====================================================
       CONNECTED
    ===================================================== */

    if (status.ready) {
      return res.send(`
        <html>
          <head>
            <title>WhatsApp Connected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />

            <style>
              body {
                font-family: Arial;
                background:#f1f5f9;
                margin:0;
                padding:20px;
              }

              .card {
                max-width:430px;
                margin:50px auto;
                background:white;
                padding:24px;
                border-radius:16px;
                text-align:center;
                box-shadow:0 18px 50px rgba(0,0,0,.14);
              }

              h2 {
                color:#16a34a;
              }

              p {
                color:#475569;
                line-height:1.5;
              }

              a {
                display:inline-block;
                margin-top:14px;
                color:#2563eb;
                font-weight:bold;
              }
            </style>
          </head>

          <body>
            <div class="card">
              <h2>WhatsApp Connected ✅</h2>

              <p>
                The company WhatsApp number is already connected.
              </p>

              <a href="/api/whatsapp/status-page">
                Refresh
              </a>
            </div>
          </body>
        </html>
      `);
    }

    /* =====================================================
       INITIALIZING
    ===================================================== */

    if (
      status.state === "INITIALIZING" ||
      status.state === "RESTARTING"
    ) {
      return res.send(`
        <html>
          <head>
            <title>WhatsApp Starting</title>

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <meta
              http-equiv="refresh"
              content="8"
            />

            <style>
              body {
                font-family: Arial;
                background:#f1f5f9;
                margin:0;
                padding:20px;
              }

              .card {
                max-width:430px;
                margin:50px auto;
                background:white;
                padding:24px;
                border-radius:16px;
                text-align:center;
                box-shadow:0 18px 50px rgba(0,0,0,.14);
              }

              h2 {
                color:#0f172a;
              }

              p {
                color:#475569;
                line-height:1.5;
              }
            </style>
          </head>

          <body>
            <div class="card">

              <h2>WhatsApp Starting...</h2>

              <p>
                WhatsApp Chromium is currently starting.
              </p>

              <p>
                This page will refresh automatically.
              </p>

            </div>
          </body>
        </html>
      `);
    }

    /* =====================================================
       QR AVAILABLE
    ===================================================== */

    if (qr) {
      const qrImage =
        await QRCode.toDataURL(qr);

      return res.send(`
        <html>
          <head>
            <title>Scan WhatsApp QR</title>

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <meta
              http-equiv="refresh"
              content="25"
            />

            <style>
              body {
                font-family: Arial;
                background:#f1f5f9;
                margin:0;
                padding:20px;
              }

              .card {
                max-width:430px;
                margin:35px auto;
                background:white;
                padding:24px;
                border-radius:16px;
                text-align:center;
                box-shadow:0 18px 50px rgba(0,0,0,.14);
              }

              h2 {
                color:#0f172a;
                margin-bottom:8px;
              }

              p {
                color:#475569;
                line-height:1.5;
              }

              img {
                width:280px;
                max-width:100%;
                border:1px solid #e5e7eb;
                border-radius:12px;
                padding:10px;
                background:#fff;
              }

              .note {
                background:#eff6ff;
                color:#1e3a8a;
                padding:10px;
                border-radius:10px;
                font-size:13px;
                margin-top:16px;
              }

              a {
                display:inline-block;
                margin-top:14px;
                color:#2563eb;
                font-weight:bold;
              }
            </style>
          </head>

          <body>
            <div class="card">

              <h2>Scan WhatsApp QR</h2>

              <p>
                Open WhatsApp → Linked Devices → Link Device
              </p>

              <img
                src="${qrImage}"
                alt="WhatsApp QR"
              />

              <div class="note">
                After scanning, wait 10–20 seconds.
              </div>

              <a href="/api/whatsapp/status-page">
                Refresh Status
              </a>

            </div>
          </body>
        </html>
      `);
    }

    /* =====================================================
       NO QR / NOT CONNECTED

       DO NOT AUTO START CHROMIUM.
       USER MAY MANUALLY REQUEST RESTART.
    ===================================================== */

    return res.send(`
      <html>
        <head>
          <title>WhatsApp Status</title>

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <style>
            body {
              font-family: Arial;
              background:#f1f5f9;
              margin:0;
              padding:20px;
            }

            .card {
              max-width:430px;
              margin:50px auto;
              background:white;
              padding:24px;
              border-radius:16px;
              text-align:center;
              box-shadow:0 18px 50px rgba(0,0,0,.14);
            }

            h2 {
              color:#0f172a;
            }

            p {
              color:#475569;
              line-height:1.5;
            }

            .state {
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:10px;
              padding:10px;
              margin-top:12px;
              font-size:13px;
              color:#334155;
            }

            a {
              display:inline-block;
              margin-top:14px;
              padding:12px 16px;
              border-radius:10px;
              background:#2563eb;
              color:white;
              text-decoration:none;
              font-weight:bold;
            }

            .refresh {
              background:#475569;
              margin-left:6px;
            }
          </style>
        </head>

        <body>
          <div class="card">

            <h2>WhatsApp Not Connected</h2>

            <p>
              WhatsApp Chromium is currently unavailable.
            </p>

            <div class="state">
              Current State:
              <strong>${status.state || "UNKNOWN"}</strong>
            </div>

            <p>
              Restart WhatsApp manually to start the existing
              saved company WhatsApp session.
            </p>

            <a href="/api/whatsapp/restart-page">
              Restart WhatsApp Client
            </a>

            <a
              class="refresh"
              href="/api/whatsapp/status-page"
            >
              Refresh Status
            </a>

          </div>
        </body>
      </html>
    `);
  } catch (error) {
    return res
      .status(500)
      .send(error.message);
  }
};

/* =========================================================
   MANUAL WHATSAPP RESTART

   THIS IS THE ONLY HTTP ENDPOINT ALLOWED
   TO REQUEST A WHATSAPP RESTART.
========================================================= */

const restartWhatsappPage = async (
  req,
  res
) => {
  try {
    const restartStarted =
      await restartWhatsappClient();

    return res.send(`
      <html>
        <head>

          <meta
            http-equiv="refresh"
            content="8;url=/api/whatsapp/status-page"
          />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

        </head>

        <body
          style="font-family:Arial;padding:30px;"
        >

          <h2>
            ${
              restartStarted
                ? "WhatsApp client restart started"
                : "WhatsApp restart request checked"
            }
          </h2>

          <p>
            Redirecting to WhatsApp status page...
          </p>

        </body>
      </html>
    `);
  } catch (error) {
    return res
      .status(500)
      .send(error.message);
  }
};

module.exports = {
  getWhatsappStatus,
  showWhatsappQrPage,
  restartWhatsappPage,
};