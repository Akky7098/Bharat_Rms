const QRCode = require("qrcode");

const {
  getWhatsappClient,
  forceCheckWhatsappStatus,
  getLatestQr,
  restartWhatsappClient,
} = require("../util/whatsappClient");

const getWhatsappStatus = async (req, res) => {
  try {
    getWhatsappClient();

    const status = await forceCheckWhatsappStatus();

    return res.json({
      success: true,
      ready: status.ready,
      state: status.state,
      error: status.error || "",
      hasQr: Boolean(getLatestQr()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const showWhatsappQrPage = async (req, res) => {
  try {
    // IMPORTANT: force client startup first
    getWhatsappClient();

    const status = await forceCheckWhatsappStatus();
    const qr = getLatestQr();

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
              <p>The company WhatsApp number is already connected.</p>
              <a href="/api/whatsapp/status-page">Refresh</a>
            </div>
          </body>
        </html>
      `);
    }

    if (!qr) {
      return res.send(`
        <html>
          <head>
            <title>WhatsApp QR</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta http-equiv="refresh" content="8" />
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
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Generating WhatsApp QR...</h2>
              <p>Please wait. QR generation can take 10–20 seconds.</p>
              <a href="/api/whatsapp/restart-page">Restart WhatsApp Client</a>
            </div>
          </body>
        </html>
      `);
    }

    const qrImage = await QRCode.toDataURL(qr);

    return res.send(`
      <html>
        <head>
          <title>Scan WhatsApp QR</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta http-equiv="refresh" content="25" />
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
            <p>Open WhatsApp → Linked Devices → Link Device</p>
            <img src="${qrImage}" alt="WhatsApp QR" />
            <div class="note">
              After scanning, wait 10–20 seconds.
            </div>
            <a href="/api/whatsapp/status-page">Refresh Status</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const restartWhatsappPage = async (req, res) => {
  try {
    await restartWhatsappClient();

    return res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="8;url=/api/whatsapp/status-page" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family:Arial;padding:30px;">
          <h2>WhatsApp client restarted</h2>
          <p>Redirecting to QR page...</p>
        </body>
      </html>
    `);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  getWhatsappStatus,
  showWhatsappQrPage,
  restartWhatsappPage,
};