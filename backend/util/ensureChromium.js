const fs =
  require("fs");

const path =
  require("path");

const puppeteer =
  require("puppeteer");


let chromiumReady =
  false;

let cachedExecutablePath =
  null;


/* =========================================================
   PERSISTENT CHROMIUM STORAGE

   IMPORTANT:

   Do NOT use:
   node_modules/puppeteer/.local-chromium

   Hostinger creates a new /hbuilds/versions/... directory
   after deployments.

   HOME is normally persistent between deployments.
========================================================= */

const CHROMIUM_STORAGE_PATH =
  process.env.CHROMIUM_STORAGE_PATH ||
  path.join(
    process.env.HOME ||
      process.cwd(),
    ".bharat-rms-chromium"
  );


/* =========================================================
   DIRECTORY
========================================================= */

const ensureDirectory =
  (
    directoryPath
  ) => {
    if (
      !directoryPath
    ) {
      throw new Error(
        "Chromium storage path is empty."
      );
    }

    if (
      !fs.existsSync(
        directoryPath
      )
    ) {
      fs.mkdirSync(
        directoryPath,
        {
          recursive:
            true,
        }
      );
    }
  };


/* =========================================================
   PERMISSIONS
========================================================= */

const chmodRecursive =
  (
    targetPath
  ) => {
    if (
      !targetPath ||
      !fs.existsSync(
        targetPath
      )
    ) {
      return;
    }

    try {
      const stat =
        fs.statSync(
          targetPath
        );

      fs.chmodSync(
        targetPath,
        0o755
      );

      if (
        stat.isDirectory()
      ) {
        fs.readdirSync(
          targetPath
        ).forEach(
          (
            child
          ) => {
            chmodRecursive(
              path.join(
                targetPath,
                child
              )
            );
          }
        );
      }
    } catch (
      error
    ) {
      console.log(
        "CHROMIUM CHMOD WARNING =>",
        targetPath,
        error.message
      );
    }
  };


/* =========================================================
   ENSURE CHROMIUM
========================================================= */

const ensureChromium =
  async () => {
    /* =====================================================
       REUSE RESOLVED BINARY
    ===================================================== */

    if (
      chromiumReady &&
      cachedExecutablePath &&
      fs.existsSync(
        cachedExecutablePath
      )
    ) {
      return (
        cachedExecutablePath
      );
    }


    /* =====================================================
       MAKE PERSISTENT STORAGE DIRECTORY
    ===================================================== */

    ensureDirectory(
      CHROMIUM_STORAGE_PATH
    );


    console.log(
      "CHROMIUM STORAGE PATH =>",
      CHROMIUM_STORAGE_PATH
    );


    /* =====================================================
       PUPPETEER REVISION

       Keep your existing revision logic unchanged.
    ===================================================== */

    const revision =
      puppeteer
        ._preferredRevision ||
      "901912";


    /* =====================================================
       IMPORTANT CHANGE

       Explicit download location.

       Chromium is now outside node_modules.
    ===================================================== */

    const browserFetcher =
      puppeteer
        .createBrowserFetcher({
          path:
            CHROMIUM_STORAGE_PATH,
        });


    let info =
      browserFetcher
        .revisionInfo(
          revision
        );


    console.log(
      "CHROMIUM CHECK =>",
      {
        revision,

        local:
          info.local,

        executablePath:
          info.executablePath,

        storagePath:
          CHROMIUM_STORAGE_PATH,
      }
    );


    /* =====================================================
       DOWNLOAD ONLY WHEN REQUIRED
    ===================================================== */

    if (
      !info.local
    ) {
      console.log(
        "CHROMIUM DOWNLOAD STARTED =>",
        revision
      );


      await browserFetcher
        .download(
          revision
        );


      info =
        browserFetcher
          .revisionInfo(
            revision
          );


      console.log(
        "CHROMIUM DOWNLOAD DONE =>",
        info.executablePath
      );
    }


    /* =====================================================
       VERIFY EXECUTABLE
    ===================================================== */

    if (
      !info.executablePath ||
      !fs.existsSync(
        info.executablePath
      )
    ) {
      throw new Error(
        `Chromium installation failed. Executable not found for revision ${revision}.`
      );
    }


    /* =====================================================
       PERMISSIONS
    ===================================================== */

    const chromiumRoot =
      path.dirname(
        path.dirname(
          info.executablePath
        )
      );


    chmodRecursive(
      chromiumRoot
    );


    try {
      fs.chmodSync(
        info.executablePath,
        0o755
      );
    } catch (
      permissionError
    ) {
      console.log(
        "CHROMIUM EXECUTABLE CHMOD WARNING =>",
        permissionError.message
      );
    }


    /* =====================================================
       CACHE
    ===================================================== */

    cachedExecutablePath =
      info.executablePath;


    chromiumReady =
      true;


    console.log(
      "CHROMIUM READY =>",
      cachedExecutablePath
    );


    return (
      cachedExecutablePath
    );
  };


module.exports =
  ensureChromium;