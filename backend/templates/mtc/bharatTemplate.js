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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

  const numericValue =
    Number(
      String(text).replace(
        /,/g,
        ""
      )
    );

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

const getFontBase64 = (
  fileName
) => {
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

    if (
      !fs.existsSync(fontPath)
    ) {
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

const normalizeItems = (
  mtc
) => {
  const sourceRows =
    Array.isArray(mtc.items)
      ? mtc.items
      : [];

  if (
    sourceRows.length > 0
  ) {
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
    return mtc
      .chemicalCompositions;
  }

  if (
    Array.isArray(
      mtc.chemicalComposition
    )
  ) {
    const values = {};

    CHEMICAL_ELEMENTS.forEach(
      ([key, label]) => {
        const matchingElement =
          mtc.chemicalComposition
            .find(
              (item) =>
                String(
                  item?.element ||
                    ""
                )
                  .trim()
                  .toLowerCase() ===
                label.toLowerCase()
            );

        values[key] =
          matchingElement
            ?.result ??
          matchingElement
            ?.achieved ??
          matchingElement
            ?.value ??
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
    return mtc
      .mechanicalResults;
  }

  return [
    {
      heatNo:
        mtc.heatLotNo,

      rowLabel:
        "ACHIEVED",

      hardness:
        mtc.mechanicalProperties
          ?.hardness
          ?.achieved ??
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

  return Array.isArray(
    sourceRows
  )
    ? sourceRows.slice(
        0,
        15
      )
    : [];
};

/* =========================================================
   ROW RENDERERS
========================================================= */

const renderItemRows = (
  mtc
) => {
  const rows =
    normalizeItems(mtc).map(
      (item) => ({
        heatNo:
          String(
            item.heatNo || ""
          ).trim(),

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

  if (
    rows.length === 0
  ) {
    rows.push({
      heatNo: "-",
      size: "-",
      noOfPcs: "-",
      quantityInKgs: "-",
      remarks: "-",
    });
  }

  while (
    rows.length < 2
  ) {
    rows.push({
      heatNo: "",
      size: "-",
      noOfPcs: "-",
      quantityInKgs: "-",
      remarks: "-",
    });
  }

  return rows
    .map(
      (
        item,
        index
      ) => {
        const currentHeat =
          String(
            item.heatNo || ""
          ).trim();

        const previousHeat =
          index > 0
            ? String(
                rows[
                  index - 1
                ]?.heatNo ||
                  ""
              ).trim()
            : null;

        let heatCell = "";

        if (
          currentHeat &&
          (
            index === 0 ||
            currentHeat !==
              previousHeat
          )
        ) {
          let rowSpan = 1;

          for (
            let nextIndex =
              index + 1;
            nextIndex <
            rows.length;
            nextIndex += 1
          ) {
            const nextHeat =
              String(
                rows[
                  nextIndex
                ]?.heatNo ||
                  ""
              ).trim();

            if (
              !nextHeat ||
              nextHeat !==
                currentHeat
            ) {
              break;
            }

            rowSpan += 1;
          }

          heatCell = `
            <td
              class="center bold"
              ${
                rowSpan > 1
                  ? `rowspan="${rowSpan}"`
                  : ""
              }
            >
              ${escapeHtml(
                currentHeat
              )}
            </td>
          `;
        } else if (
          !currentHeat
        ) {
          heatCell = `
            <td class="center bold">
              -
            </td>
          `;
        }

        return `
          <tr class="item-data-row">
            ${heatCell}

            <td>
              ${escapeHtml(
                item.size
              )}
            </td>

            <td>
              ${escapeHtml(
                item.noOfPcs
              )}
            </td>

            <td>
              ${escapeHtml(
                formatWeight(
                  item.quantityInKgs
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                item.remarks
              )}
            </td>
          </tr>
        `;
      }
    )
    .join("");
};

const renderChemicalRows = (
  mtc
) => {
  const rows =
    normalizeChemicalRows(
      mtc
    );

  if (
    rows.length === 0
  ) {
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
          () => `
            <td class="chemical-value-cell">
              -
            </td>
          `
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

const renderMechanicalRows = (
  mtc
) =>
  normalizeMechanicalRows(
    mtc
  )
    .map(
      (row) => `
        <tr class="mechanical-result-row">
          <td class="bold">
            ${escapeHtml(
              row.heatNo
            )}
          </td>

          <td class="bold">
            ${escapeHtml(
              row.rowLabel ||
                "ACHIEVED"
            )}
          </td>

          <td>
            ${escapeHtml(
              row.hardness
            )}
          </td>

          <td>
            ${escapeHtml(
              row.tensileStrength
            )}
          </td>

          <td>
            ${escapeHtml(
              row.yieldStrength
            )}
          </td>

          <td>
            ${escapeHtml(
              row.elongation
            )}
          </td>

          <td>
            ${escapeHtml(
              row.impactStrength
            )}
          </td>
        </tr>
      `
    )
    .join("");

const renderHardenability = (
  mtc
) => {
  const sourceRows =
    normalizeHardenabilityRows(
      mtc
    );

  const columnCount =
    Math.max(
      sourceRows.length,
      12
    );

  const rows =
    Array.from({
      length:
        columnCount,
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
          field ===
          "achieved"
            ? row.achieved ??
              row.result
            : row[field];

        return `
          <td class="hard-value-cell">
            ${escapeHtml(
              value
            )}
          </td>
        `;
      })
      .join("");

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
        min
      </td>

      ${renderCells(
        "specMin"
      )}
    </tr>

    <tr>
      <td class="hard-row-label">
        max
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

  const rawMaterial =
    mtc.rawMaterialDetail ||
    {};

  const ultrasonic =
    mtc.ultrasonicTesting ||
    {};

  const gas =
    mtc.gasAnalysis ||
    {};

  const decarbonization =
    mtc.depthOfDecarbonization ||
    {};

  const inclusion =
    mtc.inclusionRating ||
    {};

  const grain =
    mtc.grainSize ||
    {};

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
        216mm 279mm;

      margin:
        2.8mm;
    }

    * {
      box-sizing:
        border-box;
    }

    html,
    body {
      width:
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

      font-size:
        6.7px;

      line-height:
        1.05;

      font-weight:
        400;

      -webkit-font-smoothing:
        antialiased;

      text-rendering:
        geometricPrecision;

      -webkit-print-color-adjust:
        exact;

      print-color-adjust:
        exact;
    }

    .certificate-page {
      width:
        100%;

      border:
        1.15px solid #000;
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
  border:
    0.78px solid #000;

  padding:
    0.75px 1.35px;

  vertical-align:
    middle;

  text-align:
    center;

  font-family:
    "RobotoEmbedded",
    Arial,
    sans-serif;

  /*
   * Increase all normal certificate text.
   */
  font-size:
    7.15px;

  line-height:
    1.08;

  font-weight:
    500;

  overflow-wrap:
    break-word;

  word-break:
    normal;
}

    .bold,
th,
.section-title,
.meta-label,
.meta-right-label,
.final-label {
  font-weight:
    700;
}

/*
 * Strong heading text like the reference PDF.
 */
th,
.section-title,
.document-title-main,
.meta-table td.bold,
.mechanical-table thead th,
.inclusion-table .bold,
.final-label {
  font-family:
    "RobotoEmbedded",
    Arial,
    sans-serif;

  font-weight:
    700;

  letter-spacing:
    -0.08px;
}

    .center {
      text-align:
        center;
    }

    .left {
      text-align:
        left;
    }

    .nowrap {
      white-space:
        nowrap;
    }

    /* =====================================================
       COMPANY HEADER
    ===================================================== */

    .company-header {
      border-bottom:
        0.95px solid #000;
    }

    .gstin-row {
      height:
        4.2mm;

      padding:
        0.75mm
        0.75mm
        0.35mm;

      text-align:
        left;

      font-size:
        6.2px;

      line-height:
        1;

      font-weight:
        700;

      border-bottom:
        0.72px solid #000;
    }

    .brand-row {
      position:
        relative;

      height:
        29.5mm;

      display:
        grid;

      grid-template-columns:
        34mm
        minmax(0, 1fr)
        45mm;

      align-items:
        center;

      padding:
        0.8mm
        1.2mm
        0.6mm;

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
        63mm;

      height:
        5.5mm;

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
      text-align:
        center;

      align-self:
        center;

      padding-top:
        1.4mm;
    }

    .company-logo {
      width:
        31mm;

      max-width:
        31mm;

      max-height:
        8.5mm;

      object-fit:
        contain;

      margin-bottom:
        0.4mm;
    }

    .company-name {
      font-size:
        15.3px;

      line-height:
        1;

      font-weight:
        700;

      letter-spacing:
        -0.25px;
    }

    .company-address {
  margin-top:
    1.1mm;

  font-size:
    6.4px;

  line-height:
    1.22;

  font-weight:
    500;
}

    .company-contact {
  padding-top:
    1.4mm;

  padding-left:
    1.5mm;

  color:
    #0066cc;

  text-align:
    left;

  font-size:
    6.1px;

  line-height:
    1.25;

  font-weight:
    500;
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
    4mm;

  white-space:
    nowrap;
}

.contact-label {
  color:
    #000;

  font-size:
    6px;

  line-height:
    1;

  font-weight:
    700;

  text-decoration:
    none;
}

.contact-text {
  color:
    #0066cc;

  font-size:
    6px;

  line-height:
    1;

  font-weight:
    500;

  text-decoration:
    underline;
}

    /* =====================================================
       DOCUMENT HEADER
    ===================================================== */

    .document-title td {
  height:
    5.3mm;

  padding:
    0.35px 1px;

  font-size:
    8.4px;

  line-height:
    1;

  font-weight:
    700;
}

.document-title-main {
  width:
    77%;

  font-size:
    9px !important;

  font-weight:
    700;

  text-align:
    center;
}

.document-title-date {
  width:
    23%;

  padding-left:
    1.4mm !important;

  text-align:
    left;

  font-size:
    7px !important;

  line-height:
    1;

  font-weight:
    700;

  white-space:
    nowrap;
}

    .meta-table td {
  height:
    4.45mm;

  padding:
    0.65px 1.55px;

  font-size:
    7.05px;

  line-height:
    1.06;

  font-weight:
    500;

  text-align:
    left;
}

/*
 * Left and right labels.
 */
.meta-table td.bold,
.meta-label,
.meta-right-label {
  font-size:
    7px;

  font-weight:
    700;
}

/*
 * Dynamic values entered from the form.
 */
.meta-main-value,
.meta-right-value {
  font-size:
    7.1px;

  font-weight:
    500;
}

.meta-label {
  width:
    18%;
}

.meta-main-value {
  width:
    59%;
}

.meta-right-label {
  width:
    12%;

  text-align:
    center !important;
}

.meta-right-value {
  width:
    11%;

  text-align:
    center !important;
}
    /* =====================================================
       SECTION TITLES
    ===================================================== */

    .section-title {
  height:
    6.3mm;

  padding:
    0.6px 1px;

  font-size:
    9px;

  line-height:
    1;

  font-weight:
    700;

  text-align:
    center;

  vertical-align:
    middle;

  border-top-width:
    1.05px;

  border-bottom-width:
    1.05px;
}

    /* =====================================================
       ITEM TABLE
    ===================================================== */

    .item-table th {
  height:
    6.8mm;

  padding:
    0.5px 0.9px;

  font-size:
    7.4px;

  line-height:
    1;

  font-weight:
    700;
}

.item-data-row td {
  height:
    8.1mm;

  padding:
    0.5px 1px;

  font-size:
    7.4px;

  line-height:
    1.05;

  font-weight:
    500;
}

.item-data-row td.bold {
  font-weight:
    700;
}

    /* =====================================================
       CHEMICAL TABLE
    ===================================================== */

    .chemical-table th {
  height:
    7mm;

  padding:
    0.45px 0.2px;

  font-size:
    7.15px;

  line-height:
    1;

  font-weight:
    700;
}

.chemical-table td {
  height:
    7.3mm;

  padding:
    0.45px 0.2px;

  font-size:
    6.9px;

  line-height:
    1;

  font-weight:
    500;
}

.chemical-heat-cell,
.chemical-result-label {
  font-size:
    6.9px;

  font-weight:
    700;
}

.chemical-value-cell {
  font-size:
    6.9px;

  font-weight:
    500;
}


    /* =====================================================
       MECHANICAL TABLE
    ===================================================== */

    .mechanical-table th,
.mechanical-table td {
  padding:
    0.6px 0.75px;

  font-size:
    6.9px;

  line-height:
    1.1;

  font-weight:
    500;
}

.mechanical-table thead th {
  height:
    12mm;

  font-size:
    7.05px;

  line-height:
    1.15;

  font-weight:
    700;
}

.mechanical-fixed-row .bold,
.mechanical-result-row .bold {
  font-size:
    6.9px;

  font-weight:
    700;
}

    /* =====================================================
       RAW MATERIAL AND HARDENABILITY
    ===================================================== */

    .raw-material-table td {
  height:
    5.7mm;

  padding:
    0.45px;

  font-size:
    6.8px;

  line-height:
    1.05;

  font-weight:
    500;
}

.hardenability-table td {
  height:
    5.7mm;

  padding:
    0.4px 0.18px;

  font-size:
    6.35px;

  line-height:
    1;

  font-weight:
    500;
}

.hard-row-label {
  width:
    15%;

  font-size:
    6.25px;

  font-weight:
    600;
}

.hard-value-cell {
  font-size:
    6.3px;

  font-weight:
    500;
}

    /* =====================================================
       TESTING TABLES
    ===================================================== */

    .testing-table td {
  height:
    6.15mm;

  padding:
    0.5px 0.85px;

  font-size:
    6.75px;

  line-height:
    1.06;

  font-weight:
    500;
}

.testing-table td.bold {
  font-weight:
    700;
}

.inclusion-table td,
.inclusion-table th {
  height:
    5.65mm;

  padding:
    0.5px 0.6px;

  font-size:
    6.65px;

  line-height:
    1.05;

  font-weight:
    500;
}

.inclusion-table .bold {
  font-weight:
    700;
}

    /* =====================================================
       FINAL DETAILS
    ===================================================== */

    .final-table td {
  height:
    5.15mm;

  padding:
    0.5px 1.1px;

  text-align:
    left;

  font-size:
    6.75px;

  line-height:
    1.06;

  font-weight:
    500;
}

.final-label {
  font-size:
    6.6px;

  font-weight:
    700;

  text-align:
    center !important;

  white-space:
    nowrap;
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
         CERTIFICATE INFORMATION
    =================================================== -->

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
        <col style="width:8.3%" />
        <col style="width:16%" />
        <col style="width:17.7%" />
        <col style="width:23.5%" />
        <col style="width:34.5%" />
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
        <col class="chemical-spec-column" />
        <col class="chemical-result-column" />

        ${CHEMICAL_ELEMENTS.map(
          () =>
            '<col style="width:5.82%" />'
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
        ${renderChemicalRows(
          mtc
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
        <col style="width:8.3%" />
        <col style="width:15.8%" />
        <col style="width:17.3%" />
        <col style="width:17.1%" />
        <col style="width:13.8%" />
        <col style="width:10.5%" />
        <col style="width:17.2%" />
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
                "IS:1608 ASTM A370 As Normalized Condition"
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
            IS:1757 Impact Strength Charpy
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

    <!-- ==================================================
         RAW MATERIAL AND HARDENABILITY
    =================================================== -->

    <table class="raw-hard-wrapper">

      <tr>

        <td
          style="width:18%"
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

        <td style="padding:0">

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

    <!-- ==================================================
         ULTRASONIC / GAS / DECARBONIZATION
    =================================================== -->

    <table>
      <tr>

        <td
          style="width:30%"
          class="section-title"
        >
          Ultrasonic Testing
          <br/>
          (As Per ASTM A388)
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
        <col style="width:8.3%" />
        <col style="width:21.7%" />
        <col style="width:10.5%" />
        <col style="width:12.2%" />
        <col style="width:12.3%" />
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

        <td>
          GAS
        </td>

        <td>
          REQ.
        </td>

        <td>
          ACT.
        </td>

        <td>
          Mixup Testing
        </td>

        <td>
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
        <col style="width:8.3%" />
        <col style="width:6.9%" />
        <col style="width:6.9%" />
        <col style="width:6.9%" />
        <col style="width:7%" />
        <col style="width:18%" />
        <col style="width:18%" />
        <col style="width:13.8%" />
        <col style="width:14.2%" />
      </colgroup>

      <tr>

        <td></td>

        <td class="bold">
          A
        </td>

        <td class="bold">
          B
        </td>

        <td class="bold">
          C
        </td>

        <td class="bold">
          D
        </td>

        <td rowspan="2">
          ${escapeHtml(
            grain.specified ||
              "5~8"
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
            inclusion.specified
              ?.a
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified
              ?.b
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified
              ?.c
          )}
        </td>

        <td>
          ${escapeHtml(
            inclusion.specified
              ?.d
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

    <!-- ==================================================
         FINAL DETAILS
    =================================================== -->

    <table class="final-table">

      <colgroup>
        <col style="width:13.3%" />
        <col style="width:57.7%" />
        <col style="width:17.6%" />
        <col style="width:11.4%" />
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