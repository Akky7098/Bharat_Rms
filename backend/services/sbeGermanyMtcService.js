const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const {
  MtcCertificate,
} = require("../model/MtcCertificate");

const SbeGermanyMtcCertificate = require(
  "../model/SbeGermanyMtcCertificate"
);

const mtcGermanTemplate = require(
  "../templates/mtc/mtcGermanTemplate"
);

const {
  SBE_FIXED_VALUES,
  SBE_CHEMICAL_ORDER,
  SBE_FRONTEND_RULES,
  getSbeGradeConfig,
  getSbeGrades,
  buildSbeGradeFormData,
  validateSbeCreatePayload,
  validateSbeUpdatePayload,
} = require(
  "../util/sbeGermanyConfig"
);

const {
  generateSbeDocumentNumbers,
} = require(
  "../util/sbeNumberGenerator"
);

/* =========================================================
   CONSTANTS
========================================================= */

const PROVIDER =
  "sbe_germany";

const PUBLIC_MTC_UPLOAD_PATH =
  "/uploads/mtc";

const MAX_MTC_LIST_LIMIT =
  200;

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (
  value,
  fallback = ""
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(
    value
  ).trim();
};

const firstValue = (
  ...values
) => {
  for (
    const value of values
  ) {
    if (
      value !== null &&
      value !== undefined &&
      String(
        value
      ).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const sanitizeFileName = (
  value = ""
) => {
  return String(
    value
  )
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      ""
    )
    .replace(
      /\s+/g,
      "_"
    )
    .replace(
      /_+/g,
      "_"
    )
    .replace(
      /^\.+|\.+$/g,
      ""
    )
    .trim();
};

const formatFileDate = (
  date
) => {
  const parsedDate =
    new Date(
      date ||
        new Date()
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return formatFileDate(
      new Date()
    );
  }

  return `${String(
    parsedDate.getDate()
  ).padStart(
    2,
    "0"
  )}-${String(
    parsedDate.getMonth() +
      1
  ).padStart(
    2,
    "0"
  )}-${parsedDate.getFullYear()}`;
};

const generateUniqueId =
  () => {
    return `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  };

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

/* =========================================================
   PDF DIRECTORY
========================================================= */

const getMtcPdfDirectory =
  () => {
    return (
      process.env
        .MTC_PDF_STORAGE_PATH ||
      path.join(
        __dirname,
        "..",
        "uploads",
        "mtc"
      )
    );
  };

const ensurePdfDirectory =
  () => {
    const directory =
      getMtcPdfDirectory();

    if (
      !fs.existsSync(
        directory
      )
    ) {
      fs.mkdirSync(
        directory,
        {
          recursive:
            true,
        }
      );
    }

    return directory;
  };

/* =========================================================
   DELETE PDF
========================================================= */

const deletePdfFile = (
  filePath
) => {
  if (
    !filePath ||
    !fs.existsSync(
      filePath
    )
  ) {
    return;
  }

  try {
    fs.unlinkSync(
      filePath
    );
  } catch (
    error
  ) {
    console.error(
      "DELETE SBE PDF ERROR =>",
      error.message
    );
  }
};

/* =========================================================
   SBE PAYLOAD NORMALIZER

   FRONTEND CREATE:
   - grade
   - customerName
   - quantity
   - dimension

   FRONTEND UPDATE:
   - customerName
   - quantity
   - dimension

   Everything else comes from backend.
========================================================= */

const normalizeSbeGermanyPayload =
  (
    payload,
    loggedInUser
  ) => {
    const grade =
      cleanText(
        payload.grade
      );

    if (!grade) {
      throw new Error(
        "Grade is required"
      );
    }

    const gradeConfig =
      getSbeGradeConfig(
        grade
      );

    if (!gradeConfig) {
      throw new Error(
        `SBE configuration not found for grade ${grade}`
      );
    }

    const customerName =
      cleanText(
        payload.customerName
      );

    if (!customerName) {
      throw new Error(
        "Customer Name is required"
      );
    }

    const quantity =
      cleanText(
        firstValue(
          payload.quantity,
          payload.pcs,
          "1"
        )
      );

    if (!quantity) {
      throw new Error(
        "Quantity is required"
      );
    }

    const dimension =
      cleanText(
        firstValue(
          payload.dimension,
          payload.size
        )
      );

    if (!dimension) {
      throw new Error(
        "Dimension is required"
      );
    }

    const productionOrder =
      cleanText(
        payload.productionOrder
      );

    const customerPoNumber =
      cleanText(
        payload.customerPoNumber
      );

    if (
      !productionOrder
    ) {
      throw new Error(
        "SBE Fertigungsauftrag was not generated"
      );
    }

    if (
      !customerPoNumber
    ) {
      throw new Error(
        "SBE Kundenbestellnummer was not generated"
      );
    }

    return {
      mtcProvider:
        PROVIDER,

      companyName:
        customerName,

      customerName,

      customerAddress:
        "",

      orderNo:
        productionOrder,

      poNo:
        customerPoNumber,

      invoiceNo:
        "",

      mtcDate:
        payload.mtcDate ||
        new Date(),

      grade:
        gradeConfig.grade,

      heatLotNo:
        productionOrder,

      size:
        dimension,

      weight:
        "",

      pcs:
        quantity,

      condition:
        SBE_FIXED_VALUES
          .condition,

      chemicalComposition:
        JSON.parse(
          JSON.stringify(
            gradeConfig
              .chemicalComposition
          )
        ),

      position:
        SBE_FIXED_VALUES
          .position,

      quantity,

      quantityUnit:
        SBE_FIXED_VALUES
          .quantityUnit,

      meltingMethod:
        SBE_FIXED_VALUES
          .meltingMethod,

      castingProcess:
        SBE_FIXED_VALUES
          .castingProcess,

      materialCode:
        gradeConfig
          .materialCode,

      materialDescription:
        gradeConfig
          .materialDescription,

      execution:
        gradeConfig
          .execution,

      hardnessBHN:
        gradeConfig
          .hardnessBHN,

      productionOrder,

      customerPoNumber,

      dimension,

      materialRemark:
        SBE_FIXED_VALUES
          .materialRemark,

      ultrasonicTest:
        SBE_FIXED_VALUES
          .ultrasonicTest,

      cleanlinessRating:
        SBE_FIXED_VALUES
          .cleanlinessRating,

      meltingProcess:
        SBE_FIXED_VALUES
          .meltingProcess,

      macroMicroStructure:
        SBE_FIXED_VALUES
          .macroMicroStructure,

      chemicalOrder: [
        ...SBE_CHEMICAL_ORDER,
      ],

      createdBy:
        loggedInUser?._id ||
        payload.createdBy,

      updatedBy:
        payload.updatedBy ||
        null,
    };
  };

/* =========================================================
   SBE PDF BUFFER

   IMPORTANT:
   - NO ensureChromium
   - NO resolveSbeChromium
   - NO chromiumLock
   - NO BrowserFetcher
   - NO Chromium download code
   - NO custom executablePath
   - Puppeteer loaded only when SBE PDF is requested
========================================================= */

const generateSbeGermanyMtcPdfBuffer =
  async (
    mtc
  ) => {
    if (!mtc) {
      throw new Error(
        "SBE MTC data is required."
      );
    }

    const plainMtc =
      typeof mtc.toObject ===
      "function"
        ? mtc.toObject({
            virtuals:
              true,
          })
        : mtc;

    const html =
      mtcGermanTemplate(
        plainMtc
      );

    if (
      !html ||
      typeof html !==
        "string"
    ) {
      throw new Error(
        "SBE Germany template returned invalid HTML."
      );
    }

    /*
     * Lazy require.
     *
     * Puppeteer is not loaded when Node starts.
     * It is loaded only when an SBE PDF is actually requested.
     */
    const puppeteer =
      require("puppeteer");

    let browser =
      null;

    let page =
      null;

    try {
      /*
       * IMPORTANT:
       *
       * No executablePath.
       * No custom Chromium resolver.
       * No download function.
       *
       * Puppeteer uses its own already-installed browser.
       */
      browser =
        await puppeteer.launch({
          headless: true,

          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--no-first-run",
          ],
        });

      if (
        !browser ||
        !browser.isConnected()
      ) {
        throw new Error(
          "SBE PDF browser failed to start."
        );
      }

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

      try {
        await page.evaluate(
          async () => {
            if (
              document.fonts &&
              document.fonts.ready
            ) {
              await document
                .fonts.ready;
            }
          }
        );
      } catch (
        fontError
      ) {
        console.log(
          "SBE FONT WAIT WARNING =>",
          fontError.message
        );
      }

      try {
        await page.evaluate(
          async () => {
            const images =
              Array.from(
                document.images ||
                  []
              );

            await Promise.all(
              images.map(
                (image) => {
                  if (
                    image.complete
                  ) {
                    return Promise.resolve();
                  }

                  return new Promise(
                    (resolve) => {
                      image.onload =
                        resolve;

                      image.onerror =
                        resolve;
                    }
                  );
                }
              )
            );
          }
        );
      } catch (
        imageError
      ) {
        console.log(
          "SBE IMAGE WAIT WARNING =>",
          imageError.message
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            400
          )
      );

      const pdfBuffer =
        await page.pdf({
          format:
            "A4",

          printBackground:
            true,

          preferCSSPageSize:
            true,

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
        pdfBuffer.length ===
          0
      ) {
        throw new Error(
          "SBE MTC PDF generation returned an empty file."
        );
      }

      console.log(
        "SBE MTC PDF GENERATED =>",
        {
          productionOrder:
            plainMtc
              .productionOrder,

          size:
            pdfBuffer.length,
        }
      );

      return pdfBuffer;
    } catch (error) {
      console.error(
        "SBE MTC PDF ERROR =>",
        error
      );

      throw error;
    } finally {
      if (page) {
        await page
          .close()
          .catch(
            () => {}
          );
      }

      if (browser) {
        await browser
          .close()
          .catch(
            () => {}
          );
      }
    }
  };

/* =========================================================
   GENERATE PDF FILE
========================================================= */

const generateMtcPdf =
  async (
    mtc
  ) => {
    const directory =
      ensurePdfDirectory();

    const company =
      sanitizeFileName(
        firstValue(
          mtc.customerName,
          mtc.companyName,
          "Customer"
        )
      ) ||
      "Customer";

    const documentNumber =
      sanitizeFileName(
        firstValue(
          mtc.productionOrder,
          mtc.orderNo,
          mtc._id,
          "Document"
        )
      );

    const grade =
      sanitizeFileName(
        firstValue(
          mtc.grade,
          "Grade"
        )
      );

    const date =
      formatFileDate(
        firstValue(
          mtc.mtcDate,
          mtc.createdAt,
          new Date()
        )
      );

    const uniqueId =
      generateUniqueId();

    const fileName = [
      "SBE_TC",
      company,
      documentNumber,
      grade,
      date,
      uniqueId,
    ]
      .filter(
        Boolean
      )
      .join("_")
      .concat(
        ".pdf"
      );

    const filePath =
      path.join(
        directory,
        fileName
      );

    const pdfBuffer =
      await generateSbeGermanyMtcPdfBuffer(
        mtc
      );

    fs.writeFileSync(
      filePath,
      pdfBuffer
    );

    return {
      fileName,

      filePath,

      fileUrl:
        `${PUBLIC_MTC_UPLOAD_PATH}/${fileName}`,

      generatedAt:
        new Date(),
    };
  };

/* =========================================================
   APPLY PDF DATA
========================================================= */

const applyPdfData = (
  mtc,
  pdfData
) => {
  mtc.pdf = {
    fileName:
      pdfData.fileName,

    filePath:
      pdfData.filePath,

    fileUrl:
      pdfData.fileUrl,

    generatedAt:
      pdfData.generatedAt ||
      new Date(),
  };

  mtc.pdfUrl =
    pdfData.fileUrl;

  mtc.pdfFileName =
    pdfData.fileName;

  if (
    typeof mtc.markModified ===
    "function"
  ) {
    mtc.markModified(
      "pdf"
    );
  }
};

/* =========================================================
   CREATE SBE CERTIFICATE
========================================================= */

const createMtcCertificate =
  async (
    payload,
    loggedInUser
  ) => {
    let createdCertificate =
      null;

    let generatedPdfData =
      null;

    try {
      validateSbeCreatePayload(
        payload
      );

      const {
        productionOrder,
        customerPoNumber,
      } =
        await generateSbeDocumentNumbers(
          new Date()
        );

      const controlledPayload =
        {
          mtcProvider:
            PROVIDER,

          grade:
            cleanText(
              payload.grade
            ),

          customerName:
            cleanText(
              payload.customerName
            ),

          quantity:
            cleanText(
              firstValue(
                payload.quantity,
                payload.pcs,
                "1"
              )
            ),

          dimension:
            cleanText(
              firstValue(
                payload.dimension,
                payload.size
              )
            ),

          productionOrder,

          customerPoNumber,

          mtcDate:
            new Date(),
        };

      const normalizedPayload =
        normalizeSbeGermanyPayload(
          controlledPayload,
          loggedInUser
        );

      createdCertificate =
        await SbeGermanyMtcCertificate.create(
          normalizedPayload
        );

      generatedPdfData =
        await generateMtcPdf(
          createdCertificate
        );

      applyPdfData(
        createdCertificate,
        generatedPdfData
      );

      await createdCertificate.save();

      return createdCertificate;
    } catch (error) {
      if (
        generatedPdfData
          ?.filePath
      ) {
        deletePdfFile(
          generatedPdfData
            .filePath
        );
      }

      if (
        createdCertificate
          ?._id
      ) {
        try {
          await createdCertificate
            .constructor
            .deleteOne({
              _id:
                createdCertificate
                  ._id,
            });
        } catch (
          deleteError
        ) {
          console.error(
            "SBE ROLLBACK ERROR =>",
            deleteError
          );
        }
      }

      throw error;
    }
  };

/* =========================================================
   FIND SBE CERTIFICATE
========================================================= */

const findMtcById =
  async (
    id
  ) => {
    if (
      !isValidObjectId(
        id
      )
    ) {
      throw new Error(
        "Invalid MTC certificate ID"
      );
    }

    return MtcCertificate.findOne({
      _id:
        id,

      mtcProvider:
        PROVIDER,
    });
  };

/* =========================================================
   GET SINGLE
========================================================= */

const getMtcCertificateById =
  async (
    id
  ) => {
    const mtc =
      await findMtcById(
        id
      );

    if (!mtc) {
      throw new Error(
        "SBE Germany MTC certificate not found"
      );
    }

    return mtc;
  };

/* =========================================================
   UPDATE SBE CERTIFICATE

   Grade / generated numbers cannot change.
========================================================= */

const updateMtcCertificate =
  async (
    id,
    payload,
    loggedInUser
  ) => {
    const mtc =
      await getMtcCertificateById(
        id
      );

    validateSbeUpdatePayload(
      payload
    );

    const oldPdfPath =
      mtc.pdf?.filePath ||
      "";

    const controlledPayload =
      {
        mtcProvider:
          PROVIDER,

        grade:
          mtc.grade,

        customerName:
          cleanText(
            firstValue(
              payload.customerName,
              mtc.customerName
            )
          ),

        quantity:
          cleanText(
            firstValue(
              payload.quantity,
              mtc.quantity,
              mtc.pcs
            )
          ),

        dimension:
          cleanText(
            firstValue(
              payload.dimension,
              mtc.dimension,
              mtc.size
            )
          ),

        productionOrder:
          mtc.productionOrder,

        customerPoNumber:
          mtc.customerPoNumber,

        mtcDate:
          mtc.mtcDate,

        createdBy:
          mtc.createdBy,

        updatedBy:
          loggedInUser?._id,
      };

    const normalizedPayload =
      normalizeSbeGermanyPayload(
        controlledPayload,
        loggedInUser
      );

    /*
     * Preserve original creator/date.
     */
    normalizedPayload.createdBy =
      mtc.createdBy;

    normalizedPayload.updatedBy =
      loggedInUser?._id ||
      mtc.updatedBy;

    normalizedPayload.mtcDate =
      mtc.mtcDate;

    Object.keys(
      normalizedPayload
    ).forEach(
      (key) => {
        mtc[key] =
          normalizedPayload[
            key
          ];
      }
    );

    let newPdfData =
      null;

    try {
      newPdfData =
        await generateMtcPdf(
          mtc
        );

      applyPdfData(
        mtc,
        newPdfData
      );

      await mtc.save();

      if (
        oldPdfPath &&
        oldPdfPath !==
          newPdfData.filePath
      ) {
        deletePdfFile(
          oldPdfPath
        );
      }

      return mtc;
    } catch (error) {
      if (
        newPdfData
          ?.filePath
      ) {
        deletePdfFile(
          newPdfData
            .filePath
        );
      }

      throw error;
    }
  };

/* =========================================================
   GET PDF
========================================================= */

const getMtcPdf =
  async (
    id
  ) => {
    const mtc =
      await getMtcCertificateById(
        id
      );

    const filePath =
      mtc.pdf?.filePath;

    if (
      filePath &&
      fs.existsSync(
        filePath
      )
    ) {
      return {
        filePath,

        fileName:
          mtc.pdf
            .fileName ||
          path.basename(
            filePath
          ),

        fileUrl:
          mtc.pdf
            .fileUrl ||
          mtc.pdfUrl ||
          "",
      };
    }

    /*
     * PDF missing from disk:
     * regenerate it.
     */
    const updated =
      await regenerateMtcPdf(
        id
      );

    return {
      filePath:
        updated.pdf
          .filePath,

      fileName:
        updated.pdf
          .fileName,

      fileUrl:
        updated.pdf
          .fileUrl,
    };
  };

/* =========================================================
   REGENERATE
========================================================= */

const regenerateMtcPdf =
  async (
    id
  ) => {
    const mtc =
      await getMtcCertificateById(
        id
      );

    const oldPdfPath =
      mtc.pdf?.filePath ||
      "";

    let newPdfData =
      null;

    try {
      newPdfData =
        await generateMtcPdf(
          mtc
        );

      applyPdfData(
        mtc,
        newPdfData
      );

      await mtc.save();

      if (
        oldPdfPath &&
        oldPdfPath !==
          newPdfData.filePath
      ) {
        deletePdfFile(
          oldPdfPath
        );
      }

      return mtc;
    } catch (error) {
      if (
        newPdfData
          ?.filePath
      ) {
        deletePdfFile(
          newPdfData
            .filePath
        );
      }

      throw error;
    }
  };

/* =========================================================
   GET SBE LIST
========================================================= */

const getMtcCertificates =
  async (
    filters = {}
  ) => {
    const query = {
      mtcProvider:
        PROVIDER,
    };

    if (
      cleanText(
        filters.grade
      )
    ) {
      query.grade =
        cleanText(
          filters.grade
        );
    }

    if (
      cleanText(
        filters.companyName
      )
    ) {
      query.$or = [
        {
          customerName: {
            $regex:
              cleanText(
                filters.companyName
              ),

            $options:
              "i",
          },
        },

        {
          companyName: {
            $regex:
              cleanText(
                filters.companyName
              ),

            $options:
              "i",
          },
        },
      ];
    }

    if (
      filters.fromDate ||
      filters.toDate
    ) {
      query.mtcDate =
        {};

      if (
        filters.fromDate
      ) {
        query.mtcDate.$gte =
          new Date(
            filters.fromDate
          );
      }

      if (
        filters.toDate
      ) {
        const toDate =
          new Date(
            filters.toDate
          );

        toDate.setHours(
          23,
          59,
          59,
          999
        );

        query.mtcDate.$lte =
          toDate;
      }
    }

    const limit =
      Math.min(
        Math.max(
          Number(
            filters.limit
          ) ||
            MAX_MTC_LIST_LIMIT,
          1
        ),
        MAX_MTC_LIST_LIMIT
      );

    return MtcCertificate.find(
      query
    )
      .sort({
        createdAt:
          -1,
      })
      .limit(
        limit
      )
      .lean();
  };

/* =========================================================
   SBE FRONTEND CONFIG
========================================================= */

const getMtcChemicalSpecs =
  async () => {
    const gradeConfigs =
      {};

    getSbeGrades().forEach(
      (
        gradeOption
      ) => {
        gradeConfigs[
          gradeOption.value
        ] =
          buildSbeGradeFormData(
            gradeOption.value
          );
      }
    );

    return {
      provider:
        PROVIDER,

      label:
        "SBE Germany",

      validationMode:
        "controlled",

      grades:
        getSbeGrades(),

      gradeConfigs,

      rules:
        SBE_FRONTEND_RULES,

      elements: [
        ...SBE_CHEMICAL_ORDER,
      ],

      fields: [
        {
          name:
            "grade",

          label:
            "Grade",

          type:
            "select",

          required:
            true,

          editable:
            true,
        },

        {
          name:
            "customerName",

          label:
            "Customer Name",

          type:
            "text",

          required:
            true,

          editable:
            true,
        },

        {
          name:
            "quantity",

          label:
            "Quantity / Anzahl",

          type:
            "number",

          required:
            true,

          editable:
            true,

          default:
            "1",
        },

        {
          name:
            "dimension",

          label:
            "Dimension / Abmessung",

          type:
            "text",

          required:
            true,

          editable:
            true,
        },
      ],

      generatedFields: [
        {
          name:
            "productionOrder",

          pdfLabel:
            "Fertigungsauftrag",

          generatedBy:
            "backend",
        },

        {
          name:
            "customerPoNumber",

          pdfLabel:
            "Kundenbestellnummer",

          generatedBy:
            "backend",
        },
      ],
    };
  };

/* =========================================================
   PROVIDER
========================================================= */

const getMtcProviders =
  async () => {
    return [
      {
        value:
          PROVIDER,

        label:
          "SBE Germany",
      },
    ];
  };

/* =========================================================
   DELETE GENERATED PDF
========================================================= */

const deleteGeneratedMtcPdf =
  (
    mtc
  ) => {
    deletePdfFile(
      mtc?.pdf
        ?.filePath
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createMtcCertificate,

  updateMtcCertificate,

  getMtcCertificateById,

  getMtcCertificates,

  getMtcChemicalSpecs,

  getMtcProviders,

  getMtcPdf,

  regenerateMtcPdf,

  findMtcById,

  generateMtcPdf,

  generateSbeGermanyMtcPdfBuffer,

  normalizeSbeGermanyPayload,

  deleteGeneratedMtcPdf,
};