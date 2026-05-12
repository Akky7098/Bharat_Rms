const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const revision = puppeteer._preferredRevision || "901912";

(async () => {
  try {
    const fetcher = puppeteer.createBrowserFetcher();
    const info = fetcher.revisionInfo(revision);

    console.log("Checking Chromium:", revision);

    if (!info.local) {
      console.log("Chromium not found. Downloading...");
      await fetcher.download(revision);
      console.log("Chromium downloaded.");
    } else {
      console.log("Chromium already exists.");
    }

    if (info.executablePath && fs.existsSync(info.executablePath)) {
      fs.chmodSync(info.executablePath, 0o755);

      const chromiumDir = path.dirname(path.dirname(info.executablePath));
      fs.chmodSync(chromiumDir, 0o755);

      console.log("Chromium permissions fixed:", info.executablePath);
    }
  } catch (error) {
    console.error("Chromium setup failed:", error.message);
    process.exit(1);
  }
})();