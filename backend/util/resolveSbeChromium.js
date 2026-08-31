const fs = require("fs");

/* =========================================================
   SAFE SBE CHROMIUM RESOLVER

   IMPORTANT:
   This utility NEVER downloads Chromium.

   It only locates a browser that is already installed.

   Resolution order:

   1. SBE_CHROME_EXECUTABLE_PATH
   2. PUPPETEER_EXECUTABLE_PATH
   3. Puppeteer's own installed executable
   4. Common Linux system Chrome / Chromium paths

   If none exists, SBE PDF generation fails cleanly.
   It does NOT modify the server browser installation.
========================================================= */

const uniqueExistingPaths = (
  values = []
) => {
  const unique =
    new Set();

  values.forEach(
    (value) => {
      if (!value) {
        return;
      }

      const normalized =
        String(
          value
        ).trim();

      if (
        !normalized ||
        unique.has(
          normalized
        )
      ) {
        return;
      }

      unique.add(
        normalized
      );
    }
  );

  return Array.from(
    unique
  );
};

const resolveSbeChromium = (
  puppeteer
) => {
  const candidates = [];

  /* =======================================================
     EXPLICIT ENV PATHS
  ======================================================= */

  if (
    process.env
      .SBE_CHROME_EXECUTABLE_PATH
  ) {
    candidates.push(
      process.env
        .SBE_CHROME_EXECUTABLE_PATH
    );
  }

  if (
    process.env
      .PUPPETEER_EXECUTABLE_PATH
  ) {
    candidates.push(
      process.env
        .PUPPETEER_EXECUTABLE_PATH
    );
  }

  /* =======================================================
     PUPPETEER'S ALREADY-INSTALLED BROWSER

     executablePath() only resolves the expected local path.
     This utility does NOT call BrowserFetcher/download().
  ======================================================= */

  try {
    if (
      puppeteer &&
      typeof puppeteer
        .executablePath ===
        "function"
    ) {
      const puppeteerPath =
        puppeteer
          .executablePath();

      if (
        puppeteerPath
      ) {
        candidates.push(
          puppeteerPath
        );
      }
    }
  } catch (error) {
    console.log(
      "SBE PUPPETEER EXECUTABLE PATH WARNING =>",
      error.message
    );
  }

  /* =======================================================
     COMMON LINUX PATHS
  ======================================================= */

  candidates.push(
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium"
  );

  const paths =
    uniqueExistingPaths(
      candidates
    );

  for (
    const executablePath
    of paths
  ) {
    try {
      if (
        fs.existsSync(
          executablePath
        )
      ) {
        console.log(
          "SBE EXISTING CHROMIUM FOUND =>",
          executablePath
        );

        return executablePath;
      }
    } catch (
      error
    ) {
      console.log(
        "SBE CHROMIUM PATH CHECK WARNING =>",
        executablePath,
        error.message
      );
    }
  }

  throw new Error(
    [
      "No existing Chromium/Chrome executable was found for SBE MTC PDF generation.",
      "No browser was downloaded.",
      "Set SBE_CHROME_EXECUTABLE_PATH to the already-working production Chrome/Chromium binary if required.",
    ].join(" ")
  );
};

module.exports =
  resolveSbeChromium;