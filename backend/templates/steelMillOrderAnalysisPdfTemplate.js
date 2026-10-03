/* =========================================================
   STEEL MILL ORDER ANALYSIS PDF TEMPLATE
   BHARAT SPECIAL STEELS

   PURPOSE
   ---------------------------------------------------------
   - Management order booking insight only
   - Steel mill wise order register
   - Supply-condition-aware PDF
   - Customer column optional
   - A4 portrait for strong mobile readability
   - NO dispatch / logistics information
   - NO grade analysis charts
   - NO size column
   ========================================================= */


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const safeNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : 0;
};


const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


const cleanText = (
  value,
  fallback = "—"
) => {
  const text = String(
    value ?? ""
  ).trim();

  return text || fallback;
};


const formatNumber = (
  value,
  decimals = 0
) =>
  safeNumber(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }
  );


const formatKG = (value) =>
  `${formatNumber(value, 0)} KG`;


const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return cleanText(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};


/* =========================================================
   SUPPLY CONDITION
   ========================================================= */

const normalizeConditionKey = (
  value
) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "and")
    .replace(/\//g, "_or_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");


const SUPPLY_CONDITION_LABELS = {
  all: "All Conditions",
  all_condition: "All Conditions",
  all_conditions: "All Conditions",

  as_per_standard:
    "As Per Standard",

  as_rolled:
    "As Rolled",

  rolled:
    "As Rolled",

  as_forged:
    "As Forged",

  forged:
    "As Forged",

  annealed:
    "Annealed",

  as_rolled_annealed:
    "As Rolled Annealed",

  as_forged_annealed:
    "As Forged Annealed",

  as_rolled_or_forged_annealed:
    "Rolled / Forged Annealed",

  as_rolled_or_as_forged_annealed:
    "Rolled / Forged Annealed",

  normalised:
    "Normalised",

  normalized:
    "Normalised",

  as_rolled_normalised:
    "As Rolled Normalised",

  as_rolled_normalized:
    "As Rolled Normalised",

  as_forged_normalised:
    "As Forged Normalised",

  as_forged_normalized:
    "As Forged Normalised",

  as_rolled_or_as_forged_normalised:
    "Rolled / Forged Normalised",

  as_rolled_or_as_forged_normalized:
    "Rolled / Forged Normalised",

  qt:
    "Q&T",

  q_t:
    "Q&T",

  q_and_t:
    "Q&T",

  quenched_tempered:
    "Q&T",

  quenched_and_tempered:
    "Q&T",

  as_rolled_qt:
    "As Rolled Q&T",

  as_forged_qt:
    "As Forged Q&T",

  as_rolled_or_as_forged_qt:
    "Rolled / Forged Q&T",

  other:
    "Other",
};


const formatSupplyCondition = (
  value
) => {
  const key =
    normalizeConditionKey(
      value
    );

  if (!key) {
    return "All Conditions";
  }

  if (
    SUPPLY_CONDITION_LABELS[
      key
    ]
  ) {
    return SUPPLY_CONDITION_LABELS[
      key
    ];
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};


/*
 * Converts condition variants to a comparison group.
 *
 * IMPORTANT:
 * as_forged and as_forged_annealed remain DIFFERENT.
 * This prevents a broad "forged" match from returning
 * the wrong supply condition.
 */
const getConditionComparisonKey = (
  value
) => {
  const key =
    normalizeConditionKey(
      value
    );

  const aliases = {
    rolled:
      "as_rolled",

    forged:
      "as_forged",

    normalized:
      "normalised",

    q_t:
      "qt",

    q_and_t:
      "qt",

    quenched_tempered:
      "qt",

    quenched_and_tempered:
      "qt",

    as_rolled_normalized:
      "as_rolled_normalised",

    as_forged_normalized:
      "as_forged_normalised",

    as_rolled_or_as_forged_normalized:
      "as_rolled_or_as_forged_normalised",

    as_rolled_or_forged_normalized:
      "as_rolled_or_as_forged_normalised",

    as_rolled_or_forged_normalised:
      "as_rolled_or_as_forged_normalised",

    as_rolled_or_forged_annealed:
      "as_rolled_or_as_forged_annealed",
  };

  return (
    aliases[key] ||
    key
  );
};


/* =========================================================
   ORDER FIELD HELPERS
   ========================================================= */

const getPoDate = (
  order = {}
) =>
  order.poDate ||
  order.orderDate ||
  order.createdAt ||
  order.date ||
  null;


const getCompany = (
  order = {}
) =>
  cleanText(
    order.companyName ||
      order.customerName ||
      order.company ||
      order.customer
  );


const getPoNumber = (
  order = {}
) =>
  cleanText(
    order.poNumber ||
      order.poNo ||
      order.purchaseOrderNumber ||
      order.orderRef
  );


const getSalesPerson = (
  order = {}
) =>
  cleanText(
    order.salesPersonName ||
      order.salesPerson ||
      order.executiveName ||
      order.salesExecutive
  );


/*
 * DO NOT use supplyFinish here.
 *
 * supplyFinish can be a separate Sales Order field.
 * PDF supply-condition filtering must use the
 * actual supply-condition field.
 */
const getRawSupplyCondition = (
  order = {}
) =>
  cleanText(
    order.supplyCondition ||
      order.condition ||
      order.supplyConditionName,
    ""
  );


const getOtherSupplyCondition = (
  order = {}
) =>
  cleanText(
    order.otherSupplyConditions ||
      order.otherSupplyCondition ||
      order.otherCondition,
    ""
  );


const getSupplyCondition = (
  order = {}
) => {
  const raw =
    getRawSupplyCondition(
      order
    );

  if (!raw) {
    return "—";
  }

  const conditionKey =
    normalizeConditionKey(
      raw
    );

  /*
   * IMPORTANT:
   *
   * Database stores:
   *
   * supplyCondition: "other"
   * otherSupplyConditions: "actual entered text"
   *
   * So never print only "Other" when the
   * actual entered supply-condition text exists.
   */
  if (
    conditionKey === "other"
  ) {
    const otherText =
      getOtherSupplyCondition(
        order
      );

    if (otherText) {
      return otherText;
    }

    return "Other";
  }

  return formatSupplyCondition(
    raw
  );
};

/* =========================================================
   GRADE EXTRACTION
   ========================================================= */

const getGrade = (
  order = {}
) => {
  const grades = [];

  const pushGrade = (
    value
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (
      Array.isArray(value)
    ) {
      value.forEach(
        pushGrade
      );

      return;
    }

    if (
      typeof value ===
      "object"
    ) {
      pushGrade(
        value.grade ||
          value.gradeName ||
          value.materialGrade ||
          value.steelGrade
      );

      return;
    }

    const grade =
      String(value)
        .trim();

    if (!grade) {
      return;
    }

    const badValues = [
      "undefined",
      "null",
      "unidentified",
      "n/a",
      "na",
      "-",
      "—",
    ];

    if (
      badValues.includes(
        grade.toLowerCase()
      )
    ) {
      return;
    }

    const alreadyExists =
      grades.some(
        (existing) =>
          existing
            .toLowerCase() ===
          grade.toLowerCase()
      );

    if (!alreadyExists) {
      grades.push(grade);
    }
  };


  /*
   * Main normalized grade array.
   */
  if (
    Array.isArray(
      order.grades
    )
  ) {
    order.grades.forEach(
      (item) => {
        pushGrade(item);
      }
    );
  }


  /*
   * IMPORTANT:
   * Actual Sales Order material rows.
   */
  if (
    Array.isArray(
      order.sizeGradeQuantityRate
    )
  ) {
    order
      .sizeGradeQuantityRate
      .forEach(
        (item) => {
          pushGrade(
            item?.grade ||
              item?.gradeName ||
              item?.materialGrade ||
              item?.steelGrade
          );
        }
      );
  }


  /*
   * Other possible item arrays.
   */
  const itemArrays = [
    order.items,
    order.products,
    order.orderItems,
    order.materials,
    order.orderDetails,
  ];

  itemArrays.forEach(
    (items) => {
      if (
        !Array.isArray(items)
      ) {
        return;
      }

      items.forEach(
        (item) => {
          pushGrade(
            item?.grade ||
              item?.gradeName ||
              item?.materialGrade ||
              item?.steelGrade
          );
        }
      );
    }
  );


  /*
   * Direct fallback.
   */
  pushGrade(
    order.grade ||
      order.gradeName ||
      order.materialGrade ||
      order.steelGrade
  );


  return grades.length
    ? grades.join(", ")
    : "—";
};


/* =========================================================
   QUANTITY EXTRACTION
   ========================================================= */

const getOrderQuantity = (
  order = {}
) => {
  const direct =
    order.quantityKG ??
    order.orderKG ??
    order.orderQuantityKG ??
    order.orderTakenKG ??
    order.orderedKG ??
    order.totalOrderKG ??
    order.totalQuantityKG;

  if (
    direct !== undefined &&
    direct !== null &&
    direct !== ""
  ) {
    return safeNumber(
      direct
    );
  }

  /*
   * If normalized total is not available,
   * try actual material rows.
   */
  if (
    Array.isArray(
      order.sizeGradeQuantityRate
    ) &&
    order.sizeGradeQuantityRate.length
  ) {
    const itemTotal =
      order
        .sizeGradeQuantityRate
        .reduce(
          (
            total,
            item
          ) => {
            const quantity =
              item?.quantityKG ??
              item?.orderQuantityKG ??
              item?.quantityInKg ??
              item?.qtyKG ??
              item?.totalKG;

            return (
              total +
              safeNumber(
                quantity
              )
            );
          },
          0
        );

    if (itemTotal > 0) {
      return itemTotal;
    }
  }

  return safeNumber(
    order.quantity
  );
};


/* =========================================================
   PERIOD
   ========================================================= */

const getPeriodLabel = (
  period = {}
) => {
  if (period.label) {
    return cleanText(
      period.label
    );
  }

  if (
    period.from &&
    period.to
  ) {
    return (
      `${formatDate(
        period.from
      )} – ` +
      `${formatDate(
        period.to
      )}`
    );
  }

  return "Selected Period";
};


/* =========================================================
   FILTERING
   ========================================================= */

const isAllConditions = (
  value
) => {
  const key =
    getConditionComparisonKey(
      value
    );

  return (
    !key ||
    key === "all" ||
    key === "all_condition" ||
    key === "all_conditions"
  );
};


const orderMatchesSupplyCondition =
  (
    order,
    selectedCondition
  ) => {
    if (
      isAllConditions(
        selectedCondition
      )
    ) {
      return true;
    }

    const selectedKey =
      getConditionComparisonKey(
        selectedCondition
      );

    const orderKey =
      getConditionComparisonKey(
        getRawSupplyCondition(
          order
        )
      );

    if (!orderKey) {
      return false;
    }

    return (
      orderKey ===
      selectedKey
    );
  };


const filterOrders = ({
  orders = [],
  supplyCondition,
}) => {
  const safeOrders =
    Array.isArray(orders)
      ? orders
      : [];

  if (
    isAllConditions(
      supplyCondition
    )
  ) {
    return safeOrders;
  }

  return safeOrders.filter(
    (order) =>
      orderMatchesSupplyCondition(
        order,
        supplyCondition
      )
  );
};


/* =========================================================
   ORDER ROW
   ========================================================= */

const buildOrderRow = ({
  order,
  index,
  includeCustomerName,
}) => {
  const customerCell =
    includeCustomerName
      ? `
        <td class="customer-cell">
          ${escapeHtml(
            getCompany(order)
          )}
        </td>
      `
      : "";

  return `
    <tr>

      <td class="serial-cell">
        ${String(
          index + 1
        ).padStart(
          2,
          "0"
        )}
      </td>

      <td class="date-cell">
        ${escapeHtml(
          formatDate(
            getPoDate(order)
          )
        )}
      </td>

      ${customerCell}

      <td class="po-cell">
        ${escapeHtml(
          getPoNumber(order)
        )}
      </td>

      <td class="grade-cell">
        ${escapeHtml(
          getGrade(order)
        )}
      </td>

      <td class="condition-cell">
        ${escapeHtml(
          getSupplyCondition(
            order
          )
        )}
      </td>

      <td class="qty-cell">
        ${escapeHtml(
          formatKG(
            getOrderQuantity(
              order
            )
          )
        )}
      </td>

      <td class="sales-cell">
        ${escapeHtml(
          getSalesPerson(
            order
          )
        )}
      </td>

    </tr>
  `;
};


/* =========================================================
   MAIN TEMPLATE
   ========================================================= */

const buildSteelMillOrderAnalysisPdfHtml =
  ({
    mill = "Steel Mill",
    period = {},
    supplyCondition =
      "All Conditions",
    orders = [],
    includeCustomerName =
      true,
  } = {}) => {

    /*
     * IMPORTANT:
     *
     * The PDF itself applies the selected
     * supply-condition filter.
     *
     * Therefore:
     * - summary order count
     * - summary quantity
     * - register rows
     *
     * are all based on the SAME data.
     */
    const filteredOrders =
      filterOrders({
        orders,
        supplyCondition,
      });


    const totalQuantity =
      filteredOrders.reduce(
        (
          total,
          order
        ) =>
          total +
          getOrderQuantity(
            order
          ),
        0
      );


    const displayCondition =
      isAllConditions(
        supplyCondition
      )
        ? "All Conditions"
        : formatSupplyCondition(
            supplyCondition
          );


    const columnCount =
      includeCustomerName
        ? 8
        : 7;


    const rows =
      filteredOrders.length
        ? filteredOrders
            .map(
              (
                order,
                index
              ) =>
                buildOrderRow({
                  order,
                  index,
                  includeCustomerName,
                })
            )
            .join("")
        : `
          <tr>
            <td
              class="empty-cell"
              colspan="${columnCount}"
            >
              <div class="empty-title">
                No orders found
              </div>

              <div class="empty-subtitle">
                No sales orders match the selected
                steel mill, period and supply condition.
              </div>
            </td>
          </tr>
        `;


    const customerHeader =
      includeCustomerName
        ? `
          <th class="customer-col">
            CUSTOMER
          </th>
        `
        : "";


    const tableModeClass =
      includeCustomerName
        ? "with-customer"
        : "without-customer";


    return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  ${escapeHtml(
    mill
  )} - Management Order Analysis
</title>


<style>

  /* =======================================================
     PRINT / PAGE
     ======================================================= */

  @page {
    size: A4 portrait;
    margin:
      7mm
      6mm
      8mm
      6mm;
  }


  * {
    box-sizing:
      border-box;
  }


  :root {
    --page:
      #f4f1e9;

    --surface:
      #fbfaf6;

    --surface-alt:
      #f0eee7;

    --navy:
      #191b45;

    --navy-deep:
      #131632;

    --purple:
      #493ca1;

    --purple-2:
      #6550c7;

    --purple-soft:
      #ece9fb;

    --text:
      #1d2338;

    --text-secondary:
      #51596d;

    --muted:
      #7b8295;

    --border:
      #c9c8c4;

    --border-strong:
      #aaabb3;

    --table-head:
      #e6e8ef;
  }


  html,
  body {
    margin: 0;

    padding: 0;

    width: 100%;

    font-family:
      Arial,
      Helvetica,
      sans-serif;

    color:
      var(--text);

    background:
      var(--page);

    -webkit-print-color-adjust:
      exact;

    print-color-adjust:
      exact;
  }


  body {
    min-height:
      100vh;
  }


  .report {
    width: 100%;

    min-height:
      100vh;

    background:
      var(--page);
  }



  /* =======================================================
     HEADER
     ======================================================= */

  .report-header {
    position:
      relative;

    overflow:
      hidden;

    padding:
      15px
      16px
      14px;

    color:
      #ffffff;

    background:
      linear-gradient(
        128deg,
        #171a3f 0%,
        #20235c 56%,
        #3b3189 100%
      );

    border-radius:
      8px;
  }


  .report-header::before {
    content: "";

    position:
      absolute;

    top:
      -78px;

    right:
      -62px;

    width:
      210px;

    height:
      210px;

    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.09
      );

    border-radius:
      50%;
  }


  .report-header::after {
    content: "";

    position:
      absolute;

    top:
      -35px;

    right:
      -22px;

    width:
      128px;

    height:
      128px;

    background:
      rgba(
        255,
        255,
        255,
        0.025
      );

    border-radius:
      50%;
  }


  .header-top {
    position:
      relative;

    z-index: 2;

    display:
      flex;

    align-items:
      flex-start;

    justify-content:
      space-between;

    gap:
      18px;
  }


  .brand-eyebrow {
    margin-bottom:
      4px;

    color:
      #c8cdfd;

    font-size:
      6.7px;

    font-weight:
      800;

    line-height:
      1.2;

    letter-spacing:
      1.65px;
  }


  .company-name {
    margin: 0;

    color:
      #ffffff;

    font-size:
      17px;

    font-weight:
      800;

    line-height:
      1.12;

    letter-spacing:
      0.1px;
  }


  .company-subtitle {
    margin-top:
      4px;

    color:
      #d5d9ec;

    font-size:
      7px;

    font-weight:
      500;

    letter-spacing:
      0.25px;
  }


  .report-tag {
    position:
      relative;

    z-index: 2;

    min-width:
      94px;

    padding:
      6px
      8px;

    text-align:
      right;

    background:
      rgba(
        255,
        255,
        255,
        0.07
      );

    border:
      1px solid
      rgba(
        255,
        255,
        255,
        0.12
      );

    border-radius:
      6px;
  }


  .report-tag span {
    display:
      block;

    color:
      #cbd0fb;

    font-size:
      5.5px;

    font-weight:
      800;

    letter-spacing:
      0.8px;
  }


  .report-tag strong {
    display:
      block;

    margin-top:
      2px;

    color:
      #ffffff;

    font-size:
      8px;

    font-weight:
      800;
  }


  .mill-heading {
    position:
      relative;

    z-index: 2;

    margin-top:
      13px;

    padding-top:
      11px;

    border-top:
      1px solid
      rgba(
        255,
        255,
        255,
        0.14
      );
  }


  .mill-heading-label {
    display:
      block;

    margin-bottom:
      3px;

    color:
      #adb5ff;

    font-size:
      6px;

    font-weight:
      800;

    letter-spacing:
      1.1px;
  }


  .mill-heading h1 {
    margin: 0;

    max-width:
      82%;

    color:
      #ffffff;

    font-size:
      18px;

    font-weight:
      800;

    line-height:
      1.14;
  }


  .mill-heading p {
    margin:
      4px
      0
      0;

    color:
      #d7daeb;

    font-size:
      7px;

    font-weight:
      500;

    line-height:
      1.4;
  }



  /* =======================================================
     ANALYSIS CONTEXT
     ======================================================= */

  .analysis-context {
    display:
      grid;

    grid-template-columns:
      1.35fr
      1fr;

    margin-top:
      7px;

    overflow:
      hidden;

    background:
      var(--surface);

    border:
      1px solid
      #d2d1ce;

    border-radius:
      6px;
  }


  .context-item {
    min-height:
      42px;

    padding:
      8px
      10px;

    border-right:
      1px solid
      #deddd8;
  }


  .context-item:last-child {
    border-right: 0;
  }


  .context-label {
    display:
      block;

    margin-bottom:
      4px;

    color:
      #777f93;

    font-size:
      5.8px;

    font-weight:
      800;

    letter-spacing:
      0.8px;
  }


  .context-value {
    color:
      #252b42;

    font-size:
      8.5px;

    font-weight:
      800;

    line-height:
      1.25;
  }


  .condition-value {
    color:
      var(--purple);
  }



  /* =======================================================
     SUMMARY
     ======================================================= */

  .summary-grid {
    display:
      grid;

    grid-template-columns:
      1fr
      1fr;

    gap:
      7px;

    margin-top:
      7px;
  }


  .summary-card {
    position:
      relative;

    overflow:
      hidden;

    min-height:
      57px;

    padding:
      9px
      11px
      9px
      13px;

    background:
      var(--surface);

    border:
      1px solid
      #d0cfcb;

    border-radius:
      6px;
  }


  .summary-card::before {
    content: "";

    position:
      absolute;

    top: 0;

    bottom: 0;

    left: 0;

    width:
      3px;

    background:
      var(--purple-2);
  }


  .summary-label {
    display:
      block;

    margin-bottom:
      5px;

    color:
      #747c91;

    font-size:
      5.8px;

    font-weight:
      800;

    letter-spacing:
      0.85px;
  }


  .summary-value {
    display:
      block;

    color:
      #171c34;

    font-size:
      17px;

    font-weight:
      800;

    line-height:
      1;
  }


  .summary-subtitle {
    display:
      block;

    margin-top:
      5px;

    color:
      #8a91a1;

    font-size:
      5.8px;

    font-weight:
      500;
  }



  /* =======================================================
     REGISTER HEADER
     ======================================================= */

  .register-head {
    display:
      flex;

    align-items:
      flex-end;

    justify-content:
      space-between;

    gap:
      15px;

    margin-top:
      10px;

    margin-bottom:
      5px;
  }


  .register-eyebrow {
    display:
      block;

    margin-bottom:
      2px;

    color:
      var(--purple);

    font-size:
      5.8px;

    font-weight:
      800;

    letter-spacing:
      1px;
  }


  .register-head h2 {
    margin: 0;

    color:
      #171c34;

    font-size:
      11px;

    font-weight:
      800;

    line-height:
      1.2;
  }


  .register-head p {
    margin:
      2px
      0
      0;

    color:
      #747c8f;

    font-size:
      6.2px;

    line-height:
      1.3;
  }


  .register-count {
    flex:
      0
      0
      auto;

    color:
      #60697d;

    font-size:
      6.3px;

    font-weight:
      700;

    white-space:
      nowrap;
  }



  /* =======================================================
     TABLE
     ======================================================= */

  .table-shell {
    width: 100%;

    overflow:
      hidden;

    background:
      var(--surface);

    border:
      1px solid
      var(--border-strong);

    border-radius:
      6px;
  }


  table {
    width: 100%;

    table-layout:
      fixed;

    border-collapse:
      collapse;

    border-spacing:
      0;
  }


  thead {
    display:
      table-header-group;
  }


  tr {
    page-break-inside:
      avoid;

    break-inside:
      avoid;
  }


  th {
    padding:
      7px
      4px;

    color:
      #424a62;

    font-size:
      6.5px;

    font-weight:
      800;

    line-height:
      1.25;

    letter-spacing:
      0.3px;

    text-align:
      center;

    vertical-align:
      middle;

    background:
      var(--table-head);

    border-right:
      1px solid
      #b7bac4;

    border-bottom:
      1px solid
      #a9adb8;
  }


  th:last-child {
    border-right: 0;
  }


  td {
    padding:
      7px
      4px;

    color:
      #2c3348;

    font-size:
      7.2px;

    font-weight:
      600;

    line-height:
      1.35;

    vertical-align:
      middle;

    background:
      #fbfaf6;

    border-right:
      1px solid
      #c8c7c3;

    border-bottom:
      1px solid
      #c8c7c3;

    overflow-wrap:
      anywhere;

    word-break:
      normal;
  }


  td:last-child {
    border-right: 0;
  }


  tbody tr:last-child td {
    border-bottom: 0;
  }


  tbody tr:nth-child(even) td {
    background:
      #f0eee7;
  }


  .serial-cell,
  .date-cell,
  .grade-cell,
  .condition-cell,
  .sales-cell {
    text-align:
      center;
  }


  .customer-cell,
  .po-cell {
    text-align:
      left;
  }


  .serial-cell {
    color:
      #70778a;

    font-weight:
      700;
  }


  .customer-cell {
    color:
      #20263b;

    font-weight:
      700;
  }


  .po-cell {
    color:
      #3f4659;

    font-size:
      6.8px;

    font-weight:
      600;
  }


  .grade-cell {
    color:
      var(--navy);

    font-weight:
      800;
  }


  .condition-cell {
    color:
      #423779;

    font-weight:
      700;
  }


  .qty-cell {
    color:
      var(--navy);

    font-size:
      7.5px;

    font-weight:
      800;

    text-align:
      right;

    white-space:
      nowrap;
  }


  .sales-cell {
    color:
      #30364a;

    font-weight:
      700;
  }



  /* =======================================================
     WITH CUSTOMER WIDTHS
     ======================================================= */

  .with-customer .serial-col {
    width: 5%;
  }

  .with-customer .date-col {
    width: 11%;
  }

  .with-customer .customer-col {
    width: 20%;
  }

  .with-customer .po-col {
    width: 18%;
  }

  .with-customer .grade-col {
    width: 12%;
  }

  .with-customer .condition-col {
    width: 14%;
  }

  .with-customer .qty-col {
    width: 11%;
  }

  .with-customer .sales-col {
    width: 9%;
  }



  /* =======================================================
     WITHOUT CUSTOMER WIDTHS
     ======================================================= */

  .without-customer .serial-col {
    width: 6%;
  }

  .without-customer .date-col {
    width: 13%;
  }

  .without-customer .po-col {
    width: 23%;
  }

  .without-customer .grade-col {
    width: 15%;
  }

  .without-customer .condition-col {
    width: 17%;
  }

  .without-customer .qty-col {
    width: 14%;
  }

  .without-customer .sales-col {
    width: 12%;
  }



  /* =======================================================
     EMPTY STATE
     ======================================================= */

  .empty-cell {
    padding:
      28px
      10px;

    text-align:
      center;
  }


  .empty-title {
    color:
      #373e52;

    font-size:
      9px;

    font-weight:
      800;
  }


  .empty-subtitle {
    margin-top:
      4px;

    color:
      #838a99;

    font-size:
      6.5px;

    font-weight:
      500;
  }



  /* =======================================================
     FOOTER
     ======================================================= */

  .footer-note {
    display:
      flex;

    align-items:
      center;

    justify-content:
      space-between;

    gap:
      12px;

    margin-top:
      7px;

    padding-top:
      5px;

    color:
      #858b99;

    font-size:
      5.5px;

    border-top:
      1px solid
      #d2d0ca;
  }


  .footer-note strong {
    color:
      #606779;

    font-weight:
      800;
  }


  /* =======================================================
     PRINT PROTECTION
     ======================================================= */

  .report-header,
  .analysis-context,
  .summary-grid,
  .register-head {
    break-inside:
      avoid;

    page-break-inside:
      avoid;
  }


  @media print {

    html,
    body {
      width: 100%;

      background:
        var(--page);
    }

    .report {
      width: 100%;
    }
  }

</style>

</head>


<body>

<main class="report">


  <!-- ===================================================
       REPORT HEADER
       =================================================== -->

  <header class="report-header">

    <div class="header-top">

      <div>

        <div class="brand-eyebrow">
          BHARAT SPECIAL STEELS
        </div>

        <div class="company-name">
          Management Order Analysis
        </div>

        <div class="company-subtitle">
          Steel Mill Order Register
        </div>

      </div>


      <div class="report-tag">

        <span>
          REPORT TYPE
        </span>

        <strong>
          STEEL MILL
        </strong>

      </div>

    </div>


    <div class="mill-heading">

      <span class="mill-heading-label">
        SELECTED STEEL MILL
      </span>

      <h1>
        ${escapeHtml(
          mill
        )}
      </h1>

      <p>
        Management order booking insight for the selected analysis period.
      </p>

    </div>

  </header>



  <!-- ===================================================
       FILTER CONTEXT
       Only meaningful business filters are shown.
       No "Customer Visibility" text.
       =================================================== -->

  <section class="analysis-context">

    <div class="context-item">

      <span class="context-label">
        ANALYSIS PERIOD
      </span>

      <div class="context-value">
        ${escapeHtml(
          getPeriodLabel(
            period
          )
        )}
      </div>

    </div>


    <div class="context-item">

      <span class="context-label">
        SUPPLY CONDITION
      </span>

      <div
        class="
          context-value
          condition-value
        "
      >
        ${escapeHtml(
          displayCondition
        )}
      </div>

    </div>

  </section>



  <!-- ===================================================
       MANAGEMENT SUMMARY
       =================================================== -->

  <section class="summary-grid">

    <div class="summary-card">

      <span class="summary-label">
        SALES ORDERS
      </span>

      <strong class="summary-value">
        ${formatNumber(
          filteredOrders.length
        )}
      </strong>

      <small class="summary-subtitle">
        Orders matching the selected filters
      </small>

    </div>


    <div class="summary-card">

      <span class="summary-label">
        ORDER QUANTITY
      </span>

      <strong class="summary-value">
        ${escapeHtml(
          formatKG(
            totalQuantity
          )
        )}
      </strong>

      <small class="summary-subtitle">
        Total booked quantity for matching orders
      </small>

    </div>

  </section>



  <!-- ===================================================
       ORDER REGISTER
       =================================================== -->

  <section>

    <div class="register-head">

      <div>

        <span class="register-eyebrow">
          ORDER REGISTER
        </span>

        <h2>
          ${escapeHtml(
            mill
          )}
        </h2>

        <p>
          Sales orders matching the selected management filters.
        </p>

      </div>


      <div class="register-count">
        ${formatNumber(
          filteredOrders.length
        )}
        ${
          filteredOrders.length === 1
            ? "order"
            : "orders"
        }
      </div>

    </div>


    <div class="table-shell">

      <table
        class="${tableModeClass}"
      >

        <thead>

          <tr>

            <th class="serial-col">
              #
            </th>

            <th class="date-col">
              PO DATE
            </th>

            ${customerHeader}

            <th class="po-col">
              PO NUMBER
            </th>

            <th class="grade-col">
              GRADE
            </th>

            <th class="condition-col">
              SUPPLY CONDITION
            </th>

            <th class="qty-col">
              ORDER QTY.
            </th>

            <th class="sales-col">
              SALES PERSON
            </th>

          </tr>

        </thead>


        <tbody>

          ${rows}

        </tbody>

      </table>

    </div>

  </section>



  <!-- ===================================================
       FOOTER
       =================================================== -->

  <footer class="footer-note">

    <span>
      <strong>
        Bharat Special Steels
      </strong>
      &nbsp;•&nbsp;
      Management Order Analysis
    </span>

    <span>
      Generated from Bharat RMS
    </span>

  </footer>


</main>

</body>

</html>
    `;
  };


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  buildSteelMillOrderAnalysisPdfHtml,

  /*
   * Exported intentionally so the backend PDF service
   * can apply EXACTLY the same filter before template
   * generation if required.
   */
  filterOrders,

  getConditionComparisonKey,

  formatSupplyCondition,
};