const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

let chromiumReady = false;

const chmodRecursive = (targetPath) => {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);

  fs.chmodSync(targetPath, stat.isDirectory() ? 0o755 : 0o755);

  if (stat.isDirectory()) {
    fs.readdirSync(targetPath).forEach((child) => {
      chmodRecursive(path.join(targetPath, child));
    });
  }
};

const ensureChromium = async () => {
  if (chromiumReady) return;

  const revision =
    puppeteer._preferredRevision ||
    "901912";

  const browserFetcher =
    puppeteer.createBrowserFetcher();

  let info =
    browserFetcher.revisionInfo(revision);

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

  const chromiumRoot = path.dirname(
    path.dirname(info.executablePath)
  );

  chmodRecursive(chromiumRoot);

  if (fs.existsSync(info.executablePath)) {
    fs.chmodSync(info.executablePath, 0o755);
  }

  chromiumReady = true;
};

module.exports = ensureChromium;