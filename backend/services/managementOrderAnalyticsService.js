const SalesOrder =
  require("../model/salesOrderModel");


/* =========================================================
   CONSTANTS
========================================================= */

const HOUSE_TYPE = "H.O.";
const STEEL_MILL_TYPE = "N.H.O.";

const ANALYTICS_START_DATE =
  new Date(
    "2026-08-13T00:00:00.000Z"
  );

const RECTANGULAR_FACTOR =
  0.00000785;

const ROUND_FACTOR =
  0.000006165;


/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();


const normalizeGrade = (value) =>
  cleanText(value)
    .toUpperCase();


const toNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number =
    Number(
      String(value)
        .replace(/,/g, "")
    );

  return Number.isFinite(number)
    ? number
    : 0;
};


const roundKG = (value) =>
  Number(
    toNumber(value)
      .toFixed(3)
  );


const safeDate = (value) => {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};


const formatDateOnly = (
  value
) => {
  const date =
    safeDate(value);

  if (!date) {
    return null;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


/* =========================================================
   TRACKING TYPE
========================================================= */

const normalizeTrackingType = (
  value
) => {
  const text =
    cleanText(value)
      .toUpperCase()
      .replace(/\s+/g, "");

  if (
    text === "H.O." ||
    text === "H.O" ||
    text === "HO"
  ) {
    return HOUSE_TYPE;
  }

  if (
    text === "N.H.O." ||
    text === "N.H.O" ||
    text === "NHO"
  ) {
    return STEEL_MILL_TYPE;
  }

  return "";
};


/* =========================================================
   PERIOD

   Selected month is END month.

   September + 1
   -> 01 Sep - 30 Sep

   September + 3
   -> 01 Jul - 30 Sep

   September + 6
   -> 01 Apr - 30 Sep

   Analytics officially starts 13-Aug-2026.
========================================================= */

const buildPeriod = ({
  month,
  months = 1,
} = {}) => {
  const monthsNumber =
    Number(months);

  if (
    ![1, 3, 6, 12].includes(
      monthsNumber
    )
  ) {
    throw new Error(
      "months must be 1, 3, 6 or 12."
    );
  }

  let selectedMonth =
    cleanText(month);

  if (!selectedMonth) {
    const now =
      new Date();

    selectedMonth =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
  }

  if (
    !/^\d{4}-\d{2}$/.test(
      selectedMonth
    )
  ) {
    throw new Error(
      "month must be YYYY-MM."
    );
  }

  const [
    year,
    monthNumber,
  ] =
    selectedMonth
      .split("-")
      .map(Number);

  if (
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error(
      "Invalid month."
    );
  }

  let fromDate =
    new Date(
      year,
      monthNumber -
        monthsNumber,
      1,
      0,
      0,
      0,
      0
    );

  const toDate =
    new Date(
      year,
      monthNumber,
      0,
      23,
      59,
      59,
      999
    );

  if (
    fromDate <
    ANALYTICS_START_DATE
  ) {
    fromDate =
      new Date(
        ANALYTICS_START_DATE
      );
  }

  return {
    selectedMonth,

    months:
      monthsNumber,

    fromDate,

    toDate,

    from:
      formatDateOnly(
        fromDate
      ),

    to:
      formatDateOnly(
        toDate
      ),
  };
};


/* =========================================================
   ORDER BOOKING DATE

   IMPORTANT:

   Management Order Analysis answers:

   "How much business/order was entered into RMS
   during this period?"

   Therefore createdAt is PRIMARY.

   PO date may be older than the actual RMS
   order-entry date.

========================================================= */

const getOrderDate = (
  order
) => {
  return (
    safeDate(
      order?.createdAt
    ) ||
    safeDate(
      order?.poDate
    )
  );
};


/* =========================================================
   STEEL MILL
========================================================= */

const getSteelMillName = (
  order
) => {
  const steelMill =
    cleanText(
      order?.steelMill
    );

  if (
    steelMill.toLowerCase() ===
    "others"
  ) {
    return (
      cleanText(
        order?.otherSteelMill
      ) ||
      "Others"
    );
  }

  return (
    steelMill ||
    cleanText(
      order?.otherSteelMill
    ) ||
    "Not Specified"
  );
};


/* =========================================================
   REMOVE RATE FROM MATERIAL STRING
========================================================= */

const removeRatePart = (
  value
) => {
  let text =
    String(value || "");

  text =
    text.replace(
      /@\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
      ""
    );

  text =
    text.replace(
      /\bRATE\s*[:=-]?\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
      ""
    );

  return text.trim();
};


/* =========================================================
   PIECE COUNT
========================================================= */

const extractPieceCount = (
  value
) => {
  const text =
    String(value || "")
      .replace(/,/g, "")
      .trim();

  if (!text) {
    return null;
  }

  const qtyMatch =
    text.match(
      /\b(?:QTY|QUANTITY)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:NOS?|PCS?|PIECES?)\b/i
    );

  if (qtyMatch) {
    const pieces =
      Number(
        qtyMatch[1]
      );

    if (
      Number.isFinite(
        pieces
      ) &&
      pieces > 0
    ) {
      return pieces;
    }
  }

  const directMatch =
    text.match(
      /\b(\d+(?:\.\d+)?)\s*(?:NOS?|PCS?|PIECES?)\b/i
    );

  if (directMatch) {
    const pieces =
      Number(
        directMatch[1]
      );

    if (
      Number.isFinite(
        pieces
      ) &&
      pieces > 0
    ) {
      return pieces;
    }
  }

  return null;
};


/* =========================================================
   DIMENSIONAL WEIGHT
========================================================= */

const parseDimensionalWeightKG =
  (value) => {
    const original =
      String(value || "");

    const text =
      removeRatePart(
        original
      )
        .replace(/,/g, "")
        .replace(
          /[×*]/g,
          "X"
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (!text) {
      return null;
    }

    const pieces =
      extractPieceCount(
        text
      );

    /*
     * Do not assume 1 piece.
     */

    if (
      pieces === null ||
      pieces <= 0
    ) {
      return null;
    }


    /* =====================================================
       ROUND
    ===================================================== */

    const roundMatch =
      text.match(
        /\b(?:DIA|DIAMETER|Ø)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i
      );

    if (roundMatch) {
      const diameterMM =
        Number(
          roundMatch[1]
        );

      const lengthMM =
        Number(
          roundMatch[2]
        );

      if (
        Number.isFinite(
          diameterMM
        ) &&
        Number.isFinite(
          lengthMM
        ) &&
        diameterMM > 0 &&
        lengthMM > 0
      ) {
        const weightPerPieceKG =
          diameterMM *
          diameterMM *
          lengthMM *
          ROUND_FACTOR;

        const totalKG =
          weightPerPieceKG *
          pieces;

        return {
          original,

          quantityKG:
            roundKG(
              totalKG
            ),

          source:
            "CALCULATED_DIMENSIONS",

          shape:
            "ROUND",

          pieces,

          weightPerPieceKG:
            roundKG(
              weightPerPieceKG
            ),

          dimensions: {
            diameterMM,
            lengthMM,
          },
        };
      }
    }


    /* =====================================================
       RECTANGULAR / FLAT
    ===================================================== */

    const rectangularMatch =
      text.match(
        /(?:^|[\s,:-])(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i
      );

    if (rectangularMatch) {
      const dimension1MM =
        Number(
          rectangularMatch[1]
        );

      const dimension2MM =
        Number(
          rectangularMatch[2]
        );

      const lengthMM =
        Number(
          rectangularMatch[3]
        );

      if (
        Number.isFinite(
          dimension1MM
        ) &&
        Number.isFinite(
          dimension2MM
        ) &&
        Number.isFinite(
          lengthMM
        ) &&
        dimension1MM > 0 &&
        dimension2MM > 0 &&
        lengthMM > 0
      ) {
        const weightPerPieceKG =
          dimension1MM *
          dimension2MM *
          lengthMM *
          RECTANGULAR_FACTOR;

        const totalKG =
          weightPerPieceKG *
          pieces;

        return {
          original,

          quantityKG:
            roundKG(
              totalKG
            ),

          source:
            "CALCULATED_DIMENSIONS",

          shape:
            "RECTANGULAR",

          pieces,

          weightPerPieceKG:
            roundKG(
              weightPerPieceKG
            ),

          dimensions: {
            dimension1MM,
            dimension2MM,
            lengthMM,
          },
        };
      }
    }


    /* =====================================================
       SQUARE / RCS
    ===================================================== */

    const squareMatch =
      text.match(
        /\b(?:RCS|SQ|SQUARE)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i
      );

    if (squareMatch) {
      const sideMM =
        Number(
          squareMatch[1]
        );

      const lengthMM =
        Number(
          squareMatch[2]
        );

      if (
        Number.isFinite(
          sideMM
        ) &&
        Number.isFinite(
          lengthMM
        ) &&
        sideMM > 0 &&
        lengthMM > 0
      ) {
        const weightPerPieceKG =
          sideMM *
          sideMM *
          lengthMM *
          RECTANGULAR_FACTOR;

        const totalKG =
          weightPerPieceKG *
          pieces;

        return {
          original,

          quantityKG:
            roundKG(
              totalKG
            ),

          source:
            "CALCULATED_DIMENSIONS",

          shape:
            "SQUARE",

          pieces,

          weightPerPieceKG:
            roundKG(
              weightPerPieceKG
            ),

          dimensions: {
            sideMM,
            lengthMM,
          },
        };
      }
    }

    return null;
  };


/* =========================================================
   QUANTITY PARSER

   OUTPUT = KG

   PRIORITY:

   1. Explicit MT
   2. Explicit KG
   3. Dimensional calculation
   4. unresolved
========================================================= */

const parseQuantityToKG = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const original =
    String(value);

  const quantityText =
    removeRatePart(
      original
    )
      .replace(/,/g, "")
      .trim();

  if (!quantityText) {
    return null;
  }


  /* =====================================================
     EXPLICIT MT
  ===================================================== */

  const mtPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:M\.?\s*T\.?|MTS?)\b/i,

    /(\d+(?:\.\d+)?)\s*(?:METRIC\s+TON(?:NE)?S?|TON(?:NE)?S?)\b/i,
  ];

  for (
    const regex of
    mtPatterns
  ) {
    const match =
      quantityText.match(
        regex
      );

    if (!match) {
      continue;
    }

    const quantityMT =
      Number(
        match[1]
      );

    if (
      !Number.isFinite(
        quantityMT
      ) ||
      quantityMT <= 0
    ) {
      continue;
    }

    return {
      original,

      detectedQuantity:
        quantityMT,

      detectedUnit:
        "MT",

      quantityKG:
        roundKG(
          quantityMT *
            1000
        ),

      source:
        "EXPLICIT_MT",

      shape: null,

      pieces: null,

      weightPerPieceKG:
        null,

      dimensions: null,
    };
  }


  /* =====================================================
     EXPLICIT KG
  ===================================================== */

  const kgMatch =
    quantityText.match(
      /(\d+(?:\.\d+)?)\s*(?:KG|KGS|KILOGRAM|KILOGRAMS)\b/i
    );

  if (kgMatch) {
    const quantityKG =
      Number(
        kgMatch[1]
      );

    if (
      Number.isFinite(
        quantityKG
      ) &&
      quantityKG > 0
    ) {
      return {
        original,

        detectedQuantity:
          quantityKG,

        detectedUnit:
          "KG",

        quantityKG:
          roundKG(
            quantityKG
          ),

        source:
          "EXPLICIT_KG",

        shape: null,

        pieces: null,

        weightPerPieceKG:
          null,

        dimensions: null,
      };
    }
  }


  /* =====================================================
     DIMENSIONAL
  ===================================================== */

  const dimensional =
    parseDimensionalWeightKG(
      quantityText
    );

  if (dimensional) {
    return {
      original,

      detectedQuantity:
        dimensional
          .quantityKG,

      detectedUnit:
        "KG",

      quantityKG:
        dimensional
          .quantityKG,

      source:
        dimensional.source,

      shape:
        dimensional.shape,

      pieces:
        dimensional.pieces,

      weightPerPieceKG:
        dimensional
          .weightPerPieceKG,

      dimensions:
        dimensional
          .dimensions,
    };
  }

  return null;
};


/* =========================================================
   GRADE PARSER
========================================================= */

const extractGradeFromText = (
  value
) => {
  const text =
    cleanText(value);

  if (!text) {
    return "";
  }

  let workingText =
    text.replace(
      /^\s*\d+\s*[.)\-:]\s*/,
      ""
    );

  const explicitGrade =
    workingText.match(
      /\b(?:GRADE|GR)\s*[:=-]?\s*([A-Z0-9][A-Z0-9.+\-]*)\b/i
    );

  if (
    explicitGrade?.[1]
  ) {
    return normalizeGrade(
      explicitGrade[1]
    );
  }

  const dinGrade =
    workingText.match(
      /^(DIN\s*\d+(?:\.\d+)?)/i
    );

  if (dinGrade?.[1]) {
    return normalizeGrade(
      dinGrade[1]
    );
  }

  const firstToken =
    workingText.match(
      /^([A-Z0-9][A-Z0-9.+\-]*)\b/i
    );

  if (
    !firstToken?.[1]
  ) {
    return "";
  }

  const candidate =
    normalizeGrade(
      firstToken[1]
    );

  const rejected =
    new Set([
      "DIA",
      "DIAMETER",
      "ROUND",
      "FLAT",
      "RCS",
      "SQ",
      "SQUARE",
      "SIZE",
      "ROUGH",
      "QTY",
      "QUANTITY",
    ]);

  return rejected.has(
    candidate
  )
    ? ""
    : candidate;
};


/* =========================================================
   EXTRACT SALES ORDER ITEMS

   IMPORTANT:

   Current RMS historical sales orders use:

   sizeGradeQuantityRate

   Example:

   ASTM A668/Grade X4 - 100 RCS -
   Qty -30000 kg @ Rs.57.5/kg + GST
========================================================= */

const extractSalesOrderItems = (
  salesOrder
) => {
  const raw =
    salesOrder
      ?.sizeGradeQuantityRate;

  if (
    raw === null ||
    raw === undefined
  ) {
    return [];
  }


  /* =====================================================
     STRUCTURED ARRAY
  ===================================================== */

  if (
    Array.isArray(raw)
  ) {
    return raw.map(
      (
        item,
        index
      ) => {
        const grade =
          normalizeGrade(
            item?.grade ||
            item?.materialGrade ||
            item?.steelGrade
          );

        let quantityKG =
          null;

        const unit =
          cleanText(
            item?.unit ||
            item?.quantityUnit ||
            item?.weightUnit
          ).toUpperCase();

        const quantity =
          toNumber(
            item?.quantity ??
            item?.qty ??
            item?.orderQuantity ??
            item?.weight
          );

        if (
          quantity > 0 &&
          (
            unit === "KG" ||
            unit === "KGS"
          )
        ) {
          quantityKG =
            roundKG(
              quantity
            );
        }

        if (
          quantity > 0 &&
          (
            unit === "MT" ||
            unit === "MTS" ||
            unit === "TON" ||
            unit === "TONS" ||
            unit === "TONNE" ||
            unit === "TONNES"
          )
        ) {
          quantityKG =
            roundKG(
              quantity *
                1000
            );
        }

        /*
         * Some structured items can still
         * contain quantity inside description.
         */

        if (
          quantityKG === null
        ) {
          const textValue =
            item?.description ||
            item?.material ||
            item?.text ||
            "";

          const parsed =
            parseQuantityToKG(
              textValue
            );

          if (parsed) {
            quantityKG =
              parsed.quantityKG;
          }
        }

        return {
          index,

          grade:
            grade ||
            "UNIDENTIFIED",

          original:
            item,

          parsed:
            quantityKG !==
            null,

          quantityKG,

          quantitySource:
            quantityKG !==
            null
              ? "STRUCTURED"
              : "UNRESOLVED",
        };
      }
    );
  }


  /* =====================================================
     HISTORICAL FREE TEXT

     IMPORTANT:
     Do not split on comma because:
     1,000 KG
  ===================================================== */

  const rows =
    String(raw)
      .split(
        /\r?\n|;/
      )
      .map(
        (row) =>
          row.trim()
      )
      .filter(Boolean);

  return rows.map(
    (
      row,
      index
    ) => {
      const parsed =
        parseQuantityToKG(
          row
        );

      const grade =
        extractGradeFromText(
          row
        );

      return {
        index,

        original:
          row,

        grade:
          grade ||
          "UNIDENTIFIED",

        parsed:
          Boolean(parsed),

        quantityKG:
          parsed
            ? parsed
                .quantityKG
            : null,

        quantitySource:
          parsed
            ? parsed.source
            : "UNRESOLVED",

        detectedQuantity:
          parsed
            ? parsed
                .detectedQuantity
            : null,

        detectedUnit:
          parsed
            ? parsed
                .detectedUnit
            : "",

        shape:
          parsed
            ? parsed.shape
            : null,

        pieces:
          parsed
            ? parsed.pieces
            : null,

        weightPerPieceKG:
          parsed
            ? parsed
                .weightPerPieceKG
            : null,

        dimensions:
          parsed
            ? parsed
                .dimensions
            : null,
      };
    }
  );
};


/* =========================================================
   FALLBACK DIRECT QUANTITY
========================================================= */

const getDirectOrderQuantityKG = (
  order
) => {
  const directKGFields = [
    order?.totalQuantityKG,
    order?.totalQuantityKg,
    order?.orderQuantityKG,
    order?.orderQuantityKg,
    order?.quantityKG,
    order?.quantityKg,
    order?.totalKG,
    order?.totalKg,
  ];

  for (
    const value of
    directKGFields
  ) {
    const kg =
      toNumber(value);

    if (kg > 0) {
      return roundKG(
        kg
      );
    }
  }

  const quantity =
    order?.totalQuantity ??
    order?.orderQuantity ??
    order?.quantity ??
    0;

  const unit =
    cleanText(
      order?.quantityUnit ||
      order?.unit ||
      ""
    ).toUpperCase();

  if (
    toNumber(quantity) > 0
  ) {
    if (
      unit === "MT" ||
      unit === "MTS" ||
      unit === "TON" ||
      unit === "TONS" ||
      unit === "TONNE" ||
      unit === "TONNES"
    ) {
      return roundKG(
        toNumber(quantity) *
          1000
      );
    }

    if (
      unit === "KG" ||
      unit === "KGS" ||
      !unit
    ) {
      return roundKG(
        quantity
      );
    }
  }

  return 0;
};


/* =========================================================
   ORDER QUANTITY INFORMATION
========================================================= */

const getOrderQuantityInfo = (
  salesOrder
) => {
  const items =
    extractSalesOrderItems(
      salesOrder
    );

  let totalKG = 0;

  let parsedItemCount =
    0;

  const grades =
    new Map();

  const unparsedItems =
    [];

  items.forEach(
    (item) => {
      if (
        !item.parsed ||
        item.quantityKG ===
          null
      ) {
        unparsedItems.push(
          item
        );

        return;
      }

      const quantityKG =
        toNumber(
          item.quantityKG
        );

      if (
        quantityKG <= 0
      ) {
        return;
      }

      totalKG +=
        quantityKG;

      parsedItemCount +=
        1;

      const gradeName =
        item.grade ||
        "UNIDENTIFIED";

      grades.set(
        gradeName,

        toNumber(
          grades.get(
            gradeName
          )
        ) +
          quantityKG
      );
    }
  );


  /*
   * Fallback only when material parser
   * could not get quantity.
   */

  if (
    totalKG <= 0
  ) {
    const fallbackKG =
      getDirectOrderQuantityKG(
        salesOrder
      );

    if (
      fallbackKG > 0
    ) {
      totalKG =
        fallbackKG;

      const fallbackGrade =
        normalizeGrade(
          salesOrder?.grade ||
          salesOrder
            ?.materialGrade
        ) ||
        "UNIDENTIFIED";

      grades.set(
        fallbackGrade,
        fallbackKG
      );
    }
  }


  return {
    items,

    totalKG:
      roundKG(
        totalKG
      ),

    parsedItemCount,

    totalItemCount:
      items.length,

    fullyParsed:
      items.length > 0 &&
      parsedItemCount ===
        items.length,

    grades,

    unparsedItems,
  };
};


/* =========================================================
   SUMMARY
========================================================= */

const createSummary = () => ({
  orderCount: 0,

  orderKG: 0,

  parsedOrderCount: 0,

  unresolvedOrderCount: 0,
});


/* =========================================================
   DETAIL OBJECT
========================================================= */

const buildOrderDetail = ({
  order,
  orderDate,
  orderKG,
  type,
  quantityInfo,
}) => {
  const isSteelMill =
    type ===
    STEEL_MILL_TYPE;

  return {
    _id:
      order._id,

    salesOrderId:
      order._id,

    salesOrderNo:
      cleanText(
        order.salesOrderNo ||
        order.salesOrderNumber
      ),

    poNumber:
      cleanText(
        order.poNumber
      ),

    companyName:
      cleanText(
        order.companyName ||
        order.customerName
      ),

    salesPersonName:
      cleanText(
        order.salesPersonName
      ),

    orderDate,

    bookingDate:
      orderDate,

    poDate:
      order.poDate ||
      null,

    trackingOrderType:
      type,

    steelMill:
      isSteelMill
        ? getSteelMillName(
            order
          )
        : "",

    supplyCondition:
      order.supplyCondition ||
      order.supplyFinish ||
      "",

    quantityKG:
      orderKG,

    orderQuantityKG:
      orderKG,

    orderTakenKG:
      orderKG,

    orderKG,

    quantityFullyParsed:
      quantityInfo
        .fullyParsed,

    grades:
      Array.from(
        quantityInfo
          .grades
          .entries()
      ).map(
        ([
          gradeName,
          quantityKG,
        ]) => ({
          grade:
            gradeName,

          quantityKG:
            roundKG(
              quantityKG
            ),

          orderKG:
            roundKG(
              quantityKG
            ),
        })
      ),

    sizeGradeQuantityRate:
      order
        .sizeGradeQuantityRate,

    material:
      order
        .sizeGradeQuantityRate,
  };
};


/* =========================================================
   MANAGEMENT ORDER ANALYSIS

   SALES ORDER COLLECTION ONLY.

   NO TRACKING.
   NO DISPATCH.
   NO LOGISTICS.
========================================================= */

const getManagementOrderAnalytics =
  async ({
    month,
    months = 1,
    trackingOrderType,
    steelMill,
    grade,
    includeDetails = false,
  } = {}) => {
    const period =
      buildPeriod({
        month,
        months,
      });


    /*
     * IMPORTANT:
     *
     * Use createdAt for the database period.
     *
     * This matches "orders entered/taken in RMS".
     *
     * poDate is retained only as fallback for
     * old documents where createdAt is missing.
     */

    const query = {
      isActive: {
        $ne: false,
      },

      $or: [
        {
          createdAt: {
            $gte:
              period.fromDate,

            $lte:
              period.toDate,
          },
        },

        {
          createdAt: {
            $exists: false,
          },

          poDate: {
            $gte:
              period.fromDate,

            $lte:
              period.toDate,
          },
        },

        {
          createdAt: null,

          poDate: {
            $gte:
              period.fromDate,

            $lte:
              period.toDate,
          },
        },
      ],
    };


    const normalizedType =
      trackingOrderType
        ? normalizeTrackingType(
            trackingOrderType
          )
        : "";

    if (normalizedType) {
      query.trackingOrderType =
        normalizedType;
    }


    if (steelMill) {
      query.$and = [
        {
          $or: [
            {
              steelMill,
            },

            {
              otherSteelMill:
                steelMill,
            },
          ],
        },
      ];
    }


    /*
     * CRITICAL:
     *
     * sizeGradeQuantityRate MUST be selected.
     *
     * This is where historical Sales Orders
     * store grade + quantity + rate.
     */

    const orders =
      await SalesOrder
        .find(query)
        .select({
          _id: 1,

          poDate: 1,
          createdAt: 1,

          trackingOrderType: 1,

          steelMill: 1,
          otherSteelMill: 1,

          companyName: 1,
          customerName: 1,

          poNumber: 1,

          salesOrderNo: 1,
          salesOrderNumber: 1,

          salesPersonName: 1,

          supplyCondition: 1,
          supplyFinish: 1,

          sizeGradeQuantityRate:
            1,

          grade: 1,
          materialGrade: 1,

          totalQuantityKG: 1,
          totalQuantityKg: 1,

          orderQuantityKG: 1,
          orderQuantityKg: 1,

          quantityKG: 1,
          quantityKg: 1,

          totalKG: 1,
          totalKg: 1,

          totalQuantity: 1,
          orderQuantity: 1,
          quantity: 1,

          quantityUnit: 1,
          unit: 1,
        })
        .sort({
          createdAt: -1,
          poDate: -1,
        })
        .lean();


    const total =
      createSummary();

    const house =
      createSummary();

    const steelMillSummary =
      createSummary();

    const millMap =
      new Map();

    const gradeMap =
      new Map();

    const orderDetails =
      [];

    const unresolvedOrders =
      [];


    for (
      const order of
      orders
    ) {
      const orderDate =
        getOrderDate(
          order
        );

      if (!orderDate) {
        continue;
      }


      /*
       * Extra safety.
       */

      if (
        orderDate <
          period.fromDate ||
        orderDate >
          period.toDate
      ) {
        continue;
      }


      const type =
        normalizeTrackingType(
          order
            .trackingOrderType
        );

      /*
       * Management route analysis only
       * contains H.O. and N.H.O.
       */

      if (
        type !== HOUSE_TYPE &&
        type !==
          STEEL_MILL_TYPE
      ) {
        continue;
      }


      const quantityInfo =
        getOrderQuantityInfo(
          order
        );

      const orderKG =
        roundKG(
          quantityInfo.totalKG
        );


      /*
       * IMPORTANT:
       *
       * Count the Sales Order even if
       * its quantity cannot be parsed.
       *
       * Quantity parsing and order count
       * are separate.
       */

      total.orderCount +=
        1;

      if (orderKG > 0) {
        total.orderKG +=
          orderKG;

        total.parsedOrderCount +=
          1;
      } else {
        total.unresolvedOrderCount +=
          1;
      }


      const isHouse =
        type ===
        HOUSE_TYPE;

      const isSteelMill =
        type ===
        STEEL_MILL_TYPE;


      if (isHouse) {
        house.orderCount +=
          1;

        if (orderKG > 0) {
          house.orderKG +=
            orderKG;

          house.parsedOrderCount +=
            1;
        } else {
          house.unresolvedOrderCount +=
            1;
        }
      }


      if (isSteelMill) {
        steelMillSummary
          .orderCount +=
          1;

        if (orderKG > 0) {
          steelMillSummary
            .orderKG +=
            orderKG;

          steelMillSummary
            .parsedOrderCount +=
            1;
        } else {
          steelMillSummary
            .unresolvedOrderCount +=
            1;
        }
      }


      /*
       * Grade filter.
       *
       * Do this after quantity extraction.
       */

      if (grade) {
        const requestedGrade =
          normalizeGrade(
            grade
          );

        const hasGrade =
          Array.from(
            quantityInfo
              .grades
              .keys()
          ).some(
            (
              itemGrade
            ) =>
              normalizeGrade(
                itemGrade
              ) ===
              requestedGrade
          );

        if (!hasGrade) {
          /*
           * Remove the counts already added.
           */

          total.orderCount -=
            1;

          if (orderKG > 0) {
            total.orderKG -=
              orderKG;

            total.parsedOrderCount -=
              1;
          } else {
            total.unresolvedOrderCount -=
              1;
          }

          if (isHouse) {
            house.orderCount -=
              1;

            if (
              orderKG > 0
            ) {
              house.orderKG -=
                orderKG;

              house.parsedOrderCount -=
                1;
            } else {
              house.unresolvedOrderCount -=
                1;
            }
          }

          if (isSteelMill) {
            steelMillSummary
              .orderCount -=
              1;

            if (
              orderKG > 0
            ) {
              steelMillSummary
                .orderKG -=
                orderKG;

              steelMillSummary
                .parsedOrderCount -=
                1;
            } else {
              steelMillSummary
                .unresolvedOrderCount -=
                1;
            }
          }

          continue;
        }
      }


      const detail =
        buildOrderDetail({
          order,
          orderDate,
          orderKG,
          type,
          quantityInfo,
        });


      /* =====================================================
         UNRESOLVED QUANTITY
      ===================================================== */

      if (
        orderKG <= 0
      ) {
        unresolvedOrders.push({
          salesOrderId:
            order._id,

          companyName:
            cleanText(
              order.companyName ||
              order.customerName
            ),

          poNumber:
            cleanText(
              order.poNumber
            ),

          trackingOrderType:
            type,

          material:
            order
              .sizeGradeQuantityRate,

          reason:
            "Order quantity could not be safely parsed.",
        });
      }


      /* =====================================================
         MILL-WISE BUSINESS
      ===================================================== */

      if (isSteelMill) {
        const millName =
          getSteelMillName(
            order
          );

        if (
          !millMap.has(
            millName
          )
        ) {
          millMap.set(
            millName,
            {
              steelMill:
                millName,

              orderCount: 0,

              orderKG: 0,

              parsedOrderCount:
                0,

              unresolvedOrderCount:
                0,

              orders: [],
            }
          );
        }

        const mill =
          millMap.get(
            millName
          );

        mill.orderCount +=
          1;

        if (orderKG > 0) {
          mill.orderKG +=
            orderKG;

          mill.parsedOrderCount +=
            1;
        } else {
          mill.unresolvedOrderCount +=
            1;
        }

        if (
          includeDetails
        ) {
          mill.orders.push(
            detail
          );
        }
      }


      /* =====================================================
         GRADE-WISE DATA
      ===================================================== */

      quantityInfo
        .grades
        .forEach(
          (
            quantityKG,
            gradeName
          ) => {
            const key =
              normalizeGrade(
                gradeName
              ) ||
              "UNIDENTIFIED";

            if (
              !gradeMap.has(
                key
              )
            ) {
              gradeMap.set(
                key,
                {
                  grade:
                    key,

                  orderCount:
                    0,

                  orderKG:
                    0,

                  houseOrderKG:
                    0,

                  steelMillOrderKG:
                    0,

                  orders: [],
                }
              );
            }

            const gradeRow =
              gradeMap.get(
                key
              );

            gradeRow
              .orderCount +=
              1;

            gradeRow
              .orderKG +=
              quantityKG;

            if (isHouse) {
              gradeRow
                .houseOrderKG +=
                quantityKG;
            }

            if (
              isSteelMill
            ) {
              gradeRow
                .steelMillOrderKG +=
                quantityKG;
            }

            if (
              includeDetails
            ) {
              gradeRow
                .orders.push(
                  detail
                );
            }
          }
        );


      if (
        includeDetails
      ) {
        orderDetails.push(
          detail
        );
      }
    }


    /* =====================================================
       ROUND TOTALS
    ===================================================== */

    total.orderKG =
      roundKG(
        total.orderKG
      );

    house.orderKG =
      roundKG(
        house.orderKG
      );

    steelMillSummary
      .orderKG =
      roundKG(
        steelMillSummary
          .orderKG
      );


    /* =====================================================
       MILL ARRAY
    ===================================================== */

    const mills =
      Array.from(
        millMap.values()
      )
        .map(
          (mill) => ({
            ...mill,

            orderKG:
              roundKG(
                mill.orderKG
              ),

            ...(includeDetails
              ? {}
              : {
                  orders:
                    undefined,
                }),
          })
        )
        .sort(
          (a, b) =>
            b.orderKG -
            a.orderKG
        );


    /* =====================================================
       GRADE ARRAY
    ===================================================== */

    const grades =
      Array.from(
        gradeMap.values()
      )
        .map(
          (gradeRow) => ({
            ...gradeRow,

            orderKG:
              roundKG(
                gradeRow
                  .orderKG
              ),

            houseOrderKG:
              roundKG(
                gradeRow
                  .houseOrderKG
              ),

            steelMillOrderKG:
              roundKG(
                gradeRow
                  .steelMillOrderKG
              ),

            ...(includeDetails
              ? {}
              : {
                  orders:
                    undefined,
                }),
          })
        )
        .sort(
          (a, b) =>
            b.orderKG -
            a.orderKG
        );


    return {
      generatedAt:
        new Date(),

      period: {
        selectedMonth:
          period
            .selectedMonth,

        months:
          period.months,

        from:
          period.from,

        to:
          period.to,
      },

      summary: {
        totalOrders: {
          ...total,

          quantityKG:
            total.orderKG,

          orderQuantityKG:
            total.orderKG,
        },

        house: {
          ...house,

          quantityKG:
            house.orderKG,

          orderQuantityKG:
            house.orderKG,
        },

        steelMill: {
          ...steelMillSummary,

          quantityKG:
            steelMillSummary
              .orderKG,

          orderQuantityKG:
            steelMillSummary
              .orderKG,
        },
      },

      mills:
        mills.map(
          (mill) => ({
            steelMill:
              mill.steelMill,

            orderCount:
              mill.orderCount,

            orderKG:
              mill.orderKG,

            quantityKG:
              mill.orderKG,

            parsedOrderCount:
              mill
                .parsedOrderCount,

            unresolvedOrderCount:
              mill
                .unresolvedOrderCount,

            ...(includeDetails
              ? {
                  orders:
                    mill.orders,
                }
              : {}),
          })
        ),

      grades:
        grades.map(
          (gradeRow) => ({
            grade:
              gradeRow.grade,

            orderCount:
              gradeRow
                .orderCount,

            orderKG:
              gradeRow
                .orderKG,

            quantityKG:
              gradeRow
                .orderKG,

            houseOrderKG:
              gradeRow
                .houseOrderKG,

            steelMillOrderKG:
              gradeRow
                .steelMillOrderKG,

            ...(includeDetails
              ? {
                  orders:
                    gradeRow
                      .orders,
                }
              : {}),
          })
        ),

      dataQuality: {
        totalOrders:
          total.orderCount,

        parsedOrders:
          total
            .parsedOrderCount,

        unresolvedOrders:
          total
            .unresolvedOrderCount,
      },

      warnings: {
        unresolvedOrders:
          unresolvedOrders,
      },

      ...(includeDetails
        ? {
            orders:
              orderDetails,
          }
        : {}),
    };
  };


/* =========================================================
   H.O. DETAIL

   Called only when H.O. drill-down opens.
========================================================= */

const getHouseOrderDetails =
  async ({
    month,
    months = 1,
  } = {}) => {
    const analytics =
      await getManagementOrderAnalytics({
        month,
        months,

        trackingOrderType:
          HOUSE_TYPE,

        includeDetails:
          true,
      });

    return {
      generatedAt:
        analytics.generatedAt,

      period:
        analytics.period,

      summary:
        analytics.summary
          .house,

      grades:
        analytics.grades,

      orders:
        analytics.orders ||
        [],

      dataQuality:
        analytics
          .dataQuality,

      warnings:
        analytics.warnings,
    };
  };


/* =========================================================
   STEEL MILL SUMMARY DETAIL

   Called only when Steel Mill drill-down opens.
========================================================= */

const getSteelMillAnalysis =
  async ({
    month,
    months = 1,
  } = {}) => {
    const analytics =
      await getManagementOrderAnalytics({
        month,
        months,

        trackingOrderType:
          STEEL_MILL_TYPE,

        includeDetails:
          true,
      });

    return {
      generatedAt:
        analytics.generatedAt,

      period:
        analytics.period,

      summary:
        analytics.summary
          .steelMill,

      mills:
        analytics.mills,

      grades:
        analytics.grades,

      orders:
        analytics.orders ||
        [],

      dataQuality:
        analytics
          .dataQuality,

      warnings:
        analytics.warnings,
    };
  };


/* =========================================================
   INDIVIDUAL MILL DETAIL
========================================================= */

const getSteelMillOrderDetails =
  async ({
    month,
    months = 1,
    steelMill,
  } = {}) => {
    if (!steelMill) {
      throw new Error(
        "steelMill is required."
      );
    }

    const analytics =
      await getManagementOrderAnalytics({
        month,
        months,

        trackingOrderType:
          STEEL_MILL_TYPE,

        steelMill,

        includeDetails:
          true,
      });

    return {
      generatedAt:
        analytics.generatedAt,

      period:
        analytics.period,

      steelMill,

      summary:
        analytics.summary
          .steelMill,

      grades:
        analytics.grades,

      orders:
        analytics.orders ||
        [],

      dataQuality:
        analytics
          .dataQuality,

      warnings:
        analytics.warnings,
    };
  };


/* =========================================================
   GRADE DETAIL
========================================================= */

const getGradeOrderDetails =
  async ({
    month,
    months = 1,
    grade,
  } = {}) => {
    if (!grade) {
      throw new Error(
        "grade is required."
      );
    }

    const analytics =
      await getManagementOrderAnalytics({
        month,
        months,
        grade,

        includeDetails:
          true,
      });

    const gradeData =
      analytics.grades.find(
        (item) =>
          normalizeGrade(
            item.grade
          ) ===
          normalizeGrade(
            grade
          )
      );

    return {
      generatedAt:
        analytics.generatedAt,

      period:
        analytics.period,

      grade,

      summary:
        gradeData || {
          grade,

          orderCount: 0,

          orderKG: 0,

          quantityKG: 0,

          houseOrderKG: 0,

          steelMillOrderKG:
            0,
        },

      orders:
        analytics.orders ||
        [],
    };
  };


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getManagementOrderAnalytics,

  getHouseOrderDetails,

  getSteelMillAnalysis,

  getSteelMillOrderDetails,

  getGradeOrderDetails,

  buildPeriod,

  getOrderQuantityInfo,

  parseQuantityToKG,

  extractSalesOrderItems,
};