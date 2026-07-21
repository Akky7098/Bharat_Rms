const fs = require("fs");
const path = require("path");

/* =========================================================
   HELPERS
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

  return `${String(date.getDate()).padStart(2, "0")}/${String(
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

  const numericValue = Number(
    String(text).replace(/,/g, "")
  );

  return Number.isFinite(numericValue)
    ? `${numericValue.toFixed(3)} KGS`
    : text.toUpperCase();
};

const normalizeComparable = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/* =========================================================
   ASSET HELPERS
========================================================= */

const fileToBase64Url = (filePath) => {
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
    } else if (extension === "svg") {
      mimeType = "svg+xml";
    } else if (extension === "webp") {
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
      "public",
      "logo.png"
    ),

    path.join(
      __dirname,
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
      "..",
      "public",
      "bharat-logo.png"
    ),

    path.join(
      __dirname,
      "..",
      "asset",
      "logo.png"
    ),

    path.join(
      __dirname,
      "..",
      "asset",
      "bharat-logo.png"
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

const getFontBase64 = (fileName) => {
  try {
    const fontPath = path.join(
      __dirname,
      "..",
      "..",
      "node_modules",
      "@fontsource",
      "roboto",
      "files",
      fileName
    );

    if (!fs.existsSync(fontPath)) {
      console.error(
        "BHARAT TC FONT NOT FOUND =>",
        fontPath
      );

      return "";
    }

    return fs
      .readFileSync(fontPath)
      .toString("base64");
  } catch (error) {
    console.error(
      "BHARAT TC FONT LOAD ERROR =>",
      error.message
    );

    return "";
  }
};

/* =========================================================
   CHEMICAL ELEMENTS
========================================================= */

const FIXED_CHEMICAL_ELEMENTS = [
  ["c", "C"],
  ["si", "Si"],
  ["mn", "Mn"],
  ["p", "P"],
  ["s", "S"],
  ["cr", "Cr"],
];

const OPTIONAL_CHEMICAL_ELEMENTS = [
  ["mo", "Mo"],
  ["ni", "Ni"],
  ["al", "Al"],
  ["cu", "Cu"],
  ["ti", "Ti"],
  ["v", "V"],
  ["nb", "Nb"],
  ["b", "B"],
];

const ALL_CHEMICAL_ELEMENTS = [
  ...FIXED_CHEMICAL_ELEMENTS,
  ...OPTIONAL_CHEMICAL_ELEMENTS,
];

/* =========================================================
   NORMALIZERS
========================================================= */

const normalizeItems = (mtc) => {
  if (
    Array.isArray(mtc.items) &&
    mtc.items.length > 0
  ) {
    return mtc.items.map(
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
    return mtc
      .chemicalCompositions;
  }

  if (
    Array.isArray(
      mtc.chemicalComposition
    ) &&
    mtc.chemicalComposition
      .length > 0
  ) {
    const values = {};

    ALL_CHEMICAL_ELEMENTS.forEach(
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
    mtc.mechanicalResults
      .length > 0
  ) {
    return mtc.mechanicalResults.map(
      (row) => ({
        rowLabel:
          row.rowLabel ||
          "ACHIEVED",

        hardness:
          row.hardness ??
          "-",

        tensileStrength:
          row.tensileStrength ??
          "-",

        yieldStrength:
          row.yieldStrength ??
          "-",

        /*
         * New field first.
         * Old elongation is retained as
         * backward-compatible fallback.
         */
        reductionArea:
          row.reductionArea ??
          row.elongation ??
          "-",

        impactStrength:
          row.impactStrength ??
          "-",
      })
    );
  }

  return [
    {
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

      reductionArea:
        mtc.mechanicalProperties
          ?.reductionArea
          ?.achieved ??
        mtc.mechanicalProperties
          ?.reductionArea
          ?.result ??
        mtc.mechanicalProperties
          ?.elongation
          ?.achieved ??
        mtc.mechanicalProperties
          ?.elongation
          ?.result ??
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

const normalizeHardenabilityRows = (
  mtc
) => {
  const sourceRows =
    mtc.hardenabilityTest
      ?.distances ||
    mtc.hardenabilityTest
      ?.distanceResults ||
    mtc.hardenability
      ?.distanceResults ||
    [];

  return Array.isArray(sourceRows)
    ? sourceRows.slice(0, 12)
    : [];
};

/* =========================================================
   ITEM ROW MERGING
========================================================= */

const getSameValueSpan = (
  rows,
  index,
  field
) => {
  const current =
    normalizeComparable(
      rows[index]?.[field]
    );

  if (!current) {
    return 1;
  }

  let rowSpan = 1;

  for (
    let nextIndex = index + 1;
    nextIndex < rows.length;
    nextIndex += 1
  ) {
    const next =
      normalizeComparable(
        rows[nextIndex]?.[field]
      );

    if (next !== current) {
      break;
    }

    rowSpan += 1;
  }

  return rowSpan;
};

const shouldRenderMergedField = (
  rows,
  index,
  field
) => {
  if (index === 0) {
    return true;
  }

  return (
    normalizeComparable(
      rows[index - 1]?.[field]
    ) !==
    normalizeComparable(
      rows[index]?.[field]
    )
  );
};

const renderMergedCell = ({
  rows,
  index,
  field,
  value,
  className = "",
}) => {
  if (
    !shouldRenderMergedField(
      rows,
      index,
      field
    )
  ) {
    return "";
  }

  const rowSpan =
    getSameValueSpan(
      rows,
      index,
      field
    );

  return `
    <td
      class="${className}"
      ${
        rowSpan > 1
          ? `rowspan="${rowSpan}"`
          : ""
      }
    >
      ${escapeHtml(value)}
    </td>
  `;
};

const renderItemRows = (mtc) => {
  const sourceRows =
    normalizeItems(mtc).map(
      (item) => ({
        heatNo:
          dash(item.heatNo),

        size:
          dash(item.size),

        noOfPcs:
          dash(item.noOfPcs),

        quantityInKgs:
          dash(
            item.quantityInKgs
          ),

        remarks:
          dash(item.remarks),
      })
    );

  const rows =
    sourceRows.length > 0
      ? [...sourceRows]
      : [
          {
            heatNo: "-",
            size: "-",
            noOfPcs: "-",
            quantityInKgs: "-",
            remarks: "-",
          },
        ];

  while (rows.length < 2) {
    rows.push({
      heatNo: "-",
      size: "-",
      noOfPcs: "-",
      quantityInKgs: "-",
      remarks: "-",
    });
  }

  return rows
    .map((item, index) => {
      return `
        <tr class="item-data-row">

          <td class="bold">
            ${escapeHtml(
              item.heatNo
            )}
          </td>

          ${renderMergedCell({
            rows,
            index,
            field: "size",
            value: item.size,
          })}

          ${renderMergedCell({
            rows,
            index,
            field: "noOfPcs",
            value:
              item.noOfPcs,
          })}

          ${renderMergedCell({
            rows,
            index,
            field:
              "quantityInKgs",
            value: formatWeight(
              item.quantityInKgs
            ),
          })}

          <td>
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
   CHEMICAL RENDERING
========================================================= */

const hasActualChemicalValue = (
  rows,
  key
) =>
  rows.some((row) => {
    const value = dash(
      row.values?.[key]
    );

    return (
      value !== "-" &&
      value !== "…" &&
      value !== "…." &&
      value !== "....."
    );
  });

const getChemicalElementOrder = (
  rows
) => {
  const filledOptional =
    OPTIONAL_CHEMICAL_ELEMENTS.filter(
      ([key]) =>
        hasActualChemicalValue(
          rows,
          key
        )
    );

  const emptyOptional =
    OPTIONAL_CHEMICAL_ELEMENTS.filter(
      ([key]) =>
        !hasActualChemicalValue(
          rows,
          key
        )
    );

  return [
    ...FIXED_CHEMICAL_ELEMENTS,
    ...filledOptional,
    ...emptyOptional,
  ];
};

const renderChemicalRows = (
  mtc,
  chemicalElements
) => {
  const rows =
    normalizeChemicalRows(mtc);

  const visibleRows =
    rows.length > 0
      ? rows
      : [
          {
            heatNo:
              mtc.heatLotNo,

            rowLabel:
              "ACHIEVED",

            values: {},
          },
        ];

  return visibleRows
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

          ${chemicalElements
            .map(
              ([key]) => `
                <td class="chemical-value-cell">
                  ${escapeHtml(
                    row.values?.[
                      key
                    ]
                  )}
                </td>
              `
            )
            .join("")}

        </tr>
      `
    )
    .join("");
};

/* =========================================================
   HARDENABILITY RENDERING
========================================================= */

const renderHardenability = (
  mtc
) => {
  const sourceRows =
    normalizeHardenabilityRows(
      mtc
    );

  const rows =
    Array.from({
      length: 12,
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
  ) =>
    rows
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

  return `
    <tr>
      <td
        class="hard-main-label"
        colspan="2"
      >
        Distance in mm
      </td>

      ${renderCells(
        "distance"
      )}
    </tr>

    <tr>
      <td
        class="hard-spec-label"
        rowspan="2"
      >
        SPEC.
      </td>

      <td class="hard-minmax-label">
        MIN
      </td>

      ${renderCells(
        "specMin"
      )}
    </tr>

    <tr>
      <td class="hard-minmax-label">
        MAX
      </td>

      ${renderCells(
        "specMax"
      )}
    </tr>

    <tr>
      <td
        class="hard-main-label"
        colspan="2"
      >
        ACHIEVED
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

  const mechanical =
    mtc.mechanicalProperties ||
    {};

  const mechanicalRows =
    normalizeMechanicalRows(mtc);

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
    mtc.inclusionRating || {};

  const grain =
    mtc.grainSize || {};

  const physical =
    mtc.physicalTesting || {};

  const chemicalRows =
    normalizeChemicalRows(mtc);

  const chemicalElements =
    getChemicalElementOrder(
      chemicalRows
    );

  const supplyCondition =
    mtc.supplyCondition ||
    mtc.condition ||
    "-";

  return `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

  <meta
    http-equiv="Content-Type"
    content="text/html; charset=UTF-8"
  />

  <style>

    @font-face {
      font-family:
        "RobotoEmbedded";

      src:
        url("data:font/woff2;base64,${robotoRegular}")
        format("woff2");

      font-weight:
        400;

      font-style:
        normal;
    }

    @font-face {
      font-family:
        "RobotoEmbedded";

      src:
        url("data:font/woff2;base64,${robotoMedium}")
        format("woff2");

      font-weight:
        500;

      font-style:
        normal;
    }

    @font-face {
      font-family:
        "RobotoEmbedded";

      src:
        url("data:font/woff2;base64,${robotoBold}")
        format("woff2");

      font-weight:
        700;

      font-style:
        normal;
    }

    @page {
      size:
        A4 portrait;

      margin:
        8.8mm;
    }

    * {
      box-sizing:
        border-box;
    }

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

      color:
        #000;

      background:
        #fff;

      font-family:
        "RobotoEmbedded",
        Arial,
        sans-serif;

      -webkit-print-color-adjust:
        exact;

      print-color-adjust:
        exact;
    }

    body {
      font-size:
        6.8px;

      line-height:
        1.04;

      font-weight:
        400;
    }

    .certificate-page {
    width: 100%;

    display: inline-block;
     
    vertical-align: top;
    
    height: auto;

    min-height: auto;

    margin: 0;

    padding: 0;

    border: 1.8px solid #000;

    overflow: hidden;
}

    table {
      width:
        100%;

      border-collapse:
        collapse;

      table-layout:
        fixed;

      page-break-inside:
        avoid;
    }

    th,
td {
  /*
   * Horizontal borders are intentionally
   * darker than internal vertical borders.
   */
  border-top:
    1.05px solid #000;

  border-bottom:
    1.05px solid #000;

  border-left:
    0.78px solid #000;

  border-right:
    0.78px solid #000;

  padding:
    0.62px 1.05px;

  vertical-align:
    middle;

  text-align:
    center;

  font-family:
    "RobotoEmbedded",
    Arial,
    sans-serif;

  /*
   * Increased field-data font.
   */
  font-size:
    7.05px;

  line-height:
    1.06;

  font-weight:
    500;

  color:
    #000;

  overflow-wrap:
    break-word;

  word-break:
    normal;
}
    th,
    .bold,
    .section-title,
    .meta-table td.bold,
    .final-label {
      font-weight:
        700;
    }

    thead th,
    .item-table th,
    .chemical-table th,
    .mechanical-table th,
    .section-title,
    .raw-hard-wrapper .section-title,
    .inclusion-table th,
    .final-label {
      color:
        #000;

      font-weight:
        700;

      -webkit-font-smoothing:
        antialiased;

      text-rendering:
        geometricPrecision;
    }

    /* =====================================================
       COMPANY HEADER
    ===================================================== */

    .company-header {
  border-bottom:
    1.8px solid #000;
}

    .gstin-row {
  height:
    4mm;

  padding:
    0.7mm;

  text-align:
    left;

  font-size:
    6.45px;

  line-height:
    1;

  font-weight:
    700;

  color:
    #000;

  border-bottom:
    1.5px solid #000;
}
    .brand-row {
      position:
        relative;

      height:
        27mm;

      display:
        grid;

      grid-template-columns:
        30mm
        minmax(0, 1fr)
        49mm;

      align-items:
        center;

      padding:
        0.8mm 1.2mm;

      overflow:
        hidden;
    }

    .brand-row::before,
    .brand-row::after {
      content:
        "";

      position:
        absolute;

      top:
        0;

      width:
        53mm;

      height:
        4.8mm;

      background:
        #000;

      z-index:
        0;
    }

    .brand-row::before {
      left:
        0;
    }

    .brand-row::after {
      right:
        0;
    }

    .brand-center,
    .company-contact {
      position:
        relative;

      z-index:
        1;
    }

    .brand-center {
      padding-top:
        1.1mm;

      text-align:
        center;
    }

    .company-logo {
      width:
        29mm;

      max-height:
        8mm;

      margin-bottom:
        0.3mm;

      object-fit:
        contain;
    }

    .company-name {
      font-size:
        14px;

      line-height:
        1;

      font-weight:
        700;
    }

    .company-address {
      margin-top:
        0.8mm;

      font-size:
        6px;

      line-height:
        1.18;

      font-weight:
        500;
    }

    .company-contact {
      padding-top:
        1.2mm;

      padding-left:
        1mm;

      text-align:
        left;
    }

    .contact-line {
      display:
        grid;

      grid-template-columns:
        11mm
        minmax(0, 1fr);

      align-items:
        center;

      min-height:
        3.5mm;

      white-space:
        nowrap;
    }

    .contact-label {
      color:
        #000;

      font-size:
        5.8px;

      font-weight:
        700;
    }

    .contact-text {
      color:
        #0066cc;

      font-size:
        5.8px;

      font-weight:
        500;

      text-decoration:
        underline;

      overflow:
        hidden;
    }

    /* =====================================================
       DOCUMENT TITLE
    ===================================================== */

    .document-title {
  border-top:
    1.6px solid #000;

  border-bottom:
    1.6px solid #000;
}

.document-title td {
  height:
    5.6mm;

  padding:
    0.45px 1px;

  font-weight:
    700;

  color:
    #000;
}

.document-title-main {
  width:
    77%;

  font-size:
    9.8px !important;

  letter-spacing:
    0.05px;

  text-shadow:
    0.08px 0 #000;
}

.document-title-date {
  width:
    23%;

  padding-left:
    1.4mm !important;

  text-align:
    left;

  font-size:
    7.45px !important;

  font-weight:
    700;

  color:
    #000;

  white-space:
    nowrap;
}

    /* =====================================================
       META TABLE
    ===================================================== */

    .meta-table {
  border-bottom:
    1.6px solid #000;
}

.meta-table td {
  height:
    4.2mm;

  padding:
    0.62px 1.3px;

  text-align:
    left;

  font-size:
    7.15px;

  line-height:
    1.05;

  font-weight:
    500;

  color:
    #000;
}

.meta-table td.bold {
  font-size:
    7.25px;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.06px 0 #000;
}

    /* =====================================================
       SECTION HEADINGS
    ===================================================== */

    .section-title {
  height:
    6mm;

  padding:
    0.55px 1px;

  font-size:
    9.6px;

  line-height:
    1;

  font-weight:
    700;

  letter-spacing:
    0.035px;

  color:
    #000;

  text-shadow:
    0.1px 0 #000;

  /*
   * Bold line above and below
   * every major section title.
   */
  border-top:
    1.8px solid #000 !important;

  border-bottom:
    1.8px solid #000 !important;
}
    /* =====================================================
       ITEM TABLE
    ===================================================== */

    .item-table {
  border-bottom:
    1.7px solid #000;
}

.item-table thead th {
  height:
    6.3mm;

  font-size:
    7.45px;

  line-height:
    1.05;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.07px 0 #000;

  border-top:
    1.35px solid #000;

  border-bottom:
    1.5px solid #000;
}

.item-data-row td {
  height:
    7mm;

  font-size:
    7.2px;

  font-weight:
    500;

  color:
    #000;
}

    /* =====================================================
       CHEMICAL TABLE
    ===================================================== */

    .chemical-table {
  border-top:
    1.5px solid #000;

  border-bottom:
    1.8px solid #000;
}

.chemical-table thead th {
  height:
    6.2mm;

  padding:
    0.45px 0.15px;

  font-size:
    6.95px;

  line-height:
    1.04;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.07px 0 #000;

  border-top:
    1.4px solid #000;

  border-bottom:
    1.5px solid #000;
}

.chemical-table td {
  height:
    6.5mm;

  padding:
    0.45px 0.15px;

  font-size:
    6.75px;

  line-height:
    1.04;

  font-weight:
    500;

  color:
    #000;
}

.chemical-heat-cell,
.chemical-result-label {
  font-size:
    6.85px;

  font-weight:
    700;

  color:
    #000;
}

    /* =====================================================
       MECHANICAL TABLE
    ===================================================== */

    .mechanical-table {
  border-top:
    1.5px solid #000;

  border-bottom:
    1.8px solid #000;
}

.mechanical-table th,
.mechanical-table td {
  padding:
    0.5px 0.6px;

  font-size:
    6.85px;

  line-height:
    1.07;

  color:
    #000;
}

.mechanical-table thead th {
  height:
    10mm;

  font-size:
    7.15px;

  line-height:
    1.08;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.07px 0 #000;

  border-top:
    1.4px solid #000;

  border-bottom:
    1.5px solid #000;
}
    .mechanical-fixed-row td,
    .mechanical-result-row td {
      height:
        5.7mm;
    }

    .mechanical-spec-heading,
.mechanical-minmax-heading,
.mechanical-result-label {
  font-size:
    6.9px;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.05px 0 #000;
}

.mechanical-sample-cell {
  font-size:
    6.8px;

  font-weight:
    600;

  line-height:
    1.1;

  vertical-align:
    middle;

  color:
    #000;
}

.mechanical-result-value {
  font-size:
    6.95px;

  font-weight:
    600;

  color:
    #000;
}
    /* =====================================================
       RAW MATERIAL AND HARDENABILITY
    ===================================================== */

    .raw-hard-wrapper >
      tbody >
      tr >
      td {
      padding:
        0;
    }

    .raw-hard-wrapper {
  border-top:
    1.8px solid #000;

  border-bottom:
    1.8px solid #000;
}

.raw-material-table td {
  height:
    5.1mm;

  font-size:
    6.65px;

  color:
    #000;
}

.hardenability-table td {
  height:
    5.1mm;

  padding:
    0.34px 0.12px;

  font-size:
    6.1px;

  line-height:
    1.02;

  color:
    #000;
}

    .hard-main-label {
  width:
    12%;

  font-size:
    6.25px;

  font-weight:
    700;

  color:
    #000;
}

.hard-spec-label {
  width:
    6%;

  font-size:
    6.2px;

  font-weight:
    700;

  color:
    #000;
}

.hard-minmax-label {
  width:
    6%;

  font-size:
    6.2px;

  font-weight:
    700;

  color:
    #000;
}

    /* =====================================================
       TEST TABLES
    ===================================================== */

    .testing-table {
  border-top:
    1.8px solid #000;

  border-bottom:
    1.8px solid #000;
}

.testing-table td {
  height:
    5.4mm;

  padding:
    0.45px 0.7px;

  font-size:
    6.55px;

  line-height:
    1.04;

  color:
    #000;
}

.testing-table td.bold {
  font-size:
    6.7px;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.05px 0 #000;
}

    .inclusion-table {
  border-top:
    1.8px solid #000;

  border-bottom:
    1.8px solid #000;
}

.inclusion-table td,
.inclusion-table th {
  height:
    5.8mm;

  padding:
    0.45px 0.55px;

  font-size:
    6.55px;

  line-height:
    1.04;

  color:
    #000;
}

    .inclusion-column-heading,
.inclusion-row-heading,
.physical-heading {
  font-size:
    6.8px;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.05px 0 #000;
}

.grain-size-value {
  font-size:
    6.9px;

  font-weight:
    600;

  color:
    #000;

  text-align:
    center;
}

.grain-size-specified {
  border-bottom:
    1.25px solid #000;
}

.macrostructure-value {
  font-size:
    6.85px;

  font-weight:
    600;

  color:
    #000;

  vertical-align:
    middle;
}

.physical-value {
  font-size:
    6.75px;

  font-weight:
    600;

  color:
    #000;

  vertical-align:
    middle;
}

    /* =====================================================
       FINAL TABLE
    ===================================================== */

    .final-table {
    margin: 0;

    border-top: 1.8px solid #000;

    border-bottom: 0;
}

.final-table td {
  height:
    5.8mm;

  padding:
    0.5px 0.85px;

  text-align:
    left;

  font-size:
    6.55px;

  line-height:
    1.05;

  color:
    #000;
}

.final-label {
  text-align:
    center !important;

  font-size:
    6.75px;

  font-weight:
    700;

  color:
    #000;

  text-shadow:
    0.05px 0 #000;

  white-space:
    nowrap;
}

.final-table tr:last-child td {
    border-bottom: 0 !important;
}

/* =========================================================
   FINAL PRODUCTION BORDER EMPHASIS
========================================================= */

/*
 * Strong left and right boundaries for every
 * primary certificate section.
 */
.document-title,
.meta-table,
.item-table,
.chemical-table,
.mechanical-table,
.raw-hard-wrapper,
.testing-table,
.inclusion-table,
.final-table {
  border-left:
    1.35px solid #000;

  border-right:
    1.35px solid #000;
}

/*
 * Strong horizontal lines around every
 * major section table.
 */
.document-title {
  border-top:
    1.6px solid #000;

  border-bottom:
    1.6px solid #000;
}

.meta-table,
.item-table,
.chemical-table,
.mechanical-table,
.raw-hard-wrapper,
.testing-table,
.inclusion-table {
  border-bottom:
    1.8px solid #000;
}

/*
 * Strong horizontal line directly above
 * all main section names.
 */


/*
 * Ensure the certificate closes strongly
 * at the final RESULT row.
 */
/*
 * The certificate outer border closes
 * immediately after the RESULT row.
 */
.final-table tr:last-child td {
  border-bottom:
    0 !important;
}

  </style>
</head>

<body>

  <div class="certificate-page">

    <!-- ==================================================
         COMPANY HEADER
    =================================================== -->

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
            Faridabad -12003
          </div>

        </div>

        <div class="company-contact">

          <div class="contact-line">
            <span class="contact-label">
              Website:
            </span>

            <span class="contact-text">
              www.bharatspecialsteel.com
            </span>
          </div>

          <div class="contact-line">
            <span class="contact-label">
              Email:
            </span>

            <span class="contact-text">
              info@bharatspecilsteels.com
            </span>
          </div>

          <div class="contact-line">
            <span class="contact-label">
              Phone:
            </span>

            <span class="contact-text">
              8448119291
            </span>
          </div>

        </div>

      </div>
    </div>

    <!-- ==================================================
         DOCUMENT TITLE
    =================================================== -->

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

    <!-- ==================================================
         CERTIFICATE DETAILS
    =================================================== -->

    <table class="meta-table">

      <colgroup>
        <col style="width:18%" />
        <col style="width:59%" />
        <col style="width:12%" />
        <col style="width:11%" />
      </colgroup>

      <tr>
        <td class="bold">
          NAME OF CUSTOMER
        </td>

        <td>
          ${escapeHtml(
            mtc.customerName
          )}
        </td>

        <td class="bold">
          TC NO.-
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
          TDC NO:-
        </td>

        <td>
          ${escapeHtml(
            mtc.tdcNo ||
              "N/A"
          )}
        </td>

        <td class="bold">
          INVOICE NO.-
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
          P.O No.
        </td>

        <td>
          ${escapeHtml(
            mtc.poNo ||
              mtc.orderNo
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
          SUPPLY CONDITION
        </td>

        <td colspan="3">
          ${escapeHtml(
            upper(
              supplyCondition
            )
          )}
        </td>
      </tr>

    </table>

    <!-- ==================================================
         ITEM DESCRIPTION
    =================================================== -->

    <table>
      <tr>
        <td class="section-title">
          ITEM DESCRIPTION
        </td>
      </tr>
    </table>

    <table class="item-table">

      <colgroup>
        <col style="width:10%" />
        <col style="width:18%" />
        <col style="width:18%" />
        <col style="width:24%" />
        <col style="width:30%" />
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
        ${renderItemRows(
          mtc
        )}
      </tbody>

    </table>

    <!-- ==================================================
         CHEMICAL COMPOSITION
    =================================================== -->

    <table>
      <tr>
        <td class="section-title">
          CHEMICAL COMPOSITION
        </td>
      </tr>
    </table>

    <table class="chemical-table">

      <colgroup>
        <col style="width:9%" />
        <col style="width:10%" />

        ${chemicalElements
          .map(
            () =>
              '<col style="width:5.785%" />'
          )
          .join("")}
      </colgroup>

      <thead>
        <tr>

          <th colspan="2">
            SPEC
          </th>

          ${chemicalElements
            .map(
              ([, label]) =>
                `<th>${label}</th>`
            )
            .join("")}

        </tr>
      </thead>

      <tbody>
        ${renderChemicalRows(
          mtc,
          chemicalElements
        )}
      </tbody>

    </table>

    <!-- ==================================================
         MECHANICAL PROPERTIES
    =================================================== -->

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
        <col style="width:15%" />
        <col style="width:12%" />
        <col style="width:17%" />
        <col style="width:15%" />
        <col style="width:11%" />
        <col style="width:20%" />
      </colgroup>

      <thead>
        <tr>

          <th>
            HARDNESS
            <br/>
            (BHN)
          </th>

          <th colspan="2">
            ${escapeHtml(
              mechanical.hardness
                ?.standard ||
                "IS:1608 ASTM A370 AS NORMALIZED CONDITION"
            )}
          </th>

          <th>
            TENSILE STRENGTH
            <br/>
            N/mm2
          </th>

          <th>
            YIELD STRENGTH
            <br/>
            N/mm2
          </th>

          <th>
            REDUCTION AREA
            <br/>
            (%)
          </th>

          <th>
            IS:1757 IMPACT STRENGTH CHARPY
            <br/>
            V-NOTCH (JOULES)
          </th>

        </tr>
      </thead>

      <tbody>

        <!-- SPEC MIN ROW -->
        <tr class="mechanical-fixed-row">

          <td>
            ${escapeHtml(
              mechanical.hardness
                ?.specMin
            )}
          </td>

          <td class="mechanical-spec-heading">
            SPEC
          </td>

          <td class="mechanical-minmax-heading">
            MIN
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .tensileStrength
                ?.specMin
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .yieldStrength
                ?.specMin
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .reductionArea
                ?.specMin ??
              mechanical
                .elongation
                ?.specMin
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .impactStrength
                ?.specMin
            )}
          </td>

        </tr>

        <!-- SPEC MAX ROW -->
        <tr class="mechanical-fixed-row">

          <td>
            ${escapeHtml(
              mechanical.hardness
                ?.specMax
            )}
          </td>

          <td
            class="mechanical-sample-cell"
            rowspan="${
              Math.max(
                1,
                mechanicalRows.length
              ) + 1
            }"
          >
            ${escapeHtml(
              mechanical.hardness
                ?.sampleRemark ||
                "ONLY H&T SAMPLE"
            )}
          </td>

          <td class="mechanical-minmax-heading">
            MAX
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .tensileStrength
                ?.specMax
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .yieldStrength
                ?.specMax
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .reductionArea
                ?.specMax ??
              mechanical
                .elongation
                ?.specMax
            )}
          </td>

          <td>
            ${escapeHtml(
              mechanical
                .impactStrength
                ?.specMax
            )}
          </td>

        </tr>

        ${normalizeMechanicalRows(mtc)
          .map(
            (row) => `
              <tr class="mechanical-result-row">

                <td class="mechanical-result-value">
                  ${escapeHtml(
                    row.hardness
                  )}
                </td>

                <td class="mechanical-result-label">
                  ${escapeHtml(
                    row.rowLabel ||
                      "ACHIEVED"
                  )}
                </td>

                <td class="mechanical-result-value">
                  ${escapeHtml(
                    row.tensileStrength
                  )}
                </td>

                <td class="mechanical-result-value">
                  ${escapeHtml(
                    row.yieldStrength
                  )}
                </td>

                <td class="mechanical-result-value">
                  ${escapeHtml(
                    row.reductionArea
                  )}
                </td>

                <td class="mechanical-result-value">
                  ${escapeHtml(
                    row.impactStrength
                  )}
                </td>

              </tr>
            `
          )
          .join("")}

      </tbody>
    </table>

    <!-- ==================================================
         HARDENABILITY
    =================================================== -->

    <table class="raw-hard-wrapper">

      <tr>

        <td
          style="width:18%"
          class="section-title"
        >
          RAW MATERIAL DETAIL
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

        <td style="padding:0">

          <table class="hardenability-table">

            <colgroup>
              <col style="width:6%" />
              <col style="width:8%" />

              ${Array.from({
                length: 12,
              })
                .map(
                  () =>
                    '<col style="width:7.166%" />'
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

    <!-- ==================================================
         ULTRASONIC / GAS / DECARBONIZATION
    =================================================== -->

    <table>
      <tr>

        <td
          style="width:30%"
          class="section-title"
        >
          ULTRASONIC TESTING
          <br/>
          (AS PER ASTM A388)
        </td>

        <td
          style="width:35%"
          class="section-title"
        >
          GAS ANALYSIS REPORT
        </td>

        <td
          style="width:35%"
          class="section-title"
        >
          DEPTH OF DECARBONIZATION
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
        <col style="width:9%" />
        <col style="width:21%" />
        <col style="width:10%" />
        <col style="width:12.5%" />
        <col style="width:12.5%" />
        <col style="width:17.5%" />
        <col style="width:17.5%" />
      </colgroup>

      <tr>

        <td>
          Ref. Std.
        </td>

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
          MIXUP TESTING
        </td>

        <td class="bold">
          MICROSTRUCTURE
        </td>

      </tr>

      <tr>

        <td>
          Acceptance
        </td>

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

        <td>
          Probe Used
        </td>

        <td>
          ${escapeHtml(
            ultrasonic
              .probeUsed ||
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

        <td>
          Result
        </td>

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

    <!-- ==================================================
         INCLUSION / GRAIN / MACRO / PHYSICAL
    =================================================== -->

    <table>
      <tr>

        <td
          style="width:36%"
          class="section-title"
        >
          INCLUSION RATING
          (${escapeHtml(
            inclusion.standard ||
              "IS:4163/ASTM E45A/J.K CHART WROST FIELD RATING"
          )})
        </td>

        <td
          style="width:18%"
          class="section-title"
        >
          GRAIN SIZE
        </td>

        <td
          style="width:18%"
          class="section-title"
        >
          MACROSTRUCTURE
        </td>

        <td
          style="width:28%"
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

        <td class="inclusion-column-heading">
          A
        </td>

        <td class="inclusion-column-heading">
          B
        </td>

        <td class="inclusion-column-heading">
          C
        </td>

        <td class="inclusion-column-heading">
          D
        </td>

        <td class="grain-size-value grain-size-specified">
          ${escapeHtml(
            grain.specified ||
              "5~8"
          )}
        </td>

        <td
          class="macrostructure-value"
          rowspan="4"
        >
          ${escapeHtml(
            mtc.macrostructure
          )}
        </td>

        <td class="physical-heading">
          S.D.T. IS:4075
        </td>

        <td class="physical-heading">
          SURFACE
        </td>

      </tr>

      <tr>

        <td class="inclusion-row-heading">
          SPECIFIED
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

        <td
          class="grain-size-value grain-size-achieved"
          rowspan="3"
        >
          ${escapeHtml(
            grain.achieved
          )}
        </td>

        <td class="physical-value">
          ${escapeHtml(
            physical.sdt ||
              "N/A"
          )}
        </td>

        <td
          class="physical-value"
          rowspan="3"
        >
          ${escapeHtml(
            physical.surface
          )}
        </td>

      </tr>

      <tr>

        <td class="inclusion-row-heading">
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

        <td class="physical-heading">
          COLD BEND TEST
        </td>

      </tr>

      <tr>

        <td class="inclusion-row-heading">
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

        <td class="physical-value">
          ${escapeHtml(
            physical
              .coldBendTest ||
              "N/A"
          )}
        </td>

      </tr>

    </table>

    <!-- ==================================================
         FINAL DETAILS
    =================================================== -->

    <table class="final-table">

      <colgroup>
        <col style="width:14%" />
        <col style="width:57%" />
        <col style="width:17%" />
        <col style="width:12%" />
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
          DIMENSIONAL INSPECTION
        </td>

        <td colspan="3">
          ${escapeHtml(
            mtc.dimensionalInspection
          )}
        </td>

      </tr>

      <tr>

        <td class="final-label">
          VISUAL INSPECTION
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