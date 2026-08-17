const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

let chromiumReady = false;
let cachedExecutablePath = null;

const chmodRecursive = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  try {
    const stat = fs.statSync(targetPath);

    fs.chmodSync(targetPath, 0o755);

    if (stat.isDirectory()) {
      fs.readdirSync(targetPath).forEach((child) => {
        chmodRecursive(
          path.join(targetPath, child)
        );
      });
    }
  } catch (error) {
    console.log(
      "CHROMIUM CHMOD WARNING =>",
      targetPath,
      error.message
    );
  }
};

const ensureChromium = async () => {
  /*
   * If we already resolved Chromium and the binary
   * still exists, reuse the same executable path.
   */
  if (
    chromiumReady &&
    cachedExecutablePath &&
    fs.existsSync(cachedExecutablePath)
  ) {
    return cachedExecutablePath;
  }

  const revision =
    puppeteer._preferredRevision ||
    "901912";

  const browserFetcher =
    puppeteer.createBrowserFetcher();

  let info =
    browserFetcher.revisionInfo(
      revision
    );

  console.log(
    "CHROMIUM CHECK =>",
    {
      revision,
      local: info.local,
      executablePath:
        info.executablePath,
    }
  );

  /*
   * This is the important fallback.
   *
   * Even if npm install did not download Chromium,
   * production can download the Puppeteer-compatible
   * revision once.
   */
  if (!info.local) {
    console.log(
      "CHROMIUM DOWNLOAD STARTED =>",
      revision
    );

    await browserFetcher.download(
      revision
    );

    info =
      browserFetcher.revisionInfo(
        revision
      );

    console.log(
      "CHROMIUM DOWNLOAD DONE =>",
      info.executablePath
    );
  }

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

  const chromiumRoot =
    path.dirname(
      path.dirname(
        info.executablePath
      )
    );

  chmodRecursive(
    chromiumRoot
  );

  fs.chmodSync(
    info.executablePath,
    0o755
  );

  cachedExecutablePath =
    info.executablePath;

  chromiumReady = true;

  console.log(
    "CHROMIUM READY =>",
    cachedExecutablePath
  );

  /*
   * CRITICAL:
   * Return exact binary path to Puppeteer.
   */
  return cachedExecutablePath;
};

module.exports =
  ensureChromium;