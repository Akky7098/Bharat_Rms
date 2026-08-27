const fs = require("fs");
const path = require("path");

/* =========================================================
   SBE GERMANY MTC TEMPLATE

   File location:

   backend/
   └── templates/
       └── mtc/
           └── mtcGermanTemplate.js

   Assets location:

   backend/
   └── public/
       └── mtc-assets/
           ├── sbe-logo.png
           ├── sbe-company-details.png
           └── sbe-signature-stamp.png
========================================================= */


/* =========================================================
   IMPORTANT:

   __dirname here is:

   backend/templates/mtc

   Therefore we must go:

   ../..
   
   to reach backend/
========================================================= */

const ASSET_DIR = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "mtc-assets"
);


/* =========================================================
   IMAGE -> BASE64
========================================================= */

const toDataUri = (fileName) => {
  try {
    const filePath = path.join(
      ASSET_DIR,
      fileName
    );

    console.log(
      "SBE MTC ASSET PATH =>",
      filePath
    );

    if (!fs.existsSync(filePath)) {
      console.log(
        "SBE MTC ASSET NOT FOUND =>",
        filePath
      );

      return "";
    }

    const buffer =
      fs.readFileSync(filePath);

    const extension =
      path
        .extname(fileName)
        .toLowerCase();

    let mime =
      "image/png";

    if (
      extension === ".jpg" ||
      extension === ".jpeg"
    ) {
      mime =
        "image/jpeg";
    }

    return `data:${mime};base64,${buffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.log(
      `SBE MTC ASSET LOAD ERROR (${fileName}) =>`,
      error.message
    );

    return "";
  }
};


/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


/* =========================================================
   DISPLAY HELPER
========================================================= */

const display = (
  value,
  fallback = ""
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return escapeHtml(
      fallback
    );
  }

  return escapeHtml(
    value
  );
};


/* =========================================================
   NORMALIZE ELEMENT NAME
========================================================= */

const normalizeElementName = (
  value
) => {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
};


/* =========================================================
   GET CHEMICAL VALUE

   IMPORTANT:

   Your MongoDB format is:

   chemicalComposition: [
     {
       element: "C",
       min: null,
       max: null,
       result: 0.54
     },
     ...
   ]

   Previous template incorrectly treated composition
   as an object.

   This fixes that.
========================================================= */

const getChemicalValue = (
  composition,
  element
) => {
  if (
    !Array.isArray(
      composition
    )
  ) {
    return "---";
  }

  const normalizedElement =
    normalizeElementName(
      element
    );

  const found =
    composition.find(
      (item) =>
        normalizeElementName(
          item?.element
        ) ===
        normalizedElement
    );

  if (!found) {
    return "---";
  }

  const result =
    found.result;

  if (
    result === null ||
    result === undefined ||
    result === ""
  ) {
    return "---";
  }

  return String(result);
};


/* =========================================================
   CHEMICAL TABLE DATA

   Exact SBE order:

   C
   Si
   Mn
   Cr
   S
   P
   V
   Mo
   Ni
   AL
   Cu
========================================================= */

const buildChemicalData = (
  mtc
) => {
  const order =
    Array.isArray(
      mtc.chemicalOrder
    ) &&
    mtc.chemicalOrder
      .length > 0
      ? mtc.chemicalOrder
      : [
          "C",
          "Si",
          "Mn",
          "Cr",
          "S",
          "P",
          "V",
          "Mo",
          "Ni",
          "Al",
          "Cu",
        ];

  return order.map(
    (element) => ({
      element,

      label:
        element.toLowerCase() ===
        "al"
          ? "AL%"
          : `${element}%`,

      result:
        getChemicalValue(
          mtc.chemicalComposition,
          element
        ),
    })
  );
};


/* =========================================================
   NORMALIZE TEST RESULT
========================================================= */

const normalizeTestResult = (
  value,
  fallback = "Ok"
) => {
  if (
    value === true
  ) {
    return "Ok";
  }

  if (
    value === false
  ) {
    return "Nicht Ok";
  }

  return display(
    value,
    fallback
  );
};


/* =========================================================
   MAIN TEMPLATE
========================================================= */

const mtcGermanTemplate = (
  mtc = {}
) => {
  /* =======================================================
     LOAD IMAGES
  ======================================================= */

  const logo =
    toDataUri(
      "sbe-logo.png"
    );

  const companyDetails =
    toDataUri(
      "sbe-company-details.png"
    );

  const signatureStamp =
    toDataUri(
      "sbe-signature-stamp.png"
    );


  /* =======================================================
     BASIC VALUES
  ======================================================= */

  const grade =
    display(
      mtc.grade
    );

  const position =
    display(
      mtc.position,
      "577"
    );

  const quantity =
    display(
      mtc.quantity,
      mtc.pcs || "1"
    );

  const quantityUnit =
    display(
      mtc.quantityUnit,
      "ST"
    );

  const meltingMethod =
    display(
      mtc.meltingMethod,
      "Elektrostahl"
    );

  const castingProcess =
    display(
      mtc.castingProcess,
      "Blockguß"
    );

  const materialCode =
    display(
      mtc.materialCode,
      mtc.grade
    );

  const productionOrder =
    display(
      mtc.productionOrder,
      mtc.orderNo
    );

  const customerName =
    display(
      mtc.customerName,
      mtc.companyName
    );

  const materialDescription =
    display(
      mtc.materialDescription,
      mtc.grade
        ? `Wst ${mtc.grade} geschmiedet`
        : ""
    );

  const materialRemark =
    display(
      mtc.materialRemark,
      "Rest-uhd Anschnittstucke"
    );

  const execution =
    display(
      mtc.execution,
      mtc.grade
    );

  const customerPoNumber =
    display(
      mtc.customerPoNumber,
      mtc.poNo
    );

  const dimension =
    display(
      mtc.dimension,
      mtc.size
    );

  const hardness =
    display(
      mtc.hardnessBHN
    );

  const chemicalData =
    buildChemicalData(
      mtc
    );


  /* =======================================================
     CHEMICAL HEADER HTML
  ======================================================= */

  const chemicalHeaders =
    chemicalData
      .map(
        (item) => `
          <div class="chem-cell chem-label">
            ${display(
              item.label
            )}
          </div>
        `
      )
      .join("");


  /* =======================================================
     CHEMICAL RESULT HTML
  ======================================================= */

  const chemicalResults =
    chemicalData
      .map(
        (item) => `
          <div class="chem-cell chem-result">
            ${display(
              item.result,
              "---"
            )}
          </div>
        `
      )
      .join("");


  /* =======================================================
     HTML
  ======================================================= */

  return `
<!DOCTYPE html>

<html lang="de">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
Werkstoffprüfzeugnis
</title>


<style>

/* =========================================================
   PAGE
========================================================= */

@page {
  size: A4 portrait;
  margin: 0;
}


/* =========================================================
   GLOBAL
========================================================= */

* {
  box-sizing: border-box;
}


html,
body {

  margin: 0;
  padding: 0;

  width: 210mm;
  height: 297mm;

  background: #ffffff;

  color: #313131;
}


/* =========================================================
   FONT

   IMPORTANT:

   We intentionally DO NOT use Roboto.

   The original SBE TC has a classic typewriter /
   monospaced document appearance.

   Courier is the closest safe system font that Puppeteer
   can render consistently on Mac/Linux/production.
========================================================= */

body {

  font-family:
    "Courier",
    "Courier New",
    "Liberation Mono",
    monospace;

  font-weight: 400;

  font-size: 9pt;

  line-height: 1.13;

  letter-spacing: 0.05mm;

  -webkit-font-smoothing:
    antialiased;

  -moz-osx-font-smoothing:
    grayscale;

  -webkit-print-color-adjust:
    exact;

  print-color-adjust:
    exact;
}


/* =========================================================
   PAGE CONTAINER
========================================================= */

.page {

  position: relative;

  width: 210mm;
  height: 297mm;

  overflow: hidden;

  background: #ffffff;
}


/* =========================================================
   HEADER
========================================================= */

.header {

  position: absolute;

  left: 14mm;
  right: 14mm;

  top: 18.5mm;

  height: 34mm;
}


/* =========================================================
   SBE LOGO
========================================================= */

.logo-image {

  position: absolute;

  left: 10mm;
  top: 0;

  width: 61mm;
  height: 28mm;

  object-fit: contain;

  object-position:
    left top;
}


/* =========================================================
   COMPANY DETAILS
========================================================= */

.company-details-image {

  position: absolute;

  right: 7mm;
  top: 0;

  width: 61mm;
  height: 28mm;

  object-fit: contain;

  object-position:
    right top;
}


/* =========================================================
   HEADER BOTTOM LINE
========================================================= */

.header-line {

  position: absolute;

  left: 6mm;
  right: 6mm;

  bottom: 0;

  height: 0;

  border-top:
    0.25mm solid #333333;
}


/* =========================================================
   MAIN CONTENT
========================================================= */

.content {

  position: absolute;

  left: 14mm;
  right: 14mm;

  top: 56mm;
}


/* =========================================================
   HORIZONTAL DIVIDER
========================================================= */

.divider {

  width: 100%;

  border-top:
    0.25mm solid #555555;

  height: 0;

  margin: 0;
}


/* =========================================================
   POSITION / ANZAHL
========================================================= */

.position-section {

  display: grid;

  grid-template-columns:
    56%
    44%;

  height: 20mm;

  padding:
    2.4mm
    1.5mm
    0
    1.5mm;
}


.position-block {

  position: relative;
}


.position-heading {

  height: 7mm;
}


.position-value {

  padding-top: 2mm;
}


/* =========================================================
   BASIC INFORMATION ROW
========================================================= */

.info-section {

  padding:
    2mm
    1.5mm
    2.2mm
    1.5mm;
}


.info-row {

  display: grid;

  grid-template-columns:
    56%
    44%;

  min-height: 5.25mm;

  align-items: center;
}


/* =========================================================
   CUSTOMER ROW
========================================================= */

.customer-row {

  display: grid;

  grid-template-columns:
    46%
    5%
    49%;

  align-items: center;

  min-height: 10.5mm;

  padding:
    0
    1.5mm;
}


.colon {

  text-align: center;
}


/* =========================================================
   MATERIAL DESCRIPTION
========================================================= */

.description-row {

  display: grid;

  grid-template-columns:
    46%
    5%
    49%;

  min-height: 16mm;

  padding:
    2.5mm
    1.5mm
    1mm
    1.5mm;
}


.description-values {

  line-height: 1.55;
}


/* =========================================================
   SIMPLE SINGLE ROW
========================================================= */

.standard-row {

  display: grid;

  grid-template-columns:
    46%
    5%
    49%;

  align-items: center;

  min-height: 10mm;

  padding:
    0
    1.5mm;
}


/* =========================================================
   DIMENSION
========================================================= */

.dimension-row {

  display: grid;

  grid-template-columns:
    46%
    5%
    49%;

  align-items: center;

  min-height: 10.5mm;

  padding:
    0
    1.5mm;
}


/* =========================================================
   CHEMICAL TITLE
========================================================= */

.chemical-title-row {

  display: grid;

  grid-template-columns:
    29%
    71%;

  align-items: center;

  min-height: 8mm;

  padding:
    0
    1.5mm;
}


.chemical-note {

  padding-left: 11mm;
}


/* =========================================================
   CHEMICAL GRID
========================================================= */

.chemical-grid {

  display: grid;

  grid-template-columns:
    repeat(
      ${Math.max(
        chemicalData.length,
        1
      )},
      minmax(0, 1fr)
    );

  width: 100%;

  padding:
    1.5mm
    1.5mm
    0.7mm
    1.5mm;
}


.chem-cell {

  text-align: center;

  overflow: hidden;

  white-space: nowrap;
}


.chem-label {

  font-size: 7.6pt;

  min-height: 5mm;
}


.chem-result {

  font-size: 7.8pt;

  min-height: 5.3mm;
}


/* =========================================================
   HARDNESS
========================================================= */

.hardness-row {

  display: grid;

  grid-template-columns:
    31%
    26%
    43%;

  align-items: center;

  height: 10mm;

  padding:
    0
    1.5mm;
}


.hardness-test {

  text-align: right;

  padding-right: 7mm;
}


/* =========================================================
   REMARKS
========================================================= */

.remarks {

  padding:
    2.3mm
    1.5mm
    0
    1.5mm;
}


.remarks-heading {

  margin-bottom: 2mm;
}


.remark-row {

  display: grid;

  grid-template-columns:
    9mm
    74mm
    8mm
    auto;

  align-items: center;

  min-height: 6.25mm;
}


.remark-colon {

  text-align: center;
}


/* =========================================================
   SIGNATURE / STAMP

   Positioned to match original SBE TC lower-right area.
========================================================= */

.signature-image {

  position: absolute;

  left: 111mm;

  top: 228mm;

  width: 61mm;

  height: 35mm;

  object-fit: contain;

  object-position:
    center center;
}


/* =========================================================
   REMOVE BROWSER IMAGE ARTIFACTS
========================================================= */

img {

  border: none;

  outline: none;

  background: transparent;
}

</style>

</head>


<body>

<div class="page">


  <!-- =====================================================
       HEADER
  ====================================================== -->

  <div class="header">

    ${
      logo
        ? `
          <img
            src="${logo}"
            class="logo-image"
            alt="SBE"
          />
        `
        : ""
    }

    ${
      companyDetails
        ? `
          <img
            src="${companyDetails}"
            class="company-details-image"
            alt="Firmendaten"
          />
        `
        : ""
    }

    <div class="header-line"></div>

  </div>


  <!-- =====================================================
       MAIN CONTENT
  ====================================================== -->

  <main class="content">


    <!-- ===================================================
         POSITION / ANZAHL

         NOTE:
         "Position" is already the correct German wording.
    ==================================================== -->

    <div class="position-section">

      <div class="position-block">

        <div class="position-heading">
          Position
        </div>

        <div class="position-value">
          ${position}
        </div>

      </div>


      <div class="position-block">

        <div class="position-heading">
          Anzahl
        </div>

        <div class="position-value">

          ${quantity}

          ${
            quantityUnit
              ? ` ${quantityUnit}`
              : ""
          }

        </div>

      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         BASIC MATERIAL DATA
    ==================================================== -->

    <div class="info-section">


      <div class="info-row">

        <div>
          Erschmelzungsart
        </div>

        <div>
          ${meltingMethod}
        </div>

      </div>


      <div class="info-row">

        <div>
          Gießverfahren
        </div>

        <div>
          ${castingProcess}
        </div>

      </div>


      <div class="info-row">

        <div>
          Kd Wsr Bez
        </div>

        <div>
          ${materialCode}
        </div>

      </div>


      <div class="info-row">

        <div>
          Werkstoff
        </div>

        <div>
          ${grade}
        </div>

      </div>


      <div class="info-row">

        <div>
          Fertigungsauftrag
        </div>

        <div>
          ${productionOrder}
        </div>

      </div>


    </div>


    <div class="divider"></div>


    <!-- ===================================================
         CUSTOMER
    ==================================================== -->

    <div class="customer-row">

      <div>
        Kunde
      </div>

      <div class="colon">
        :
      </div>

      <div>
        ${customerName}
      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         DESCRIPTION
    ==================================================== -->

    <div class="description-row">

      <div></div>

      <div class="colon">
        :
      </div>

      <div class="description-values">

        <div>
          ${materialDescription}
        </div>

        <div>
          ${materialRemark}
        </div>

      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         EXECUTION
    ==================================================== -->

    <div class="standard-row">

      <div>
        Ausführung
      </div>

      <div class="colon">
        :
      </div>

      <div>
        ${execution}
      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         CUSTOMER PO
    ==================================================== -->

    <div class="standard-row">

      <div>
        Kundenbestellnummer
      </div>

      <div class="colon">
        :
      </div>

      <div>
        ${customerPoNumber}
      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         DIMENSION
    ==================================================== -->

    <div class="dimension-row">

      <div>
        Abmessung
      </div>

      <div class="colon">
        :
      </div>

      <div>
        ${dimension}
      </div>

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         CHEMICAL ANALYSIS
    ==================================================== -->

    <div class="chemical-title-row">

      <div>
        Schmelzanalyse
      </div>

      <div class="chemical-note">

        (% - H&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ppm)

      </div>

    </div>


    <div class="divider"></div>


    <!-- ELEMENT HEADERS -->

    <div class="chemical-grid">

      ${chemicalHeaders}

    </div>


    <!-- CHEMICAL RESULTS -->

    <div class="chemical-grid">

      ${chemicalResults}

    </div>


    <div class="divider"></div>


    <!-- ===================================================
         HARDNESS
    ==================================================== -->

    <div class="hardness-row">

      <div></div>

      <div class="hardness-test">
        Härteprüfung
      </div>

      <div>

        Härte&nbsp;&nbsp;:&nbsp;&nbsp;

        ${hardness}

        ${
          hardness
            ? " BHN"
            : ""
        }

      </div>

    </div>


    <!-- ===================================================
         REMARKS
    ==================================================== -->

    <section class="remarks">


      <div class="remarks-heading">

        Bemerkungen&nbsp;&nbsp;:

      </div>


      <div class="remark-row">

        <div>
          1.
        </div>

        <div>
          Ultraschall Prüfen
        </div>

        <div class="remark-colon">
          :
        </div>

        <div>

          ${normalizeTestResult(
            mtc.ultrasonicTest,
            "Ok"
          )}

        </div>

      </div>


      <div class="remark-row">

        <div>
          2.
        </div>

        <div>
          Cleanliness Kating
        </div>

        <div class="remark-colon">
          :
        </div>

        <div>

          ${normalizeTestResult(
            mtc.cleanlinessRating,
            "Ok"
          )}

        </div>

      </div>


      <div class="remark-row">

        <div>
          3.
        </div>

        <div>
          Schmelzen Verfahren
        </div>

        <div class="remark-colon">
          :
        </div>

        <div>

          ${display(
            mtc.meltingProcess,
            "EAF+LHF+VD"
          )}

        </div>

      </div>


      <div class="remark-row">

        <div>
          4.
        </div>

        <div>
          Makro/Mikro Struktur
        </div>

        <div class="remark-colon">
          :
        </div>

        <div>

          ${normalizeTestResult(
            mtc.macroMicroStructure,
            "Ok"
          )}

        </div>

      </div>


    </section>


  </main>


  <!-- =====================================================
       SIGNATURE / STAMP
  ====================================================== -->

  ${
    signatureStamp
      ? `
        <img
          src="${signatureStamp}"
          class="signature-image"
          alt="Servicebetrieb für Edelstahl GmbH"
        />
      `
      : ""
  }


</div>

</body>

</html>
`;
};


/* =========================================================
   EXPORT
========================================================= */

module.exports =
  mtcGermanTemplate;