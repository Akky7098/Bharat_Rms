const fs = require("fs");
const path = require("path");

/* =========================================================
   BASIC HELPERS
========================================================= */

const dash = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "-";
  }

  return String(value).trim();
};

const escapeHtml = (value) =>
  dash(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const upper = (value) => {
  const text = dash(value);

  return text === "-"
    ? "-"
    : text
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return `${String(
    date.getDate()
  ).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatWeight = (value) => {
  const text = dash(value);

  if (text === "-") {
    return "-";
  }

  if (/kgs?/i.test(text)) {
    return text.toUpperCase();
  }

  const numericValue = Number(text);

  return Number.isFinite(
    numericValue
  )
    ? `${numericValue.toFixed(
        3
      )} KGS`
    : text.toUpperCase();
};

/* =========================================================
   ASSET HELPERS
========================================================= */

const fileToBase64Url = (
  filePath
) => {
  try {
    if (
      !filePath ||
      !fs.existsSync(filePath)
    ) {
      return "";
    }

    const extension = path
      .extname(filePath)
      .replace(".", "")
      .toLowerCase();

    let mimeType = "png";

    if (
      extension === "jpg" ||
      extension === "jpeg"
    ) {
      mimeType = "jpeg";
    } else if (
      extension === "svg"
    ) {
      mimeType = "svg+xml";
    } else if (
      extension === "webp"
    ) {
      mimeType = "webp";
    }

    const buffer =
      fs.readFileSync(filePath);

    return `data:image/${mimeType};base64,${buffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.error(
      "BHARAT TC ASSET ERROR =>",
      error.message
    );

    return "";
  }
};

const getLogoBase64 = () => {
  const candidatePaths = [
    path.join(
      __dirname,
      "..",
      "..",
      "public",
      "bharat-logo.png"
    ),

    path.join(
      __dirname,
      "..",
      "..",
      "public",
      "logo.png"
    ),

    path.join(
      __dirname,
      "..",
      "asset",
      "bharat-logo.png"
    ),

    path.join(
      __dirname,
      "..",
      "asset",
      "logo.png"
    ),
  ];

  const existingPath =
    candidatePaths.find(
      (candidatePath) =>
        fs.existsSync(
          candidatePath
        )
    );

  if (!existingPath) {
    console.log(
      "BHARAT TC LOGO NOT FOUND"
    );

    return "";
  }

  return fileToBase64Url(
    existingPath
  );
};

/* =========================================================
   CONSTANTS
========================================================= */

const CHEMICAL_ELEMENTS = [
  ["c", "C"],
  ["si", "Si"],
  ["mn", "Mn"],
  ["p", "P"],
  ["s", "S"],
  ["cr", "Cr"],
  ["mo", "Mo"],
  ["ni", "Ni"],
  ["al", "Al"],
  ["cu", "Cu"],
  ["ti", "Ti"],
  ["v", "V"],
  ["nb", "Nb"],
  ["b", "B"],
];

/* =========================================================
   NORMALIZERS
========================================================= */

const normalizeItems = (mtc) => {
  const sourceRows =
    Array.isArray(mtc.items)
      ? mtc.items
      : [];

  if (sourceRows.length > 0) {
    return sourceRows.map(
      (item) => ({
        heatNo:
          item.heatNo,

        size:
          item.size,

        noOfPcs:
          item.noOfPcs ??
          item.pcs,

        quantityInKgs:
          item.quantityInKgs ??
          item.quantity ??
          item.weight,

        remarks:
          item.remarks,
      })
    );
  }

  return [
    {
      heatNo:
        mtc.heatLotNo,

      size:
        mtc.size,

      noOfPcs:
        mtc.pcs,

      quantityInKgs:
        mtc.weight,

      remarks:
        mtc.remarks,
    },
  ];
};

const normalizeChemicalRows = (
  mtc
) => {
  if (
    Array.isArray(
      mtc.chemicalCompositions
    ) &&
    mtc.chemicalCompositions
      .length > 0
  ) {
    return mtc.chemicalCompositions;
  }

  /*
   * Backward compatibility.
   */
  if (
    Array.isArray(
      mtc.chemicalComposition
    )
  ) {
    const values = {};

    CHEMICAL_ELEMENTS.forEach(
      ([key, label]) => {
        const matchingElement =
          mtc.chemicalComposition.find(
            (item) =>
              String(
                item?.element || ""
              )
                .trim()
                .toLowerCase() ===
              label.toLowerCase()
          );

        values[key] =
          matchingElement?.result ??
          matchingElement?.achieved ??
          matchingElement?.value ??
          "-";
      }
    );

    return [
      {
        heatNo:
          mtc.heatLotNo,

        rowLabel:
          "ACHIEVED",

        values,
      },
    ];
  }

  return [];
};

const normalizeMechanicalRows = (
  mtc
) => {
  if (
    Array.isArray(
      mtc.mechanicalResults
    ) &&
    mtc.mechanicalResults.length > 0
  ) {
    return mtc.mechanicalResults;
  }

  /*
   * Backward compatibility.
   */
  return [
    {
      heatNo:
        mtc.heatLotNo,

      rowLabel:
        "ACHIEVED",

      hardness:
        mtc.mechanicalProperties
          ?.hardness?.achieved ??
        mtc.mechanicalProperties
          ?.hardnessResult ??
        "-",

      tensileStrength:
        mtc.mechanicalProperties
          ?.tensileStrength
          ?.achieved ??
        mtc.mechanicalProperties
          ?.tensileStrength
          ?.result ??
        "-",

      yieldStrength:
        mtc.mechanicalProperties
          ?.yieldStrength
          ?.achieved ??
        mtc.mechanicalProperties
          ?.yieldStrength
          ?.result ??
        "-",

      elongation:
        mtc.mechanicalProperties
          ?.elongation?.achieved ??
        mtc.mechanicalProperties
          ?.elongation?.result ??
        "-",

      impactStrength:
        mtc.mechanicalProperties
          ?.impactStrength
          ?.achieved ??
        mtc.mechanicalProperties
          ?.impactStrength
          ?.result ??
        "-",
    },
  ];
};

const normalizeHardenabilityRows =
  (mtc) => {
    const sourceRows =
      mtc.hardenabilityTest
        ?.distances ||
      mtc.hardenabilityTest
        ?.distanceResults ||
      mtc.hardenability
        ?.distanceResults ||
      [];

    if (
      !Array.isArray(sourceRows)
    ) {
      return [];
    }

    return sourceRows.slice(
      0,
      15
    );
  };

/* =========================================================
   ITEM ROW RENDERER
========================================================= */

const renderItemRows = (mtc) => {
  const rows =
    normalizeItems(mtc);

  /*
   * The reference TC always keeps
   * at least two visible rows.
   */
  const visibleRowCount =
    Math.max(
      rows.length,
      2
    );

  return Array.from({
    length: visibleRowCount,
  })
    .map((_, index) => {
      const item =
        rows[index] || {};

      return `
        <tr class="item-data-row">
          <td class="center bold">
            ${escapeHtml(
              item.heatNo
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              item.size
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              item.noOfPcs
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              formatWeight(
                item.quantityInKgs
              )
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              item.remarks
            )}
          </td>
        </tr>
      `;
    })
    .join("");
};

/* =========================================================
   CHEMICAL COMPOSITION RENDERER
========================================================= */

const renderChemicalRows = (
  mtc
) => {
  const rows =
    normalizeChemicalRows(mtc);

  if (rows.length === 0) {
    return `
      <tr>
        <td class="chemical-heat-cell">
          ${escapeHtml(
            mtc.heatLotNo
          )}
        </td>

        <td class="chemical-result-label">
          ACHIEVED
        </td>

        ${CHEMICAL_ELEMENTS.map(
          () =>
            `<td class="chemical-value-cell">-</td>`
        ).join("")}
      </tr>
    `;
  }

  return rows
    .map(
      (row) => `
        <tr>
          <td class="chemical-heat-cell">
            ${escapeHtml(
              row.heatNo
            )}
          </td>

          <td class="chemical-result-label">
            ${escapeHtml(
              row.rowLabel ||
                "ACHIEVED"
            )}
          </td>

          ${CHEMICAL_ELEMENTS.map(
            ([key]) => `
              <td class="chemical-value-cell">
                ${escapeHtml(
                  row.values?.[
                    key
                  ]
                )}
              </td>
            `
          ).join("")}
        </tr>
      `
    )
    .join("");
};

/* =========================================================
   MECHANICAL PROPERTIES RENDERER
========================================================= */

const renderMechanicalRows = (
  mtc
) => {
  const rows =
    normalizeMechanicalRows(mtc);

  return rows
    .map(
      (row) => `
        <tr class="mechanical-result-row">
          <td class="center bold">
            ${escapeHtml(
              row.heatNo
            )}
          </td>

          <td class="center bold">
            ${escapeHtml(
              row.rowLabel ||
                "ACHIEVED"
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              row.hardness
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              row.tensileStrength
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              row.yieldStrength
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              row.elongation
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              row.impactStrength
            )}
          </td>
        </tr>
      `
    )
    .join("");
};

/* =========================================================
   HARDENABILITY RENDERER
========================================================= */

const renderHardenability = (
  mtc
) => {
  const sourceRows =
    normalizeHardenabilityRows(
      mtc
    );

  /*
   * The reference certificate has a
   * wide horizontal hardenability table.
   * Keep at least 12 distance columns.
   */
  const columnCount =
    Math.max(
      sourceRows.length,
      12
    );

  const rows =
    Array.from({
      length: columnCount,
    }).map(
      (_, index) =>
        sourceRows[index] || {
          distance: "-",
          specMin: "-",
          specMax: "-",
          achieved: "-",
        }
    );

  const renderCells = (
    field
  ) => {
    return rows
      .map((row) => {
        const value =
          field === "achieved"
            ? row.achieved ??
              row.result
            : row[field];

        return `
          <td class="hard-value-cell">
            ${escapeHtml(value)}
          </td>
        `;
      })
      .join("");
  };

  return `
    <tr>
      <td class="hard-row-label">
        Distance in mm
      </td>

      ${renderCells(
        "distance"
      )}
    </tr>

    <tr>
      <td class="hard-row-label">
        SPEC.
        <br/>
        MIN
      </td>

      ${renderCells(
        "specMin"
      )}
    </tr>

    <tr>
      <td class="hard-row-label">
        MAX
      </td>

      ${renderCells(
        "specMax"
      )}
    </tr>

    <tr>
      <td class="hard-row-label">
        Achieved
      </td>

      ${renderCells(
        "achieved"
      )}
    </tr>
  `;
};

/* =========================================================
   MAIN TEMPLATE
========================================================= */

const bharatTemplate = (
  mtc = {}
) => {
  const logoBase64 =
    getLogoBase64();

  const mechanical =
    mtc.mechanicalProperties ||
    {};

  const rawMaterial =
    mtc.rawMaterialDetail ||
    {};

  const ultrasonic =
    mtc.ultrasonicTesting ||
    {};

  const gas =
    mtc.gasAnalysis || {};

  const decarbonization =
    mtc.depthOfDecarbonization ||
    {};

  const inclusion =
    mtc.inclusionRating ||
    {};

  const grain =
    mtc.grainSize || {};

  const physical =
    mtc.physicalTesting ||
    {};

  const hardenabilityColumns =
    Math.max(
      normalizeHardenabilityRows(
        mtc
      ).length,
      12
    );

  return `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

  <style>
    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      color: #000;
      background: #fff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 6.2px;
      line-height: 1.08;
      -webkit-print-color-adjust:
        exact;
      print-color-adjust: exact;
    }

    .certificate-page {
      width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      border: 0.65px solid #000;
      padding: 1px 1.4px;
      vertical-align: middle;
      text-align: center;
      overflow-wrap: anywhere;
    }

    .center {
      text-align: center;
    }

    .left {
      text-align: left;
    }

    .bold {
      font-weight: 700;
    }

    .nowrap {
      white-space: nowrap;
    }

    /* =====================================================
       COMPANY HEADER
    ===================================================== */

    .company-header {
      border: 1px solid #000;
    }

    .gstin-row {
      min-height: 3.2mm;
      padding: 0.4mm 1mm;
      text-align: left;
      font-size: 5.7px;
      border-bottom:
        1px solid #000;
    }

    .brand-row {
      min-height: 20mm;
      padding: 0.8mm 1.2mm;
      display: grid;
      grid-template-columns:
        28mm 1fr 42mm;
      align-items: center;
    }

    .brand-center {
      text-align: center;
    }

    .company-logo {
      width: 30mm;
      max-height: 8mm;
      object-fit: contain;
    }

    .company-name {
      margin-top: 0.4mm;
      font-size: 13px;
      line-height: 1;
      font-weight: 700;
    }

    .company-address {
      margin-top: 0.8mm;
      font-size: 5.7px;
      line-height: 1.25;
      font-weight: 600;
    }

    .company-contact {
      padding-left: 2mm;
      color: #0066cc;
      text-align: left;
      font-size: 5.6px;
      line-height: 1.5;
    }

    /* =====================================================
       DOCUMENT HEADER
    ===================================================== */

    .document-title td {
      font-size: 7.6px;
      font-weight: 700;
    }

    .document-title-main {
      width: 76%;
    }

    .document-title-date {
      width: 24%;
      text-align: left;
    }

    .meta-table td {
      font-size: 5.75px;
      text-align: left;
    }

    .meta-label {
      width: 18%;
      font-weight: 700;
    }

    .meta-main-value {
      width: 53%;
    }

    .meta-right-label {
      width: 14%;
      font-weight: 700;
      text-align: center !important;
    }

    .meta-right-value {
      width: 15%;
      text-align: center !important;
    }

    /* =====================================================
       SECTION TITLES
    ===================================================== */

    .section-title {
      padding: 1.35px;
      font-size: 7.3px;
      line-height: 1;
      font-weight: 700;
      text-align: center;
    }

    /* =====================================================
       ITEM TABLE
    ===================================================== */

    .item-table th {
      padding: 1.2px;
      font-size: 5.7px;
      font-weight: 700;
    }

    .item-data-row td {
      height: 5.7mm;
      font-size: 5.75px;
    }

    /* =====================================================
       CHEMICAL TABLE
    ===================================================== */

    .chemical-table th,
    .chemical-table td {
      padding: 1px 0.55px;
      font-size: 5px;
    }

    .chemical-spec-column {
      width: 9%;
    }

    .chemical-result-column {
      width: 9%;
    }

    .chemical-heat-cell,
    .chemical-result-label {
      font-weight: 700;
    }

    .chemical-value-cell {
      font-size: 5px;
    }

    /* =====================================================
       MECHANICAL TABLE
    ===================================================== */

    .mechanical-table th,
    .mechanical-table td {
      padding: 1px;
      font-size: 5.1px;
      text-align: center;
    }

    .mechanical-table thead th {
      font-weight: 700;
      line-height: 1.2;
    }

    .mechanical-fixed-row td {
      height: 4mm;
    }

    .mechanical-result-row td {
      height: 4.4mm;
    }

    /* =====================================================
       RAW MATERIAL AND HARDENABILITY
    ===================================================== */

    .raw-hard-wrapper > tbody >
      tr > td {
      padding: 0;
    }

    .raw-material-table td {
      height: 5mm;
      font-size: 5.1px;
    }

    .hardenability-table td {
      padding: 0.7px 0.25px;
      font-size: 4.65px;
    }

    .hard-row-label {
      width: 15%;
      font-weight: 700;
    }

    .hard-value-cell {
      text-align: center;
    }

    /* =====================================================
       TESTING TABLES
    ===================================================== */

    .testing-table td {
      padding: 1px;
      font-size: 5.1px;
    }

    .inclusion-table td,
    .inclusion-table th {
      padding: 0.9px;
      font-size: 5px;
    }

    /* =====================================================
       FINAL DETAILS
    ===================================================== */

    .final-table td {
      padding: 1px 1.5px;
      text-align: left;
      font-size: 5px;
    }

    .final-label {
      font-weight: 700;
      text-align: center !important;
      white-space: nowrap;
    }
  </style>
</head>

<body>

  <div class="certificate-page">

    <!-- ===============================================
         COMPANY HEADER
    ================================================ -->

    <div class="company-header">

      <div class="gstin-row">
        GSTIN:06AAMCB2429H1ZQ
      </div>

      <div class="brand-row">

        <div></div>

        <div class="brand-center">

          ${
            logoBase64
              ? `
                <img
                  class="company-logo"
                  src="${logoBase64}"
                  alt="Bharat Special Steel"
                />
              `
              : ""
          }

          <div class="company-name">
            BHARAT SPECIAL STEEL
          </div>

          <div class="company-address">
            107, 1st floor,
            SSR Corporate Park,
            13/6 Ekta Nagar Road,
            Near NHPC metro
            <br/>
            Faridabad - 12003
          </div>

        </div>

        <div class="company-contact">
          🌐 www.bharatspecialsteel.com
          <br/>
          ✉ info@bharatspecialsteels.com
          <br/>
          ☎ 8448119291
        </div>

      </div>
    </div>

    <!-- ===============================================
         DOCUMENT TITLE
    ================================================ -->

    <table class="document-title">
      <tr>
        <td class="document-title-main">
          MATERIAL TEST CERTIFICATE
        </td>

        <td class="document-title-date">
          Issue Date :
          ${formatDate(
            mtc.issueDate ||
              mtc.mtcDate ||
              mtc.createdAt
          )}
        </td>
      </tr>
    </table>

    <!-- ===============================================
         CERTIFICATE META
    ================================================ -->

    <table class="meta-table">

      <colgroup>
        <col class="meta-label" />
        <col class="meta-main-value" />
        <col class="meta-right-label" />
        <col class="meta-right-value" />
      </colgroup>

      <tr>
        <td class="bold">
          NAME OF CUSTOMER
        </td>

        <td>
          ${escapeHtml(
            mtc.customerName ||
              mtc.companyName ||
              mtc.messers
          )}
        </td>

        <td class="bold">
          TC NO. -
        </td>

        <td>
          ${escapeHtml(
            mtc.tcNo
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          ADDRESS
        </td>

        <td>
          ${escapeHtml(
            mtc.customerAddress
          )}
        </td>

        <td class="bold">
          DATE -
        </td>

        <td>
          ${formatDate(
            mtc.issueDate ||
              mtc.mtcDate
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          TDC NO. -
        </td>

        <td>
          ${escapeHtml(
            mtc.tdcNo ||
              "N/A"
          )}
        </td>

        <td class="bold">
          INVOICE NO. -
        </td>

        <td>
          ${escapeHtml(
            mtc.invoiceNo
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          PURCHASE SPECIFICATION
        </td>

        <td>
          ${escapeHtml(
            mtc.purchaseSpecification ||
              mtc.grade
          )}
        </td>

        <td class="bold">
          P.O. No.
        </td>

        <td>
          ${escapeHtml(
            mtc.poNo
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          PRODUCT
        </td>

        <td colspan="3">
          ${escapeHtml(
            upper(
              mtc.product
            )
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          MFG. ROUTE
        </td>

        <td colspan="3">
          ${escapeHtml(
            upper(
              mtc.manufacturingRoute ||
                mtc.condition
            )
          )}
        </td>
      </tr>

    </table>

    <!-- ===============================================
         ITEM DESCRIPTION
    ================================================ -->

    <table>
      <tr>
        <td class="section-title">
          ITEM DESCRIPTION
        </td>
      </tr>
    </table>

    <table class="item-table">

      <colgroup>
        <col style="width:18%" />
        <col style="width:22%" />
        <col style="width:18%" />
        <col style="width:24%" />
        <col style="width:18%" />
      </colgroup>

      <thead>
        <tr>
          <th>HEAT NO.</th>
          <th>SIZE(mm)</th>
          <th>NO. OF PCS</th>
          <th>QTY IN KGS</th>
          <th>REMARKS</th>
        </tr>
      </thead>

      <tbody>
        ${renderItemRows(mtc)}
      </tbody>

    </table>

    <!-- ===============================================
         CHEMICAL COMPOSITION
    ================================================ -->

    <table>
      <tr>
        <td class="section-title">
          CHEMICAL COMPOSITION
        </td>
      </tr>
    </table>

    <table class="chemical-table">

      <colgroup>
        <col class="chemical-spec-column" />
        <col class="chemical-result-column" />

        ${CHEMICAL_ELEMENTS.map(
          () =>
            '<col style="width:5.857%" />'
        ).join("")}
      </colgroup>

      <thead>
        <tr>
          <th>SPEC</th>
          <th></th>

          ${CHEMICAL_ELEMENTS.map(
            ([, label]) =>
              `<th>${label}</th>`
          ).join("")}
        </tr>
      </thead>

      <tbody>
        ${renderChemicalRows(mtc)}
      </tbody>

    </table>

    <!-- ===============================================
         MECHANICAL PROPERTIES
    ================================================ -->

    <table>
      <tr>
        <td class="section-title">
          MECHANICAL PROPERTIES
        </td>
      </tr>
    </table>

    <table class="mechanical-table">

      <colgroup>
        <col style="width:10%" />
        <col style="width:12%" />
        <col style="width:13%" />
        <col style="width:17%" />
        <col style="width:15%" />
        <col style="width:12%" />
        <col style="width:21%" />
      </colgroup>

      <thead>
        <tr>
          <th colspan="2">
            HARDNESS
            <br/>
            (BHN)
          </th>

          <th>
            ${escapeHtml(
              mechanical.hardness
                ?.standard ||
                "IS:1608 ASTM A370 AS NORMALIZED CONDITION"
            )}
          </th>

          <th>
            Tensile Strength
            <br/>
            N/mm2
          </th>

          <th>
            Yield Strength
            <br/>
            N/mm2
          </th>

          <th>
            EL (%)
          </th>

          <th>
            IS:1757 Impact Strength
            Charpy
            <br/>
            V-NOTCH (Joules)
          </th>
        </tr>
      </thead>

      <tbody>

        <tr class="mechanical-fixed-row">
          <td>-</td>

          <td class="bold">
            SPEC
          </td>

          <td class="bold">
            MIN
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .tensileStrength
                ?.specMin ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .yieldStrength
                ?.specMin ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .elongation
                ?.specMin ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .impactStrength
                ?.specMin ||
                "-"
            )}
          </td>
        </tr>

        <tr class="mechanical-fixed-row">
          <td>-</td>

          <td rowspan="2">
            ${escapeHtml(
              mechanical.hardness
                ?.sampleRemark ||
                "ONLY H&T SAMPLE"
            )}
          </td>

          <td class="bold">
            MAX
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .tensileStrength
                ?.specMax ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .yieldStrength
                ?.specMax ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .elongation
                ?.specMax ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .impactStrength
                ?.specMax ||
                "-"
            )}
          </td>
        </tr>

        ${renderMechanicalRows(
          mtc
        )}

      </tbody>
    </table>

    <!-- ===============================================
         RAW MATERIAL AND HARDENABILITY
    ================================================ -->

    <table class="raw-hard-wrapper">

      <tr>
        <td
          style="width:18%;"
          class="section-title"
        >
          Raw Material Detail
        </td>

        <td class="section-title">
          HARDENABILITY TEST
          (${escapeHtml(
            mtc.hardenabilityTest
              ?.standard ||
              "IS: 3848, ASTM A255, SAE J406"
          )})
        </td>
      </tr>

      <tr>

        <td
          style="
            vertical-align:top;
            padding:0;
          "
        >
          <table class="raw-material-table">

            <tr>
              <td>
                ${escapeHtml(
                  rawMaterial.source
                )}
              </td>
            </tr>

            <tr>
              <td>
                ${escapeHtml(
                  rawMaterial.reference
                )}
              </td>
            </tr>

            <tr>
              <td>-</td>
            </tr>

            <tr>
              <td>-</td>
            </tr>

          </table>
        </td>

        <td style="padding:0;">

          <table class="hardenability-table">

            <colgroup>
              <col style="width:15%" />

              ${Array.from({
                length:
                  hardenabilityColumns,
              })
                .map(
                  () => "<col />"
                )
                .join("")}
            </colgroup>

            ${renderHardenability(
              mtc
            )}

          </table>

        </td>
      </tr>

    </table>

    <!-- ===============================================
         ULTRASONIC / GAS / DECARBONIZATION
    ================================================ -->

    <table>
      <tr>

        <td
          style="width:36%;"
          class="section-title"
        >
          Ultrasonic Testing
          <br/>
          (As Per ASTM A388)
        </td>

        <td
          style="width:32%;"
          class="section-title"
        >
          GAS ANALYSIS REPORT
        </td>

        <td
          style="width:32%;"
          class="section-title"
        >
          Depth Of Decarbonization
          <br/>

          ${escapeHtml(
            decarbonization
              .standard ||
              "IS 6396/ASTM E1077"
          )}
        </td>

      </tr>
    </table>

    <table class="testing-table">

      <colgroup>
        <col style="width:10%" />
        <col style="width:26%" />

        <col style="width:10%" />
        <col style="width:11%" />
        <col style="width:11%" />

        <col style="width:14%" />
        <col style="width:18%" />
      </colgroup>

      <tr>
        <td>Ref. Std.</td>

        <td>
          ${escapeHtml(
            ultrasonic
              .referenceStandard ||
              "ASTM A388"
          )}
        </td>

        <td class="bold">
          GAS
        </td>

        <td class="bold">
          REQ.
        </td>

        <td class="bold">
          ACT.
        </td>

        <td class="bold">
          Mixup Testing
        </td>

        <td class="bold">
          MICROSTRUCTURE
        </td>
      </tr>

      <tr>
        <td>Acceptance</td>

        <td>
          ${escapeHtml(
            ultrasonic
              .acceptance ||
              "4MM FBH, 2MHZ"
          )}
        </td>

        <td>
          O2 (PPM)
        </td>

        <td>
          ${escapeHtml(
            gas.o2?.required
          )}
        </td>

        <td>
          ${escapeHtml(
            gas.o2?.actual
          )}
        </td>

        <td rowspan="3">
          ${escapeHtml(
            decarbonization
              .mixupTesting ||
              "OK"
          )}
        </td>

        <td rowspan="3">
          ${escapeHtml(
            decarbonization
              .microstructure ||
              "Pearlite + Ferrite"
          )}
        </td>
      </tr>

      <tr>
        <td>Probe Used</td>

        <td>
          ${escapeHtml(
            ultrasonic.probeUsed ||
              "24MM"
          )}
        </td>

        <td>
          N2 (PPM)
        </td>

        <td>
          ${escapeHtml(
            gas.n2?.required
          )}
        </td>

        <td>
          ${escapeHtml(
            gas.n2?.actual
          )}
        </td>
      </tr>

      <tr>
        <td>Result</td>

        <td>
          ${escapeHtml(
            ultrasonic.result ||
              "100% SATISFACTORY"
          )}
        </td>

        <td>
          H2 (PPM)
        </td>

        <td>
          ${escapeHtml(
            gas.h2?.required
          )}
        </td>

        <td>
          ${escapeHtml(
            gas.h2?.actual
          )}
        </td>
      </tr>

    </table>

    <!-- ===============================================
         INCLUSION / GRAIN / MACRO / PHYSICAL
    ================================================ -->

    <table>
      <tr>

        <td
          style="width:36%;"
          class="section-title"
        >
          INCLUSION RATING
          (${escapeHtml(
            inclusion.standard ||
              "IS:4163/ASTM E45A/J.K CHART WROST FIELD RATING"
          )})
        </td>

        <td
          style="width:18%;"
          class="section-title"
        >
          GRAIN SIZE
        </td>

        <td
          style="width:18%;"
          class="section-title"
        >
          MACROSTRUCTURE
        </td>

        <td
          style="width:28%;"
          class="section-title"
        >
          PHYSICAL TESTING
        </td>

      </tr>
    </table>

    <table class="inclusion-table">

      <colgroup>
        <col style="width:12%" />
        <col style="width:6%" />
        <col style="width:6%" />
        <col style="width:6%" />
        <col style="width:6%" />

        <col style="width:18%" />
        <col style="width:18%" />

        <col style="width:14%" />
        <col style="width:14%" />
      </colgroup>

      <tr>
        <td></td>

        <td class="bold">A</td>
        <td class="bold">B</td>
        <td class="bold">C</td>
        <td class="bold">D</td>

        <td rowspan="2">
          ${escapeHtml(
            grain.specified ||
              "5-8"
          )}
        </td>

        <td rowspan="3">
          ${escapeHtml(
            mtc.macrostructure
          )}
        </td>

        <td class="bold">
          S.D.T. IS:4075
        </td>

        <td class="bold">
          SURFACE
        </td>
      </tr>

      <tr>
        <td class="bold">
          Specified
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified?.a
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified?.b
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified?.c
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified?.d
          )}
        </td>

        <td>
          ${escapeHtml(
            physical.sdt ||
              "N/A"
          )}
        </td>

        <td rowspan="2">
          ${escapeHtml(
            physical.surface
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          THIN
        </td>

        <td>
          ${escapeHtml(
            inclusion.thin?.a
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thin?.b
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thin?.c
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thin?.d
          )}
        </td>

        <td>
          ${escapeHtml(
            grain.achieved
          )}
        </td>

        <td class="bold">
          COLD BEND TEST
          <br/>

          ${escapeHtml(
            physical
              .coldBendTest ||
              "N/A"
          )}
        </td>
      </tr>

      <tr>
        <td class="bold">
          THICK
        </td>

        <td>
          ${escapeHtml(
            inclusion.thick?.a
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thick?.b
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thick?.c
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.thick?.d
          )}
        </td>

        <td colspan="4"></td>
      </tr>

    </table>

    <!-- ===============================================
         FINAL INSPECTIONS
    ================================================ -->

    <table class="final-table">

      <colgroup>
        <col style="width:18%" />
        <col style="width:64%" />
        <col style="width:10%" />
        <col style="width:8%" />
      </colgroup>

      <tr>
        <td class="final-label">
          IDENTIFICATION DETAIL
        </td>

        <td>
          ${escapeHtml(
            mtc.identificationDetail
          )}
        </td>

        <td class="final-label">
          COLOUR CODE
        </td>

        <td>
          ${escapeHtml(
            mtc.colourCode ||
              "N/A"
          )}
        </td>
      </tr>

      <tr>
        <td class="final-label">
          Dimensional Inspection
        </td>

        <td colspan="3">
          ${escapeHtml(
            mtc.dimensionalInspection
          )}
        </td>
      </tr>

      <tr>
        <td class="final-label">
          Visual Inspection
        </td>

        <td colspan="3">
          ${escapeHtml(
            mtc.visualInspection
          )}
        </td>
      </tr>

      <tr>
        <td class="final-label">
          RESULT
        </td>

        <td colspan="3">
          ${escapeHtml(
            mtc.resultDeclaration
          )}
        </td>
      </tr>

    </table>

  </div>

</body>
</html>
  `;
};

module.exports =
  bharatTemplate;