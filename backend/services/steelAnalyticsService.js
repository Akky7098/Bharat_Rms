// backend/services/steelAnalyticsService.js

const SalesOrder = require("../model/salesOrderModel");
const Dispatch = require("../model/dispatchModel");

const OrderTracking = require("../model/OrderTracking");

/* =========================================================
   CONSTANTS
========================================================= */

const HOUSE_TYPE = "H.O.";
const STEEL_MILL_TYPE = "N.H.O.";

const PERIODS = {
  ONE_MONTH: 1,
  THREE_MONTHS: 3,
  SIX_MONTHS: 6,
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeGrade = (value) =>
  cleanText(value).toUpperCase();

const toNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(
    String(value).replace(/,/g, "")
  );

  return Number.isFinite(number)
    ? number
    : 0;
};

const roundKG = (value) =>
  Number(toNumber(value).toFixed(3));

const safeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const startOfDay = (value) => {
  const date = safeDate(value);

  if (!date) return null;

  date.setHours(0, 0, 0, 0);

  return date;
};

const endOfDay = (value) => {
  const date = safeDate(value);

  if (!date) return null;

  date.setHours(23, 59, 59, 999);

  return date;
};

const formatDateOnly = (value) => {
  const date = safeDate(value);

  if (!date) return null;

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/* =========================================================
   TRACKING TYPE
========================================================= */

const normalizeTrackingType = (value) => {
  const text = cleanText(value)
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

const isValidTrackingType = (value) => {
  const type =
    normalizeTrackingType(value);

  return (
    type === HOUSE_TYPE ||
    type === STEEL_MILL_TYPE
  );
};

/* =========================================================
   PERIOD
========================================================= */

/*
 * Management Analysis now works like a bank statement:
 *
 * 1 Month
 * 3 Months
 * 6 Months
 *
 * Example:
 *
 * Selected month = September 2026
 *
 * 1 month:
 * 01-Sep-2026 -> 30-Sep-2026
 *
 * 3 months:
 * 01-Jul-2026 -> 30-Sep-2026
 *
 * 6 months:
 * 01-Apr-2026 -> 30-Sep-2026
 */

const normalizeMonths = (value) => {
  const months = Number(value);

  if ([1, 3, 6].includes(months)) {
    return months;
  }

  return 1;
};

const parseSelectedMonth = (month) => {
  if (
    typeof month === "string" &&
    /^\d{4}-\d{2}$/.test(month)
  ) {
    const [year, monthNumber] =
      month.split("-").map(Number);

    if (
      year >= 2000 &&
      monthNumber >= 1 &&
      monthNumber <= 12
    ) {
      return {
        year,
        monthIndex:
          monthNumber - 1,
      };
    }
  }

  const now = new Date();

  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  };
};

const buildPeriod = ({
  month,
  months = 1,
} = {}) => {
  const selectedMonths =
    normalizeMonths(months);

  const {
    year,
    monthIndex,
  } = parseSelectedMonth(month);

  const toDate = new Date(
    year,
    monthIndex + 1,
    0,
    23,
    59,
    59,
    999
  );

  const fromDate = new Date(
    year,
    monthIndex -
      selectedMonths +
      1,
    1,
    0,
    0,
    0,
    0
  );

  return {
    months: selectedMonths,

    month:
      `${year}-${String(
        monthIndex + 1
      ).padStart(2, "0")}`,

    fromDate,
    toDate,

    from:
      formatDateOnly(fromDate),

    to:
      formatDateOnly(toDate),

    label:
      selectedMonths === 1
        ? "1 Month"
        : `${selectedMonths} Months`,
  };
};

const isDateInPeriod = (
  value,
  period
) => {
  const date = safeDate(value);

  if (!date) return false;

  return (
    date >= period.fromDate &&
    date <= period.toDate
  );
};

const isDateOnOrBefore = (
  value,
  endDate
) => {
  const date = safeDate(value);

  if (!date) return false;

  return date <= endDate;
};

/* =========================================================
   ORDER BOOKING DATE
========================================================= */

/*
 * IMPORTANT
 *
 * We want "how many orders did we TAKE?"
 *
 * Therefore createdAt is primary.
 *
 * poDate is NOT used as the primary
 * analytics booking date because an
 * old customer PO may be entered into
 * RMS in a later month.
 *
 * This is important for matching the
 * Sales Order count shown in RMS.
 */

const getOrderBookingDate = (
  salesOrder
) =>
  safeDate(
    salesOrder?.createdAt ||
      salesOrder?.poDate
  );

/* =========================================================
   STEEL MILL NAME
========================================================= */

const getSteelMillName = (
  salesOrder
) => {
  const type =
    normalizeTrackingType(
      salesOrder?.trackingOrderType
    );

  if (
    type !== STEEL_MILL_TYPE
  ) {
    return "";
  }

  const steelMill =
    cleanText(
      salesOrder?.steelMill
    );

  if (
    steelMill.toLowerCase() ===
    "others"
  ) {
    return (
      cleanText(
        salesOrder
          ?.otherSteelMill
      ) ||
      "Others"
    );
  }

  return (
    steelMill ||
    "Not Specified"
  );
};

/* =========================================================
   REMOVE RATE FROM MATERIAL STRING
========================================================= */

const removeRatePart = (value) => {
  let text =
    String(value || "");

  /*
   * Remove:
   *
   * @ 280/kg
   * @280/KG
   * @ Rs. 280/KG
   */

  text = text.replace(
    /@\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
    ""
  );

  /*
   * Remove:
   *
   * RATE: 280/KG
   */

  text = text.replace(
    /\bRATE\s*[:=-]?\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
    ""
  );

  return text.trim();
};

/* =========================================================
   PIECE COUNT
========================================================= */

const extractPieceCount = (value) => {
  const text =
    String(value || "")
      .replace(/,/g, "")
      .trim();

  if (!text) return null;

  const qtyMatch =
    text.match(
      /\b(?:QTY|QUANTITY)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:NOS?|PCS?|PIECES?)\b/i
    );

  if (qtyMatch) {
    const pieces =
      Number(qtyMatch[1]);

    if (
      Number.isFinite(pieces) &&
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
      Number(directMatch[1]);

    if (
      Number.isFinite(pieces) &&
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

const RECTANGULAR_FACTOR =
  0.00000785;

const ROUND_FACTOR =
  0.000006165;

const parseDimensionalWeightKG = (
  value
) => {
  const original =
    String(value || "");

  const text =
    removeRatePart(original)
      .replace(/,/g, "")
      .replace(/[×*]/g, "X")
      .replace(/\s+/g, " ")
      .trim();

  if (!text) return null;

  const pieces =
    extractPieceCount(text);

  /*
   * Never assume 1 piece.
   */

  if (
    pieces === null ||
    pieces <= 0
  ) {
    return null;
  }

  /* -------------------------
     ROUND
  ------------------------- */

  const roundMatch =
    text.match(
      /\b(?:DIA|DIAMETER|Ø)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i
    );

  if (roundMatch) {
    const diameterMM =
      Number(roundMatch[1]);

    const lengthMM =
      Number(roundMatch[2]);

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
          roundKG(totalKG),

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

  /* -------------------------
     RECTANGULAR / FLAT
  ------------------------- */

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
          roundKG(totalKG),

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

  /* -------------------------
     SQUARE / RCS
  ------------------------- */

  const squareMatch =
    text.match(
      /\b(?:RCS|SQ|SQUARE)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i
    );

  if (squareMatch) {
    const sideMM =
      Number(squareMatch[1]);

    const lengthMM =
      Number(squareMatch[2]);

    if (
      Number.isFinite(sideMM) &&
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
          roundKG(totalKG),

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
   QUANTITY PARSER - OUTPUT ALWAYS KG
========================================================= */

/*
 * Priority:
 *
 * 1. Explicit MT -> convert to KG
 * 2. Explicit KG
 * 3. Dimensions -> calculate KG
 * 4. Unresolved -> null
 *
 * IMPORTANT:
 * Quantity parser DOES NOT control
 * whether an order is counted.
 */

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
    removeRatePart(original)
      .replace(/,/g, "")
      .trim();

  if (!quantityText) {
    return null;
  }

  /* -------------------------
     EXPLICIT MT
  ------------------------- */

  const mtPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:M\.?\s*T\.?|MTS?)\b/i,

    /(\d+(?:\.\d+)?)\s*(?:METRIC\s+TON(?:NE)?S?|TON(?:NE)?S?)\b/i,
  ];

  for (
    const regex of mtPatterns
  ) {
    const match =
      quantityText.match(
        regex
      );

    if (!match) continue;

    const quantityMT =
      Number(match[1]);

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
          quantityMT * 1000
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

  /* -------------------------
     EXPLICIT KG
  ------------------------- */

  const kgMatch =
    quantityText.match(
      /(\d+(?:\.\d+)?)\s*(?:KG|KGS|KILOGRAM|KILOGRAMS)\b/i
    );

  if (kgMatch) {
    const quantityKG =
      Number(kgMatch[1]);

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

  /* -------------------------
     DIMENSIONAL
  ------------------------- */

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

  if (!text) return "";

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

  if (!firstToken?.[1]) {
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

  return rejected.has(candidate)
    ? ""
    : candidate;
};

/* =========================================================
   EXTRACT MATERIAL ITEMS
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

  /* -------------------------
     STRUCTURED ARRAY
  ------------------------- */

  if (Array.isArray(raw)) {
    return raw.map(
      (item, index) => {
        const grade =
          normalizeGrade(
            item?.grade
          );

        let quantityKG = null;

        const unit =
          cleanText(
            item?.unit
          ).toUpperCase();

        const quantity =
          toNumber(
            item?.quantity
          );

        if (
          quantity > 0 &&
          (
            unit === "KG" ||
            unit === "KGS"
          )
        ) {
          quantityKG =
            roundKG(quantity);
        }

        if (
          quantity > 0 &&
          (
            unit === "MT" ||
            unit === "MTS"
          )
        ) {
          quantityKG =
            roundKG(
              quantity * 1000
            );
        }

        return {
          index,

          grade:
            grade ||
            "UNIDENTIFIED",

          original:
            item,

          parsed:
            quantityKG !== null,

          quantityKG,

          quantitySource:
            quantityKG !== null
              ? "STRUCTURED"
              : "UNRESOLVED",
        };
      }
    );
  }

  /* -------------------------
     LEGACY TEXT
  ------------------------- */

  const rows =
    String(raw)
      .split(/\r?\n|;/)
      .map(
        (row) =>
          row.trim()
      )
      .filter(Boolean);

  return rows.map(
    (row, index) => {
      const parsed =
        parseQuantityToKG(row);

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
            ? parsed.quantityKG
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
            ? parsed.dimensions
            : null,
      };
    }
  );
};

/* =========================================================
   ORDER QUANTITY
========================================================= */

const getOrderQuantityInfo = (
  salesOrder
) => {
  const items =
    extractSalesOrderItems(
      salesOrder
    );

  let totalKG = 0;

  let parsedItemCount = 0;

  const grades =
    new Map();

  const unparsedItems = [];

  items.forEach(
    (item) => {
      if (
        !item.parsed ||
        item.quantityKG === null
      ) {
        unparsedItems.push(
          item
        );

        /*
         * IMPORTANT:
         *
         * Do NOT remove the Sales Order.
         *
         * Order count and quantity parsing
         * are completely separate.
         */

        return;
      }

      const quantityKG =
        toNumber(
          item.quantityKG
        );

      totalKG += quantityKG;

      parsedItemCount += 1;

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

  return {
    items,

    totalKG:
      roundKG(totalKG),

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
   DISPATCH HELPERS
========================================================= */

const getTrackingDispatchTargetDate = (
  tracking
) => {
  if (!tracking) {
    return null;
  }

  /*
   * PRIMARY SOURCE
   *
   * Order Tracking service calculates this
   * from:
   *
   * Sales Order approval date
   *          +
   * process-specific ready_for_dispatch day
   *
   * Examples:
   *
   * AS_ROLLED       -> approval + 30 days
   * AS_FORGED       -> approval + 30 days
   * ROLLED ANN/NORM -> approval + 39 days
   * FORGED ANN/NORM -> approval + 45 days
   * ROLLED Q&T      -> approval + 52 days
   * FORGED Q&T      -> approval + 58 days
   *
   * Therefore analytics MUST NOT calculate
   * target month from PO date / createdAt.
   */

  const estimatedReadyDate =
    safeDate(
      tracking
        ?.estimatedReadyDate
    );

  if (estimatedReadyDate) {
    return estimatedReadyDate;
  }

  /*
   * FALLBACK
   *
   * If summary estimatedReadyDate is missing,
   * use the actual ready_for_dispatch milestone.
   */

  const milestones =
    Array.isArray(
      tracking?.milestones
    )
      ? tracking.milestones
      : [];

  const readyMilestone =
    milestones.find(
      (milestone) =>
        cleanText(
          milestone?.code
        ).toLowerCase() ===
        "ready_for_dispatch"
    );

  if (!readyMilestone) {
    return null;
  }

  /*
   * Prefer revised/current estimated date.
   *
   * originalEstimatedDate is only fallback.
   */

  return safeDate(
    readyMilestone
      ?.estimatedDate ||
      readyMilestone
        ?.originalEstimatedDate
  );
};


const getDispatchDate = (
  dispatch
) =>
  safeDate(
    dispatch?.dispatchDate ||
      dispatch?.createdAt
  );

const getDispatchQuantityKG = (
  dispatch
) =>
  roundKG(
    dispatch?.dispatchQty
  );

/* =========================================================
   EMPTY SUMMARY
========================================================= */

const createSummary = () => ({
  orderCount: 0,

  parsedOrderCount: 0,

  unresolvedOrderCount: 0,

  orderTakenKG: 0,

  /*
   * DISPATCH PLAN
   *
   * Quantity whose Order Tracking
   * estimatedReadyDate /
   * ready_for_dispatch date falls
   * inside the selected period.
   */

  dispatchTargetKG: 0,

  totalDispatchKG: 0,

  /*
   * Target quantity still pending
   * against the selected period's
   * dispatch plan.
   */

  targetPendingKG: 0,

  dispatchLeftKG: 0,

  /*
   * Separate informational metric.
   *
   * This includes every dispatch whose
   * dispatch date falls in the selected
   * period, including older orders.
   */

  allDispatchInPeriodKG: 0,
});



/* =========================================================
   GRADE BUCKET
========================================================= */

const getGradeBucket = (
  map,
  grade
) => {
  const key =
    normalizeGrade(
      grade ||
      "UNIDENTIFIED"
    ) ||
    "UNIDENTIFIED";

  if (!map.has(key)) {
    map.set(key, {
      grade: key,

      orderIds:
        new Set(),

      houseOrderIds:
        new Set(),

      steelMillOrderIds:
        new Set(),

      orderTakenKG: 0,

      dispatchedKG: 0,

      dispatchLeftKG: 0,

      houseOrderKG: 0,

      steelMillOrderKG: 0,

      houseDispatchKG: 0,

      steelMillDispatchKG: 0,

      houseDispatchLeftKG: 0,

      steelMillDispatchLeftKG: 0,
    });
  }

  return map.get(key);
};

/* =========================================================
   ALLOCATE DISPATCH TO GRADES
========================================================= */

/*
 * Dispatch records are Sales-Order level.
 *
 * If an order contains multiple grades,
 * dispatch cannot be assigned exactly to
 * a grade unless Dispatch itself stores
 * grade/item details.
 *
 * Therefore grade dispatch is allocated
 * proportionally to ordered grade KG.
 */

const allocateDispatchToGrades = ({
  quantityInfo,
  dispatchKG,
}) => {
  const result = [];

  const totalKG =
    toNumber(
      quantityInfo.totalKG
    );

  if (
    totalKG <= 0 ||
    dispatchKG <= 0
  ) {
    return result;
  }

  quantityInfo
    .grades
    .forEach(
      (
        gradeKG,
        grade
      ) => {
        const ratio =
          toNumber(gradeKG) /
          totalKG;

        result.push({
          grade,

          dispatchKG:
            roundKG(
              dispatchKG *
                ratio
            ),
        });
      }
    );

  return result;
};

/* =========================================================
   MAIN ANALYTICS
========================================================= */

const getSteelAnalytics = async ({
  month,
  months = 1,
  trackingOrderType,
  steelMill,
  grade,
} = {}) => {
  const period =
    buildPeriod({
      month,
      months,
    });

  const requestedType =
    trackingOrderType
      ? normalizeTrackingType(
          trackingOrderType
        )
      : "";

  /*
   * IMPORTANT:
   *
   * Do NOT date-filter Sales Orders
   * in MongoDB.
   *
   * We need:
   *
   * 1. Orders TAKEN in selected period
   * 2. Orders whose TRACKING READY DATE
   *    falls in selected period
   * 3. Historical dispatches against
   *    those orders
   */

  const salesOrderQuery = {
    isActive: {
      $ne: false,
    },
  };

  if (requestedType) {
    salesOrderQuery.trackingOrderType =
      requestedType;
  }

  if (steelMill) {
    salesOrderQuery.$or = [
      {
        steelMill,
      },
      {
        otherSteelMill:
          steelMill,
      },
    ];
  }

  /* =====================================================
     LOAD SALES ORDERS
  ===================================================== */

  const allSalesOrders =
    await SalesOrder
      .find(
        salesOrderQuery
      )
      .lean();

  /* =====================================================
     LOAD ORDER TRACKING
  ===================================================== */

  const allSalesOrderIds =
    allSalesOrders.map(
      (order) => order._id
    );

 const orderTrackings =
  allSalesOrderIds.length
    ? await OrderTracking
        .find({
          salesOrderId: {
            $in:
              allSalesOrderIds,
          },

          /*
           * IMPORTANT:
           *
           * Never use an old/deactivated
           * tracking record for Management
           * Analysis dispatch planning.
           */
          isActive: {
            $ne: false,
          },
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean()
    : [];

const trackingMap =
  new Map();

orderTrackings.forEach(
  (tracking) => {
    const salesOrderId =
      tracking?.salesOrderId;

    if (!salesOrderId) {
      return;
    }

    const key =
      String(
        salesOrderId
      );

    /*
     * Query is sorted newest first.
     *
     * Keep the first/current tracking
     * record for this Sales Order.
     */
    if (
      !trackingMap.has(key)
    ) {
      trackingMap.set(
        key,
        tracking
      );
    }
  }
);

  /* =====================================================
     CLASSIFY H.O. / N.H.O.
  ===================================================== */

  const classifiedOrders = [];

  const unclassifiedOrders = [];

  allSalesOrders.forEach(
    (order) => {
      const type =
        normalizeTrackingType(
          order
            ?.trackingOrderType
        );

      if (
        !isValidTrackingType(
          type
        )
      ) {
        unclassifiedOrders.push(
          order
        );

        return;
      }

      if (
        requestedType &&
        type !== requestedType
      ) {
        return;
      }

      classifiedOrders.push({
        ...order,

        trackingOrderType:
          type,
      });
    }
  );

  /* =====================================================
     ORDER TAKEN COHORT

     Order Taken / Order Count use
     Sales Order booking date.

     createdAt is primary through
     getOrderBookingDate().
  ===================================================== */

  const periodOrders =
    classifiedOrders.filter(
      (order) =>
        isDateInPeriod(
          getOrderBookingDate(
            order
          ),
          period
        )
    );

  /* =====================================================
     DISPATCH PLAN COHORT

     CRITICAL:

     This does NOT use:
     - createdAt
     - PO date
     - Sales Order date

     It uses Order Tracking:
     estimatedReadyDate

     fallback:
     ready_for_dispatch milestone
  ===================================================== */

  const dispatchTargetOrders =
  classifiedOrders.filter(
    (order) => {
      const tracking =
        trackingMap.get(
          String(
            order._id
          )
        );

      const targetDate =
        getTrackingDispatchTargetDate(
          tracking
        );

      /*
       * No tracking ETA =
       * no artificial Plan.
       *
       * DO NOT fallback to:
       *
       * order.createdAt
       * order.poDate
       * approval date
       *
       * Analytics only consumes the
       * calculated Order Tracking ETA.
       */
      if (!targetDate) {
        return false;
      }

      return isDateInPeriod(
        targetDate,
        period
      );
    }
  );

  /* =====================================================
     TARGET QUANTITY MAP
  ===================================================== */

  const dispatchTargetMap =
    new Map();

  dispatchTargetOrders.forEach(
    (salesOrder) => {
      const quantityInfo =
        getOrderQuantityInfo(
          salesOrder
        );

      dispatchTargetMap.set(
        String(
          salesOrder._id
        ),
        roundKG(
          quantityInfo.totalKG
        )
      );
    }
  );

  /* =====================================================
     ORDER IDS REQUIRED FOR DISPATCH HISTORY

     IMPORTANT:

     We need dispatch history for BOTH:

     1. Orders taken in period
     2. Orders planned in period

     A target order may have been booked
     in an older month.
  ===================================================== */

  const relevantOrderIdMap =
    new Map();

  periodOrders.forEach(
    (order) => {
      relevantOrderIdMap.set(
        String(order._id),
        order._id
      );
    }
  );

  dispatchTargetOrders.forEach(
    (order) => {
      relevantOrderIdMap.set(
        String(order._id),
        order._id
      );
    }
  );

  const relevantOrderIds =
    Array.from(
      relevantOrderIdMap.values()
    );

  /* =====================================================
     LOAD DISPATCH HISTORY FOR RELEVANT ORDERS
  ===================================================== */

  const cohortDispatches =
    relevantOrderIds.length
      ? await Dispatch
          .find({
            salesOrderId: {
              $in:
                relevantOrderIds,
            },
          })
          .lean()
      : [];

  /*
   * Physical dispatch occurring inside
   * selected period.
   *
   * This can contain dispatch against
   * older Sales Orders.
   */

  const allPeriodDispatches =
    await Dispatch
      .find({
        dispatchDate: {
          $gte:
            period.fromDate,

          $lte:
            period.toDate,
        },
      })
      .lean();

  /* =====================================================
     DISPATCH MAP
  ===================================================== */

  const dispatchMap =
    new Map();

  cohortDispatches.forEach(
    (dispatch) => {
      if (
        !dispatch
          ?.salesOrderId
      ) {
        return;
      }

      const key =
        String(
          dispatch
            .salesOrderId
        );

      if (
        !dispatchMap.has(key)
      ) {
        dispatchMap.set(
          key,
          []
        );
      }

      dispatchMap
        .get(key)
        .push(dispatch);
    }
  );

  /* =====================================================
     SUMMARY BUCKETS
  ===================================================== */

  const house =
    createSummary();

  const steelMillSummary =
    createSummary();

  const combined =
    createSummary();

  const gradeMap =
    new Map();

  const millMap =
    new Map();

  const orders = [];

  const unparsedOrders = [];

  /* =====================================================
     PHYSICAL DISPATCH DURING PERIOD
  ===================================================== */

  const allDispatchInPeriodKG =
    roundKG(
      allPeriodDispatches.reduce(
        (
          sum,
          dispatch
        ) =>
          sum +
          getDispatchQuantityKG(
            dispatch
          ),
        0
      )
    );

  combined
    .allDispatchInPeriodKG =
    allDispatchInPeriodKG;

  /* =====================================================
     HELPER:
     DISPATCH AGAINST ORDER THROUGH PERIOD END
  ===================================================== */

  const getOrderDispatchThroughPeriodKG =
    (salesOrderId) => {
      const orderDispatches =
        dispatchMap.get(
          String(
            salesOrderId
          )
        ) || [];

      return roundKG(
        orderDispatches
          .filter(
            (dispatch) =>
              isDateOnOrBefore(
                getDispatchDate(
                  dispatch
                ),
                period.toDate
              )
          )
          .reduce(
            (
              sum,
              dispatch
            ) =>
              sum +
              getDispatchQuantityKG(
                dispatch
              ),
            0
          )
      );
    };

  /* =====================================================
     ORDER TAKEN ANALYSIS

     ONLY orders booked inside selected
     period contribute to:

     - order count
     - order taken
     - grade order demand
     - mill order demand
     - dispatch left against taken orders
  ===================================================== */

  periodOrders.forEach(
    (salesOrder) => {
      const id =
        String(
          salesOrder._id
        );

      const type =
        normalizeTrackingType(
          salesOrder
            .trackingOrderType
        );

      const quantityInfo =
        getOrderQuantityInfo(
          salesOrder
        );

      const orderedKG =
        roundKG(
          quantityInfo.totalKG
        );

      const orderDispatches =
        dispatchMap.get(id) ||
        [];

      const dispatchedKG =
        getOrderDispatchThroughPeriodKG(
          salesOrder._id
        );

      const dispatchLeftKG =
        roundKG(
          Math.max(
            0,
            orderedKG -
              dispatchedKG
          )
        );

      const dispatchTargetKG =
        roundKG(
          dispatchTargetMap.get(
            id
          ) || 0
        );

      const targetPendingKG =
        roundKG(
          Math.max(
            0,
            dispatchTargetKG -
              Math.min(
                dispatchTargetKG,
                dispatchedKG
              )
          )
        );

      const tracking =
        trackingMap.get(
          id
        );

      const dispatchTargetDate =
        getTrackingDispatchTargetDate(
          tracking
        );

      const fullyParsed =
        quantityInfo
          .fullyParsed;

      if (!fullyParsed) {
        unparsedOrders.push({
          salesOrderId:
            salesOrder._id,

          salesOrderNo:
            salesOrder
              .salesOrderNo ||
            "",

          poNumber:
            salesOrder
              .poNumber ||
            "",

          companyName:
            salesOrder
              .companyName ||
            "",

          trackingOrderType:
            type,

          material:
            salesOrder
              .sizeGradeQuantityRate,

          parsedKG:
            orderedKG,

          unresolvedItems:
            quantityInfo
              .unparsedItems,
        });
      }

      const bucket =
        type === HOUSE_TYPE
          ? house
          : steelMillSummary;

      /*
       * COUNT ALWAYS.
       *
       * Quantity parser failure must
       * never remove an order count.
       */

      bucket.orderCount += 1;

      combined.orderCount += 1;

      if (fullyParsed) {
        bucket
          .parsedOrderCount +=
          1;

        combined
          .parsedOrderCount +=
          1;
      } else {
        bucket
          .unresolvedOrderCount +=
          1;

        combined
          .unresolvedOrderCount +=
          1;
      }

      bucket.orderTakenKG +=
        orderedKG;

      bucket.totalDispatchKG +=
        dispatchedKG;

      bucket.dispatchLeftKG +=
        dispatchLeftKG;

      combined.orderTakenKG +=
        orderedKG;

      combined.totalDispatchKG +=
        dispatchedKG;

      combined.dispatchLeftKG +=
        dispatchLeftKG;

      /* -------------------------
         GRADE ANALYSIS
      ------------------------- */

      quantityInfo
        .grades
        .forEach(
          (
            gradeKG,
            gradeName
          ) => {
            const gradeBucket =
              getGradeBucket(
                gradeMap,
                gradeName
              );

            gradeBucket
              .orderIds
              .add(id);

            gradeBucket
              .orderTakenKG +=
              gradeKG;

            if (
              type ===
              HOUSE_TYPE
            ) {
              gradeBucket
                .houseOrderIds
                .add(id);

              gradeBucket
                .houseOrderKG +=
                gradeKG;
            } else {
              gradeBucket
                .steelMillOrderIds
                .add(id);

              gradeBucket
                .steelMillOrderKG +=
                gradeKG;
            }
          }
        );

      const gradeDispatchAllocation =
        allocateDispatchToGrades({
          quantityInfo,

          dispatchKG:
            dispatchedKG,
        });

      gradeDispatchAllocation
        .forEach(
          ({
            grade,
            dispatchKG,
          }) => {
            const gradeBucket =
              getGradeBucket(
                gradeMap,
                grade
              );

            gradeBucket
              .dispatchedKG +=
              dispatchKG;

            if (
              type ===
              HOUSE_TYPE
            ) {
              gradeBucket
                .houseDispatchKG +=
                dispatchKG;
            } else {
              gradeBucket
                .steelMillDispatchKG +=
                dispatchKG;
            }
          }
        );

      /* -------------------------
         STEEL MILL ANALYSIS
      ------------------------- */

      if (
        type ===
        STEEL_MILL_TYPE
      ) {
        const millName =
          getSteelMillName(
            salesOrder
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

              orderIds:
                new Set(),

              orderTakenKG: 0,

              totalDispatchKG:
                0,

              dispatchLeftKG:
                0,
            }
          );
        }

        const mill =
          millMap.get(
            millName
          );

        mill.orderIds.add(
          id
        );

        mill.orderTakenKG +=
          orderedKG;

        mill.totalDispatchKG +=
          dispatchedKG;

        mill.dispatchLeftKG +=
          dispatchLeftKG;
      }

      /* -------------------------
         ORDER DETAIL
      ------------------------- */

      orders.push({
        salesOrderId:
          salesOrder._id,

        salesOrderNo:
          salesOrder
            .salesOrderNo ||
          "",

        poNumber:
          salesOrder
            .poNumber ||
          "",

        companyName:
          salesOrder
            .companyName ||
          "",

        salesPersonName:
          salesOrder
            .salesPersonName ||
          "",

        bookingDate:
          getOrderBookingDate(
            salesOrder
          ),

        poDate:
          salesOrder
            .poDate ||
          null,

        trackingOrderType:
          type,

        steelMill:
          getSteelMillName(
            salesOrder
          ),

        /*
         * Explicit flags for frontend.
         */

        isNewOrderInPeriod:
          true,

        isDispatchTargetInPeriod:
          dispatchTargetKG >
          0,

        orderTakenKG:
          orderedKG,

        dispatchTargetKG,

        dispatchTargetDate:
          dispatchTargetDate ||
          null,

        totalDispatchKG:
          dispatchedKG,

        targetPendingKG,

        dispatchLeftKG,

        quantityFullyParsed:
          fullyParsed,

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
            })
          ),

        material:
          salesOrder
            .sizeGradeQuantityRate,

        dispatches:
          orderDispatches.map(
            (dispatch) => ({
              dispatchId:
                dispatch._id,

              dispatchDate:
                getDispatchDate(
                  dispatch
                ),

              dispatchQtyKG:
                getDispatchQuantityKG(
                  dispatch
                ),

              invoiceNumber:
                dispatch
                  .invoiceNumber ||
                "",

              status:
                dispatch
                  .dispatchCompletionStatus ||
                "",
            })
          ),
      });
    }
  );

  /* =====================================================
     DISPATCH PLAN SUMMARY

     THIS IS THE IMPORTANT NEW LOGIC.

     Plan is based ONLY on Order Tracking
     ready/estimated date.

     It is completely independent of
     Sales Order booking month.
  ===================================================== */

  dispatchTargetOrders.forEach(
    (salesOrder) => {
      const id =
        String(
          salesOrder._id
        );

      const type =
        normalizeTrackingType(
          salesOrder
            .trackingOrderType
        );

      const targetKG =
        roundKG(
          dispatchTargetMap.get(
            id
          ) || 0
        );

      if (targetKG <= 0) {
        return;
      }

      const dispatchedKG =
        getOrderDispatchThroughPeriodKG(
          salesOrder._id
        );

      const targetPendingKG =
        roundKG(
          Math.max(
            0,
            targetKG -
              Math.min(
                targetKG,
                dispatchedKG
              )
          )
        );

      combined.dispatchTargetKG +=
        targetKG;

      combined.targetPendingKG +=
        targetPendingKG;

      if (
        type ===
        HOUSE_TYPE
      ) {
        house.dispatchTargetKG +=
          targetKG;

        house.targetPendingKG +=
          targetPendingKG;
      }

      if (
        type ===
        STEEL_MILL_TYPE
      ) {
        steelMillSummary
          .dispatchTargetKG +=
          targetKG;

        steelMillSummary
          .targetPendingKG +=
          targetPendingKG;
      }
    }
  );

  /* =====================================================
     ADD TARGET-ONLY ORDERS TO DRILL-DOWN

     Example:

     Order booked in August
     Ready in October

     It must NOT increase October
     Order Taken.

     But it MUST appear when user
     clicks October Dispatch Plan.
  ===================================================== */

  const periodOrderIdSet =
    new Set(
      periodOrders.map(
        (order) =>
          String(
            order._id
          )
      )
    );

  dispatchTargetOrders.forEach(
    (salesOrder) => {
      const id =
        String(
          salesOrder._id
        );

      /*
       * Already added above because
       * this order was also booked
       * during selected period.
       */

      if (
        periodOrderIdSet.has(
          id
        )
      ) {
        return;
      }

      const type =
        normalizeTrackingType(
          salesOrder
            .trackingOrderType
        );

      const quantityInfo =
        getOrderQuantityInfo(
          salesOrder
        );

      const targetKG =
        roundKG(
          dispatchTargetMap.get(
            id
          ) || 0
        );

      const dispatchedKG =
        getOrderDispatchThroughPeriodKG(
          salesOrder._id
        );

      const targetPendingKG =
        roundKG(
          Math.max(
            0,
            targetKG -
              Math.min(
                targetKG,
                dispatchedKG
              )
          )
        );

      const tracking =
        trackingMap.get(
          id
        );

      const targetDate =
        getTrackingDispatchTargetDate(
          tracking
        );

      const orderDispatches =
        dispatchMap.get(id) ||
        [];

      orders.push({
        salesOrderId:
          salesOrder._id,

        salesOrderNo:
          salesOrder
            .salesOrderNo ||
          "",

        poNumber:
          salesOrder
            .poNumber ||
          "",

        companyName:
          salesOrder
            .companyName ||
          "",

        salesPersonName:
          salesOrder
            .salesPersonName ||
          "",

        bookingDate:
          getOrderBookingDate(
            salesOrder
          ),

        poDate:
          salesOrder
            .poDate ||
          null,

        trackingOrderType:
          type,

        steelMill:
          getSteelMillName(
            salesOrder
          ),

        /*
         * IMPORTANT:
         *
         * This order belongs to Plan,
         * not Order Taken for this
         * selected period.
         */

        isNewOrderInPeriod:
          false,

        isDispatchTargetInPeriod:
          true,

        orderTakenKG: 0,

        dispatchTargetKG:
          targetKG,

        dispatchTargetDate:
          targetDate ||
          null,

        totalDispatchKG:
          dispatchedKG,

        targetPendingKG,

        /*
         * Do not show this older order
         * as selected-period Order Taken
         * balance.
         */

        dispatchLeftKG: 0,

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
            })
          ),

        material:
          salesOrder
            .sizeGradeQuantityRate,

        dispatches:
          orderDispatches.map(
            (dispatch) => ({
              dispatchId:
                dispatch._id,

              dispatchDate:
                getDispatchDate(
                  dispatch
                ),

              dispatchQtyKG:
                getDispatchQuantityKG(
                  dispatch
                ),

              invoiceNumber:
                dispatch
                  .invoiceNumber ||
                "",

              status:
                dispatch
                  .dispatchCompletionStatus ||
                "",
            })
          ),
      });
    }
  );

  /* =====================================================
     FINALIZE SUMMARY
  ===================================================== */

  const finalizeSummary = (
    summary
  ) => ({
    orderCount:
      summary.orderCount,

    parsedOrderCount:
      summary
        .parsedOrderCount,

    unresolvedOrderCount:
      summary
        .unresolvedOrderCount,

    orderTakenKG:
      roundKG(
        summary.orderTakenKG
      ),

    dispatchTargetKG:
      roundKG(
        summary
          .dispatchTargetKG
      ),

    totalDispatchKG:
      roundKG(
        summary
          .totalDispatchKG
      ),

    targetPendingKG:
      roundKG(
        summary
          .targetPendingKG
      ),

    dispatchLeftKG:
      roundKG(
        summary
          .dispatchLeftKG
      ),

    allDispatchInPeriodKG:
      roundKG(
        summary
          .allDispatchInPeriodKG
      ),
  });

  const finalizedHouse =
    finalizeSummary(
      house
    );

  const finalizedSteelMill =
    finalizeSummary(
      steelMillSummary
    );

  const finalizedCombined =
    finalizeSummary(
      combined
    );

  /* =====================================================
     PHYSICAL PERIOD DISPATCH BY H.O/N.H.O.
  ===================================================== */

  const salesOrderTypeMap =
    new Map();

  classifiedOrders.forEach(
    (order) => {
      salesOrderTypeMap.set(
        String(
          order._id
        ),

        normalizeTrackingType(
          order
            .trackingOrderType
        )
      );
    }
  );

  let housePeriodDispatchKG =
    0;

  let steelMillPeriodDispatchKG =
    0;

  allPeriodDispatches.forEach(
    (dispatch) => {
      const type =
        salesOrderTypeMap.get(
          String(
            dispatch
              .salesOrderId
          )
        );

      const qty =
        getDispatchQuantityKG(
          dispatch
        );

      if (
        type === HOUSE_TYPE
      ) {
        housePeriodDispatchKG +=
          qty;
      }

      if (
        type ===
        STEEL_MILL_TYPE
      ) {
        steelMillPeriodDispatchKG +=
          qty;
      }
    }
  );

  finalizedHouse
    .allDispatchInPeriodKG =
    roundKG(
      housePeriodDispatchKG
    );

  finalizedSteelMill
    .allDispatchInPeriodKG =
    roundKG(
      steelMillPeriodDispatchKG
    );

  finalizedCombined
    .allDispatchInPeriodKG =
    roundKG(
      housePeriodDispatchKG +
        steelMillPeriodDispatchKG
    );

  /* =====================================================
     FINALIZE GRADES
  ===================================================== */

  const grades =
    Array.from(
      gradeMap.values()
    )
      .map(
        (item) => {
          const orderTakenKG =
            roundKG(
              item.orderTakenKG
            );

          const dispatchedKG =
            roundKG(
              item.dispatchedKG
            );

          const dispatchLeftKG =
            roundKG(
              Math.max(
                0,
                orderTakenKG -
                  dispatchedKG
              )
            );

          const houseDispatchLeftKG =
            roundKG(
              Math.max(
                0,
                item
                  .houseOrderKG -
                  item
                    .houseDispatchKG
              )
            );

          const steelMillDispatchLeftKG =
            roundKG(
              Math.max(
                0,
                item
                  .steelMillOrderKG -
                  item
                    .steelMillDispatchKG
              )
            );

          return {
            grade:
              item.grade,

            orderCount:
              item
                .orderIds
                .size,

            houseOrderCount:
              item
                .houseOrderIds
                .size,

            steelMillOrderCount:
              item
                .steelMillOrderIds
                .size,

            orderTakenKG,

            totalDispatchKG:
              dispatchedKG,

            dispatchLeftKG,

            house: {
              orderCount:
                item
                  .houseOrderIds
                  .size,

              orderTakenKG:
                roundKG(
                  item
                    .houseOrderKG
                ),

              totalDispatchKG:
                roundKG(
                  item
                    .houseDispatchKG
                ),

              dispatchLeftKG:
                houseDispatchLeftKG,
            },

            steelMill: {
              orderCount:
                item
                  .steelMillOrderIds
                  .size,

              orderTakenKG:
                roundKG(
                  item
                    .steelMillOrderKG
                ),

              totalDispatchKG:
                roundKG(
                  item
                    .steelMillDispatchKG
                ),

              dispatchLeftKG:
                steelMillDispatchLeftKG,
            },
          };
        }
      )
      .filter(
        (item) =>
          !grade ||
          normalizeGrade(
            item.grade
          ) ===
            normalizeGrade(
              grade
            )
      )
      .sort(
        (a, b) =>
          b.orderTakenKG -
          a.orderTakenKG
      );

  /* =====================================================
     FINALIZE MILLS
  ===================================================== */

  const mills =
    Array.from(
      millMap.values()
    )
      .map(
        (item) => ({
          steelMill:
            item.steelMill,

          orderCount:
            item
              .orderIds
              .size,

          orderTakenKG:
            roundKG(
              item
                .orderTakenKG
            ),

          totalDispatchKG:
            roundKG(
              item
                .totalDispatchKG
            ),

          dispatchLeftKG:
            roundKG(
              item
                .dispatchLeftKG
            ),
        })
      )
      .sort(
        (a, b) =>
          b.orderTakenKG -
          a.orderTakenKG
      );

  /* =====================================================
     OPTIONAL GRADE FILTER
  ===================================================== */

  let filteredOrders =
    orders;

  if (grade) {
    const wanted =
      normalizeGrade(
        grade
      );

    filteredOrders =
      orders.filter(
        (order) =>
          order.grades.some(
            (item) =>
              normalizeGrade(
                item.grade
              ) === wanted
          )
      );
  }

  /* =====================================================
     SORT ORDERS
  ===================================================== */

  filteredOrders.sort(
    (a, b) => {
      /*
       * For target-only orders,
       * target date is more useful.
       *
       * Otherwise booking date.
       */

      const dateA =
        safeDate(
          a.dispatchTargetDate ||
            a.bookingDate
        );

      const dateB =
        safeDate(
          b.dispatchTargetDate ||
            b.bookingDate
        );

      return (
        (dateB?.getTime() ||
          0) -
        (dateA?.getTime() ||
          0)
      );
    }
  );

  /* =====================================================
     RETURN
  ===================================================== */

  return {
    generatedAt:
      new Date(),

    period: {
      type:
        period.label,

      months:
        period.months,

      selectedMonth:
        period.month,

      from:
        period.from,

      to:
        period.to,
    },

    filters: {
      month:
        period.month,

      months:
        period.months,

      trackingOrderType:
        requestedType ||
        null,

      steelMill:
        steelMill ||
        null,

      grade:
        grade ||
        null,
    },

    summary: {
      combined:
        finalizedCombined,

      house:
        finalizedHouse,

      steelMill:
        finalizedSteelMill,
    },

    grades,

    mills,

    salesOrders:
      filteredOrders,

    dataQuality: {
      databaseOrdersLoaded:
        allSalesOrders.length,

      classifiedOrderCount:
        classifiedOrders.length,

      selectedPeriodOrderCount:
        periodOrders.length,

      /*
       * Number of orders whose tracking
       * ready date falls inside selected
       * period.
       */

      dispatchTargetOrderCount:
        dispatchTargetOrders.length,

      countedOrders:
        finalizedCombined
          .orderCount,

      houseOrderCount:
        finalizedHouse
          .orderCount,

      steelMillOrderCount:
        finalizedSteelMill
          .orderCount,

      parsedOrderCount:
        finalizedCombined
          .parsedOrderCount,

      unresolvedQuantityOrderCount:
        finalizedCombined
          .unresolvedOrderCount,

      unclassifiedOrderCount:
        unclassifiedOrders
          .length,
    },

    warnings: {
      unparsedOrders,

      unclassifiedOrders:
        unclassifiedOrders.map(
          (order) => ({
            salesOrderId:
              order._id,

            salesOrderNo:
              order
                .salesOrderNo ||
              "",

            poNumber:
              order
                .poNumber ||
              "",

            companyName:
              order
                .companyName ||
              "",

            trackingOrderType:
              order
                .trackingOrderType ||
              "",
          })
        ),
    },
  };
};

/* =========================================================
   SUMMARY
========================================================= */

const getSteelAnalyticsSummary =
  async (
    filters = {}
  ) => {
    const analytics =
      await getSteelAnalytics(
        filters
      );

    return {
      generatedAt:
        analytics
          .generatedAt,

      period:
        analytics.period,

      filters:
        analytics.filters,

      summary:
        analytics.summary,

      grades:
        analytics.grades,

      mills:
        analytics.mills,

      dataQuality:
        analytics
          .dataQuality,

      warnings: {
        unparsedOrderCount:
          analytics
            .warnings
            .unparsedOrders
            .length,

        unclassifiedOrderCount:
          analytics
            .warnings
            .unclassifiedOrders
            .length,
      },
    };
  };

/* =========================================================
   ORDER DRILL DOWN
========================================================= */

const getSteelAnalyticsDrillDown =
  async ({
    metric,
    month,
    months = 1,
    trackingOrderType,
    steelMill,
    grade,
  } = {}) => {
    const analytics =
      await getSteelAnalytics({
        month,
        months,
        trackingOrderType,
        steelMill,
        grade,
      });

    const allowedMetrics = [
      "order_taken",
      "dispatch_target",
      "total_dispatch",
      "target_pending",
      "dispatch_left",
    ];

    if (
      !allowedMetrics.includes(
        metric
      )
    ) {
      throw new Error(
        "Invalid drill-down metric. Use order_taken, dispatch_target, total_dispatch, target_pending or dispatch_left."
      );
    }

    let orders = [
      ...analytics.salesOrders,
    ];

    /* =====================================================
       ORDER TAKEN
    ===================================================== */

    if (
      metric ===
      "order_taken"
    ) {
      orders =
        orders.filter(
          (order) =>
            order
              .isNewOrderInPeriod ===
              true &&
            order
              .orderTakenKG >
              0
        );
    }

    /* =====================================================
       DISPATCH PLAN / TARGET
    ===================================================== */

    if (
      metric ===
      "dispatch_target"
    ) {
      orders =
        orders.filter(
          (order) =>
            order
              .isDispatchTargetInPeriod ===
              true &&
            order
              .dispatchTargetKG >
              0
        );
    }

    /* =====================================================
       DISPATCH AGAINST PERIOD ORDER COHORT
    ===================================================== */

    if (
      metric ===
      "total_dispatch"
    ) {
      orders =
        orders.filter(
          (order) =>
            order
              .isNewOrderInPeriod ===
              true &&
            order
              .totalDispatchKG >
              0
        );
    }

    /* =====================================================
       TARGET PENDING
    ===================================================== */

    if (
      metric ===
      "target_pending"
    ) {
      orders =
        orders.filter(
          (order) =>
            order
              .isDispatchTargetInPeriod ===
              true &&
            order
              .targetPendingKG >
              0
        );
    }

    /* =====================================================
       DISPATCH LEFT AGAINST ORDER TAKEN
    ===================================================== */

    if (
      metric ===
      "dispatch_left"
    ) {
      orders =
        orders.filter(
          (order) =>
            order
              .isNewOrderInPeriod ===
              true &&
            order
              .dispatchLeftKG >
              0
        );
    }

    /* =====================================================
       METRIC QUANTITY
    ===================================================== */

    const getMetricKG = (
      order
    ) => {
      if (
        metric ===
        "order_taken"
      ) {
        return (
          order.orderTakenKG ||
          0
        );
      }

      if (
        metric ===
        "dispatch_target"
      ) {
        return (
          order.dispatchTargetKG ||
          0
        );
      }

      if (
        metric ===
        "total_dispatch"
      ) {
        return (
          order.totalDispatchKG ||
          0
        );
      }

      if (
        metric ===
        "target_pending"
      ) {
        return (
          order.targetPendingKG ||
          0
        );
      }

      return (
        order.dispatchLeftKG ||
        0
      );
    };

    orders.sort(
      (a, b) =>
        getMetricKG(b) -
        getMetricKG(a)
    );

    return {
      generatedAt:
        new Date(),

      metric,

      period:
        analytics.period,

      filters:
        analytics.filters,

      orderCount:
        orders.length,

      totalKG:
        roundKG(
          orders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              getMetricKG(
                order
              ),
            0
          )
        ),

      orders:
        orders.map(
          (order) => ({
            ...order,

            metric,

            metricQuantityKG:
              roundKG(
                getMetricKG(
                  order
                )
              ),
          })
        ),
    };
  };

/* =========================================================
   PDF DATA
========================================================= */

/*
 * Use this endpoint/service result to
 * generate the two-page PDF.
 *
 * It returns:
 *
 * - 1 month
 * - 3 months
 * - 6 months
 *
 * from one selected ending month.
 */

const getSteelAnalyticsPdfData =
  async ({
    month,
  } = {}) => {
    const [
      oneMonth,
      threeMonths,
      sixMonths,
    ] = await Promise.all([
      getSteelAnalytics({
        month,
        months: 1,
      }),

      getSteelAnalytics({
        month,
        months: 3,
      }),

      getSteelAnalytics({
        month,
        months: 6,
      }),
    ]);

    return {
      generatedAt:
        new Date(),

      selectedMonth:
        oneMonth
          .period
          .selectedMonth,

      comparison: [
        {
          label:
            "1 Month",

          period:
            oneMonth.period,

          summary:
            oneMonth.summary,
        },

        {
          label:
            "3 Months",

          period:
            threeMonths
              .period,

          summary:
            threeMonths
              .summary,
        },

        {
          label:
            "6 Months",

          period:
            sixMonths
              .period,

          summary:
            sixMonths
              .summary,
        },
      ],

      /*
       * Page 2 tables can use the
       * selected range.
       *
       * Here 6-month grade data is
       * returned so management sees
       * longer demand/stock behaviour.
       */

      houseGrades:
        sixMonths.grades
          .filter(
            (item) =>
              item.house
                .orderCount >
              0
          )
          .map(
            (item) => ({
              grade:
                item.grade,

              orderCount:
                item.house
                  .orderCount,

              orderTakenKG:
                item.house
                  .orderTakenKG,

              totalDispatchKG:
                item.house
                  .totalDispatchKG,

              dispatchLeftKG:
                item.house
                  .dispatchLeftKG,
            })
          ),

      steelMillGrades:
        sixMonths.grades
          .filter(
            (item) =>
              item.steelMill
                .orderCount >
              0
          )
          .map(
            (item) => ({
              grade:
                item.grade,

              orderCount:
                item.steelMill
                  .orderCount,

              orderTakenKG:
                item.steelMill
                  .orderTakenKG,

              totalDispatchKG:
                item.steelMill
                  .totalDispatchKG,

              dispatchLeftKG:
                item.steelMill
                  .dispatchLeftKG,
            })
          ),

      mills:
        sixMonths.mills,

      dataQuality: {
        oneMonth:
          oneMonth
            .dataQuality,

        threeMonths:
          threeMonths
            .dataQuality,

        sixMonths:
          sixMonths
            .dataQuality,
      },
    };
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getSteelAnalytics,

  getSteelAnalyticsSummary,

  getSteelAnalyticsDrillDown,

  getSteelAnalyticsPdfData,

  parseQuantityToKG,

  extractGradeFromText,

  extractSalesOrderItems,

  getOrderQuantityInfo,
};