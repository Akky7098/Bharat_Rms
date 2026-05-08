const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const salesOrderTemplate = require("../templates/salesOrderTemplate");

const generateSalesOrderPdf = async (salesOrder) => {
  let browser;

  try {
    const pdfDirectory =
      process.env.PDF_STORAGE_PATH ||
      path.join(__dirname, "..", "uploads", "sales-orders");

    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, { recursive: true });
    }

    const fileName = `SO-${salesOrder._id}.pdf`;
    const filePath = path.join(pdfDirectory, fileName);
    const html = salesOrderTemplate(salesOrder);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
    });

    await page.emulateMediaType("screen");

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });

    return {
      generated: true,
      fileName,
      filePath,
      fileUrl: `/uploads/sales-orders/${fileName}`,
    };
  } catch (error) {
    console.log("PDF GENERATION ERROR =>", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = {
  generateSalesOrderPdf,
};