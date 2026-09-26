// backend/services/steelAnalyticsService.js

const SalesOrder = require("../model/salesOrderModel");
const Dispatch = require("../model/dispatchModel");
const OrderTracking = require("../model/OrderTracking");

const {
  TRACKING_TYPES,
  convertToMetricTon,
  roundMetricTon,
} = require("../model/steelAnalyticsModel");

/* =========================================================
   CONSTANTS
========================================================= */

const HOUSE_TYPE =
  TRACKING_TYPES?.HOUSE || "H.O.";

const STEEL_MILL_TYPE =
  TRACKING_TYPES?.STEEL_MILL || "N.H.O.";

/*
 * Management Analysis became meaningful only after
 * H.O. / N.H.O. tracking was introduced.
 *
 * Everything before 13-Aug-2026 is ignored completely.
 */
const ANALYTICS_START_DATE =
  new Date(2026, 7, 13, 0, 0, 0, 0);

const METRICS = {
  NEW_ORDER: "new_order",
  DISPATCH_TARGET: "dispatch_target",
  ACTUAL_DISPATCH: "actual_dispatch",
  TARGET_PENDING: "target_pending",
  ORDER_BALANCE: "order_balance",
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeGrade = (value) =>
  cleanText(value).toUpperCase();

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const roundMT = (value) =>
  roundMetricTon(toNumber(value));

const kgToMT = (kg) =>
  roundMT(toNumber(kg) / 1000);

const safeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDateOnly = (value) => {
  const date = safeDate(value);

  if (!date) {
    return null;
  }

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
   DATE HELPERS
========================================================= */

const startOfDay = (value) => {
  const date = safeDate(value);

  if (!date) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const endOfDay = (value) => {
  const date = safeDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

const startOfCurrentMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
};

const endOfCurrentMonth = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
};

/*
 * IMPORTANT
 *
 * If frontend sends no dates:
 * current month is automatically selected.
 *
 * Example:
 * Sep 2026 -> 01-Sep to 30-Sep
 * Oct 2026 -> 01-Oct to 31-Oct
 */
const buildPeriod = ({
  from,
  to,
} = {}) => {
  let fromDate = from
    ? startOfDay(from)
    : startOfCurrentMonth();

  let toDate = to
    ? endOfDay(to)
    : endOfCurrentMonth();

  if (from && !fromDate) {
    throw new Error(
      "Invalid from date."
    );
  }

  if (to && !toDate) {
    throw new Error(
      "Invalid to date."
    );
  }

  /*
   * Never allow analytics before
   * 13-Aug-2026.
   */
  if (
    fromDate <
    ANALYTICS_START_DATE
  ) {
    fromDate =
      new Date(
        ANALYTICS_START_DATE
      );
  }

  if (
    toDate <
    ANALYTICS_START_DATE
  ) {
    throw new Error(
      "Management Analysis is available only from 13 August 2026."
    );
  }

  if (toDate < fromDate) {
    throw new Error(
      "To date cannot be earlier than From date."
    );
  }

  return {
    fromDate,
    toDate,

    from:
      formatDateOnly(fromDate),

    to:
      formatDateOnly(toDate),
  };
};

const isDateInPeriod = (
  value,
  period
) => {
  const date = safeDate(value);

  if (!date) {
    return false;
  }

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

  if (!date) {
    return false;
  }

  return date <= endDate;
};

const isOnOrAfterAnalyticsStart = (
  value
) => {
  const date = safeDate(value);

  if (!date) {
    return false;
  }

  return (
    date >=
    ANALYTICS_START_DATE
  );
};

/* =========================================================
   TRACKING TYPE
========================================================= */

const normalizeTrackingType = (
  value
) => {
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

const isValidTrackingType = (
  value
) => {
  const type =
    normalizeTrackingType(value);

  return (
    type === HOUSE_TYPE ||
    type === STEEL_MILL_TYPE
  );
};

/* =========================================================
   STEEL MILL
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
        salesOrder?.otherSteelMill
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
   QUANTITY PARSER
========================================================= */

/*
 * Standard theoretical steel density:
 *
 * Rectangular / Flat:
 * KG = Width(mm) × Thickness(mm) × Length(mm)
 *      × 0.00000785 × Pieces
 *
 * Round:
 * KG = Dia(mm) × Dia(mm) × Length(mm)
 *      × 0.000006165 × Pieces
 *
 * IMPORTANT:
 * Explicit KG / MT always has priority.
 *
 * Example:
 * 500 KGS @ 440/KG
 *
 * Quantity = 500 KG
 * Rate     = 440/KG
 *
 * We must NEVER read @280/kg or @173/kg as quantity.
 */

const STEEL_RECTANGULAR_FACTOR = 0.00000785;
const STEEL_ROUND_FACTOR = 0.000006165;


/*
 * ---------------------------------------------------------
 * REMOVE PRICE/RATE PART BEFORE QUANTITY DETECTION
 * ---------------------------------------------------------
 *
 * Example:
 *
 * 50X30X1209MM QTY:2 NOS @ 280/kg + GST
 *
 * becomes:
 *
 * 50X30X1209MM QTY:2 NOS
 *
 * This prevents 280/kg from being treated as 280 KG.
 */
const removeRatePart = (value) => {
  const text = String(value || "");

  return text
    .replace(
      /@\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
      ""
    )
    .replace(
      /\bRATE\s*[:=-]?\s*(?:RS\.?\s*)?\d+(?:\.\d+)?\s*\/?\s*(?:KG|KGS|MT|MTS|PC|PCS|NOS?)\b.*$/i,
      ""
    )
    .trim();
};


/*
 * ---------------------------------------------------------
 * EXTRACT NUMBER OF PIECES
 * ---------------------------------------------------------
 *
 * Supports:
 *
 * QTY:2 NOS
 * QTY 2 NOS
 * QTY-2 NOS
 * QTY: 09 NOS
 * 10 NOS
 * 2 PCS
 * 2 PIECES
 */
const extractPieceCount = (value) => {
  const text =
    String(value || "")
      .replace(/,/g, "")
      .trim();

  if (!text) {
    return null;
  }

  const qtyMatch =
    text.match(
      /\b(?:QTY|QUANTITY)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:NOS?|PCS?|PIECES?)\b/i
    );

  if (qtyMatch) {
    const pieces =
      Number(qtyMatch[1]);

    return Number.isFinite(pieces) &&
      pieces > 0
      ? pieces
      : null;
  }

  const nosMatch =
    text.match(
      /\b(\d+(?:\.\d+)?)\s*(?:NOS?|PCS?|PIECES?)\b/i
    );

  if (nosMatch) {
    const pieces =
      Number(nosMatch[1]);

    return Number.isFinite(pieces) &&
      pieces > 0
      ? pieces
      : null;
  }

  return null;
};


/*
 * ---------------------------------------------------------
 * PARSE DIMENSIONAL WEIGHT
 * ---------------------------------------------------------
 */
const parseDimensionalWeight = (
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

  const text =
    removeRatePart(original)
      .replace(/,/g, "")
      .replace(/[×*]/g, "X")
      .replace(/\s+/g, " ")
      .trim();

  if (!text) {
    return null;
  }

  const pieces =
    extractPieceCount(text);

  /*
   * We calculate dimensional weight only when
   * piece quantity is explicitly available.
   *
   * This avoids silently assuming 1 piece.
   */
  if (
    pieces === null ||
    pieces <= 0
  ) {
    return null;
  }


  /*
   * =======================================================
   * ROUND MATERIAL
   * =======================================================
   *
   * Examples:
   *
   * DIA 115X230MM QTY:10 NOS
   * DIA115 X 610 MM QTY:09 NOS
   * Ø115X230MM QTY 10 NOS
   *
   * Formula:
   *
   * Dia × Dia × Length × 0.000006165 × Qty
   */

  const roundPatterns = [
    /\b(?:DIA|DIAMETER|Ø)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*MM\b/i,

    /\b(?:DIA|DIAMETER|Ø)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*[Xx]\s*(\d+(?:\.\d+)?)\s*(?:MM)?\b/i,
  ];

  for (
    const regex of roundPatterns
  ) {
    const match =
      text.match(regex);

    if (!match) {
      continue;
    }

    const diameterMM =
      Number(match[1]);

    const lengthMM =
      Number(match[2]);

    if (
      !Number.isFinite(
        diameterMM
      ) ||
      !Number.isFinite(
        lengthMM
      ) ||
      diameterMM <= 0 ||
      lengthMM <= 0
    ) {
      continue;
    }

    const weightPerPieceKg =
      diameterMM *
      diameterMM *
      lengthMM *
      STEEL_ROUND_FACTOR;

    const totalWeightKg =
      weightPerPieceKg *
      pieces;

    return {
      original,

      quantity:
        totalWeightKg,

      unit:
        "KG",

      metricTon:
        roundMT(
          totalWeightKg /
            1000
        ),

      source:
        "CALCULATED_DIMENSIONS",

      shape:
        "ROUND",

      pieces,

      weightPerPieceKg:
        Number(
          weightPerPieceKg
            .toFixed(3)
        ),

      totalWeightKg:
        Number(
          totalWeightKg
            .toFixed(3)
        ),

      dimensions: {
        diameterMM,
        lengthMM,
      },
    };
  }


  /*
   * =======================================================
   * RECTANGULAR / FLAT / BLOCK
   * =======================================================
   *
   * Examples:
   *
   * 50X30X1209MM QTY:2 NOS
   * 100 X 50 X 500 MM QTY 3 NOS
   * 100*50*500 MM QTY 3 PCS
   *
   * Formula:
   *
   * A × B × Length × 0.00000785 × Qty
   */

  const rectangularMatch =
    text.match(
      /(?:^|[\s:,\-])(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*MM\b/i
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
      const weightPerPieceKg =
        dimension1MM *
        dimension2MM *
        lengthMM *
        STEEL_RECTANGULAR_FACTOR;

      const totalWeightKg =
        weightPerPieceKg *
        pieces;

      return {
        original,

        quantity:
          totalWeightKg,

        unit:
          "KG",

        metricTon:
          roundMT(
            totalWeightKg /
              1000
          ),

        source:
          "CALCULATED_DIMENSIONS",

        shape:
          "RECTANGULAR",

        pieces,

        weightPerPieceKg:
          Number(
            weightPerPieceKg
              .toFixed(3)
          ),

        totalWeightKg:
          Number(
            totalWeightKg
              .toFixed(3)
        ),

        dimensions: {
          dimension1MM,
          dimension2MM,
          lengthMM,
        },
      };
    }
  }


  /*
   * =======================================================
   * SQUARE / RCS
   * =======================================================
   *
   * Examples:
   *
   * RCS 100X500MM QTY:2 NOS
   * SQ 100X500MM QTY:2 NOS
   * SQUARE 100X500MM QTY:2 NOS
   *
   * Means:
   * 100 × 100 × 500
   */

  const squareMatch =
    text.match(
      /\b(?:RCS|SQ|SQUARE)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:MM)?\s*X\s*(\d+(?:\.\d+)?)\s*MM\b/i
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
      Number.isFinite(sideMM) &&
      Number.isFinite(lengthMM) &&
      sideMM > 0 &&
      lengthMM > 0
    ) {
      const weightPerPieceKg =
        sideMM *
        sideMM *
        lengthMM *
        STEEL_RECTANGULAR_FACTOR;

      const totalWeightKg =
        weightPerPieceKg *
        pieces;

      return {
        original,

        quantity:
          totalWeightKg,

        unit:
          "KG",

        metricTon:
          roundMT(
            totalWeightKg /
              1000
          ),

        source:
          "CALCULATED_DIMENSIONS",

        shape:
          "SQUARE",

        pieces,

        weightPerPieceKg:
          Number(
            weightPerPieceKg
              .toFixed(3)
          ),

        totalWeightKg:
          Number(
            totalWeightKg
              .toFixed(3)
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


/*
 * ---------------------------------------------------------
 * MAIN QUANTITY PARSER
 * ---------------------------------------------------------
 *
 * Priority:
 *
 * 1. Explicit MT
 * 2. Explicit KG
 * 3. Dimensional calculated weight
 * 4. Otherwise unresolved
 */
const parseQuantityToMetricTon = (
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

  /*
   * Remove rate before looking for KG.
   *
   * Otherwise:
   *
   * QTY:2 NOS @280/kg
   *
   * could incorrectly become 280 KG.
   */
  const quantityText =
    removeRatePart(original)
      .replace(/,/g, "")
      .trim();

  if (!quantityText) {
    return null;
  }


  /*
   * =======================================================
   * 1. EXPLICIT MT
   * =======================================================
   */

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

    if (!match) {
      continue;
    }

    const quantity =
      Number(match[1]);

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {
      continue;
    }

    const metricTon =
      convertToMetricTon(
        quantity,
        "MT"
      );

    if (
      metricTon !== null &&
      metricTon !== undefined
    ) {
      return {
        original,

        quantity,

        unit:
          "MT",

        metricTon:
          roundMT(metricTon),

        source:
          "EXPLICIT_MT",

        shape:
          null,

        pieces:
          null,

        weightPerPieceKg:
          null,

        totalWeightKg:
          Number(
            (
              metricTon *
              1000
            ).toFixed(3)
          ),

        dimensions:
          null,
      };
    }
  }


  /*
   * =======================================================
   * 2. EXPLICIT KG
   * =======================================================
   */

  const kgMatch =
    quantityText.match(
      /(\d+(?:\.\d+)?)\s*(?:KG|KGS|KILOGRAM|KILOGRAMS)\b/i
    );

  if (kgMatch) {
    const quantity =
      Number(
        kgMatch[1]
      );

    if (
      Number.isFinite(
        quantity
      ) &&
      quantity > 0
    ) {
      const metricTon =
        convertToMetricTon(
          quantity,
          "KG"
        );

      if (
        metricTon !== null &&
        metricTon !==
          undefined
      ) {
        return {
          original,

          quantity,

          unit:
            "KG",

          metricTon:
            roundMT(
              metricTon
            ),

          source:
            "EXPLICIT_KG",

          shape:
            null,

          pieces:
            null,

          weightPerPieceKg:
            null,

          totalWeightKg:
            Number(
              quantity.toFixed(
                3
              )
            ),

          dimensions:
            null,
        };
      }
    }
  }


  /*
   * =======================================================
   * 3. DIMENSIONAL CALCULATION
   * =======================================================
   */

  const dimensional =
    parseDimensionalWeight(
      quantityText
    );

  if (dimensional) {
    return dimensional;
  }


  /*
   * Nothing could be safely determined.
   */
  return null;
};

const extractGradeFromText = (
  value
) => {
  const text =
    cleanText(value);

  if (!text) {
    return "";
  }

  /*
   * Remove leading item numbering.
   *
   * 1.H13 ...
   * 2.D3 ...
   * 3) H11 ...
   */
  let workingText =
    text.replace(
      /^\s*\d+\s*[.)\-:]\s*/,
      ""
    );


  /*
   * First try explicit:
   *
   * GRADE: H13
   * GRADE H13
   * GR: D3
   */
  const explicitGrade =
    workingText.match(
      /\b(?:GRADE|GR)\s*[:=\-]?\s*([A-Z0-9][A-Z0-9.+\-]*)\b/i
    );

  if (
    explicitGrade &&
    explicitGrade[1]
  ) {
    return normalizeGrade(
      explicitGrade[1]
    );
  }


  /*
   * In the legacy Sales Order format,
   * grade is normally the first token:
   *
   * H13 ROUGH SIZE...
   * D3 ROUGH SIZE...
   * DIN 1.2714...
   *
   * Handle DIN specially.
   */
  const dinGrade =
    workingText.match(
      /^(DIN\s*\d+(?:\.\d+)?)/i
    );

  if (dinGrade) {
    return normalizeGrade(
      dinGrade[1]
    );
  }


  /*
   * Standard first-token grade.
   *
   * Examples:
   * H13
   * H11
   * D2
   * D3
   * EN19
   * EN24
   * P20
   * 1.2714
   */
  const firstToken =
    workingText.match(
      /^([A-Z0-9][A-Z0-9.+\-]*)\b/i
    );

  if (
    firstToken &&
    firstToken[1]
  ) {
    const candidate =
      normalizeGrade(
        firstToken[1]
      );

    /*
     * Don't treat generic words as grades.
     */
    const rejected = new Set([
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

    if (
      candidate &&
      !rejected.has(
        candidate
      )
    ) {
      return candidate;
    }
  }


  return "";
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

  /*
   * Structured array
   */
  if (Array.isArray(raw)) {
    return raw.map(
      (item, index) => {
        const grade =
          normalizeGrade(
            item?.grade
          );

        const directMT =
          convertToMetricTon(
            item?.quantity,
            item?.unit
          );

        return {
          index,

          grade,

          original: item,

          parsed:
            directMT !== null &&
            directMT !==
              undefined,

          metricTon:
            directMT !== null &&
            directMT !==
              undefined
              ? roundMT(
                  directMT
                )
              : null,

          detectedQuantity:
            item?.quantity ??
            null,

          detectedUnit:
            item?.unit || "",
        };
      }
    );
  }

  /*
   * Legacy/free-text format
   */
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
      const parsedQuantity =
        parseQuantityToMetricTon(
          row
        );

      const grade =
        extractGradeFromText(
          row
        );

      return {
  index,

  original: row,

  grade,

  parsed:
    Boolean(
      parsedQuantity
    ),

  metricTon:
    parsedQuantity
      ? parsedQuantity
          .metricTon
      : null,

  detectedQuantity:
    parsedQuantity
      ? parsedQuantity
          .quantity
      : null,

  detectedUnit:
    parsedQuantity
      ? parsedQuantity
          .unit
      : "",

  quantitySource:
    parsedQuantity
      ? parsedQuantity
          .source ||
        "EXPLICIT_WEIGHT"
      : "UNRESOLVED",

  shape:
    parsedQuantity
      ? parsedQuantity
          .shape ||
        null
      : null,

  pieces:
    parsedQuantity
      ? parsedQuantity
          .pieces ??
        null
      : null,

  weightPerPieceKg:
    parsedQuantity
      ? parsedQuantity
          .weightPerPieceKg ??
        null
      : null,

  totalWeightKg:
    parsedQuantity
      ? parsedQuantity
          .totalWeightKg ??
        null
      : null,

  dimensions:
    parsedQuantity
      ? parsedQuantity
          .dimensions ||
        null
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

  let totalMT = 0;
  let parsedItemCount = 0;

  const grades =
    new Map();

  const unparsedItems = [];

  items.forEach(
    (item) => {
      if (
        !item.parsed ||
        item.metricTon === null
      ) {
        unparsedItems.push(
          item
        );

        return;
      }

      const quantityMT =
        toNumber(
          item.metricTon
        );

      totalMT +=
        quantityMT;

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
          quantityMT
      );
    }
  );

  return {
    items,

    totalMT:
      roundMT(totalMT),

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
   ORDER DATE
========================================================= */

const getSalesOrderDate = (
  salesOrder
) =>
  safeDate(
    salesOrder?.poDate ||
      salesOrder?.createdAt
  );

/* =========================================================
   READY / TARGET DATE
========================================================= */

const getReadyMilestone = (
  tracking
) => {
  if (
    !Array.isArray(
      tracking?.milestones
    )
  ) {
    return null;
  }

  return (
    tracking.milestones.find(
      (milestone) =>
        milestone?.code ===
          "ready_for_dispatch" ||
        milestone?.status ===
          "ready_for_dispatch"
    ) ||
    null
  );
};

const getCurrentTargetDate = (
  tracking
) => {
  return (
    safeDate(
      tracking
        ?.estimatedReadyDate
    ) ||
    safeDate(
      getReadyMilestone(
        tracking
      )?.estimatedDate
    )
  );
};

const getOriginalTargetDate = (
  tracking
) => {
  const milestone =
    getReadyMilestone(
      tracking
    );

  return (
    safeDate(
      milestone
        ?.originalEstimatedDate
    ) ||
    safeDate(
      tracking
        ?.estimatedReadyDate
    )
  );
};

/* =========================================================
   SUMMARY BUCKET
========================================================= */

const createSummaryBucket = () => ({
  newOrderMT: 0,

  dispatchTargetMT: 0,

  actualDispatchMT: 0,

  targetPendingMT: 0,

  orderBalanceMT: 0,

  newOrderIds:
    new Set(),

  dispatchTargetOrderIds:
    new Set(),

  actualDispatchOrderIds:
    new Set(),

  targetPendingOrderIds:
    new Set(),

  orderBalanceOrderIds:
    new Set(),
});

const addMetric = (
  bucket,
  metric,
  quantity,
  salesOrderId
) => {
  const qty =
    toNumber(quantity);

  if (qty <= 0) {
    return;
  }

  const id =
    salesOrderId
      ? String(
          salesOrderId
        )
      : "";

  switch (metric) {
    case METRICS.NEW_ORDER:
      bucket.newOrderMT +=
        qty;

      if (id) {
        bucket
          .newOrderIds
          .add(id);
      }

      break;

    case METRICS.DISPATCH_TARGET:
      bucket.dispatchTargetMT +=
        qty;

      if (id) {
        bucket
          .dispatchTargetOrderIds
          .add(id);
      }

      break;

    case METRICS.ACTUAL_DISPATCH:
      bucket.actualDispatchMT +=
        qty;

      if (id) {
        bucket
          .actualDispatchOrderIds
          .add(id);
      }

      break;

    case METRICS.TARGET_PENDING:
      bucket.targetPendingMT +=
        qty;

      if (id) {
        bucket
          .targetPendingOrderIds
          .add(id);
      }

      break;

    case METRICS.ORDER_BALANCE:
      bucket.orderBalanceMT +=
        qty;

      if (id) {
        bucket
          .orderBalanceOrderIds
          .add(id);
      }

      break;

    default:
      break;
  }
};

const finalizeBucket = (
  bucket
) => {
  const target =
    roundMT(
      bucket
        .dispatchTargetMT
    );

  const actual =
    roundMT(
      bucket
        .actualDispatchMT
    );

  return {
    newOrderMT:
      roundMT(
        bucket.newOrderMT
      ),

    dispatchTargetMT:
      target,

    actualDispatchMT:
      actual,

    targetPendingMT:
      roundMT(
        bucket
          .targetPendingMT
      ),

    orderBalanceMT:
      roundMT(
        bucket
          .orderBalanceMT
      ),

    targetAchievementPercentage:
      target > 0
        ? Math.round(
            (
              actual /
              target
            ) *
              10000
          ) / 100
        : 0,

    drillDown: {
      newOrder: {
        metric:
          METRICS.NEW_ORDER,

        orderCount:
          bucket
            .newOrderIds
            .size,
      },

      dispatchTarget: {
        metric:
          METRICS.DISPATCH_TARGET,

        orderCount:
          bucket
            .dispatchTargetOrderIds
            .size,
      },

      actualDispatch: {
        metric:
          METRICS.ACTUAL_DISPATCH,

        orderCount:
          bucket
            .actualDispatchOrderIds
            .size,
      },

      targetPending: {
        metric:
          METRICS.TARGET_PENDING,

        orderCount:
          bucket
            .targetPendingOrderIds
            .size,
      },

      orderBalance: {
        metric:
          METRICS.ORDER_BALANCE,

        orderCount:
          bucket
            .orderBalanceOrderIds
            .size,
      },
    },
  };
};

/* =========================================================
   GRADE / MILL BUCKETS
========================================================= */

const getGradeBucket = (
  map,
  gradeName
) => {
  const key =
    normalizeGrade(
      gradeName
    ) ||
    "UNIDENTIFIED";

  if (!map.has(key)) {
    map.set(
      key,
      {
        grade: key,

        bucket:
          createSummaryBucket(),

        salesOrderIds:
          new Set(),
      }
    );
  }

  return map.get(key);
};

const getMillBucket = (
  map,
  millName
) => {
  const key =
    cleanText(
      millName
    ) ||
    "Not Specified";

  if (!map.has(key)) {
    map.set(
      key,
      {
        steelMill: key,

        bucket:
          createSummaryBucket(),

        salesOrderIds:
          new Set(),
      }
    );
  }

  return map.get(key);
};

/* =========================================================
   FILTERED GRADE QUANTITY
========================================================= */

const orderMatchesGrade = (
  quantityInfo,
  grade
) => {
  if (!grade) {
    return true;
  }

  return quantityInfo
    .grades
    .has(
      normalizeGrade(
        grade
      )
    );
};

const getFilteredOrderQuantityMT = (
  quantityInfo,
  grade
) => {
  if (!grade) {
    return quantityInfo
      .totalMT;
  }

  return roundMT(
    quantityInfo
      .grades
      .get(
        normalizeGrade(
          grade
        )
      ) || 0
  );
};

/* =========================================================
   BUILD ORDER CONTEXTS
========================================================= */

const buildOrderContexts = ({
  salesOrders,
  trackings,
  dispatches,
  grade,
  period,
}) => {
  const trackingMap =
    new Map();

  trackings.forEach(
    (tracking) => {
      if (
        tracking
          ?.salesOrderId
      ) {
        trackingMap.set(
          String(
            tracking
              .salesOrderId
          ),
          tracking
        );
      }
    }
  );

  const dispatchMap =
    new Map();

  dispatches.forEach(
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
        !dispatchMap.has(
          key
        )
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

  const contexts = [];
  const unparsedOrders = [];

  salesOrders.forEach(
    (salesOrder) => {
      const trackingType =
        normalizeTrackingType(
          salesOrder
            ?.trackingOrderType
        );

      /*
       * CRITICAL:
       * Ignore every order that is not
       * explicitly H.O. or N.H.O.
       */
      if (
        !isValidTrackingType(
          trackingType
        )
      ) {
        return;
      }

      const orderDate =
        getSalesOrderDate(
          salesOrder
        );

      /*
       * CRITICAL:
       * Ignore all business before
       * 13-Aug-2026.
       */
      if (
        !isOnOrAfterAnalyticsStart(
          orderDate
        )
      ) {
        return;
      }

      const quantityInfo =
        getOrderQuantityInfo(
          salesOrder
        );

      if (
        !orderMatchesGrade(
          quantityInfo,
          grade
        )
      ) {
        return;
      }

      const orderedMT =
        getFilteredOrderQuantityMT(
          quantityInfo,
          grade
        );

      if (orderedMT <= 0) {
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
            trackingType,

          steelMill:
            getSteelMillName(
              salesOrder
            ),

          original:
            salesOrder
              .sizeGradeQuantityRate,

          reason:
            grade
              ? `No safely parsed quantity found for grade ${grade}.`
              : "Sales Order quantity could not be safely parsed.",
        });

        return;
      }

      const id =
        String(
          salesOrder._id
        );

      const tracking =
        trackingMap.get(id) ||
        null;

      const orderDispatches =
        dispatchMap.get(id) ||
        [];

      /*
       * Actual dispatch during
       * selected month/range.
       *
       * dispatchQty is stored in KG.
       */
      const periodDispatchedMT =
        roundMT(
          orderDispatches
            .filter(
              (dispatch) =>
                isDateInPeriod(
                  dispatch
                    .dispatchDate ||
                    dispatch
                      .createdAt,
                  period
                )
            )
            .reduce(
              (
                sum,
                dispatch
              ) =>
                sum +
                kgToMT(
                  dispatch
                    .dispatchQty
                ),
              0
            )
        );

      /*
       * Dispatch history up to
       * selected period end.
       *
       * Needed for Order Balance.
       */
      const dispatchedUntilPeriodEndMT =
        roundMT(
          orderDispatches
            .filter(
              (dispatch) =>
                isDateOnOrBefore(
                  dispatch
                    .dispatchDate ||
                    dispatch
                      .createdAt,
                  period.toDate
                )
            )
            .reduce(
              (
                sum,
                dispatch
              ) =>
                sum +
                kgToMT(
                  dispatch
                    .dispatchQty
                ),
              0
            )
        );

      const allTimeDispatchedMT =
        roundMT(
          orderDispatches
            .reduce(
              (
                sum,
                dispatch
              ) =>
                sum +
                kgToMT(
                  dispatch
                    .dispatchQty
                ),
              0
            )
        );

      const orderBalanceMT =
        roundMT(
          Math.max(
            0,
            orderedMT -
              dispatchedUntilPeriodEndMT
          )
        );

      const currentTargetDate =
        getCurrentTargetDate(
          tracking
        );

      const originalTargetDate =
        getOriginalTargetDate(
          tracking
        );

      const isTargetInPeriod =
        currentTargetDate
          ? isDateInPeriod(
              currentTargetDate,
              period
            )
          : false;

      /*
       * For target pending we need
       * everything dispatched by the
       * selected month end.
       *
       * Example:
       * Target September = 20 MT
       * dispatched through Sep 30 = 12 MT
       * pending = 8 MT
       */
      const targetActualMT =
        isTargetInPeriod
          ? Math.min(
              orderedMT,
              dispatchedUntilPeriodEndMT
            )
          : 0;

      const targetPendingMT =
        isTargetInPeriod
          ? roundMT(
              Math.max(
                0,
                orderedMT -
                  targetActualMT
              )
            )
          : 0;

      const isNewOrderInPeriod =
        isDateInPeriod(
          orderDate,
          period
        );

      contexts.push({
        salesOrder: {
          ...salesOrder,

          /*
           * Normalize it once so every
           * calculation uses exactly the
           * same H.O./N.H.O. value.
           */
          trackingOrderType:
            trackingType,
        },

        tracking,

        dispatches:
          orderDispatches,

        quantityInfo,

        orderedMT,

        orderDate,

        isNewOrderInPeriod,

        currentTargetDate,

        originalTargetDate,

        isTargetInPeriod,

        periodDispatchedMT,

        dispatchedUntilPeriodEndMT,

        allTimeDispatchedMT,

        targetActualMT:
          roundMT(
            targetActualMT
          ),

        targetPendingMT,

        orderBalanceMT,
      });
    }
  );

  return {
    contexts,
    unparsedOrders,
  };
};

/* =========================================================
   ADD CONTEXT TO SUMMARY
========================================================= */

const addContextToBucket = (
  bucket,
  context,
  quantityOverride = null
) => {
  const id =
    context
      .salesOrder
      ._id;

  const quantity =
    quantityOverride !== null
      ? quantityOverride
      : context
          .orderedMT;

  if (
    context
      .isNewOrderInPeriod
  ) {
    addMetric(
      bucket,
      METRICS.NEW_ORDER,
      quantity,
      id
    );
  }

  if (
    context
      .isTargetInPeriod
  ) {
    addMetric(
      bucket,
      METRICS.DISPATCH_TARGET,
      quantity,
      id
    );

    if (
      context
        .targetPendingMT >
      0
    ) {
      const ratio =
        context.orderedMT > 0
          ? quantity /
            context.orderedMT
          : 0;

      addMetric(
        bucket,
        METRICS.TARGET_PENDING,
        context
          .targetPendingMT *
          ratio,
        id
      );
    }
  }

  if (
    context
      .periodDispatchedMT >
    0
  ) {
    const ratio =
      context.orderedMT > 0
        ? quantity /
          context.orderedMT
        : 0;

    addMetric(
      bucket,
      METRICS.ACTUAL_DISPATCH,
      context
        .periodDispatchedMT *
        ratio,
      id
    );
  }

  /*
   * Order Balance:
   *
   * Includes valid H.O./N.H.O.
   * business from 13-Aug onward
   * which is still pending at the
   * selected month end.
   */
  if (
    context
      .orderBalanceMT >
    0
  ) {
    const ratio =
      context.orderedMT > 0
        ? quantity /
          context.orderedMT
        : 0;

    addMetric(
      bucket,
      METRICS.ORDER_BALANCE,
      context
        .orderBalanceMT *
        ratio,
      id
    );
  }
};

/* =========================================================
   ORDER DETAIL FOR DRILL-DOWN
========================================================= */

const buildOrderDetail = (
  context
) => {
  const {
    salesOrder,
    tracking,
  } = context;

  const delayed =
    Boolean(
      context
        .originalTargetDate &&
      context
        .currentTargetDate &&
      context
        .currentTargetDate >
        context
          .originalTargetDate
    );

  const delayDays =
    delayed
      ? Math.max(
          0,
          Math.ceil(
            (
              context
                .currentTargetDate -
              context
                .originalTargetDate
            ) /
              86400000
          )
        )
      : 0;

  return {
    salesOrderId:
      salesOrder._id,

    trackingId:
      tracking?._id ||
      null,

    trackingNumber:
      tracking
        ?.trackingNumber ||
      "",

    salesOrderNo:
      salesOrder
        .salesOrderNo ||
      tracking
        ?.salesOrderNo ||
      "",

    enquiryNumber:
      salesOrder
        .enquiryNumber ||
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

    trackingOrderType:
      salesOrder
        .trackingOrderType,

    steelMill:
      getSteelMillName(
        salesOrder
      ),

    supplyCondition:
      salesOrder
        .supplyCondition ||
      tracking
        ?.supplyCondition ||
      "",

    processType:
      tracking
        ?.processType ||
      "",

    orderDate:
      context.orderDate,

    isNewOrderInPeriod:
      context
        .isNewOrderInPeriod,

    orderedMT:
      roundMT(
        context.orderedMT
      ),

    dispatchTargetMT:
      context
        .isTargetInPeriod
        ? roundMT(
            context
              .orderedMT
          )
        : 0,

    targetActualMT:
      roundMT(
        context
          .targetActualMT
      ),

    actualDispatchMT:
      roundMT(
        context
          .periodDispatchedMT
      ),

    dispatchedUntilPeriodEndMT:
      roundMT(
        context
          .dispatchedUntilPeriodEndMT
      ),

    allTimeDispatchedMT:
      roundMT(
        context
          .allTimeDispatchedMT
      ),

    targetPendingMT:
      roundMT(
        context
          .targetPendingMT
      ),

    orderBalanceMT:
      roundMT(
        context
          .orderBalanceMT
      ),

    currentStatus:
      tracking
        ?.currentStatus ||
      "",

    currentStatusLabel:
      tracking
        ?.currentStatusLabel ||
      "",

    progressPercentage:
      toNumber(
        tracking
          ?.progressPercentage
      ),

    estimatedDispatchDate:
      context
        .currentTargetDate,

    originalEstimatedDispatchDate:
      context
        .originalTargetDate,

    delayed,

    delayDays,

    fullyDispatched:
      context
        .orderBalanceMT <=
      0,

    grades:
      Array.from(
        context
          .quantityInfo
          .grades
          .entries()
      ).map(
        ([
          gradeName,
          quantityMT,
        ]) => ({
          grade:
            gradeName,

          quantityMT:
            roundMT(
              quantityMT
            ),
        })
      ),

    dispatches:
      context
        .dispatches
        .map(
          (dispatch) => ({
            dispatchId:
              dispatch._id,

            invoiceNumber:
              dispatch
                .invoiceNumber ||
              "",

            dispatchDate:
              dispatch
                .dispatchDate ||
              dispatch
                .createdAt,

            dispatchQtyKG:
              toNumber(
                dispatch
                  .dispatchQty
              ),

            dispatchedMT:
              kgToMT(
                dispatch
                  .dispatchQty
              ),

            dispatchCompletionStatus:
              dispatch
                .dispatchCompletionStatus ||
              "",

            remainingQtyAfterDispatchKG:
              toNumber(
                dispatch
                  .remainingQtyAfterDispatch
              ),
          })
        ),
  };
};

/* =========================================================
   MAIN ANALYTICS
========================================================= */

const getSteelAnalytics = async ({
  from,
  to,
  trackingOrderType,
  steelMill,
  grade,
} = {}) => {
  /*
   * If frontend gives no dates,
   * this becomes current month.
   */
  const period =
    buildPeriod({
      from,
      to,
    });

  const requestedType =
    trackingOrderType
      ? normalizeTrackingType(
          trackingOrderType
        )
      : "";

  /*
   * CRITICAL:
   *
   * Database query itself only loads
   * H.O. / N.H.O.
   *
   * Old orders without classification
   * cannot enter analytics.
   */
  const salesOrderQuery = {
    isActive: {
      $ne: false,
    },

    trackingOrderType:
      requestedType
        ? requestedType
        : {
            $in: [
              HOUSE_TYPE,
              STEEL_MILL_TYPE,
            ],
          },
  };

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

  const salesOrders =
    await SalesOrder
      .find(
        salesOrderQuery
      )
      .lean();

  /*
   * Filter by business start date
   * using PO Date first.
   *
   * We do this in JS because
   * legacy orders may depend on
   * createdAt fallback.
   */
  const eligibleSalesOrders =
    salesOrders.filter(
      (order) => {
        const orderDate =
          getSalesOrderDate(
            order
          );

        return (
          orderDate &&
          orderDate >=
            ANALYTICS_START_DATE &&
          isValidTrackingType(
            order
              .trackingOrderType
          )
        );
      }
    );

  const salesOrderIds =
    eligibleSalesOrders.map(
      (order) =>
        order._id
    );

  const trackings =
    salesOrderIds.length
      ? await OrderTracking
          .find({
            salesOrderId: {
              $in:
                salesOrderIds,
            },

            isActive: {
              $ne: false,
            },
          })
          .lean()
      : [];

  const dispatches =
    salesOrderIds.length
      ? await Dispatch
          .find({
            salesOrderId: {
              $in:
                salesOrderIds,
            },
          })
          .lean()
      : [];

  const {
    contexts,
    unparsedOrders,
  } =
    buildOrderContexts({
      salesOrders:
        eligibleSalesOrders,

      trackings,

      dispatches,

      grade,

      period,
    });

  /*
   * NO ALL-TIME TOTAL BUCKET.
   *
   * Management screen is now
   * H.O. vs Steel Mill for the
   * selected month.
   */
  const summary = {
    house:
      createSummaryBucket(),

    steelMill:
      createSummaryBucket(),
  };

  const gradeMap =
    new Map();

  const millMap =
    new Map();

  contexts.forEach(
    (context) => {
      const {
        salesOrder,
        quantityInfo,
      } = context;

      const type =
        normalizeTrackingType(
          salesOrder
            .trackingOrderType
        );

      /*
       * H.O.
       */
      if (
        type === HOUSE_TYPE
      ) {
        addContextToBucket(
          summary.house,
          context
        );
      }

      /*
       * N.H.O. / Steel Mill
       */
      if (
        type ===
        STEEL_MILL_TYPE
      ) {
        addContextToBucket(
          summary.steelMill,
          context
        );

        const mill =
          getMillBucket(
            millMap,
            getSteelMillName(
              salesOrder
            )
          );

        mill
          .salesOrderIds
          .add(
            String(
              salesOrder._id
            )
          );

        addContextToBucket(
          mill.bucket,
          context
        );
      }

      /*
       * Grade analytics
       */
      quantityInfo
        .grades
        .forEach(
          (
            gradeQuantityMT,
            gradeName
          ) => {
            if (
              grade &&
              normalizeGrade(
                gradeName
              ) !==
                normalizeGrade(
                  grade
                )
            ) {
              return;
            }

            const gradeBucket =
              getGradeBucket(
                gradeMap,
                gradeName
              );

            gradeBucket
              .salesOrderIds
              .add(
                String(
                  salesOrder._id
                )
              );

            /*
             * When no specific grade
             * filter is selected,
             * allocate metrics according
             * to that grade quantity.
             */
            const quantityOverride =
              grade
                ? context
                    .orderedMT
                : roundMT(
                    gradeQuantityMT
                  );

            addContextToBucket(
              gradeBucket.bucket,
              context,
              quantityOverride
            );
          }
        );
    }
  );

  const house =
    finalizeBucket(
      summary.house
    );

  const steelMillSummary =
    finalizeBucket(
      summary.steelMill
    );

  /*
   * Combined monthly values are supplied
   * only as a convenience for frontend
   * cards.
   *
   * They are ALWAYS mathematically:
   *
   * H.O. + N.H.O.
   *
   * No unclassified order can enter.
   *
   * This is NOT an all-time total.
   */
  const monthlyCombined = {
    newOrderMT:
      roundMT(
        house.newOrderMT +
          steelMillSummary
            .newOrderMT
      ),

    dispatchTargetMT:
      roundMT(
        house
          .dispatchTargetMT +
          steelMillSummary
            .dispatchTargetMT
      ),

    actualDispatchMT:
      roundMT(
        house
          .actualDispatchMT +
          steelMillSummary
            .actualDispatchMT
      ),

    targetPendingMT:
      roundMT(
        house
          .targetPendingMT +
          steelMillSummary
            .targetPendingMT
      ),

    orderBalanceMT:
      roundMT(
        house
          .orderBalanceMT +
          steelMillSummary
            .orderBalanceMT
      ),
  };

  const grades =
    Array.from(
      gradeMap.values()
    )
      .map(
        (item) => ({
          grade:
            item.grade,

          salesOrderCount:
            item
              .salesOrderIds
              .size,

          ...finalizeBucket(
            item.bucket
          ),
        })
      )
      .sort(
        (a, b) =>
          b.newOrderMT -
          a.newOrderMT
      );

  const mills =
    Array.from(
      millMap.values()
    )
      .map(
        (item) => ({
          steelMill:
            item.steelMill,

          salesOrderCount:
            item
              .salesOrderIds
              .size,

          ...finalizeBucket(
            item.bucket
          ),
        })
      )
      .sort(
        (a, b) =>
          b.newOrderMT -
          a.newOrderMT
      );

  const orderDetails =
    contexts
      .map(
        buildOrderDetail
      )
      .sort(
        (a, b) => {
          const dateA =
            safeDate(
              a.orderDate
            );

          const dateB =
            safeDate(
              b.orderDate
            );

          return (
            (dateB
              ?.getTime() ||
              0) -
            (dateA
              ?.getTime() ||
              0)
          );
        }
      );

  const missingTracking =
    orderDetails.filter(
      (order) =>
        !order.trackingId
    );

  const missingTargetDate =
    orderDetails.filter(
      (order) =>
        order.trackingId &&
        !order
          .estimatedDispatchDate
    );

  return {
    generatedAt:
      new Date(),

    /*
     * Frontend will now ALWAYS receive
     * actual period even if it did not
     * send from/to.
     */
    filters: {
      from:
        period.from,

      to:
        period.to,

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

    period: {
      from:
        period.from,

      to:
        period.to,

      mode:
        from || to
          ? "custom"
          : "current_month",

      analyticsStartDate:
        "2026-08-13",
    },

    definitions: {
      newOrder:
        "Sales Order quantity whose PO/order date falls inside the selected month.",

      dispatchTarget:
        "Order quantity whose current Order Tracking estimated ready-for-dispatch date falls inside the selected month.",

      actualDispatch:
        "Actual quantity dispatched during the selected month.",

      targetPending:
        "Quantity still pending against orders targeted for dispatch in the selected month.",

      orderBalance:
        "Outstanding quantity at the selected month end for valid H.O./N.H.O. orders created on or after 13-Aug-2026.",

      analyticsStart:
        "Management Analysis includes only H.O. and N.H.O. orders from 13-Aug-2026 onward.",
    },

    /*
     * Main comparison.
     *
     * No summary.total anymore.
     */
    summary: {
      house,

      steelMill:
        steelMillSummary,
    },

    /*
     * Optional convenience object.
     * This is MONTHLY combined,
     * never all-time.
     */
    monthlyCombined,

    grades,

    mills,

    salesOrders:
      orderDetails,

    dataQuality: {
      sourceSalesOrderCount:
        salesOrders.length,

      eligibleSalesOrderCount:
        eligibleSalesOrders
          .length,

      calculatedOrderCount:
        contexts.length,

      excludedBeforeAnalyticsStart:
        salesOrders.filter(
          (order) => {
            const date =
              getSalesOrderDate(
                order
              );

            return (
              date &&
              date <
                ANALYTICS_START_DATE
            );
          }
        ).length,

      unparsedOrderCount:
        unparsedOrders.length,

      missingTrackingCount:
        missingTracking.length,

      missingTargetDateCount:
        missingTargetDate.length,
    },

    warnings: {
      unparsedOrders,

      missingTracking:
        missingTracking.map(
          (order) => ({
            salesOrderId:
              order.salesOrderId,

            salesOrderNo:
              order.salesOrderNo,

            poNumber:
              order.poNumber,

            companyName:
              order.companyName,

            trackingOrderType:
              order
                .trackingOrderType,
          })
        ),

      missingTargetDate:
        missingTargetDate.map(
          (order) => ({
            salesOrderId:
              order.salesOrderId,

            salesOrderNo:
              order.salesOrderNo,

            poNumber:
              order.poNumber,

            companyName:
              order.companyName,

            trackingOrderType:
              order
                .trackingOrderType,

            trackingNumber:
              order
                .trackingNumber,
          })
        ),
    },
  };
};

/* =========================================================
   SUMMARY ONLY
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

      filters:
        analytics.filters,

      period:
        analytics.period,

      definitions:
        analytics
          .definitions,

      summary:
        analytics.summary,

      monthlyCombined:
        analytics
          .monthlyCombined,

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

        missingTrackingCount:
          analytics
            .warnings
            .missingTracking
            .length,

        missingTargetDateCount:
          analytics
            .warnings
            .missingTargetDate
            .length,
      },
    };
  };

/* =========================================================
   DRILL DOWN
========================================================= */

const getSteelAnalyticsDrillDown =
  async ({
    metric,
    from,
    to,
    trackingOrderType,
    steelMill,
    grade,
  } = {}) => {
    const allowedMetrics =
      Object.values(
        METRICS
      );

    if (
      !allowedMetrics.includes(
        metric
      )
    ) {
      throw new Error(
        "Invalid drill-down metric."
      );
    }

    const analytics =
      await getSteelAnalytics({
        from,
        to,
        trackingOrderType,
        steelMill,
        grade,
      });

    const period =
      buildPeriod({
        from:
          analytics
            .filters
            .from,

        to:
          analytics
            .filters
            .to,
      });

    let orders =
      analytics
        .salesOrders
        .filter(
          (order) => {
            switch (metric) {
              case METRICS.NEW_ORDER:
                return (
                  isDateInPeriod(
                    order.orderDate,
                    period
                  ) &&
                  order
                    .orderedMT >
                    0
                );

              case METRICS.DISPATCH_TARGET:
                return (
                  order
                    .dispatchTargetMT >
                  0
                );

              case METRICS.ACTUAL_DISPATCH:
                return (
                  order
                    .actualDispatchMT >
                  0
                );

              case METRICS.TARGET_PENDING:
                return (
                  order
                    .targetPendingMT >
                  0
                );

              case METRICS.ORDER_BALANCE:
                return (
                  order
                    .orderBalanceMT >
                  0
                );

              default:
                return false;
            }
          }
        );

    if (grade) {
      const wantedGrade =
        normalizeGrade(
          grade
        );

      orders =
        orders.filter(
          (order) =>
            order.grades.some(
              (item) =>
                normalizeGrade(
                  item.grade
                ) ===
                wantedGrade
            )
        );
    }

    const getMetricQuantity =
      (order) => {
        switch (metric) {
          case METRICS.NEW_ORDER:
            return order
              .orderedMT;

          case METRICS.DISPATCH_TARGET:
            return order
              .dispatchTargetMT;

          case METRICS.ACTUAL_DISPATCH:
            return order
              .actualDispatchMT;

          case METRICS.TARGET_PENDING:
            return order
              .targetPendingMT;

          case METRICS.ORDER_BALANCE:
            return order
              .orderBalanceMT;

          default:
            return 0;
        }
      };

    const totalMT =
      roundMT(
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            toNumber(
              getMetricQuantity(
                order
              )
            ),
          0
        )
      );

    orders.sort(
      (a, b) =>
        toNumber(
          getMetricQuantity(
            b
          )
        ) -
        toNumber(
          getMetricQuantity(
            a
          )
        )
    );

    return {
      generatedAt:
        new Date(),

      metric,

      filters:
        analytics.filters,

      period:
        analytics.period,

      totalMT,

      orderCount:
        orders.length,

      orders:
        orders.map(
          (order) => ({
            ...order,

            metric,

            metricQuantityMT:
              roundMT(
                getMetricQuantity(
                  order
                )
              ),
          })
        ),
    };
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getSteelAnalytics,

  getSteelAnalyticsSummary,

  getSteelAnalyticsDrillDown,

  parseQuantityToMetricTon,

  extractGradeFromText,

  extractSalesOrderItems,
};