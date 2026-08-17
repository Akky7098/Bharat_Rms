const QRCode =
  require("qrcode");

const {
  getBaileysStatus,
  initBaileysClient,
  getParticipatingGroups,
} =
  require("../util/baileysClient");

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

      return res.status(200).json({
        success:
          true,

        ...status,

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
      return res.status(500).json({
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

      /*
       * Start client on demand if needed.
       */
      if (
        status.state ===
          "NOT_STARTED" ||
        status.state ===
          "DISCONNECTED" ||
        status.state ===
          "ERROR"
      ) {
        initBaileysClient()
          .catch(
            () => {}
          );

        await new Promise(
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              1500
            )
        );

        status =
          getBaileysStatus();
      }

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
                background:white;
                padding:40px;
                border-radius:16px;
                box-shadow:0 8px 30px rgba(0,0,0,.08);
                text-align:center;
                width:min(420px,88vw);
              "
            >
              <h2>
                WhatsApp Connected
              </h2>

              <p>
                Baileys connection is ready.
              </p>
            </div>
          </body>
          </html>
        `);
      }

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
                background:white;
                padding:30px;
                border-radius:16px;
                box-shadow:0 8px 30px rgba(0,0,0,.08);
                text-align:center;
                width:min(430px,90vw);
              "
            >
              <h2>
                Link Bharat RMS WhatsApp
              </h2>

              <p>
                Open WhatsApp → Linked Devices →
                Link a Device
              </p>

              <img
                src="${qrImage}"
                style="
                  width:100%;
                  max-width:340px;
                "
              />

              <p
                style="
                  color:#666;
                  font-size:13px;
                "
              >
                This page refreshes automatically.
              </p>
            </div>
          </body>
          </html>
        `);
      }

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
            content="5"
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
              background:white;
              padding:40px;
              border-radius:16px;
              box-shadow:0 8px 30px rgba(0,0,0,.08);
              text-align:center;
            "
          >
            <h2>
              WhatsApp Starting...
            </h2>

            <p>
              Current state:
              ${status.state}
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (
      error
    ) {
      return res
        .status(500)
        .send(
          error.message
        );
    }
  };

/* =========================================================
   GROUP LIST

   TEMPORARY TEST ENDPOINT.

   REMOVE/PROTECT after we determine group ID.
========================================================= */

const getGroups =
  async (
    req,
    res
  ) => {
    try {
      const groups =
        await getParticipatingGroups();

      return res.status(200).json({
        success:
          true,

        count:
          groups.length,

        groups,
      });
    } catch (
      error
    ) {
      return res.status(500).json({
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