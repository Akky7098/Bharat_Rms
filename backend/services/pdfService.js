const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const salesOrderTemplate = require("../templates/salesOrderTemplate");

const generateSalesOrderPdf = async (salesOrder) => {
  try {
    // =========================
    // CREATE PDF DIRECTORY
    // =========================
    const pdfDirectory = path.join(
      __dirname,
      "..",
      "uploads",
      "sales-orders"
    );

    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, {
        recursive: true,
      });
    }

    // =========================
    // FILE NAME
    // =========================
    const fileName = `SO-${salesOrder._id}.pdf`;

    const filePath = path.join(
      pdfDirectory,
      fileName
    );

    // =========================
    // HTML TEMPLATE
    // =========================
    const html = salesOrderTemplate(
      salesOrder
    );

    // =========================
    // PUPPETEER LAUNCH
    // =========================
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();

    // =========================
    // LOAD HTML
    // =========================
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // =========================
    // GENERATE PDF
    // =========================
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    // =========================
    // RETURN PDF DETAILS
    // =========================
    return {
      generated: true,

      fileName,

      filePath,

      fileUrl: `/uploads/sales-orders/${fileName}`,
    };
  } catch (error) {
    console.log(
      "PDF GENERATION ERROR =>",
      error
    );

    throw error;
  }
};

module.exports = {
  generateSalesOrderPdf,
};