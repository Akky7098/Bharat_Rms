const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

let chromiumReady = false;

const chmodRecursive = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  fs.chmodSync(targetPath, 0o755);

  if (stat.isDirectory()) {
    fs.readdirSync(targetPath).forEach((child) => {
      chmodRecursive(path.join(targetPath, child));
    });
  }
};

const ensureChromium = async () => {
  if (chromiumReady) return;

  let executablePath = "";

  try {
    executablePath = puppeteer.executablePath();
  } catch (error) {
    console.log("PUPPETEER EXECUTABLE PATH ERROR =>", error.message);
  }

  console.log("PUPPETEER EXECUTABLE PATH =>", executablePath);

  if (executablePath && fs.existsSync(executablePath)) {
    chmodRecursive(path.dirname(path.dirname(executablePath)));
    fs.chmodSync(executablePath, 0o755);

    chromiumReady = true;
    return;
  }

  if (puppeteer.createBrowserFetcher) {
    const revision =
      puppeteer._preferredRevision ||
      puppeteer.browserRevision ||
      "901912";

    const browserFetcher = puppeteer.createBrowserFetcher();
    let info = browserFetcher.revisionInfo(revision);

    console.log("CHROMIUM CHECK =>", {
      revision,
      local: info.local,
      executablePath: info.executablePath,
    });

    if (!info.local) {
      console.log("CHROMIUM DOWNLOAD STARTED =>", revision);
      await browserFetcher.download(revision);

      info = browserFetcher.revisionInfo(revision);
      console.log("CHROMIUM DOWNLOAD DONE =>", info.executablePath);
    }

    const chromiumRoot = path.dirname(path.dirname(info.executablePath));
    chmodRecursive(chromiumRoot);

    if (fs.existsSync(info.executablePath)) {
      fs.chmodSync(info.executablePath, 0o755);
    }

    chromiumReady = true;
    return;
  }

  throw new Error(
    "Chromium executable not found. Run: npm install puppeteer && npx puppeteer browsers install chrome"
  );
};

module.exports = ensureChromium;