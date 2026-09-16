const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const ensureChromium = require("../util/ensureChromium");
const runWithChromiumLock = require("../util/chromiumLock");

const priceContractTemplate = require(
  "../templates/priceContractTemplate"
);


/* =========================================================
   STORAGE DIRECTORY
========================================================= */

const getPriceContractPdfDirectory = () => {
  return (
    process.env.PRICE_CONTRACT_PDF_STORAGE_PATH ||
    path.join(
      __dirname,
      "..",
      "uploads",
      "price-contracts"
    )
  );
};


/* =========================================================
   SAFE FILE NAME
========================================================= */

const sanitizeFileName = (value = "") => {
  const cleaned = String(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();

  return cleaned || "Document";
};


/* =========================================================
   FILE DATE
========================================================= */

const formatFileDate = (date) => {
  const d = new Date(
    date || new Date()
  );

  return `${String(
    d.getDate()
  ).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};


/* =========================================================
   NORMALIZE MODEL DATA -> TEMPLATE DATA

   PdfDocument stores form fields inside:

   document.formData

   But our template expects:

   {
     price,
     priceBasis,
     validity,
     ...
   }

   So this combines model fields + formData.
========================================================= */

const buildPriceContractTemplateData = (
  pdfDocument
) => {
  const formData =
    pdfDocument?.formData || {};

  return {
    ...formData,

    _id:
      pdfDocument?._id,

    documentNumber:
      pdfDocument?.documentNumber || "",

    priceContractNo:
      pdfDocument?.documentNumber || "",

    referenceNumber:
      pdfDocument?.referenceNumber || "",

    customerName:
      pdfDocument?.customerName ||
      formData.customerName ||
      "",

    companyName:
      pdfDocument?.companyName ||
      formData.companyName ||
      "",

    createdAt:
      pdfDocument?.createdAt,

    revisionCount:
      pdfDocument?.revisionCount || 0,
  };
};


/* =========================================================
   HTML -> PDF BUFFER
========================================================= */

const generatePriceContractPdfBuffer = async (
  pdfDocument
) => {
  return runWithChromiumLock(
    "PRICE_CONTRACT_PDF",

    async () => {
      const templateData =
        buildPriceContractTemplateData(
          pdfDocument
        );

      const html =
        priceContractTemplate(
          templateData
        );

      let browser = null;
      let page = null;

      try {
        /* ===============================================
           CHROMIUM
        =============================================== */

        const executablePath =
          await ensureChromium();

        if (
          !executablePath ||
          !fs.existsSync(
            executablePath
          )
        ) {
          throw new Error(
            "PDF Chromium executable is unavailable."
          );
        }


        console.log(
          "PRICE CONTRACT PDF CHROMIUM START =>",
          executablePath
        );


        /* ===============================================
           LAUNCH
        =============================================== */

        browser =
          await puppeteer.launch({
            executablePath,

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


        if (
          !browser ||
          !browser.isConnected()
        ) {
          throw new Error(
            "Price Contract PDF Chromium failed to start."
          );
        }


        /* ===============================================
           PAGE
        =============================================== */

        page =
          await browser.newPage();


        await page.setContent(
          html,
          {
            waitUntil:
              "domcontentloaded",

            timeout:
              120000,
          }
        );


        await page.emulateMediaType(
          "screen"
        );


        /* ===============================================
           WAIT FOR FONTS
        =============================================== */

        try {
          await page.evaluateHandle(
            "document.fonts.ready"
          );
        } catch (error) {
          console.log(
            "PRICE CONTRACT FONT WAIT SKIPPED =>",
            error.message
          );
        }


        /*
         * Give Chromium a very small amount of time
         * to finish final layout/paint.
         */

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500
            )
        );


        /* ===============================================
           PDF
        =============================================== */

        const pdfBuffer =
          await page.pdf({
            format:
              "A4",

            printBackground:
              true,

            preferCSSPageSize:
              true,

            /*
             * Template itself uses full A4.
             * No Puppeteer margin.
             */

            margin: {
              top:
                "0mm",

              right:
                "0mm",

              bottom:
                "0mm",

              left:
                "0mm",
            },
          });


        if (
          !pdfBuffer ||
          pdfBuffer.length === 0
        ) {
          throw new Error(
            "Price Contract PDF generation returned an empty file."
          );
        }


        console.log(
          "PRICE CONTRACT PDF BUFFER GENERATED SUCCESSFULLY"
        );


        return pdfBuffer;

      } catch (error) {
        console.log(
          "PRICE CONTRACT PDF BUFFER FAILED =>",
          error.message
        );

        throw error;

      } finally {

        /* ===============================================
           CLOSE PAGE
        =============================================== */

        if (page) {
          await page
            .close()
            .catch(
              () => {}
            );
        }


        /* ===============================================
           CLOSE CHROMIUM
        =============================================== */

        if (browser) {
          await browser
            .close()
            .catch(
              () => {}
            );


          console.log(
            "PRICE CONTRACT PDF CHROMIUM CLOSED"
          );
        }
      }
    }
  );
};


/* =========================================================
   GENERATE + SAVE PRICE CONTRACT PDF
========================================================= */

const generatePriceContractPdf = async (
  pdfDocument
) => {
  try {
    const pdfDirectory =
      getPriceContractPdfDirectory();


    /* =====================================================
       CREATE DIRECTORY
    ===================================================== */

    if (
      !fs.existsSync(
        pdfDirectory
      )
    ) {
      fs.mkdirSync(
        pdfDirectory,
        {
          recursive: true,
        }
      );
    }


    /* =====================================================
       CUSTOMER NAME
    ===================================================== */

    const customerName =
      sanitizeFileName(
        pdfDocument?.customerName ||
        pdfDocument?.companyName ||
        pdfDocument?.formData?.customerName ||
        pdfDocument?.formData?.companyName ||
        "Customer"
      );


    /* =====================================================
       DOCUMENT NUMBER
    ===================================================== */

    const documentNumber =
      sanitizeFileName(
        pdfDocument?.documentNumber ||
        pdfDocument?._id ||
        Date.now()
      );


    /* =====================================================
       DATE
    ===================================================== */

    const createdDate =
      formatFileDate(
        pdfDocument?.createdAt ||
        new Date()
      );


    /* =====================================================
       REVISION
    ===================================================== */

    const revisionCount =
      Number(
        pdfDocument?.revisionCount || 0
      );


    const revision =
      `REV_${revisionCount}`;


    /* =====================================================
       UNIQUE ID

       Prevents files being overwritten even when
       generated multiple times quickly.
    ===================================================== */

    const uniquePdfId =
      `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;


    /* =====================================================
       FILE NAME
    ===================================================== */

    const finalFileName =
      `Price_Contract_${customerName}_${documentNumber}_${createdDate}_${revision}_${uniquePdfId}.pdf`;


    const finalFilePath =
      path.join(
        pdfDirectory,
        finalFileName
      );


    console.log(
      "NEW PRICE CONTRACT PDF =>",
      finalFileName
    );


    /* =====================================================
       GENERATE
    ===================================================== */

    const pdfBuffer =
      await generatePriceContractPdfBuffer(
        pdfDocument
      );


    /* =====================================================
       SAVE
    ===================================================== */

    fs.writeFileSync(
      finalFilePath,
      pdfBuffer
    );


    /* =====================================================
       VERIFY
    ===================================================== */

    if (
      !fs.existsSync(
        finalFilePath
      )
    ) {
      throw new Error(
        "Price Contract PDF file was not saved."
      );
    }


    const stats =
      fs.statSync(
        finalFilePath
      );


    if (
      !stats.size
    ) {
      throw new Error(
        "Price Contract PDF file is empty."
      );
    }


    console.log(
      "PRICE CONTRACT PDF SAVED =>",
      finalFilePath
    );


    return {
      generated:
        true,

      fileName:
        finalFileName,

      filePath:
        finalFilePath,

      fileUrl:
        `/uploads/price-contracts/${finalFileName}`,

      fileSize:
        stats.size,

      generatedAt:
        new Date(),

      revisionNo:
        revisionCount,
    };

  } catch (error) {
    console.log(
      "PRICE CONTRACT PDF GENERATION ERROR =>",
      error
    );

    throw error;
  }
};


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generatePriceContractPdf,
  generatePriceContractPdfBuffer,
};