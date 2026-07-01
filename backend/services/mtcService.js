const fs = require("fs");
const path = require("path");

const MtcCertificate = require("../model/MtcCertificate");
const mtcChemicalSpecs = require("../util/mtcChemicalSpecs");
const runWithChromiumLock = require("../util/chromiumLock");

const gloriaTemplate = require("../templates/mtc/gloriaTemplate");

const getMtcPdfDirectory = () => {
  return (
    process.env.MTC_PDF_STORAGE_PATH ||
    path.join(__dirname, "..", "uploads", "mtc")
  );
};

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

const getTemplateByProvider = (provider) => {
  switch (provider) {
    case "gloria":
      return gloriaTemplate;

    default:
      throw new Error(`MTC template not configured for provider: ${provider}`);
  }
};

const validateChemicalComposition = (grade, inputComposition = []) => {
  const gradeConfig = mtcChemicalSpecs[grade];

  if (!gradeConfig) {
    throw new Error(`Chemical composition spec not configured for grade ${grade}`);
  }

  const gradeSpec = gradeConfig.elements || gradeConfig;

  return Object.keys(gradeSpec).map((element) => {
    const spec = gradeSpec[element];

    const input = inputComposition.find(
      (item) => String(item.element).trim() === element
    );

    const noMinMax = spec.min === null && spec.max === null;

    if (noMinMax) {
      return {
        element,
        min: "X",
        max: "X",
        result: "X",
      };
    }

    if (!input || input.result === "" || input.result === null || input.result === undefined) {
      throw new Error(`${element} result is required`);
    }

    const result = Number(input.result);

    if (Number.isNaN(result)) {
      throw new Error(`${element} result must be numeric`);
    }

    if (spec.min !== null && result < spec.min) {
      throw new Error(`${element} result must be greater than or equal to ${spec.min}`);
    }

    if (spec.max !== null && result > spec.max) {
      throw new Error(`${element} result must be less than or equal to ${spec.max}`);
    }

    return {
      element,
      min: spec.min === null ? "" : spec.min,
      max: spec.max === null ? "" : spec.max,
      result,
    };
  });
};

const getMtcChemicalSpecs = async () => {
  return mtcChemicalSpecs;
};

const generateMtcPdfBuffer = async (mtc) => {
  const template = getTemplateByProvider(mtc.mtcProvider);
  const html = template(mtc);

  let page;

  const {
    getWhatsappBrowser,
    pauseWhatsappHealthForPdf,
    resumeWhatsappHealthAfterPdf,
  } = require("../util/whatsappClient");

  try {
    pauseWhatsappHealthForPdf();

    const browser = getWhatsappBrowser();

    if (!browser || !browser.isConnected()) {
      throw new Error(
        "WhatsApp Chromium is not connected. Please restart the Node app once and try again."
      );
    }

    console.log("MTC PDF USING WHATSAPP CHROMIUM");

    page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.emulateMediaType("screen");

    try {
      await page.evaluateHandle("document.fonts.ready");
    } catch (error) {
      console.log("MTC PDF font wait skipped:", error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }

    resumeWhatsappHealthAfterPdf();
  }
};

const generateMtcPdf = async (mtc) => {
  return await runWithChromiumLock(async () => {
    const pdfDirectory = getMtcPdfDirectory();

    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, { recursive: true });
    }

    const company = sanitizeFileName(mtc.messers || "Customer");
    const orderNo = sanitizeFileName(mtc.orderNo || mtc._id);
    const grade = sanitizeFileName(mtc.grade || "Grade");
    const date = formatFileDate(mtc.mtcDate || new Date());

    const uniqueId = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const fileName = `MTC_${company}_${orderNo}_${grade}_${date}_${uniqueId}.pdf`;
    const filePath = path.join(pdfDirectory, fileName);

    const pdfBuffer = await generateMtcPdfBuffer(mtc);

    fs.writeFileSync(filePath, pdfBuffer);

    return {
      fileName,
      filePath,
      fileUrl: `/uploads/mtc/${fileName}`,
      generatedAt: new Date(),
    };
  });
};

const createMtcCertificate = async (payload, loggedInUser) => {
  const mtcProvider = payload.mtcProvider || "gloria";

  const chemicalComposition = validateChemicalComposition(
    payload.grade,
    payload.chemicalComposition || []
  );

  const mtc = await MtcCertificate.create({
    ...payload,
    mtcProvider,
    chemicalComposition,
    createdBy: loggedInUser?._id,
  });

  const pdfData = await generateMtcPdf(mtc);

  mtc.pdf = pdfData;
  mtc.pdfUrl = pdfData.fileUrl;

  await mtc.save();

  return mtc;
};

const getMtcPdf = async (id) => {
  const mtc = await MtcCertificate.findById(id);

  if (!mtc) {
    throw new Error("MTC certificate not found");
  }

  if (!mtc.pdf?.filePath || !fs.existsSync(mtc.pdf.filePath)) {
    throw new Error("MTC PDF file not found");
  }

  return {
    filePath: mtc.pdf.filePath,
    fileName: mtc.pdf.fileName || "MTC.pdf",
  };
};
const getMtcCertificates = async (filters = {}) => {
  const query = {};

  if (filters.companyName) {
    query.$or = [
      { messers: { $regex: filters.companyName, $options: "i" } },
      { companyName: { $regex: filters.companyName, $options: "i" } },
      { orderNo: { $regex: filters.companyName, $options: "i" } },
    ];
  }

  if (filters.fromDate || filters.toDate) {
    query.mtcDate = {};

    if (filters.fromDate) {
      query.mtcDate.$gte = new Date(filters.fromDate);
    }

    if (filters.toDate) {
      const endDate = new Date(filters.toDate);
      endDate.setHours(23, 59, 59, 999);
      query.mtcDate.$lte = endDate;
    }
  }

  return await MtcCertificate.find(query)
    .sort({ createdAt: -1 })
    .limit(200);
};

module.exports = {
  createMtcCertificate,
  getMtcCertificates,
  getMtcChemicalSpecs,
  getMtcPdf,
};