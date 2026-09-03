const QRCode =
  require("qrcode");

const {
  getBaileysStatus,
  initBaileysClient,
  startFreshQrSession,
  getParticipatingGroups,
} =
  require("../util/baileysClient");

/* =========================================================
   HELPER
========================================================= */

const sleep =
  (
    ms
  ) =>
    new Promise(
      (
        resolve
      ) =>
        setTimeout(
          resolve,
          ms
        )
    );

/* =========================================================
   JSON STATUS
========================================================= */

const getStatus =
  async (
    req,
    res
  ) => {
    try {
      const status =
        getBaileysStatus();

      return res
        .status(200)
        .json({
          success:
            true,

          ...status,

          /*
           * Never expose raw QR payload through
           * normal status API.
           */
          qr:
            undefined,

          hasQr:
            Boolean(
              status.qr
            ),
        });
    } catch (
      error
    ) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  };

/* =========================================================
   QR PAGE
========================================================= */

const showQrPage =
  async (
    req,
    res
  ) => {
    try {
      let status =
        getBaileysStatus();

      /* =====================================================
         LOGGED OUT

         Explicit logout means old credentials are invalid.

         Ask Baileys client to clear the invalid session and
         start a fresh pairing session.
      ===================================================== */

      if (
        status.state ===
        "LOGGED_OUT"
      ) {
        startFreshQrSession()
          .catch(
            (
              error
            ) => {
              console.log(
                "BAILEYS FRESH QR START ERROR =>",
                error.message
              );
            }
          );

        /*
         * Give WhatsApp some time to create QR.
         */
        await sleep(
          2500
        );

        status =
          getBaileysStatus();
      }

      /* =====================================================
         NORMAL START
      ===================================================== */

      else if (
        status.state ===
          "NOT_STARTED" ||
        status.state ===
          "DISCONNECTED" ||
        status.state ===
          "ERROR" ||
        status.state ===
          "PAIRING_REQUIRED"
      ) {
        initBaileysClient()
          .catch(
            (
              error
            ) => {
              console.log(
                "BAILEYS QR INIT ERROR =>",
                error.message
              );
            }
          );

        await sleep(
          2000
        );

        status =
          getBaileysStatus();
      }

      /* =====================================================
         CONNECTED PAGE
      ===================================================== */

      if (
        status.ready
      ) {
        return res.send(`
          <!DOCTYPE html>

          <html>
          <head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <title>
              Bharat RMS WhatsApp
            </title>
          </head>

          <body
            style="
              font-family:Arial,sans-serif;
              background:#f4f6f8;
              display:flex;
              align-items:center;
              justify-content:center;
              min-height:100vh;
              margin:0;
            "
          >
            <div
              style="
                background:#fff;
                padding:40px;
                border-radius:16px;
                box-shadow:0 8px 30px rgba(0,0,0,.08);
                text-align:center;
                width:min(420px,88vw);
              "
            >
              <h2
                style="
                  margin:0 0 12px;
                "
              >
                WhatsApp Connected
              </h2>

              <p
                style="
                  color:#555;
                  margin:0;
                "
              >
                Bharat RMS WhatsApp connection is ready.
              </p>
            </div>
          </body>
          </html>
        `);
      }

      /* =====================================================
         QR AVAILABLE
      ===================================================== */

      if (
        status.qr
      ) {
        const qrImage =
          await QRCode
            .toDataURL(
              status.qr,
              {
                width:
                  340,

                margin:
                  2,
              }
            );

        return res.send(`
          <!DOCTYPE html>

          <html>
          <head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <title>
              Bharat RMS WhatsApp QR
            </title>

            <meta
              http-equiv="refresh"
              content="15"
            />
          </head>

          <body
            style="
              font-family:Arial,sans-serif;
              background:#f4f6f8;
              display:flex;
              align-items:center;
              justify-content:center;
              min-height:100vh;
              margin:0;
            "
          >
            <div
              style="
                background:#fff;
                padding:30px;
                border-radius:16px;
                box-shadow:0 8px 30px rgba(0,0,0,.08);
                text-align:center;
                width:min(430px,90vw);
              "
            >
              <h2
                style="
                  margin-top:0;
                "
              >
                Link Bharat RMS WhatsApp
              </h2>

              <p
                style="
                  color:#555;
                "
              >
                Open WhatsApp →
                Linked Devices →
                Link a Device
              </p>

              <img
                src="${qrImage}"
                alt="WhatsApp QR Code"
                style="
                  width:100%;
                  max-width:340px;
                  display:block;
                  margin:20px auto;
                "
              />

              <p
                style="
                  color:#777;
                  font-size:13px;
                  margin-bottom:0;
                "
              >
                QR codes expire automatically.
                This page refreshes every 15 seconds.
              </p>
            </div>
          </body>
          </html>
        `);
      }

      /* =====================================================
         STARTING PAGE
      ===================================================== */

      return res.send(`
        <!DOCTYPE html>

        <html>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            Bharat RMS WhatsApp
          </title>

          <meta
            http-equiv="refresh"
            content="4"
          />
        </head>

        <body
          style="
            font-family:Arial,sans-serif;
            background:#f4f6f8;
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100vh;
            margin:0;
          "
        >
          <div
            style="
              background:#fff;
              padding:40px;
              border-radius:16px;
              box-shadow:0 8px 30px rgba(0,0,0,.08);
              text-align:center;
              width:min(420px,88vw);
            "
          >
            <h2
              style="
                margin-top:0;
              "
            >
              WhatsApp Starting...
            </h2>

            <p>
              Current state:
              <strong>
                ${status.state}
              </strong>
            </p>

            <p
              style="
                color:#777;
                font-size:13px;
                margin-bottom:0;
              "
            >
              Waiting for WhatsApp connection / QR...
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (
      error
    ) {
      console.log(
        "BAILEYS QR PAGE ERROR =>",
        error.message
      );

      return res
        .status(500)
        .send(`
          <!DOCTYPE html>

          <html>
          <body
            style="
              font-family:Arial,sans-serif;
              padding:40px;
            "
          >
            <h2>
              WhatsApp Error
            </h2>

            <p>
              ${String(
                error.message
              )}
            </p>
          </body>
          </html>
        `);
    }
  };

/* =========================================================
   GROUP LIST
========================================================= */

const getGroups =
  async (
    req,
    res
  ) => {
    try {
      const groups =
        await getParticipatingGroups();

      return res
        .status(200)
        .json({
          success:
            true,

          count:
            groups.length,

          groups,
        });
    } catch (
      error
    ) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  };

module.exports = {
  getStatus,
  showQrPage,
  getGroups,
};