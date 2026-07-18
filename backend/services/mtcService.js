const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const {
  MtcCertificate,
} = require("../model/MtcCertificate");
const BharatMtcCertificate = require(
  "../model/BharatMtcCertificate"
);
const GloriaMtcCertificate = require(
  "../model/GloriaMtcCertificate"
);
const mtcChemicalSpecs = require(
  "../util/mtcChemicalSpecs"
);

const runWithChromiumLock = require(
  "../util/chromiumLock"
);

const gloriaTemplate = require(
  "../templates/mtc/gloriaTemplate"
);

const bharatTemplate = require(
  "../templates/mtc/bharatTemplate"
);

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PROVIDER = "gloria";

const MAX_MTC_LIST_LIMIT = 200;

const PUBLIC_MTC_UPLOAD_PATH = "/uploads/mtc";

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalizeProvider = (value) => {
  return String(value || DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();
};

const cleanText = (value, fallback = "") => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value).trim();
};

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const sanitizeFileName = (value = "") => {
  return String(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .trim();
};

const formatFileDate = (date) => {
  const parsedDate = new Date(
    date || new Date()
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return formatFileDate(new Date());
  }

  return `${String(
    parsedDate.getDate()
  ).padStart(2, "0")}-${String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0")}-${parsedDate.getFullYear()}`;
};

const getMtcPdfDirectory = () => {
  return (
    process.env.MTC_PDF_STORAGE_PATH ||
    path.join(
      __dirname,
      "..",
      "uploads",
      "mtc"
    )
  );
};

const ensurePdfDirectory = () => {
  const pdfDirectory =
    getMtcPdfDirectory();

  if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory, {
      recursive: true,
    });
  }

  return pdfDirectory;
};

const generateUniqueId = () => {
  return `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

/* =========================================================
   CHEMICAL COMPOSITION HELPERS
========================================================= */

const normalizeElementName = (value) => {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
};

const findChemicalInput = (
  inputComposition,
  element
) => {
  if (!Array.isArray(inputComposition)) {
    return null;
  }

  const normalizedElement =
    normalizeElementName(element);

  return (
    inputComposition.find(
      (item) =>
        normalizeElementName(item?.element) ===
        normalizedElement
    ) || null
  );
};

/**
 * Gloria validation:
 *
 * The grade configuration controls:
 * - allowed elements
 * - minimum value
 * - maximum value
 * - elements where result must be X
 */
const validateGloriaChemicalComposition = (
  grade,
  inputComposition = []
) => {
  const gradeConfig =
    mtcChemicalSpecs[grade];

  if (!gradeConfig) {
    throw new Error(
      `Chemical composition spec not configured for grade ${grade}`
    );
  }

  const gradeSpec =
    gradeConfig.elements || gradeConfig;

  return Object.keys(gradeSpec).map(
    (element) => {
      const spec = gradeSpec[element];

      const input = findChemicalInput(
        inputComposition,
        element
      );

      const hasNoMinAndMax =
        spec.min === null &&
        spec.max === null;

      if (hasNoMinAndMax) {
        return {
          element,
          min: null,
          max: null,
          result: "X",
        };
      }

      if (
        !input ||
        input.result === "" ||
        input.result === null ||
        input.result === undefined
      ) {
        throw new Error(
          `${element} result is required`
        );
      }

      const result = Number(input.result);

      if (Number.isNaN(result)) {
        throw new Error(
          `${element} result must be numeric`
        );
      }

      if (
        spec.min !== null &&
        spec.min !== undefined &&
        result < Number(spec.min)
      ) {
        throw new Error(
          `${element} result must be greater than or equal to ${spec.min}`
        );
      }

      if (
        spec.max !== null &&
        spec.max !== undefined &&
        result > Number(spec.max)
      ) {
        throw new Error(
          `${element} result must be less than or equal to ${spec.max}`
        );
      }

      return {
        element,
        min:
          spec.min === null ||
          spec.min === undefined
            ? null
            : Number(spec.min),

        max:
          spec.max === null ||
          spec.max === undefined
            ? null
            : Number(spec.max),

        result,
      };
    }
  );
};

/**
 * Bharat certificate chemical composition:
 *
 * The Bharat certificate displays achieved values supplied
 * from the frontend. It does not automatically force the
 * Gloria chemical grade configuration.
 *
 * Empty values are represented by "-".
 */
const normalizeBharatChemicalComposition = (
  inputComposition = []
) => {
  const bharatElements = [
    "C",
    "Si",
    "Mn",
    "P",
    "S",
    "Cr",
    "Mo",
    "Ni",
    "Al",
    "Cu",
    "Ti",
    "V",
    "Nb",
    "B",
  ];

  return bharatElements.map((element) => {
    const input = findChemicalInput(
      inputComposition,
      element
    );

    const rawResult = firstValue(
      input?.result,
      input?.achieved,
      input?.value,
      "-"
    );

    let result = rawResult;

    if (
      rawResult !== "-" &&
      rawResult !== "X" &&
      rawResult !== "x" &&
      rawResult !== ""
    ) {
      const numericValue =
        Number(rawResult);

      result = Number.isNaN(numericValue)
        ? cleanText(rawResult, "-")
        : numericValue;
    }

    return {
      element,
      min:
        input?.min === "" ||
        input?.min === undefined
          ? null
          : input?.min,

      max:
        input?.max === "" ||
        input?.max === undefined
          ? null
          : input?.max,

      result,
    };
  });
};

/**
 * Generic chemical composition normalizer.
 *
 * Future providers can use this when they do not require
 * grade-level min/max validation.
 */
const normalizeGenericChemicalComposition = (
  inputComposition = []
) => {
  if (!Array.isArray(inputComposition)) {
    return [];
  }

  return inputComposition
    .filter((item) =>
      cleanText(item?.element)
    )
    .map((item) => ({
      element: cleanText(item.element),
      min:
        item.min === "" ||
        item.min === undefined
          ? null
          : item.min,
      max:
        item.max === "" ||
        item.max === undefined
          ? null
          : item.max,
      result: firstValue(
        item.result,
        "-"
      ),
    }));
};

/* =========================================================
   GLORIA PAYLOAD NORMALIZATION
========================================================= */

const normalizeGloriaPayload = (
  payload,
  loggedInUser
) => {
  const grade = cleanText(
    payload.grade
  );

  if (!grade) {
    throw new Error(
      "Grade is required"
    );
  }

  const gradeConfig =
    mtcChemicalSpecs[grade];

  if (!gradeConfig) {
    throw new Error(
      `MTC configuration not found for grade ${grade}`
    );
  }

  const messers = cleanText(
    firstValue(
      payload.messers,
      payload.companyName
    )
  );

  const chemicalComposition =
    validateGloriaChemicalComposition(
      grade,
      payload.chemicalComposition || []
    );

  return {
    ...payload,

    mtcProvider: "gloria",

    messers,

    companyName: cleanText(
      firstValue(
        payload.companyName,
        messers
      )
    ),

    orderNo: cleanText(
      payload.orderNo
    ),

    poNo: cleanText(payload.poNo),

    fileNo: cleanText(
      payload.fileNo
    ),

    mtcDate: payload.mtcDate,

    grade,

    weight: cleanText(
      payload.weight
    ),

    size: cleanText(payload.size),

    pcs: cleanText(payload.pcs),

    heatLotNo: cleanText(
      payload.heatLotNo
    ),

    condition: cleanText(
      payload.condition
    ),

    chemicalComposition,

    /*
     * Gloria values are controlled by the grade
     * configuration.
     */
    hardness:
      gradeConfig.hardness || {},

    hardenability:
      gradeConfig.hardenability || {},

    seat: gradeConfig.seat || {},

    createdBy:
      loggedInUser?._id ||
      payload.createdBy,
  };
};

/* =========================================================
   BHARAT PAYLOAD NORMALIZATION
========================================================= */

const normalizeBharatItems = (
  payload
) => {
  const inputItems =
    payload.items ||
    payload.itemDescription ||
    payload.materialItems ||
    [];

  if (
    Array.isArray(inputItems) &&
    inputItems.length > 0
  ) {
    return inputItems.map(
      (item, index) => ({
        heatNo: cleanText(
          firstValue(
            item.heatNo,
            item.heatNumber,
            payload.heatLotNo
          )
        ),

        size: cleanText(
          firstValue(
            item.size,
            item.materialSize,
            payload.size
          )
        ),

        noOfPcs: cleanText(
          firstValue(
            item.noOfPcs,
            item.pcs,
            item.quantityPcs,
            "-"
          )
        ),

        quantityInKgs: cleanText(
          firstValue(
            item.quantityInKgs,
            item.quantity,
            item.qty,
            item.weight
          )
        ),

        remarks: cleanText(
          firstValue(
            item.remarks,
            "-"
          )
        ),

        rowNumber: index + 1,
      })
    );
  }

  /*
   * Backward-compatible single item row.
   */
  return [
    {
      heatNo: cleanText(
        payload.heatLotNo
      ),

      size: cleanText(payload.size),

      noOfPcs: cleanText(
        firstValue(
          payload.pcs,
          "-"
        )
      ),

      quantityInKgs: cleanText(
        firstValue(
          payload.weight,
          payload.quantityInKgs
        )
      ),

      remarks: cleanText(
        firstValue(
          payload.remarks,
          "-"
        )
      ),
    },
  ];
};

const normalizeBharatHardenability = (
  payload
) => {
  const source =
    payload.hardenabilityTest ||
    payload.hardenability ||
    {};

  const distanceResults =
    source.distanceResults ||
    payload.hardenabilityRows ||
    [];

  return {
    standard: cleanText(
      firstValue(
        source.standard,
        "IS: 3848, ASTM A255, SAE J406"
      )
    ),

    distanceResults: Array.isArray(
      distanceResults
    )
      ? distanceResults.map(
          (item) => ({
            distance: cleanText(
              firstValue(
                item.distance,
                item.distanceMm,
                item.position
              )
            ),

            specMin: cleanText(
              item.specMin
            ),

            specMax: cleanText(
              item.specMax
            ),

            result: cleanText(
              item.result
            ),
          })
        )
      : [],
  };
};

const normalizeBharatPayload = (
  payload,
  loggedInUser
) => {
  const customerName = cleanText(
    firstValue(
      payload.customerName,
      payload.companyName,
      payload.messers
    )
  );

  const companyName = cleanText(
    firstValue(
      payload.companyName,
      customerName
    )
  );

  const items =
    normalizeBharatItems(payload);

  const primaryItem =
    items[0] || {};

  return {
    ...payload,

    mtcProvider: "bharat",

    messers: cleanText(
      firstValue(
        payload.messers,
        customerName,
        companyName
      )
    ),

    companyName,

    customerName,

    customerAddress: cleanText(
      firstValue(
        payload.customerAddress,
        payload.companyAddress,
        payload.address
      )
    ),

    orderNo: cleanText(
      firstValue(
        payload.orderNo,
        payload.salesOrderNo
      )
    ),

    poNo: cleanText(
      firstValue(
        payload.poNo,
        payload.poNumber,
        "-"
      )
    ),

    invoiceNo: cleanText(
      firstValue(
        payload.invoiceNo,
        payload.invoiceNumber
      )
    ),

    tcNo: cleanText(
      firstValue(
        payload.tcNo,
        payload.certificateNo,
        payload.mtcNumber
      )
    ),

    issueDate:
      payload.issueDate ||
      payload.mtcDate ||
      new Date(),

    mtcDate:
      payload.mtcDate ||
      payload.issueDate ||
      new Date(),

    tdcNo: cleanText(
      firstValue(
        payload.tdcNo,
        payload.tdcNumber,
        "N/A"
      )
    ),

    grade: cleanText(
      firstValue(
        payload.grade,
        payload.purchaseSpecification
      )
    ),

    purchaseSpecification:
      cleanText(
        firstValue(
          payload.purchaseSpecification,
          payload.grade
        )
      ),

    product: cleanText(
      firstValue(
        payload.product,
        payload.productDescription,
        payload.materialDescription
      )
    ),

    manufacturingRoute: cleanText(
      firstValue(
        payload.manufacturingRoute,
        payload.mfgRoute,
        payload.condition
      )
    ),

    heatLotNo: cleanText(
      firstValue(
        payload.heatLotNo,
        primaryItem.heatNo
      )
    ),

    size: cleanText(
      firstValue(
        payload.size,
        primaryItem.size
      )
    ),

    weight: cleanText(
      firstValue(
        payload.weight,
        primaryItem.quantityInKgs
      )
    ),

    pcs: cleanText(
      firstValue(
        payload.pcs,
        primaryItem.noOfPcs,
        "-"
      )
    ),

    condition: cleanText(
      firstValue(
        payload.condition,
        payload.manufacturingRoute
      )
    ),

    items,

    chemicalComposition:
      normalizeBharatChemicalComposition(
        payload.chemicalComposition || []
      ),

    mechanicalProperties: {
      hardnessBhn: cleanText(
        firstValue(
          payload.mechanicalProperties
            ?.hardnessBhn,
          payload.hardness?.bhn,
          payload.hardnessBhn
        )
      ),

      hardnessSpec: cleanText(
        firstValue(
          payload.mechanicalProperties
            ?.hardnessSpec,
          payload.hardness?.spec,
          payload.hardnessSpec
        )
      ),

      hardnessResult: cleanText(
        firstValue(
          payload.mechanicalProperties
            ?.hardnessResult,
          payload.hardness?.result,
          payload.hardnessResult
        )
      ),

      sampleRemark: cleanText(
        firstValue(
          payload.mechanicalProperties
            ?.sampleRemark,
          payload.mechanicalSampleRemark,
          "ONLY H&T SAMPLE"
        )
      ),

      tensileStrength:
        payload.mechanicalProperties
          ?.tensileStrength || {},

      yieldStrength:
        payload.mechanicalProperties
          ?.yieldStrength || {},

      elongation:
        payload.mechanicalProperties
          ?.elongation || {},

      impactStrength:
        payload.mechanicalProperties
          ?.impactStrength || {},
    },

    rawMaterialDetail: {
      source: cleanText(
        payload.rawMaterialDetail
          ?.source
      ),

      reference: cleanText(
        payload.rawMaterialDetail
          ?.reference
      ),
    },

    hardenabilityTest:
      normalizeBharatHardenability(
        payload
      ),

    ultrasonicTesting: {
      referenceStandard: cleanText(
        firstValue(
          payload.ultrasonicTesting
            ?.referenceStandard,
          "ASTM A388"
        )
      ),

      acceptance: cleanText(
        firstValue(
          payload.ultrasonicTesting
            ?.acceptance,
          "4MM FBH, 2MHZ"
        )
      ),

      probeUsed: cleanText(
        firstValue(
          payload.ultrasonicTesting
            ?.probeUsed,
          "24MM"
        )
      ),

      result: cleanText(
        firstValue(
          payload.ultrasonicTesting
            ?.result,
          "100% SATISFACTORY"
        )
      ),
    },

    gasAnalysis: {
      o2:
        payload.gasAnalysis?.o2 ||
        {},

      n2:
        payload.gasAnalysis?.n2 ||
        {},

      h2:
        payload.gasAnalysis?.h2 ||
        {},
    },

    depthOfDecarbonization: {
      mixupTesting: cleanText(
        firstValue(
          payload.depthOfDecarbonization
            ?.mixupTesting,
          payload.mixupTesting,
          "OK"
        )
      ),

      microstructure: cleanText(
        firstValue(
          payload.depthOfDecarbonization
            ?.microstructure,
          payload.microstructure,
          "Pearlite + Ferrite"
        )
      ),
    },

    inclusionRating:
      payload.inclusionRating || {},

    grainSize: {
      specified: cleanText(
        firstValue(
          payload.grainSize
            ?.specified,
          "5-8"
        )
      ),

      achieved: cleanText(
        firstValue(
          payload.grainSize
            ?.achieved,
          typeof payload.grainSize ===
            "string"
            ? payload.grainSize
            : ""
        )
      ),
    },

    macrostructure: cleanText(
      firstValue(
        payload.macrostructure,
        payload.macroStructure
      )
    ),

    physicalTesting: {
      sdt: cleanText(
        firstValue(
          payload.physicalTesting
            ?.sdt,
          "N/A"
        )
      ),

      coldBendTest: cleanText(
        firstValue(
          payload.physicalTesting
            ?.coldBendTest,
          "N/A"
        )
      ),

      surface: cleanText(
        payload.physicalTesting
          ?.surface
      ),
    },

    identificationDetail: cleanText(
      firstValue(
        payload.identificationDetail,
        "Heat No, Grade, Size has been marked on Bar. Free from bend"
      )
    ),

    colourCode: cleanText(
      firstValue(
        payload.colourCode,
        payload.colorCode,
        "N/A"
      )
    ),

    dimensionalInspection: cleanText(
      firstValue(
        payload.dimensionalInspection,
        "Dimensional inspection carried out as per above mentioned PO/TDS and found within limits"
      )
    ),

    visualInspection: cleanText(
      firstValue(
        payload.visualInspection,
        "Visual inspection carried out as per T.D.C and found satisfactory"
      )
    ),

    resultDeclaration: cleanText(
      firstValue(
        payload.resultDeclaration,
        payload.result,
        "We hereby certify that material is free from radioactive elements, has been manufactured and inspected, and found acceptable as per customer requirement"
      )
    ),

    preparedBy: cleanText(
      firstValue(
        payload.preparedBy,
        loggedInUser?.name
      )
    ),

    createdBy:
      loggedInUser?._id ||
      payload.createdBy,
  };
};

/* =========================================================
   PROVIDER REGISTRY
========================================================= */

/**
 * Add every future provider only inside this registry.
 *
 * Example:
 *
 * tata: {
 *   model: TataMtcCertificate,
 *   template: tataTemplate,
 *   normalizePayload: normalizeTataPayload,
 *   filePrefix: "TATA_TC",
 * }
 */
const MTC_PROVIDER_REGISTRY = {
  gloria: {
  provider: "gloria",

  model: GloriaMtcCertificate,

  template: gloriaTemplate,

  normalizePayload: normalizeGloriaPayload,

  filePrefix: "MTC",

  getCompanyName: (mtc) =>
    firstValue(
      mtc.messers,
      mtc.companyName,
      "Customer"
    ),

  getDocumentNumber: (mtc) =>
    firstValue(
      mtc.orderNo,
      mtc.fileNo,
      mtc._id
    ),

  getDocumentDate: (mtc) =>
    firstValue(
      mtc.mtcDate,
      mtc.createdAt,
      new Date()
    ),
},

  bharat: {
    provider: "bharat",

    model: BharatMtcCertificate,

    template: bharatTemplate,

    normalizePayload:
      normalizeBharatPayload,

    filePrefix: "TC_BHARAT",

    getCompanyName: (mtc) =>
      firstValue(
        mtc.customerName,
        mtc.companyName,
        mtc.messers,
        "Customer"
      ),

    getDocumentNumber: (mtc) =>
      firstValue(
        mtc.tcNo,
        mtc.invoiceNo,
        mtc.orderNo,
        mtc._id
      ),

    getDocumentDate: (mtc) =>
      firstValue(
        mtc.issueDate,
        mtc.mtcDate,
        mtc.createdAt,
        new Date()
      ),
  },
};

const getProviderConfiguration = (
  provider
) => {
  const normalizedProvider =
    normalizeProvider(provider);

  const configuration =
    MTC_PROVIDER_REGISTRY[
      normalizedProvider
    ];

  if (!configuration) {
    throw new Error(
      `MTC provider not configured: ${normalizedProvider}`
    );
  }

  return configuration;
};

const getConfiguredProviders = () => {
  return Object.keys(
    MTC_PROVIDER_REGISTRY
  );
};

/* =========================================================
   TEMPLATE SELECTION
========================================================= */

const getTemplateByProvider = (
  provider
) => {
  return getProviderConfiguration(
    provider
  ).template;
};

/* =========================================================
   PDF GENERATION
========================================================= */

const generateMtcPdfBuffer = async (
  mtc
) => {
  const plainMtc =
    typeof mtc?.toObject ===
    "function"
      ? mtc.toObject({
          virtuals: true,
        })
      : mtc;

  const template =
    getTemplateByProvider(
      plainMtc.mtcProvider
    );

  const html = template(plainMtc);

  let page;

  const {
    getWhatsappBrowser,
    pauseWhatsappHealthForPdf,
    resumeWhatsappHealthAfterPdf,
  } = require("../util/whatsappClient");

  try {
    pauseWhatsappHealthForPdf();

    const whatsappBrowser =
      getWhatsappBrowser();

    if (
      !whatsappBrowser ||
      !whatsappBrowser.isConnected()
    ) {
      throw new Error(
        "WhatsApp Chromium is not connected. Please restart the Node app once and try again."
      );
    }

    console.log(
      `MTC PDF USING WHATSAPP CHROMIUM => ${plainMtc.mtcProvider}`
    );

    page =
      await whatsappBrowser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.emulateMediaType(
      "screen"
    );

    try {
      await page.evaluateHandle(
        "document.fonts.ready"
      );
    } catch (error) {
      console.log(
        "MTC PDF font wait skipped:",
        error.message
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

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
      await page
        .close()
        .catch(() => {});
    }

    resumeWhatsappHealthAfterPdf();
  }
};

const generateMtcPdf = async (
  mtc
) => {
  return runWithChromiumLock(
    "MTC PDF",
    async () => {
      const providerConfiguration =
        getProviderConfiguration(
          mtc.mtcProvider
        );

      const pdfDirectory =
        ensurePdfDirectory();

      const company =
        sanitizeFileName(
          providerConfiguration.getCompanyName(
            mtc
          )
        ) || "Customer";

      const documentNumber =
        sanitizeFileName(
          providerConfiguration.getDocumentNumber(
            mtc
          )
        ) ||
        sanitizeFileName(mtc._id) ||
        "Document";

      const grade =
        sanitizeFileName(
          firstValue(
            mtc.grade,
            "Grade"
          )
        ) || "Grade";

      const date = formatFileDate(
        providerConfiguration.getDocumentDate(
          mtc
        )
      );

      const uniqueId =
        generateUniqueId();

      const filePrefix =
        sanitizeFileName(
          providerConfiguration.filePrefix ||
            "MTC"
        );

      const fileName = [
        filePrefix,
        company,
        documentNumber,
        grade,
        date,
        uniqueId,
      ]
        .filter(Boolean)
        .join("_")
        .concat(".pdf");

      const filePath = path.join(
        pdfDirectory,
        fileName
      );

      const pdfBuffer =
        await generateMtcPdfBuffer(mtc);

      fs.writeFileSync(
        filePath,
        pdfBuffer
      );

      return {
        fileName,

        filePath,

        fileUrl: `${PUBLIC_MTC_UPLOAD_PATH}/${fileName}`,

        generatedAt: new Date(),
      };
    }
  );
};

/* =========================================================
   CREATE CERTIFICATE
========================================================= */

const createMtcCertificate = async (
  payload,
  loggedInUser
) => {
  let createdCertificate = null;
  let generatedPdfData = null;

  try {
    const provider =
      normalizeProvider(
        payload?.mtcProvider
      );

    const providerConfiguration =
      getProviderConfiguration(
        provider
      );

    if (
      !providerConfiguration?.model ||
      typeof providerConfiguration.model
        .create !== "function"
    ) {
      throw new Error(
        `Invalid MTC model configured for provider: ${provider}`
      );
    }

    if (
      typeof providerConfiguration
        .normalizePayload !==
      "function"
    ) {
      throw new Error(
        `MTC payload normalizer is missing for provider: ${provider}`
      );
    }

    const normalizedPayload =
      providerConfiguration.normalizePayload(
        {
          ...payload,
          mtcProvider: provider,
        },
        loggedInUser
      );

    if (
      !normalizedPayload ||
      typeof normalizedPayload !==
        "object"
    ) {
      throw new Error(
        `Invalid normalized MTC payload for provider: ${provider}`
      );
    }

    /*
     * Keep provider fixed after normalization.
     */
    normalizedPayload.mtcProvider =
      provider;

    /*
     * Uses the correct discriminator model:
     *
     * gloria => GloriaMtcCertificate
     * bharat => BharatMtcCertificate
     */
    createdCertificate =
      await providerConfiguration.model.create(
        normalizedPayload
      );

    generatedPdfData =
      await generateMtcPdf(
        createdCertificate
      );

    if (
      !generatedPdfData?.fileName ||
      !generatedPdfData?.filePath ||
      !generatedPdfData?.fileUrl
    ) {
      throw new Error(
        "MTC PDF generation returned incomplete file details"
      );
    }

    createdCertificate.pdf = {
      fileName:
        generatedPdfData.fileName,

      filePath:
        generatedPdfData.filePath,

      fileUrl:
        generatedPdfData.fileUrl,

      generatedAt:
        generatedPdfData.generatedAt ||
        new Date(),
    };

    createdCertificate.pdfUrl =
      generatedPdfData.fileUrl;

    createdCertificate.pdfFileName =
      generatedPdfData.fileName;

    /*
     * Safe for nested pdf object.
     */
    createdCertificate.markModified(
      "pdf"
    );

    await createdCertificate.save();

    return createdCertificate;
  } catch (error) {
    /*
     * Delete generated PDF if database update
     * failed after PDF creation.
     */
    if (
      generatedPdfData?.filePath &&
      fs.existsSync(
        generatedPdfData.filePath
      )
    ) {
      try {
        fs.unlinkSync(
          generatedPdfData.filePath
        );
      } catch (fileDeleteError) {
        console.error(
          "FAILED TO DELETE GENERATED MTC PDF =>",
          fileDeleteError
        );
      }
    }

    /*
     * Roll back the newly created database record
     * whenever any later operation fails.
     */
    if (createdCertificate?._id) {
      try {
        await createdCertificate
          .constructor
          .deleteOne({
            _id:
              createdCertificate._id,
          });
      } catch (deleteError) {
        console.error(
          "FAILED TO ROLLBACK MTC RECORD =>",
          deleteError
        );
      }
    }

    throw error;
  }
};

/* =========================================================
   FIND CERTIFICATE ACROSS ALL PROVIDERS
========================================================= */

const findMtcById = async (
  id,
  preferredProvider = ""
) => {
  if (!isValidObjectId(id)) {
    throw new Error(
      "Invalid MTC certificate ID"
    );
  }

  const query = {
    _id: id,
  };

  if (preferredProvider) {
    const normalizedProvider =
      normalizeProvider(
        preferredProvider
      );

    /*
     * Throws a clear error when an unsupported
     * provider is supplied.
     */
    getProviderConfiguration(
      normalizedProvider
    );

    query.mtcProvider =
      normalizedProvider;
  }

  return MtcCertificate.findOne(
    query
  );
};

/* =========================================================
   GET PDF
========================================================= */

const getMtcPdf = async (
  id,
  provider = ""
) => {
  const mtc = await findMtcById(
    id,
    provider
  );

  if (!mtc) {
    throw new Error(
      "MTC certificate not found"
    );
  }

  const filePath =
    mtc.pdf?.filePath;

  if (
    !filePath ||
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      "MTC PDF file not found"
    );
  }

  return {
    filePath,

    fileName:
      mtc.pdf?.fileName ||
      `${normalizeProvider(
        mtc.mtcProvider
      )}_MTC.pdf`,

    mtcProvider: mtc.mtcProvider,
  };
};

/* =========================================================
   BUILD COMMON LIST FILTER
========================================================= */

const buildMtcListQuery = (
  filters = {}
) => {
  const query = {};

  if (filters.companyName) {
    const searchText = cleanText(
      filters.companyName
    );

    query.$or = [
      {
        messers: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        companyName: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        customerName: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        orderNo: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        tcNo: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        invoiceNo: {
          $regex: searchText,
          $options: "i",
        },
      },

      {
        heatLotNo: {
          $regex: searchText,
          $options: "i",
        },
      },
    ];
  }

  if (filters.grade) {
    query.grade = {
      $regex: cleanText(
        filters.grade
      ),
      $options: "i",
    };
  }

  if (
    filters.fromDate ||
    filters.toDate
  ) {
    query.mtcDate = {};

    if (filters.fromDate) {
      const fromDate = new Date(
        filters.fromDate
      );

      if (
        !Number.isNaN(
          fromDate.getTime()
        )
      ) {
        fromDate.setHours(
          0,
          0,
          0,
          0
        );

        query.mtcDate.$gte =
          fromDate;
      }
    }

    if (filters.toDate) {
      const toDate = new Date(
        filters.toDate
      );

      if (
        !Number.isNaN(toDate.getTime())
      ) {
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

    if (
      Object.keys(query.mtcDate)
        .length === 0
    ) {
      delete query.mtcDate;
    }
  }

  return query;
};

/* =========================================================
   LIST CERTIFICATES FROM ONE OR ALL PROVIDERS
========================================================= */

const getMtcCertificates = async (
  filters = {}
) => {
  const requestedProvider =
    cleanText(filters.mtcProvider)
      .toLowerCase();

  const limit = Math.min(
    Math.max(
      Number(filters.limit) ||
        MAX_MTC_LIST_LIMIT,
      1
    ),
    MAX_MTC_LIST_LIMIT
  );

  const query =
    buildMtcListQuery(filters);

  /*
   * All provider discriminators use the same
   * "mtccertificates" MongoDB collection.
   *
   * Therefore, query through the base model.
   */
  if (requestedProvider) {
    /*
     * Validate provider before adding it to query.
     */
    getProviderConfiguration(
      requestedProvider
    );

    query.mtcProvider =
      requestedProvider;
  }

  return MtcCertificate.find(query)
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .lean();
};

/* =========================================================
   GET CHEMICAL SPECS
========================================================= */

const getMtcChemicalSpecs = async (
  provider = "gloria"
) => {
  const normalizedProvider =
    normalizeProvider(provider);

  /*
   * Gloria currently uses the configured grade limits.
   */
  if (
    normalizedProvider === "gloria"
  ) {
    return mtcChemicalSpecs;
  }

  /*
   * Bharat values are entered according to the supplied
   * original TC and are not forced through Gloria limits.
   */
  if (
    normalizedProvider === "bharat"
  ) {
    return {
      elements: [
        "C",
        "Si",
        "Mn",
        "P",
        "S",
        "Cr",
        "Mo",
        "Ni",
        "Al",
        "Cu",
        "Ti",
        "V",
        "Nb",
        "B",
      ],

      validationMode: "manual",
    };
  }

  return {
    elements: [],
    validationMode: "manual",
  };
};

/* =========================================================
   GET PROVIDERS FOR FRONTEND DROPDOWN
========================================================= */

const getMtcProviders = async () => {
  return getConfiguredProviders().map(
    (provider) => {
      const labels = {
        gloria: "Gloria",
        bharat: "Bharat Special Steel",
      };

      return {
        value: provider,
        label:
          labels[provider] ||
          provider
            .charAt(0)
            .toUpperCase() +
            provider.slice(1),
      };
    }
  );
};

/* =========================================================
   DELETE GENERATED PDF SAFELY
========================================================= */

const deleteGeneratedMtcPdf = (
  mtc
) => {
  const filePath =
    mtc?.pdf?.filePath;

  if (
    filePath &&
    fs.existsSync(filePath)
  ) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(
        "DELETE MTC PDF ERROR =>",
        error
      );
    }
  }
};

/* =========================================================
   REGENERATE PDF
========================================================= */

const regenerateMtcPdf = async (
  id,
  provider = ""
) => {
  const mtc = await findMtcById(
    id,
    provider
  );

  if (!mtc) {
    throw new Error(
      "MTC certificate not found"
    );
  }

  const oldPdf = mtc.pdf
    ? {
        ...mtc.pdf,
      }
    : null;

  const pdfData =
    await generateMtcPdf(mtc);

  mtc.pdf = {
  fileName:
    pdfData.fileName,

  filePath:
    pdfData.filePath,

  fileUrl:
    pdfData.fileUrl,

  generatedAt:
    pdfData.generatedAt,
};

mtc.pdfUrl =
  pdfData.fileUrl;

mtc.pdfFileName =
  pdfData.fileName;

await mtc.save();

  /*
   * Delete old PDF only after the new PDF and database
   * record are saved successfully.
   */
  if (
    oldPdf?.filePath &&
    oldPdf.filePath !==
      pdfData.filePath &&
    fs.existsSync(
      oldPdf.filePath
    )
  ) {
    try {
      fs.unlinkSync(
        oldPdf.filePath
      );
    } catch (error) {
      console.error(
        "OLD MTC PDF DELETE ERROR =>",
        error
      );
    }
  }

  return mtc;
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createMtcCertificate,

  getMtcCertificates,

  getMtcChemicalSpecs,

  getMtcProviders,

  getMtcPdf,

  regenerateMtcPdf,

  findMtcById,

  generateMtcPdf,

  generateMtcPdfBuffer,

  getTemplateByProvider,

  getProviderConfiguration,

  normalizeGenericChemicalComposition,

  deleteGeneratedMtcPdf,
};