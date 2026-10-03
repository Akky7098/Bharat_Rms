/* =========================================================
   MANAGEMENT ORDER ANALYSIS
   H.O. PDF TEMPLATE

   Premium management PDF for
   Head Office Sales Order Analysis.

   PRESENTATION ONLY.

   No MongoDB queries.
   No Puppeteer launch.
   No business calculation source of truth.

   Backend service supplies normalized data.
========================================================= */


/* =========================================================
   ESCAPE HTML
========================================================= */

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


/* =========================================================
   SAFE NUMBER
========================================================= */

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


/* =========================================================
   FORMAT NUMBER
========================================================= */

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


/* =========================================================
   FORMAT KG
========================================================= */

const formatKG = (value) =>
  `${formatNumber(value, 2)} KG`;


/* =========================================================
   FORMAT DATE
========================================================= */

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
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};


/* =========================================================
   FORMAT SHORT DATE
========================================================= */

const formatShortDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
};


/* =========================================================
   FORMAT PERIOD
========================================================= */

const formatPeriod = (
  period = {}
) => {
  const from =
    formatDate(
      period.from
    );

  const to =
    formatDate(
      period.to
    );

  if (
    from !== "—" &&
    to !== "—"
  ) {
    return `${from} - ${to}`;
  }

  return (
    period.label ||
    period.month ||
    "Selected Period"
  );
};


/* =========================================================
   PERIOD TITLE
========================================================= */

const getPeriodTitle = (
  period = {}
) => {
  if (
    period.label &&
    String(
      period.label
    ).trim()
  ) {
    return String(
      period.label
    ).trim();
  }

  if (
    period.month &&
    String(
      period.month
    ).trim()
  ) {
    const monthValue =
      String(
        period.month
      ).trim();

    const match =
      monthValue.match(
        /^(\d{4})-(\d{2})$/
      );

    if (match) {
      const year =
        Number(
          match[1]
        );

      const month =
        Number(
          match[2]
        );

      const date =
        new Date(
          year,
          month - 1,
          1
        );

      return date
        .toLocaleDateString(
          "en-IN",
          {
            month: "short",
            year: "numeric",
          }
        )
        .toUpperCase();
    }

    return monthValue
      .toUpperCase();
  }

  if (period.from) {
    const date =
      new Date(
        period.from
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date
        .toLocaleDateString(
          "en-IN",
          {
            month: "short",
            year: "numeric",
          }
        )
        .toUpperCase();
    }
  }

  return "SELECTED PERIOD";
};


/* =========================================================
   GET ORDER QUANTITY
========================================================= */

const getOrderQuantity = (
  order = {}
) =>
  safeNumber(
    order.quantityKG ??
      order.orderQuantityKG ??
      order.orderKG ??
      order.orderedKG ??
      order.orderTakenKG ??
      order.totalOrderKG ??
      order.totalQuantityKG ??
      order.quantity ??
      0
  );


/* =========================================================
   GET GRADES
========================================================= */

const getGrades = (
  order = {}
) => {
  if (
    Array.isArray(
      order.grades
    )
  ) {
    return [
      ...new Set(
        order.grades
          .map((item) =>
            typeof item === "string"
              ? item
              : (
                  item?.grade ||
                  item?.gradeName ||
                  ""
                )
          )
          .filter(Boolean)
      ),
    ];
  }

  if (
    Array.isArray(
      order.sizeGradeQuantityRate
    )
  ) {
    const grades =
      order.sizeGradeQuantityRate
        .map(
          (item) =>
            item?.grade ||
            item?.gradeName ||
            item?.materialGrade ||
            ""
        )
        .filter(Boolean);

    return [
      ...new Set(
        grades
      ),
    ];
  }

  const grade =
    order.grade ||
    order.gradeName ||
    order.materialGrade ||
    order.steelGrade;

  return grade
    ? [grade]
    : [];
};


/* =========================================================
   GET COMPANY NAME
========================================================= */

const getCompanyName = (
  order = {}
) =>
  order.companyName ||
  order.customerName ||
  order.company ||
  order.customer ||
  order.partyName ||
  "—";


/* =========================================================
   GET PO NUMBER
========================================================= */

const getPONumber = (
  order = {}
) =>
  order.poNumber ||
  order.customerPONumber ||
  order.customerPoNumber ||
  order.customerPO ||
  order.poNo ||
  order.purchaseOrderNumber ||
  order.orderRef ||
  "—";


/* =========================================================
   GET ORDER DATE

   Booking date priority:
   bookingDate
   createdAt
   poDate
   orderDate
========================================================= */

const getOrderDate = (
  order = {}
) =>
  order.bookingDate ||
  order.createdAt ||
  order.poDate ||
  order.orderDate ||
  order.date ||
  null;


/* =========================================================
   GET SALES PERSON
========================================================= */

const getSalesPerson = (
  order = {}
) =>
  order.salesPersonName ||
  order.salesPerson ||
  order.salesExecutive ||
  order.salesExecutiveName ||
  order.createdByName ||
  "—";


/* =========================================================
   GRADE ORDER COUNT
========================================================= */

const getGradeOrderCount = (
  grade = {}
) =>
  safeNumber(
    grade.orderCount ??
      grade.totalOrders ??
      grade.orders ??
      grade.salesOrderCount ??
      grade.count ??
      0
  );


/* =========================================================
   GRADE QUANTITY
========================================================= */

const getGradeQuantity = (
  grade = {}
) =>
  safeNumber(
    grade.quantityKG ??
      grade.orderQuantityKG ??
      grade.orderKG ??
      grade.orderedKG ??
      grade.orderTakenKG ??
      grade.totalOrderKG ??
      grade.totalQuantityKG ??
      grade.quantity ??
      0
  );


/* =========================================================
   GRADE NAME
========================================================= */

const getGradeName = (
  grade = {}
) =>
  grade.grade ||
  grade.gradeName ||
  grade.materialGrade ||
  grade.steelGrade ||
  "Unknown";


/* =========================================================
   RENDER ORDER ROWS
========================================================= */

const renderOrderRows = (
  orders = []
) => {
  if (
    !Array.isArray(
      orders
    ) ||
    !orders.length
  ) {
    return `
      <tr>
        <td
          colspan="7"
          class="empty-row"
        >
          No H.O. sales orders found
          for the selected period.
        </td>
      </tr>
    `;
  }

  return orders
    .map(
      (
        order,
        index
      ) => {
        const grades =
          getGrades(
            order
          );

        const gradeText =
          grades.length
            ? grades.join(", ")
            : "—";

        return `
          <tr>

            <td class="serial-cell">
              <div class="cell-center">
                ${index + 1}
              </div>
            </td>

            <td class="customer-cell">
              <div class="cell-center">
                <strong class="company-name">
                  ${escapeHtml(
                    getCompanyName(
                      order
                    )
                  )}
                </strong>
              </div>
            </td>

            <td class="po-cell">
              <div class="cell-center">
                ${escapeHtml(
                  getPONumber(
                    order
                  )
                )}
              </div>
            </td>

            <td class="date-cell">
              <div class="cell-center">
                ${escapeHtml(
                  formatShortDate(
                    getOrderDate(
                      order
                    )
                  )
                )}
              </div>
            </td>

            <td class="order-grade-cell">
              <div class="cell-center">

                <span class="order-grade-badge">
                  ${escapeHtml(
                    gradeText
                  )}
                </span>

              </div>
            </td>

            <td class="order-quantity-cell">
              <div class="cell-center quantity-value">
                ${escapeHtml(
                  formatKG(
                    getOrderQuantity(
                      order
                    )
                  )
                )}
              </div>
            </td>

            <td class="sales-person-cell">
              <div class="cell-center salesperson-value">
                ${escapeHtml(
                  getSalesPerson(
                    order
                  )
                )}
              </div>
            </td>

          </tr>
        `;
      }
    )
    .join("");
};


/* =========================================================
   RENDER GRADE ROWS
========================================================= */

const renderGradeRows = (
  grades = []
) => {
  if (
    !Array.isArray(
      grades
    ) ||
    !grades.length
  ) {
    return `
      <tr>
        <td
          colspan="4"
          class="empty-row"
        >
          No grade-wise H.O. order data available.
        </td>
      </tr>
    `;
  }

  return grades
    .map(
      (
        grade,
        index
      ) => {
        const name =
          getGradeName(
            grade
          );

        const quantity =
          getGradeQuantity(
            grade
          );

        const orderCount =
          getGradeOrderCount(
            grade
          );

        return `
          <tr>

            <td class="serial-cell">
              <div class="cell-center">
                ${index + 1}
              </div>
            </td>

            <td class="grade-name-cell">
              <div class="cell-center">

                <span class="grade-badge">
                  ${escapeHtml(
                    name
                  )}
                </span>

              </div>
            </td>

            <td class="grade-quantity-cell">
              <div class="cell-center grade-quantity-value">
                ${escapeHtml(
                  formatKG(
                    quantity
                  )
                )}
              </div>
            </td>

            <td class="grade-orders-cell">
              <div class="cell-center grade-order-value">
                ${escapeHtml(
                  formatNumber(
                    orderCount
                  )
                )}
              </div>
            </td>

          </tr>
        `;
      }
    )
    .join("");
};


/* =========================================================
   TEMPLATE
========================================================= */

const managementOrderAnalyticsPdfTemplate =
  ({
    generatedAt,
    period = {},
    summary = {},
    grades = [],
    orders = [],
  } = {}) => {

    /* =====================================================
       TOTAL ORDER QUANTITY
    ===================================================== */

    const totalQuantity =
      safeNumber(
        summary.quantityKG ??
          summary.orderQuantityKG ??
          summary.orderKG ??
          summary.orderedKG ??
          summary.orderTakenKG ??
          summary.totalOrderKG ??
          summary.totalQuantityKG ??
          0
      ) ||
      orders.reduce(
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


    /* =====================================================
       TOTAL ORDERS
    ===================================================== */

    const totalOrders =
      safeNumber(
        summary.orderCount ??
          summary.totalOrders ??
          summary.orders ??
          summary.salesOrderCount ??
          0
      ) ||
      orders.length;


    /* =====================================================
       GENERATED DATE
    ===================================================== */

    const generated =
      generatedAt
        ? formatDate(
            generatedAt
          )
        : formatDate(
            new Date()
          );


    /* =====================================================
       COMPANY LOGO
    ===================================================== */

    const companyLogoUrl =
      process.env
        .COMPANY_LOGO_URL ||
      "https://dashboard.bharatspecialsteels.com/logo.png";


    /* =====================================================
       PERIOD
    ===================================================== */

    const periodTitle =
      getPeriodTitle(
        period
      );

    const periodRange =
      formatPeriod(
        period
      );


    /* =====================================================
       HTML
    ===================================================== */

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
    H.O. Order Analysis
  </title>


  <style>

    /* =====================================================
       DOCUMENT COLOURS

       IMPORTANT:
       No pure white page.
       Entire report uses warm off-white.
    ===================================================== */

    :root {

      --page:
        #f4f1e9;

      --surface:
        #f8f5ed;

      --surface-alt:
        #efede6;

      --surface-soft:
        #f3f0e9;

      --navy:
        #191b45;

      --navy-2:
        #29225f;

      --purple:
        #493ca1;

      --purple-2:
        #6550c7;

      --purple-soft:
        #ebe7fb;

      --blue-soft:
        #e6eff9;

      --text:
        #1d2338;

      --text-secondary:
        #50586d;

      --muted:
        #7b8295;

      --border:
        #c8c6c0;

      --border-strong:
        #aaa8b3;
    }


    /* =====================================================
       PDF PAGE
    ===================================================== */

    @page {

      size:
        A4 portrait;

      margin:
        7mm 6mm
        8mm 6mm;

      background:
        #f4f1e9;

    }


    /* =====================================================
       RESET
    ===================================================== */

    * {

      box-sizing:
        border-box;

    }


    html {

      margin:
        0;

      padding:
        0;

      width:
        100%;

      min-height:
        100%;

      background:
        #f4f1e9 !important;

    }


    body {

      margin:
        0;

      padding:
        0;

      width:
        100%;

      min-height:
        100vh;

      color:
        var(--text);

      background:
        #f4f1e9 !important;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      font-size:
        9.5px;

      line-height:
        1.35;

      -webkit-print-color-adjust:
        exact !important;

      print-color-adjust:
        exact !important;

    }


    .page {

      width:
        100%;

      min-height:
        100vh;

      margin:
        0;

      padding:
        0;

      background:
        #f4f1e9 !important;

    }


    /* =====================================================
       HEADER
    ===================================================== */

    .header {

      position:
        relative;

      overflow:
        hidden;

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        14px;

      padding:
        12px 14px;

      border-radius:
        10px;

      color:
        #ffffff;

      background:
        linear-gradient(
          125deg,
          #171940 0%,
          #28215e 46%,
          #49389a 76%,
          #6447b7 100%
        );

      box-shadow:
        0 3px 10px
        rgba(
          27,
          26,
          68,
          0.15
        );

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    .header::before {

      content:
        "";

      position:
        absolute;

      width:
        175px;

      height:
        175px;

      top:
        -92px;

      right:
        -52px;

      border-radius:
        50%;

      background:
        rgba(
          255,
          255,
          255,
          0.055
        );

    }


    .header::after {

      content:
        "";

      position:
        absolute;

      width:
        125px;

      height:
        125px;

      right:
        86px;

      bottom:
        -82px;

      border-radius:
        50%;

      background:
        rgba(
          255,
          255,
          255,
          0.035
        );

    }


    /* =====================================================
       BRAND
    ===================================================== */

    .brand {

      position:
        relative;

      z-index:
        2;

      display:
        flex;

      align-items:
        center;

      gap:
        10px;

      min-width:
        0;

    }


    .brand-logo {

      width:
        68px;

      min-width:
        68px;

      height:
        43px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      padding:
        4px 5px;

      border-radius:
        7px;

      background:
        #f8f5ed;

      box-shadow:
        0 2px 7px
        rgba(
          0,
          0,
          0,
          0.14
        );

    }


    .brand-logo img {

      display:
        block;

      max-width:
        59px;

      max-height:
        34px;

      object-fit:
        contain;

    }


    .brand-copy {

      min-width:
        0;

    }


    .brand-copy .company {

      display:
        block;

      margin-bottom:
        3px;

      color:
        #ddd9ff;

      font-size:
        7px;

      line-height:
        1;

      font-weight:
        900;

      letter-spacing:
        1.35px;

      text-transform:
        uppercase;

    }


    .brand-copy h1 {

      margin:
        0;

      color:
        #ffffff;

      font-size:
        18px;

      line-height:
        1.05;

      font-weight:
        900;

      letter-spacing:
        -0.2px;

    }


    .brand-copy p {

      margin:
        4px 0 0;

      color:
        #eeecff;

      font-size:
        8px;

      line-height:
        1.2;

      font-weight:
        700;

    }


    /* =====================================================
       PERIOD BOX
    ===================================================== */

    .header-meta {

      position:
        relative;

      z-index:
        2;

      min-width:
        148px;

      padding:
        7px 9px;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.24
        );

      border-radius:
        8px;

      background:
        rgba(
          255,
          255,
          255,
          0.10
        );

      text-align:
        right;

    }


    .header-meta-label {

      display:
        block;

      color:
        #dcd9ff;

      font-size:
        6.3px;

      line-height:
        1;

      font-weight:
        900;

      letter-spacing:
        0.8px;

      text-transform:
        uppercase;

    }


    .header-meta strong {

      display:
        block;

      margin-top:
        4px;

      color:
        #ffffff;

      font-size:
        11.5px;

      line-height:
        1.05;

      font-weight:
        900;

      text-transform:
        uppercase;

    }


    .period-range {

      display:
        block;

      margin-top:
        4px;

      color:
        #efedff;

      font-size:
        7px;

      line-height:
        1.15;

      font-weight:
        700;

    }


    /* =====================================================
       KPI AREA
    ===================================================== */

    .kpis {

      display:
        grid;

      grid-template-columns:
        repeat(
          2,
          minmax(
            0,
            1fr
          )
        );

      gap:
        7px;

      margin-top:
        8px;

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    .kpi {

      position:
        relative;

      overflow:
        hidden;

      min-height:
        59px;

      display:
        flex;

      align-items:
        center;

      gap:
        10px;

      padding:
        9px 11px;

      border:
        1px solid
        #d1ced8;

      border-radius:
        9px;

      background:
        #f8f5ed;

      box-shadow:
        0 2px 5px
        rgba(
          30,
          31,
          55,
          0.045
        );

    }


    .kpi::before {

      content:
        "";

      position:
        absolute;

      top:
        0;

      bottom:
        0;

      left:
        0;

      width:
        4px;

    }


    .kpi.primary::before {

      background:
        linear-gradient(
          180deg,
          #5045d4,
          #7650bd
        );

    }


    .kpi.orders::before {

      background:
        linear-gradient(
          180deg,
          #3269c7,
          #4c48cf
        );

    }


    .kpi-icon {

      width:
        34px;

      min-width:
        34px;

      height:
        34px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      border-radius:
        9px;

      color:
        #5146c6;

      background:
        #e9e5f9;

      font-size:
        11px;

      font-weight:
        900;

    }


    .kpi.orders
    .kpi-icon {

      color:
        #275fae;

      background:
        #e4edf8;

    }


    .kpi-content {

      min-width:
        0;

    }


    .kpi-label {

      display:
        block;

      color:
        #73798b;

      font-size:
        7px;

      line-height:
        1.1;

      font-weight:
        900;

      letter-spacing:
        0.65px;

      text-transform:
        uppercase;

    }


    .kpi strong {

      display:
        block;

      margin-top:
        4px;

      color:
        #191f35;

      font-size:
        15px;

      line-height:
        1.05;

      font-weight:
        900;

      white-space:
        nowrap;

    }


    .kpi-note {

      display:
        block;

      margin-top:
        3px;

      color:
        #888e9c;

      font-size:
        6.6px;

      line-height:
        1.1;

      font-weight:
        700;

    }


    /* =====================================================
       SECTION
    ===================================================== */

    .section {

      margin-top:
        9px;

    }


    .section-title {

      display:
        flex;

      align-items:
        flex-end;

      justify-content:
        space-between;

      gap:
        10px;

      margin-bottom:
        5px;

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    .section-eyebrow {

      display:
        block;

      margin-bottom:
        2px;

      color:
        #5549c7;

      font-size:
        6.8px;

      line-height:
        1;

      font-weight:
        900;

      letter-spacing:
        1.05px;

      text-transform:
        uppercase;

    }


    .section-title h2 {

      margin:
        0;

      color:
        #1d2337;

      font-size:
        13px;

      line-height:
        1.05;

      font-weight:
        900;

    }


    .section-count {

      display:
        inline-block;

      padding:
        4px 8px;

      border:
        1px solid
        #ddd7f4;

      border-radius:
        6px;

      color:
        #5146c7;

      background:
        #ebe7f7;

      font-size:
        7px;

      line-height:
        1;

      font-weight:
        900;

      letter-spacing:
        0.35px;

      white-space:
        nowrap;

    }


    /* =====================================================
       COMMON TABLE

       IMPORTANT:
       Full visible grid.
       Vertical + horizontal lines.
    ===================================================== */

    table {

      width:
        100%;

      border-collapse:
        collapse;

      border-spacing:
        0;

      table-layout:
        fixed;

      background:
        #f8f5ed;

    }


    thead {

      display:
        table-header-group;

    }


    tr {

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    th,
    td {

      border:
        1px solid
        #c9c6c4;

    }


    /* =====================================================
       ORDER TABLE WRAPPER
    ===================================================== */

    .order-table-wrap {

      overflow:
        hidden;

      border:
        1.25px solid
        #aaa7b3;

      border-radius:
        8px;

      background:
        #f8f5ed;

    }


    /* =====================================================
       ORDER TABLE HEADER
    ===================================================== */

    .order-table th {

      height:
        30px;

      padding:
        6px 4px;

      color:
        #ffffff;

      background:
        #463b9e;

      border-color:
        #655bb2;

      font-size:
        7.15px;

      line-height:
        1.1;

      font-weight:
        900;

      letter-spacing:
        0.25px;

      text-align:
        center;

      vertical-align:
        middle;

      text-transform:
        uppercase;

    }


    /* =====================================================
       ORDER TABLE ROWS
    ===================================================== */

    .order-table td {

      min-height:
        36px;

      padding:
        6px 5px;

      color:
        #343a4e;

      background:
        #f8f5ed;

      border-color:
        #ccc9c5;

      font-size:
        8px;

      line-height:
        1.25;

      text-align:
        center;

      vertical-align:
        middle;

      overflow-wrap:
        anywhere;

    }


    .order-table
    tbody
    tr:nth-child(even)
    td {

      background:
        #efede6;

    }


    .order-table
    tbody
    tr:nth-child(odd)
    td {

      background:
        #f8f5ed;

    }


    .order-table
    tbody
    tr:hover
    td {

      background:
        #efede6;

    }


    /* =====================================================
       TRUE CELL CENTERING

       Keeps quantity / salesperson / grade
       visually inside their own columns.
    ===================================================== */

    .cell-center {

      width:
        100%;

      min-height:
        24px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      text-align:
        center;

      margin:
        0 auto;

    }


    /* =====================================================
       ORDER COLUMN WIDTHS
    ===================================================== */

    .order-table
    th:nth-child(1),
    .order-table
    td:nth-child(1) {

      width:
        4%;

    }


    .order-table
    th:nth-child(2),
    .order-table
    td:nth-child(2) {

      width:
        25%;

    }


    .order-table
    th:nth-child(3),
    .order-table
    td:nth-child(3) {

      width:
        17%;

    }


    .order-table
    th:nth-child(4),
    .order-table
    td:nth-child(4) {

      width:
        10%;

    }


    .order-table
    th:nth-child(5),
    .order-table
    td:nth-child(5) {

      width:
        13%;

    }


    .order-table
    th:nth-child(6),
    .order-table
    td:nth-child(6) {

      width:
        17%;

    }


    .order-table
    th:nth-child(7),
    .order-table
    td:nth-child(7) {

      width:
        14%;

    }


    /* =====================================================
       SERIAL
    ===================================================== */

    .serial-cell {

      color:
        #767d8d !important;

      font-size:
        7.6px !important;

      font-weight:
        900 !important;

    }


    /* =====================================================
       CUSTOMER
    ===================================================== */

    .customer-cell {

      padding-left:
        7px !important;

      padding-right:
        7px !important;

    }


    .company-name {

      display:
        block;

      width:
        100%;

      color:
        #171e34;

      font-size:
        8.35px;

      line-height:
        1.22;

      font-weight:
        900;

      text-align:
        center;

    }


    /* =====================================================
       PO
    ===================================================== */

    .po-cell {

      color:
        #4a5266 !important;

      font-size:
        7.7px !important;

      line-height:
        1.22 !important;

      font-weight:
        800 !important;

    }


    /* =====================================================
       DATE
    ===================================================== */

    .date-cell {

      color:
        #50586a !important;

      font-size:
        7.6px !important;

      font-weight:
        800 !important;

      white-space:
        nowrap;

    }


    /* =====================================================
       GRADE
    ===================================================== */

    .order-grade-cell {

      text-align:
        center !important;

    }


    .order-grade-badge {

      display:
        inline-block;

      max-width:
        100%;

      padding:
        3px 6px;

      border:
        1px solid
        #cbc4ec;

      border-radius:
        5px;

      color:
        #4e43b6;

      background:
        #eae6f8;

      font-size:
        7.35px;

      line-height:
        1.12;

      font-weight:
        900;

      text-align:
        center;

      overflow-wrap:
        anywhere;

    }


    /* =====================================================
       ORDER QUANTITY
    ===================================================== */

    .order-quantity-cell {

      padding-left:
        4px !important;

      padding-right:
        4px !important;

    }


    .quantity-value {

      color:
        #4035a8;

      font-size:
        8.35px;

      line-height:
        1.15;

      font-weight:
        900;

      text-align:
        center;

      white-space:
        nowrap;

    }


    /* =====================================================
       SALES PERSON
    ===================================================== */

    .sales-person-cell {

      padding-left:
        5px !important;

      padding-right:
        5px !important;

    }


    .salesperson-value {

      color:
        #20273d;

      font-size:
        7.8px;

      line-height:
        1.18;

      font-weight:
        900;

      text-align:
        center;

    }


    /* =====================================================
       EMPTY ROW
    ===================================================== */

    .empty-row {

      padding:
        20px 10px !important;

      color:
        #7e8494 !important;

      background:
        #f8f5ed !important;

      font-size:
        8.5px !important;

      font-weight:
        800 !important;

      text-align:
        center !important;

    }


    /* =====================================================
       ORDER REGISTER FOOTER
    ===================================================== */

    .report-footer {

      margin-top:
        7px;

      padding:
        6px 1px 0;

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        8px;

      color:
        #818797;

      border-top:
        1px solid
        #c8c5c0;

      font-size:
        6.4px;

      line-height:
        1.2;

      font-weight:
        700;

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    .report-footer strong {

      color:
        #555c6d;

      font-weight:
        900;

    }


    /* =====================================================
       GRADE ANALYSIS

       Always after order register.
    ===================================================== */

    .grade-analysis {

      break-before:
        page;

      page-break-before:
        always;

      margin-top:
        0;

      padding-top:
        0;

      background:
        #f4f1e9;

    }


    .grade-header {

      position:
        relative;

      overflow:
        hidden;

      margin-bottom:
        9px;

      padding:
        11px 13px;

      border-radius:
        10px;

      color:
        #ffffff;

      background:
        linear-gradient(
          125deg,
          #211d57 0%,
          #443692 63%,
          #6849b4 100%
        );

      break-inside:
        avoid;

      page-break-inside:
        avoid;

    }


    .grade-header::after {

      content:
        "";

      position:
        absolute;

      width:
        130px;

      height:
        130px;

      top:
        -67px;

      right:
        -40px;

      border-radius:
        50%;

      background:
        rgba(
          255,
          255,
          255,
          0.06
        );

    }


    .grade-header-label {

      position:
        relative;

      z-index:
        2;

      color:
        #dcd8ff;

      font-size:
        6.8px;

      line-height:
        1;

      font-weight:
        900;

      letter-spacing:
        1.05px;

      text-transform:
        uppercase;

    }


    .grade-header h2 {

      position:
        relative;

      z-index:
        2;

      margin:
        4px 0 0;

      color:
        #ffffff;

      font-size:
        16px;

      line-height:
        1.05;

      font-weight:
        900;

    }


    .grade-header p {

      position:
        relative;

      z-index:
        2;

      margin:
        4px 0 0;

      color:
        #eeecff;

      font-size:
        7.5px;

      line-height:
        1.2;

      font-weight:
        700;

    }


    /* =====================================================
       GRADE TABLE
    ===================================================== */

    .grade-table-wrap {

      overflow:
        hidden;

      border:
        1.25px solid
        #aaa7b3;

      border-radius:
        8px;

      background:
        #f8f5ed;

    }


    .grade-table th {

      height:
        31px;

      padding:
        7px;

      color:
        #ffffff;

      background:
        #463b9e;

      border-color:
        #655bb2;

      font-size:
        7.3px;

      line-height:
        1.1;

      font-weight:
        900;

      letter-spacing:
        0.3px;

      text-align:
        center;

      vertical-align:
        middle;

      text-transform:
        uppercase;

    }


    .grade-table td {

      min-height:
        38px;

      padding:
        7px;

      color:
        #343a4e;

      background:
        #f8f5ed;

      border-color:
        #ccc9c5;

      font-size:
        8.5px;

      line-height:
        1.25;

      text-align:
        center;

      vertical-align:
        middle;

    }


    .grade-table
    tbody
    tr:nth-child(even)
    td {

      background:
        #efede6;

    }


    .grade-table
    tbody
    tr:nth-child(odd)
    td {

      background:
        #f8f5ed;

    }


    /* =====================================================
       GRADE COLUMN WIDTHS
    ===================================================== */

    .grade-table
    th:nth-child(1),
    .grade-table
    td:nth-child(1) {

      width:
        8%;

    }


    .grade-table
    th:nth-child(2),
    .grade-table
    td:nth-child(2) {

      width:
        42%;

    }


    .grade-table
    th:nth-child(3),
    .grade-table
    td:nth-child(3) {

      width:
        32%;

    }


    .grade-table
    th:nth-child(4),
    .grade-table
    td:nth-child(4) {

      width:
        18%;

    }


    /* =====================================================
       GRADE CELLS
    ===================================================== */

    .grade-name-cell {

      text-align:
        center !important;

    }


    .grade-badge {

      display:
        inline-block;

      padding:
        4px 8px;

      border:
        1px solid
        #c9c2ea;

      border-radius:
        5px;

      color:
        #4b40b3;

      background:
        #e9e5f7;

      font-size:
        8.3px;

      line-height:
        1.1;

      font-weight:
        900;

      text-align:
        center;

    }


    .grade-quantity-value {

      color:
        #3f35a7;

      font-size:
        9px;

      font-weight:
        900;

      white-space:
        nowrap;

    }


    .grade-order-value {

      color:
        #20273d;

      font-size:
        9px;

      font-weight:
        900;

    }


    /* =====================================================
       SCREEN PREVIEW
    ===================================================== */

    @media screen {

      html,
      body {

        background:
          #e9e6de !important;

      }


      body {

        padding:
          14px 8px;

      }


      .page {

        width:
          min(
            100%,
            794px
          );

        margin:
          0 auto;

        padding:
          12px;

        border-radius:
          12px;

        background:
          #f4f1e9 !important;

        box-shadow:
          0 8px 28px
          rgba(
            26,
            29,
            49,
            0.12
          );

      }

    }


    /* =====================================================
       MOBILE PREVIEW
    ===================================================== */

    @media screen and
    (max-width: 600px) {

      body {

        padding:
          0;

      }


      .page {

        width:
          100%;

        padding:
          6px 4px;

        border-radius:
          0;

        box-shadow:
          none;

      }


      .header {

        gap:
          7px;

        padding:
          9px 8px;

        border-radius:
          8px;

      }


      .brand {

        gap:
          6px;

      }


      .brand-logo {

        width:
          54px;

        min-width:
          54px;

        height:
          36px;

        padding:
          3px;

      }


      .brand-logo img {

        max-width:
          48px;

        max-height:
          29px;

      }


      .brand-copy .company {

        font-size:
          5.7px;

        letter-spacing:
          0.7px;

      }


      .brand-copy h1 {

        font-size:
          13px;

      }


      .brand-copy p {

        font-size:
          6.4px;

      }


      .header-meta {

        min-width:
          102px;

        padding:
          5px;

      }


      .header-meta-label {

        font-size:
          5.3px;

      }


      .header-meta strong {

        font-size:
          8px;

      }


      .period-range {

        font-size:
          5.6px;

      }


      .kpis {

        gap:
          5px;

        margin-top:
          6px;

      }


      .kpi {

        min-height:
          51px;

        gap:
          6px;

        padding:
          7px;

      }


      .kpi-icon {

        width:
          27px;

        min-width:
          27px;

        height:
          27px;

        border-radius:
          7px;

        font-size:
          8px;

      }


      .kpi-label {

        font-size:
          5.8px;

      }


      .kpi strong {

        font-size:
          10px;

      }


      .kpi-note {

        font-size:
          5.4px;

      }


      .section-title h2 {

        font-size:
          10px;

      }


      .section-eyebrow {

        font-size:
          5.6px;

      }


      .section-count {

        font-size:
          5.8px;

      }


      .order-table th {

        padding:
          5px 2px;

        font-size:
          5.6px;

      }


      .order-table td {

        padding:
          5px 2px;

        font-size:
          6.4px;

      }


      .company-name {

        font-size:
          6.7px;

      }


      .po-cell {

        font-size:
          6.1px !important;

      }


      .date-cell {

        font-size:
          6px !important;

      }


      .order-grade-badge {

        padding:
          2px 3px;

        font-size:
          5.8px;

      }


      .quantity-value {

        font-size:
          6.5px;

      }


      .salesperson-value {

        font-size:
          6.2px;

      }

    }


    /* =====================================================
       PRINT

       IMPORTANT:
       Force off-white everywhere.
    ===================================================== */

    @media print {

      html,
      body {

        width:
          100%;

        min-height:
          100%;

        margin:
          0;

        padding:
          0;

        background:
          #f4f1e9 !important;

        -webkit-print-color-adjust:
          exact !important;

        print-color-adjust:
          exact !important;

      }


      .page {

        width:
          100%;

        min-height:
          100vh;

        margin:
          0;

        padding:
          0;

        background:
          #f4f1e9 !important;

      }


      table,
      tr,
      td {

        -webkit-print-color-adjust:
          exact !important;

        print-color-adjust:
          exact !important;

      }

    }

  </style>

</head>


<body>

  <main class="page">


    <!-- ===================================================
         HEADER
    ==================================================== -->

    <header class="header">

      <div class="brand">

        <div class="brand-logo">

          <img
            src="${escapeHtml(
              companyLogoUrl
            )}"
            alt="Bharat Special Steels"
          />

        </div>


        <div class="brand-copy">

          <span class="company">
            BHARAT SPECIAL STEELS
          </span>

          <h1>
            H.O. Order Analysis
          </h1>

          <p>
            Management Sales Order Intelligence
          </p>

        </div>

      </div>


      <div class="header-meta">

        <span class="header-meta-label">
          Analysis Period
        </span>

        <strong>
          ${escapeHtml(
            periodTitle
          )}
        </strong>

        <span class="period-range">
          ${escapeHtml(
            periodRange
          )}
        </span>

      </div>

    </header>


    <!-- ===================================================
         TWO KPI CARDS ONLY
    ==================================================== -->

    <section class="kpis">


      <div class="kpi primary">

        <div class="kpi-icon">
          KG
        </div>


        <div class="kpi-content">

          <span class="kpi-label">
            H.O. Order Quantity
          </span>

          <strong>
            ${escapeHtml(
              formatKG(
                totalQuantity
              )
            )}
          </strong>

          <span class="kpi-note">
            Total quantity booked
          </span>

        </div>

      </div>


      <div class="kpi orders">

        <div class="kpi-icon">
          #
        </div>


        <div class="kpi-content">

          <span class="kpi-label">
            Sales Orders
          </span>

          <strong>
            ${escapeHtml(
              formatNumber(
                totalOrders
              )
            )}
          </strong>

          <span class="kpi-note">
            H.O. orders received
          </span>

        </div>

      </div>


    </section>


    <!-- ===================================================
         ORDER REGISTER
    ==================================================== -->

    <section class="section">

      <div class="section-title">

        <div>

          <span class="section-eyebrow">
            H.O. SALES ORDERS
          </span>

          <h2>
            Order Register
          </h2>

        </div>


        <span class="section-count">

          ${escapeHtml(
            formatNumber(
              totalOrders
            )
          )}

          ORDERS

        </span>

      </div>


      <div class="order-table-wrap">

        <table class="order-table">

          <thead>

            <tr>

              <th>
                #
              </th>

              <th>
                CUSTOMER
              </th>

              <th>
                PO NO.
              </th>

              <th>
                DATE
              </th>

              <th>
                GRADE
              </th>

              <th>
                ORDER QTY
              </th>

              <th>
                SALES
              </th>

            </tr>

          </thead>


          <tbody>

            ${renderOrderRows(
              orders
            )}

          </tbody>

        </table>

      </div>

    </section>


    <!-- ===================================================
         PAGE / SECTION FOOTER
    ==================================================== -->

    <footer class="report-footer">

      <span>

        <strong>
          Bharat Special Steels
        </strong>

        · H.O. Management Analysis

      </span>


      <span>
        ${escapeHtml(
          periodRange
        )}
      </span>

    </footer>


    <!-- ===================================================
         GRADE ANALYSIS

         ALWAYS AFTER ORDER REGISTER
    ==================================================== -->

    <section class="grade-analysis">


      <div class="grade-header">

        <div class="grade-header-label">
          H.O. MANAGEMENT ANALYSIS
        </div>

        <h2>
          Grade Analysis
        </h2>

        <p>

          Grade-wise order quantity
          and sales order count

          ·

          ${escapeHtml(
            periodTitle
          )}

        </p>

      </div>


      <div class="section-title">

        <div>

          <span class="section-eyebrow">
            GRADE MIX
          </span>

          <h2>
            H.O. Order Mix
          </h2>

        </div>


        <span class="section-count">

          ${escapeHtml(
            formatNumber(
              Array.isArray(
                grades
              )
                ? grades.length
                : 0
            )
          )}

          GRADES

        </span>

      </div>


      <div class="grade-table-wrap">

        <table class="grade-table">

          <thead>

            <tr>

              <th>
                #
              </th>

              <th>
                GRADE
              </th>

              <th>
                ORDER QUANTITY
              </th>

              <th>
                ORDERS
              </th>

            </tr>

          </thead>


          <tbody>

            ${renderGradeRows(
              grades
            )}

          </tbody>

        </table>

      </div>


      <footer class="report-footer">

        <span>

          <strong>
            Bharat Special Steels
          </strong>

          · Grade Analysis

        </span>


        <strong>
          H.O. Order Analysis
        </strong>


        <span>

          Generated:

          ${escapeHtml(
            generated
          )}

        </span>

      </footer>


    </section>


  </main>

</body>

</html>
    `;
  };


module.exports =
  managementOrderAnalyticsPdfTemplate;