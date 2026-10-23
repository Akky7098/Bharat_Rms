// Match the working sales order launch settings on Hostinger.
// Pipe transport avoids a localhost debugging socket; low-process flags
// keep temporary PDF browsers within shared hosting process limits.
const pdfChromiumOptions = (executablePath) => {
  if (!executablePath) {
    throw new Error("PDF Chromium executable is unavailable.");
  }
  return {
    executablePath,
    pipe: true,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--single-process",
      "--no-zygote",
      "--no-first-run",
    ],
  };
};

module.exports = pdfChromiumOptions;
