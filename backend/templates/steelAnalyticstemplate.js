// backend/templates/steelAnalyticstemplate.js

const fs = require("fs");
const path = require("path");

/* =========================================================
   BASIC HELPERS
========================================================= */

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatKg = (value) => {
  const kg = numberValue(value);

  return `${kg.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} KG`;
};

const formatCompactKg = (value) => {
  const kg = numberValue(value);

  if (Math.abs(kg) >= 100000) {
    return `${(
      kg / 100000
    ).toFixed(2)}L`;
  }

  if (Math.abs(kg) >= 1000) {
    return `${(
      kg / 1000
    ).toFixed(1)}K`;
  }

  return Math.round(kg).toString();
};

const escapeHtml = (value) => {
  return String(
    value === null ||
    value === undefined
      ? ""
      : value
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const safeText = (
  value,
  fallback = "-"
) => {
  const text = String(
    value === null ||
    value === undefined
      ? ""
      : value
  ).trim();

  return text || fallback;
};

/* =========================================================
   LOGO

   Same production-safe principle as Sales Order:
   embed image into HTML as base64.
========================================================= */

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(
      __dirname,
      "..",
      "public",
      "logo.png"
    );

    if (
      !fs.existsSync(
        logoPath
      )
    ) {
      console.log(
        "STEEL ANALYTICS LOGO NOT FOUND =>",
        logoPath
      );

      return "";
    }

    const logoBuffer =
      fs.readFileSync(
        logoPath
      );

    return `data:image/png;base64,${logoBuffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.log(
      "STEEL ANALYTICS LOGO LOAD ERROR =>",
      error.message
    );

    return "";
  }
};

/* =========================================================
   FONT

   EXACT SAME PRODUCTION PRINCIPLE AS SALES ORDER.

   Font comes from node_modules/@fontsource/roboto.
   It is embedded into the HTML as base64.

   Chromium does NOT need a Hostinger system font.
========================================================= */

const getFontBase64 = (
  fileName
) => {
  try {
    const fontPath = path.join(
      __dirname,
      "..",
      "node_modules",
      "@fontsource",
      "roboto",
      "files",
      fileName
    );

    if (
      !fs.existsSync(
        fontPath
      )
    ) {
      console.log(
        "STEEL ANALYTICS FONT NOT FOUND =>",
        fontPath
      );

      return "";
    }

    const fontBuffer =
      fs.readFileSync(
        fontPath
      );

    return fontBuffer.toString(
      "base64"
    );
  } catch (error) {
    console.log(
      "STEEL ANALYTICS FONT LOAD ERROR =>",
      error.message
    );

    return "";
  }
};

/* =========================================================
   REPORT HELPERS
========================================================= */

const getMetric = (
  block,
  key
) => {
  return numberValue(
    block?.[key]
  );
};

const buildSummaryCard = ({
  label,
  value,
  type,
  subtitle,
}) => {
  return `
    <div class="summary-card ${type}">
      <div class="summary-icon">
        ${
          type === "order"
            ? "O"
            : type === "target"
              ? "T"
              : type === "dispatch"
                ? "D"
                : "P"
        }
      </div>

      <div class="summary-content">
        <div class="summary-label">
          ${escapeHtml(label)}
        </div>

        <div class="summary-value">
          ${formatKg(value)}
        </div>

        <div class="summary-subtitle">
          ${escapeHtml(subtitle)}
        </div>
      </div>
    </div>
  `;
};

/* =========================================================
   H.O. / STEEL MILL TABLE
========================================================= */

const buildBusinessTable = ({
  title,
  subtitle,
  block,
  type,
}) => {
  return `
    <div class="business-card ${type}">

      <div class="business-header">

        <div>
          <div class="business-tag">
            ${
              type === "ho"
                ? "H.O."
                : "STEEL MILL"
            }
          </div>

          <div class="business-title">
            ${escapeHtml(title)}
          </div>

          <div class="business-subtitle">
            ${escapeHtml(subtitle)}
          </div>
        </div>

        <div class="business-order">
          <span>ORDER QTY</span>

          <strong>
            ${formatKg(
              getMetric(
                block,
                "newOrderKg"
              )
            )}
          </strong>
        </div>

      </div>

      <table class="business-table">

        <thead>
          <tr>
            <th>Metric</th>
            <th>Quantity</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>
              Order Quantity
            </td>

            <td>
              ${formatKg(
                getMetric(
                  block,
                  "newOrderKg"
                )
              )}
            </td>
          </tr>

          <tr>
            <td>
              Dispatch Target
            </td>

            <td>
              ${formatKg(
                getMetric(
                  block,
                  "dispatchTargetKg"
                )
              )}
            </td>
          </tr>

          <tr>
            <td>
              Actual Dispatch
            </td>

            <td class="positive">
              ${formatKg(
                getMetric(
                  block,
                  "actualDispatchKg"
                )
              )}
            </td>
          </tr>

          <tr>
            <td>
              Dispatch Left
            </td>

            <td class="pending">
              ${formatKg(
                getMetric(
                  block,
                  "dispatchLeftKg"
                )
              )}
            </td>
          </tr>

        </tbody>

      </table>

    </div>
  `;
};

/* =========================================================
   MONTH COMPARISON TABLE
========================================================= */

const buildMonthlyRows = (
  months = []
) => {
  if (!months.length) {
    return `
      <tr>
        <td
          colspan="7"
          class="empty-cell"
        >
          No monthly data available.
        </td>
      </tr>
    `;
  }

  return months
    .map((month) => {
      const combined =
        month.combined || {};

      const ho =
        month.house || {};

      const steelMill =
        month.steelMill || {};

      return `
        <tr>

          <td class="month-name">
            ${escapeHtml(
              safeText(
                month.label
              )
            )}
          </td>

          <td>
            ${formatKg(
              combined.newOrderKg
            )}
          </td>

          <td>
            ${formatKg(
              ho.newOrderKg
            )}
          </td>

          <td>
            ${formatKg(
              steelMill.newOrderKg
            )}
          </td>

          <td>
            ${formatKg(
              combined.dispatchTargetKg
            )}
          </td>

          <td class="positive">
            ${formatKg(
              combined.actualDispatchKg
            )}
          </td>

          <td class="pending">
            ${formatKg(
              combined.dispatchLeftKg
            )}
          </td>

        </tr>
      `;
    })
    .join("");
};

/* =========================================================
   MONTH CHART

   Pure HTML/CSS.
   No external chart package.
   No network.
========================================================= */

const buildMonthlyChart = (
  months = []
) => {
  if (!months.length) {
    return "";
  }

  const maximum = Math.max(
    1,
    ...months.flatMap(
      (month) => [
        numberValue(
          month?.combined
            ?.newOrderKg
        ),

        numberValue(
          month?.combined
            ?.actualDispatchKg
        ),
      ]
    )
  );

  return `
    <div class="chart-card">

      <div class="section-heading-row">

        <div>
          <div class="section-kicker">
            MONTHLY COMPARISON
          </div>

          <div class="section-heading">
            Order vs Dispatch
          </div>
        </div>

        <div class="chart-legend">

          <div class="legend-item">
            <span class="legend-box order"></span>
            Order
          </div>

          <div class="legend-item">
            <span class="legend-box dispatch"></span>
            Dispatch
          </div>

        </div>

      </div>

      <div class="chart-area">

        ${months
          .map((month) => {
            const order =
              numberValue(
                month?.combined
                  ?.newOrderKg
              );

            const dispatch =
              numberValue(
                month?.combined
                  ?.actualDispatchKg
              );

            const orderHeight =
              order > 0
                ? Math.max(
                    4,
                    Math.round(
                      (
                        order /
                        maximum
                      ) *
                        125
                    )
                  )
                : 0;

            const dispatchHeight =
              dispatch > 0
                ? Math.max(
                    4,
                    Math.round(
                      (
                        dispatch /
                        maximum
                      ) *
                        125
                    )
                  )
                : 0;

            return `
              <div class="chart-group">

                <div class="chart-numbers">

                  <span>
                    ${formatCompactKg(
                      order
                    )}
                  </span>

                  <span>
                    ${formatCompactKg(
                      dispatch
                    )}
                  </span>

                </div>

                <div class="chart-bars">

                  <div
                    class="chart-bar order"
                    style="height:${orderHeight}px"
                  ></div>

                  <div
                    class="chart-bar dispatch"
                    style="height:${dispatchHeight}px"
                  ></div>

                </div>

                <div class="chart-month">
                  ${escapeHtml(
                    safeText(
                      month.label
                    )
                  )}
                </div>

              </div>
            `;
          })
          .join("")}

      </div>

    </div>
  `;
};

/* =========================================================
   GRADE TABLE
========================================================= */

const buildGradeRows = (
  grades = []
) => {
  if (!grades.length) {
    return `
      <tr>
        <td
          colspan="7"
          class="empty-cell"
        >
          No grade-wise data available
          for the selected period.
        </td>
      </tr>
    `;
  }

  return grades
    .map(
      (
        grade,
        index
      ) => `
        <tr>

          <td class="serial">
            ${index + 1}
          </td>

          <td class="grade-name">
            ${escapeHtml(
              safeText(
                grade.grade
              )
            )}
          </td>

          <td>
            ${formatKg(
              grade.newOrderKg
            )}
          </td>

          <td>
            ${formatKg(
              grade.dispatchTargetKg
            )}
          </td>

          <td class="positive">
            ${formatKg(
              grade.actualDispatchKg
            )}
          </td>

          <td class="pending">
            ${formatKg(
              grade.dispatchLeftKg
            )}
          </td>

          <td>
            ${Number(
              grade.orderCount || 0
            ).toLocaleString(
              "en-IN"
            )}
          </td>

        </tr>
      `
    )
    .join("");
};

/* =========================================================
   MAIN TEMPLATE
========================================================= */

const steelAnalyticsTemplate = (
  report
) => {
  const logoBase64 =
    getLogoBase64();

  const robotoRegular =
    getFontBase64(
      "roboto-latin-400-normal.woff2"
    );

  const robotoMedium =
    getFontBase64(
      "roboto-latin-500-normal.woff2"
    );

  const robotoBold =
    getFontBase64(
      "roboto-latin-700-normal.woff2"
    );

  const combined =
    report?.total?.combined ||
    {};

  const house =
    report?.total?.house ||
    {};

  const steelMill =
    report?.total?.steelMill ||
    {};

  const months =
    Array.isArray(
      report?.months
    )
      ? report.months
      : [];

  const grades =
    Array.isArray(
      report?.grades
    )
      ? report.grades
      : [];

  const generatedAt =
    report?.generatedAt
      ? new Date(
          report.generatedAt
        )
      : new Date();

  const generatedText =
    generatedAt.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<title>
  Management Analysis
</title>

<style>

@font-face {
  font-family: "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoRegular}"
    )
    format("woff2");

  font-weight: 400;
}

@font-face {
  font-family: "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoMedium}"
    )
    format("woff2");

  font-weight: 500;
}

@font-face {
  font-family: "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoBold}"
    )
    format("woff2");

  font-weight: 700;
}

@page {
  size: A4 portrait;
  margin: 8mm;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;

  font-family:
    "RobotoEmbedded",
    Arial,
    sans-serif;

  color: #172033;
  background: #ffffff;

  -webkit-print-color-adjust:
    exact !important;

  print-color-adjust:
    exact !important;
}

body {
  font-size: 9px;
}

.page {
  width: 100%;
}

.page-break {
  page-break-before: always;
}

.no-break {
  page-break-inside: avoid;
}

/* ======================================================
   HEADER
====================================================== */

.report-header {
  width: 100%;

  border-radius: 12px;

  overflow: hidden;

  margin-bottom: 12px;

  background:
    linear-gradient(
      115deg,
      #171b3d 0%,
      #342c91 52%,
      #7237c7 100%
    );

  color: #ffffff;

  padding: 15px 17px;
}

.header-row {
  width: 100%;

  display: table;

  table-layout: fixed;
}

.header-brand,
.header-period {
  display: table-cell;

  vertical-align: middle;
}

.header-brand {
  width: 68%;
}

.header-period {
  width: 32%;

  text-align: right;
}

.logo-wrap {
  display: inline-block;

  vertical-align: middle;

  width: 82px;

  margin-right: 10px;
}

.logo-wrap img {
  display: block;

  width: 76px;

  max-height: 38px;

  object-fit: contain;

  background: #ffffff;

  border-radius: 5px;

  padding: 3px;
}

.title-wrap {
  display: inline-block;

  vertical-align: middle;

  max-width: 310px;
}

.report-kicker {
  font-size: 7px;

  font-weight: 700;

  letter-spacing: 1.4px;

  color: #cbc9ff;

  margin-bottom: 3px;
}

.report-title {
  font-size: 20px;

  font-weight: 700;

  line-height: 1.05;

  margin: 0;
}

.report-subtitle {
  font-size: 8px;

  margin-top: 5px;

  color: #dddfff;
}

.period-box {
  display: inline-block;

  min-width: 145px;

  text-align: left;

  padding: 9px 11px;

  border-radius: 9px;

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      0.24
    );

  background:
    rgba(
      255,
      255,
      255,
      0.12
    );
}

.period-label {
  font-size: 6.5px;

  letter-spacing: 1px;

  color: #d7d5ff;

  font-weight: 700;
}

.period-value {
  margin-top: 3px;

  font-size: 12px;

  font-weight: 700;
}

.period-range {
  margin-top: 3px;

  font-size: 7px;

  color: #e6e6ff;
}

/* ======================================================
   SECTION
====================================================== */

.section-heading-row {
  display: flex;

  justify-content:
    space-between;

  align-items: flex-end;

  margin-bottom: 8px;
}

.section-kicker {
  color: #6656e8;

  font-size: 6.5px;

  letter-spacing: 1.2px;

  font-weight: 700;

  margin-bottom: 2px;
}

.section-heading {
  font-size: 14px;

  line-height: 1.1;

  font-weight: 700;
}

/* ======================================================
   SUMMARY
====================================================== */

.summary-grid {
  width: 100%;

  display: grid;

  grid-template-columns:
    repeat(
      4,
      1fr
    );

  gap: 7px;

  margin-bottom: 12px;
}

.summary-card {
  position: relative;

  min-height: 77px;

  border-radius: 10px;

  border:
    1px solid #e4e8f1;

  background: #ffffff;

  padding: 11px 9px 9px;

  overflow: hidden;
}

.summary-card::before {
  content: "";

  position: absolute;

  left: 0;
  top: 0;
  bottom: 0;

  width: 4px;
}

.summary-card.order::before {
  background: #5147e5;
}

.summary-card.target::before {
  background: #7a43d3;
}

.summary-card.dispatch::before {
  background: #129c72;
}

.summary-card.pending::before {
  background: #e39b23;
}

.summary-icon {
  width: 22px;
  height: 22px;

  border-radius: 7px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 8px;

  font-weight: 700;

  background: #f0efff;

  color: #5548de;

  margin-bottom: 7px;
}

.summary-label {
  font-size: 6.5px;

  letter-spacing: 0.6px;

  text-transform: uppercase;

  color: #768198;

  font-weight: 700;
}

.summary-value {
  font-size: 13px;

  line-height: 1.1;

  font-weight: 700;

  color: #172033;

  margin-top: 3px;

  white-space: nowrap;
}

.summary-subtitle {
  margin-top: 3px;

  color: #9aa3b3;

  font-size: 6.5px;
}

/* ======================================================
   BUSINESS CARDS
====================================================== */

.business-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 10px;

  margin-bottom: 12px;
}

.business-card {
  border:
    1px solid #e2e6ef;

  border-radius: 10px;

  overflow: hidden;

  background: #ffffff;

  page-break-inside:
    avoid;
}

.business-card.ho {
  border-top:
    4px solid #5147e5;
}

.business-card.steel {
  border-top:
    4px solid #873ec7;
}

.business-header {
  display: flex;

  justify-content:
    space-between;

  align-items: flex-start;

  gap: 10px;

  padding: 10px 11px;

  background: #fafbfe;
}

.business-tag {
  display: inline-block;

  border-radius: 5px;

  padding: 3px 6px;

  background: #ecebff;

  color: #5147e5;

  font-size: 6px;

  font-weight: 700;

  letter-spacing: 0.8px;
}

.business-title {
  margin-top: 5px;

  font-size: 12px;

  font-weight: 700;
}

.business-subtitle {
  margin-top: 2px;

  font-size: 6.5px;

  color: #8993a5;
}

.business-order {
  text-align: right;
}

.business-order span {
  display: block;

  font-size: 6px;

  color: #929bad;

  font-weight: 700;

  letter-spacing: 0.7px;
}

.business-order strong {
  display: block;

  margin-top: 3px;

  font-size: 11px;
}

.business-table {
  width: 100%;

  border-collapse:
    collapse;
}

.business-table th {
  padding: 6px 9px;

  background: #f4f6fa;

  color: #788297;

  text-transform:
    uppercase;

  font-size: 6px;

  letter-spacing: 0.6px;

  text-align: left;
}

.business-table th:last-child {
  text-align: right;
}

.business-table td {
  padding: 6px 9px;

  border-top:
    1px solid #edf0f5;

  font-size: 8px;
}

.business-table td:last-child {
  text-align: right;

  font-weight: 700;
}

.positive {
  color: #0a865e !important;

  font-weight: 700;
}

.pending {
  color: #c0780c !important;

  font-weight: 700;
}

/* ======================================================
   MONTHLY TABLE
====================================================== */

.comparison-card {
  border:
    1px solid #e2e6ef;

  border-radius: 10px;

  overflow: hidden;

  margin-bottom: 12px;

  page-break-inside:
    avoid;
}

.comparison-header {
  padding: 10px 11px;

  background: #ffffff;
}

.month-table {
  width: 100%;

  border-collapse:
    collapse;
}

.month-table th {
  padding: 7px 6px;

  background: #f4f6fa;

  color: #737e93;

  font-size: 5.8px;

  font-weight: 700;

  letter-spacing: 0.4px;

  text-transform:
    uppercase;

  text-align: right;
}

.month-table th:first-child {
  text-align: left;
}

.month-table td {
  padding: 7px 6px;

  border-top:
    1px solid #edf0f5;

  font-size: 7px;

  text-align: right;

  white-space: nowrap;
}

.month-table td:first-child {
  text-align: left;
}

.month-name {
  font-weight: 700;
}

/* ======================================================
   CHART
====================================================== */

.chart-card {
  border:
    1px solid #e2e6ef;

  border-radius: 10px;

  padding: 11px;

  margin-bottom: 12px;

  page-break-inside:
    avoid;
}

.chart-legend {
  display: flex;

  gap: 12px;

  color: #778196;

  font-size: 6.5px;
}

.legend-item {
  display: flex;

  align-items: center;

  gap: 4px;
}

.legend-box {
  width: 7px;
  height: 7px;

  border-radius: 2px;

  display: inline-block;
}

.legend-box.order {
  background: #5548e2;
}

.legend-box.dispatch {
  background: #129c72;
}

.chart-area {
  height: 160px;

  display: flex;

  justify-content:
    space-around;

  align-items: flex-end;

  border-bottom:
    1px solid #dfe3ec;

  padding:
    12px 8px 0;
}

.chart-group {
  height: 145px;

  flex: 1;

  max-width: 75px;

  display: flex;

  flex-direction: column;

  justify-content:
    flex-end;

  align-items: center;
}

.chart-numbers {
  width: 100%;

  display: flex;

  justify-content:
    center;

  gap: 7px;

  font-size: 5.5px;

  color: #7d8799;

  margin-bottom: 3px;
}

.chart-bars {
  height: 125px;

  display: flex;

  align-items: flex-end;

  gap: 5px;
}

.chart-bar {
  width: 15px;

  border-radius:
    4px 4px 0 0;
}

.chart-bar.order {
  background:
    linear-gradient(
      180deg,
      #776bf2,
      #4a3bd1
    );
}

.chart-bar.dispatch {
  background:
    linear-gradient(
      180deg,
      #35c79a,
      #09855f
    );
}

.chart-month {
  font-size: 6.5px;

  font-weight: 700;

  margin-top: 5px;

  white-space: nowrap;
}

/* ======================================================
   GRADE TABLE
====================================================== */

.grade-card {
  border:
    1px solid #e2e6ef;

  border-radius: 10px;

  overflow: hidden;

  page-break-inside:
    auto;
}

.grade-header {
  padding: 10px 11px;

  background: #ffffff;
}

.grade-table {
  width: 100%;

  border-collapse:
    collapse;
}

.grade-table thead {
  display:
    table-header-group;
}

.grade-table tr {
  page-break-inside:
    avoid;
}

.grade-table th {
  padding: 7px 6px;

  background: #f4f6fa;

  color: #737e93;

  font-size: 5.8px;

  font-weight: 700;

  letter-spacing: 0.4px;

  text-transform:
    uppercase;

  text-align: right;
}

.grade-table th:nth-child(1),
.grade-table th:nth-child(2) {
  text-align: left;
}

.grade-table td {
  padding: 7px 6px;

  border-top:
    1px solid #edf0f5;

  font-size: 7px;

  text-align: right;

  white-space: nowrap;
}

.grade-table td:nth-child(1),
.grade-table td:nth-child(2) {
  text-align: left;
}

.serial {
  width: 25px;

  color: #8993a5;
}

.grade-name {
  font-weight: 700;

  color: #222a3b;
}

.empty-cell {
  padding: 22px !important;

  text-align: center !important;

  color: #8b95a7;
}

/* ======================================================
   FOOTER
====================================================== */

.report-footer {
  margin-top: 10px;

  padding-top: 7px;

  border-top:
    1px solid #e5e8ef;

  display: flex;

  justify-content:
    space-between;

  color: #8c96a8;

  font-size: 6px;
}

.stock-note {
  margin-top: 8px;

  padding: 8px 9px;

  border-radius: 7px;

  border:
    1px solid #f1d89e;

  background: #fff9eb;

  color: #79561b;

  font-size: 6.8px;

  line-height: 1.4;
}

</style>

</head>

<body>

<!-- =====================================================
     PAGE 1
===================================================== -->

<div class="page">

  <div class="report-header">

    <div class="header-row">

      <div class="header-brand">

        ${
          logoBase64
            ? `
              <div class="logo-wrap">
                <img
                  src="${logoBase64}"
                  alt="Bharat Special Steel"
                />
              </div>
            `
            : ""
        }

        <div class="title-wrap">

          <div class="report-kicker">
            MANAGEMENT
          </div>

          <div class="report-title">
            Management Analysis
          </div>

          <div class="report-subtitle">
            Order • Dispatch • Grade Intelligence
          </div>

        </div>

      </div>

      <div class="header-period">

        <div class="period-box">

          <div class="period-label">
            ANALYSIS PERIOD
          </div>

          <div class="period-value">
            ${escapeHtml(
              safeText(
                report?.periodLabel
              )
            )}
          </div>

          <div class="period-range">
            ${escapeHtml(
              safeText(
                report?.dateRange
                  ?.display
              )
            )}
          </div>

        </div>

      </div>

    </div>

  </div>


  <div class="section-heading-row">

    <div>

      <div class="section-kicker">
        PERIOD SUMMARY
      </div>

      <div class="section-heading">
        Quantity Performance
      </div>

    </div>

  </div>


  <div class="summary-grid">

    ${buildSummaryCard({
      label:
        "Order Quantity",

      value:
        combined.newOrderKg,

      type:
        "order",

      subtitle:
        "Orders received",
    })}

    ${buildSummaryCard({
      label:
        "Dispatch Target",

      value:
        combined.dispatchTargetKg,

      type:
        "target",

      subtitle:
        "Planned dispatch",
    })}

    ${buildSummaryCard({
      label:
        "Actual Dispatch",

      value:
        combined.actualDispatchKg,

      type:
        "dispatch",

      subtitle:
        "Actually dispatched",
    })}

    ${buildSummaryCard({
      label:
        "Dispatch Left",

      value:
        combined.dispatchLeftKg,

      type:
        "pending",

      subtitle:
        "Pending against target",
    })}

  </div>


  <div class="section-heading-row">

    <div>

      <div class="section-kicker">
        BUSINESS SPLIT
      </div>

      <div class="section-heading">
        H.O. and Steel Mill
      </div>

    </div>

  </div>


  <div class="business-grid">

    ${buildBusinessTable({
      title:
        "H.O. Orders",

      subtitle:
        "House order performance",

      block:
        house,

      type:
        "ho",
    })}

    ${buildBusinessTable({
      title:
        "Steel Mill Orders",

      subtitle:
        "N.H.O. / mill order performance",

      block:
        steelMill,

      type:
        "steel",
    })}

  </div>


  ${
    months.length > 1
      ? `
        <div class="comparison-card">

          <div class="comparison-header">

            <div class="section-kicker">
              ${escapeHtml(
                report.periodLabel
              )}
            </div>

            <div class="section-heading">
              Month-by-Month Comparison
            </div>

          </div>

          <table class="month-table">

            <thead>

              <tr>

                <th>
                  Month
                </th>

                <th>
                  Total Order
                </th>

                <th>
                  H.O.
                </th>

                <th>
                  Steel Mill
                </th>

                <th>
                  Target
                </th>

                <th>
                  Dispatch
                </th>

                <th>
                  Left
                </th>

              </tr>

            </thead>

            <tbody>
              ${buildMonthlyRows(
                months
              )}
            </tbody>

          </table>

        </div>
      `
      : ""
  }


  <div class="report-footer">

    <span>
      Bharat Special Steel
    </span>

    <span>
      Generated:
      ${escapeHtml(
        generatedText
      )}
    </span>

  </div>

</div>


<!-- =====================================================
     PAGE 2
===================================================== -->

<div class="page page-break">

  ${buildMonthlyChart(
    months
  )}


  <div class="grade-card">

    <div class="grade-header">

      <div class="section-kicker">
        GRADE ANALYSIS
      </div>

      <div class="section-heading">
        Grade-wise Order and Dispatch
      </div>

    </div>

    <table class="grade-table">

      <thead>

        <tr>

          <th>
            #
          </th>

          <th>
            Grade
          </th>

          <th>
            Order Qty
          </th>

          <th>
            Target
          </th>

          <th>
            Dispatch
          </th>

          <th>
            Left
          </th>

          <th>
            Orders
          </th>

        </tr>

      </thead>

      <tbody>

        ${buildGradeRows(
          grades
        )}

      </tbody>

    </table>

  </div>


  <div class="stock-note">

    Grade-wise quantities are provided for
    management stock planning and MOQ analysis.
    "Dispatch Left" represents pending quantity
    against the dispatch target supplied by the
    analytics service.

  </div>


  <div class="report-footer">

    <span>
      Bharat Special Steel
      • Management Analysis
    </span>

    <span>
      ${escapeHtml(
        safeText(
          report?.dateRange
            ?.display
        )
      )}
    </span>

  </div>

</div>

</body>

</html>
  `;
};

module.exports =
  steelAnalyticsTemplate;