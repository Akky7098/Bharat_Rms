const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const ensureChromium = require("../util/ensureChromium")
const runWithChromiumLock = require("../util/chromiumLock");
const {
  PDFDocument,
  StandardFonts,
  rgb,
} = require("pdf-lib");

const salesOrderTemplate = require("../templates/salesOrderTemplate");

const getPdfDirectory = () => {
  return (
    process.env.PDF_STORAGE_PATH ||
    path.join(__dirname, "..", "uploads", "sales-orders")
  );
};

const wrapText = (text, maxChars = 40) => {
  if (!text) return [""];

  const paragraphs = String(text).split(/\r?\n/);
  const finalLines = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      finalLines.push("");
      return;
    }

    const words = paragraph.split(" ");
    let line = "";

    words.forEach((word) => {
      const testLine = `${line} ${word}`.trim();

      if (testLine.length > maxChars) {
        if (line.trim()) finalLines.push(line.trim());
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line.trim()) finalLines.push(line.trim());
  });

  return finalLines;
};

const drawCell = ({
  page,
  x,
  y,
  width,
  height,
  text = "",
  font,
  boldFont,
  fontSize = 8,
  bold = false,
  center = true,
  bgColor = null,
  textColor = rgb(0, 0, 0),
}) => {
  if (bgColor) {
    page.drawRectangle({ x, y, width, height, color: bgColor });
  }

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: 0.8,
    borderColor: rgb(0, 0, 0),
  });

  const activeFont = bold ? boldFont : font;

  const safeText = String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ");

  const lines = wrapText(safeText, Math.floor(width / 5));
  const lineHeight = fontSize + 2;

  let textY = y + height - fontSize - 4;

  lines.forEach((line) => {
    const cleanLine = String(line)
      .replace(/\n/g, " ")
      .replace(/\r/g, " ");

    const textWidth = activeFont.widthOfTextAtSize(
      cleanLine,
      fontSize
    );

    const textX = center
      ? x + (width - textWidth) / 2
      : x + 5;

    if (textY > y + 3) {
      page.drawText(cleanLine, {
        x: textX,
        y: textY,
        size: fontSize,
        font: activeFont,
        color: textColor,
        maxWidth: width - 10,
      });
    }

    textY -= lineHeight;
  });
};

const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
};

const generateSalesOrderPdfBuffer = async (salesOrder) => {
  return runWithChromiumLock("PDF_GENERATION", async () => {
    await ensureChromium();

    const html = salesOrderTemplate(salesOrder);

    let browser;
    let page;

    try {
      browser = await puppeteer.launch({
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
      });

      page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 300000,
      });

      await page.emulateMediaType("screen");
      await page.evaluateHandle("document.fonts.ready");

      await new Promise((resolve) => setTimeout(resolve, 800));

      return await page.pdf({
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
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  });
};
const addSalesOrderHtmlPages = async (mergedPdf, salesOrder) => {
  const salesOrderPdfBuffer = await generateSalesOrderPdfBuffer(salesOrder);

  const salesOrderPdf = await PDFDocument.load(salesOrderPdfBuffer);

  const copiedPages = await mergedPdf.copyPages(
    salesOrderPdf,
    salesOrderPdf.getPageIndices()
  );

  copiedPages.forEach((page) => mergedPdf.addPage(page));
};

const mergeExistingPdf = async (mergedPdf, pdfPath) => {
  if (!pdfPath) return;

  if (!fs.existsSync(pdfPath)) {
    console.log("CUSTOMER PO PDF NOT FOUND =>", pdfPath);
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);

  const pdf = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const copiedPages = await mergedPdf.copyPages(
    pdf,
    pdf.getPageIndices()
  );

  copiedPages.forEach((page) => mergedPdf.addPage(page));
};
const extractUniqueGrades = (sizeGradeQuantityRate = "") => {
  const lines = String(sizeGradeQuantityRate)
    .split(/\r?\n/)
    .filter((line) => line.trim());

  const grades = [];

  lines.forEach((line) => {
    let cleaned = line
      .replace(/^\d+\.\s*/, "")
      .split("-")[0]
      .trim();

    // skip notes like Make SBE, MTC etc.
    const lower = cleaned.toLowerCase();

    if (
      !cleaned ||
      lower.includes("make ") ||
      lower.includes("mtc") ||
      lower.includes("required") ||
      lower.includes("test") ||
      lower.includes("material")
    ) {
      return;
    }

    if (!grades.some((g) => g.toLowerCase() === cleaned.toLowerCase())) {
      grades.push(cleaned);
    }
  });

  return grades.join(", ");
};

const generatePreShipmentPage = async (pdfDoc, salesOrder) => {
  const page = pdfDoc.addPage([595.28, 841.89]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const blue = rgb(0.02, 0.13, 0.38);
  const white = rgb(1, 1, 1);
  const red = rgb(1, 0, 0);

  const startX = 75;
  const tableWidth = 445;
  const col1 = 145;
  const col2 = 150;
  const col3 = 150;

  let y = 765;

  const row = (h, cells) => {
    let x = startX;

    cells.forEach((cell, index) => {
      const width = index === 0 ? col1 : index === 1 ? col2 : col3;

      drawCell({
        page,
        x,
        y: y - h,
        width,
        height: h,
        text: cell.text,
        font,
        boldFont,
        fontSize: cell.fontSize || 8,
        bold: cell.bold || false,
        center: cell.center !== false,
        bgColor: cell.bgColor || null,
        textColor: cell.textColor || rgb(0, 0, 0),
      });

      x += width;
    });

    y -= h;
  };

  const fullRow = (h, text, options = {}) => {
    drawCell({
      page,
      x: startX,
      y: y - h,
      width: tableWidth,
      height: h,
      text,
      font,
      boldFont,
      fontSize: options.fontSize || 10,
      bold: options.bold || false,
      bgColor: options.bgColor || null,
      textColor: options.textColor || rgb(0, 0, 0),
      center: options.center !== false,
    });

    y -= h;
  };

  const shippingAddress =
    salesOrder.shippingAddress?.sameAsCompanyAddress
      ? salesOrder.companyAddress
      : salesOrder.shippingAddress?.address ||
        salesOrder.companyAddress ||
        "";

  const reportNo =
    salesOrder.salesOrderNo ||
    salesOrder.poNumber ||
    String(salesOrder._id).slice(-6);

  fullRow(35, "Pre- Shipment Inspection Report", {
    bgColor: blue,
    textColor: white,
    bold: true,
    fontSize: 13,
  });

  fullRow(18, "");

  row(25, [
    {
      text: "Basic Information",
      bgColor: blue,
      textColor: white,
      bold: true,
      center: false,
      fontSize: 7.5,
    },
    {
      text: "",
      bgColor: blue,
      textColor: white,
    },
    {
      text: `Date - ${formatDate(new Date())}`,
      bgColor: blue,
      textColor: white,
      bold: true,
      fontSize: 7.5,
    },
  ]);

  row(24, [
    { text: "Report Number", bold: true, fontSize: 7 },
    { text: reportNo, bold: true, fontSize: 7 },
    { text: "-", bold: true, fontSize: 7 },
  ]);

  row(24, [
    { text: "Sales Order Form Number", bold: true, fontSize: 7 },
    { text: reportNo, bold: true, fontSize: 7 },
    { text: "-", bold: true, fontSize: 7 },
  ]);

  row(55, [
    { text: "Customer Name", bold: true, fontSize: 7 },
    { text: salesOrder.companyName || "", bold: true, fontSize: 7 },
    { text: salesOrder.companyName || "", bold: true, fontSize: 7 },
  ]);

  row(70, [
    { text: "Address (Location)", bold: true, fontSize: 7 },
    { text: salesOrder.companyAddress || "", fontSize: 6.5 },
    { text: shippingAddress, fontSize: 6.5 },
  ]);

  row(24, [
    { text: "Inspection Date:", bold: true, fontSize: 7 },
    { text: "" },
    { text: "" },
  ]);

  row(24, [
    { text: "Inspection Start (time):", bold: true, fontSize: 7 },
    { text: "" },
    { text: "" },
  ]);

  row(24, [
    { text: "Inspection End (time):", bold: true, fontSize: 7 },
    { text: "" },
    { text: "" },
  ]);

  row(24, [
    { text: "Inspector:", bold: true, fontSize: 7 },
    { text: "" },
    { text: "" },
  ]);

  fullRow(28, "");

  fullRow(24, "Summary", {
    bgColor: blue,
    textColor: white,
    bold: true,
    fontSize: 8,
  });

  row(24, [
    { text: "Description", bold: true, fontSize: 7 },
    { text: "Yes/No/ Pending", bold: true, fontSize: 7 },
    { text: "Remarks (If Not Ok)", bold: true, fontSize: 7 },
  ]);

  row(38, [
    { text: "Grade (As per PO)", bold: true, fontSize: 7 },
    {
      text: extractUniqueGrades(salesOrder.sizeGradeQuantityRate),
      bold: true,
      textColor: red,
      fontSize: 8,
    },
    { text: "" },
  ]);

  row(24, [
    { text: "Dimensions (As per PO)", bold: true, fontSize: 7 },
    { text: "OK / NOT OK", bold: true, fontSize: 7 },
    { text: "" },
  ]);

  row(24, [
    { text: "Quantity (As per PO)", bold: true, fontSize: 7 },
    { text: "OK / NOT OK", bold: true, fontSize: 7 },
    { text: "" },
  ]);

  row(24, [
    { text: "Surface Cleanliness", bold: true, fontSize: 7 },
    { text: "OK / NOT OK", bold: true, fontSize: 7 },
    { text: "" },
  ]);

  row(24, [
    { text: "Ultrasonic Testing", bold: true, fontSize: 7 },
    { text: "OK / NOT OK", bold: true, fontSize: 7 },
    { text: "" },
  ]);

  fullRow(24, "Comments(Inspector)", {
    bgColor: blue,
    textColor: white,
    bold: true,
    center: false,
    fontSize: 8,
  });

  fullRow(55, "");

  fullRow(28, "Factory Authorised Signatory", {
    bgColor: blue,
    textColor: white,
    bold: true,
    center: false,
    fontSize: 8,
  });

  fullRow(48, "");

  return page;
};

const generateSalesOrderPdf = async (salesOrder) => {
  try {
    const pdfDirectory = getPdfDirectory();

    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, { recursive: true });
    }

    const sanitizeFileName = (value = "") => {
  return String(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .trim();
};

const formatFileDate = (date) => {
  const d = new Date(date || new Date());

  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const companyName = sanitizeFileName(
  salesOrder.companyName || "Customer"
);

const createdDate = formatFileDate(
  salesOrder.createdAt || new Date()
);

const finalFileName =
  `Sales_Order_Form_${companyName}_${createdDate}.pdf`;
    const finalFilePath = path.join(pdfDirectory, finalFileName);

    const mergedPdf = await PDFDocument.create();

    await addSalesOrderHtmlPages(mergedPdf, salesOrder);

    await mergeExistingPdf(
      mergedPdf,
      salesOrder.customerPOFile?.filePath
    );

    await generatePreShipmentPage(mergedPdf, salesOrder);

    const finalPdfBytes = await mergedPdf.save();

    fs.writeFileSync(finalFilePath, finalPdfBytes);

    return {
      generated: true,
      fileName: finalFileName,
      filePath: finalFilePath,
      fileUrl: `/uploads/sales-orders/${finalFileName}`,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.log("PDF GENERATION ERROR =>", error);
    throw error;
  }
};

module.exports = {
  generateSalesOrderPdf,
};