const fs = require("fs");
const path = require("path");


/* =========================================================
   HTML HELPERS
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


const nl2br = (value) => {
  return escapeHtml(value)
    .replace(
      /\r?\n/g,
      "<br/>"
    );
};


/* =========================================================
   LOGO
========================================================= */

const getLogoBase64 = () => {
  try {
    const logoPath =
      path.join(
        __dirname,
        "..",
        "public",
        "logo.png"
      );

    const logoBuffer =
      fs.readFileSync(
        logoPath
      );

    return `data:image/png;base64,${logoBuffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.log(
      "PRICE CONTRACT LOGO LOAD ERROR =>",
      error.message
    );

    return "";
  }
};


/* =========================================================
   RENU SIGNATURE
========================================================= */

const getRenuSignatureBase64 = () => {
  try {
    const signaturePath =
      path.join(
        __dirname,
        "..",
        "public",
        "signatures",
        "renu-signature.png"
      );

    const signatureBuffer =
      fs.readFileSync(
        signaturePath
      );

    return `data:image/png;base64,${signatureBuffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.log(
      "PRICE CONTRACT RENU SIGNATURE LOAD ERROR =>",
      error.message
    );

    return "";
  }
};


/* =========================================================
   FONT
========================================================= */

const getFontBase64 = (
  fileName
) => {
  try {
    const fontPath =
      path.join(
        __dirname,
        "..",
        "node_modules",
        "@fontsource",
        "roboto",
        "files",
        fileName
      );

    const fontBuffer =
      fs.readFileSync(
        fontPath
      );

    return fontBuffer.toString(
      "base64"
    );
  } catch (error) {
    console.log(
      "PRICE CONTRACT FONT LOAD ERROR =>",
      error.message
    );

    return "";
  }
};


/* =========================================================
   VALUE HELPER
========================================================= */

const getValue = (
  obj,
  keys,
  fallback = ""
) => {
  for (
    const key of keys
  ) {
    const value =
      obj?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return fallback;
};


/* =========================================================
   SAFE INTRODUCTION BUILDER
========================================================= */

const buildIntroductionHtml = (
  introduction,
  supplierName
) => {
  const intro =
    String(
      introduction || ""
    ).trim();

  const supplier =
    String(
      supplierName || ""
    ).trim();


  if (!supplier) {
    return escapeHtml(
      intro
    );
  }


  const supplierIndex =
    intro.indexOf(
      supplier
    );


  if (
    supplierIndex !== -1
  ) {
    const before =
      intro.slice(
        0,
        supplierIndex
      );

    const after =
      intro.slice(
        supplierIndex +
          supplier.length
      );

    return `
      ${escapeHtml(before)}
      <span class="supplier">
        ${escapeHtml(supplier)}
      </span>
      ${escapeHtml(after)}
    `;
  }


  return `
    ${escapeHtml(intro)}
    <span class="supplier">
      ${escapeHtml(supplier)}
    </span>
  `;
};


/* =========================================================
   PRICE CONTRACT TEMPLATE
========================================================= */

const priceContractTemplate = (
  priceContract = {}
) => {

  const logoBase64 =
    getLogoBase64();


  const renuSignatureBase64 =
    getRenuSignatureBase64();


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


  /* =======================================================
     FIXED / OPTIONAL DATA
  ======================================================= */

  const supplierName =
    getValue(
      priceContract,
      [
        "supplierName",
        "supplier_name",
      ],
      "M/S BHARAT SPECIAL STEEL PRIVATE LIMITED."
    );


  /*
   * Steel type comes from frontend dropdown.
   *
   * Recommended frontend values:
   *
   * tool_die
   * alloy
   *
   * "both" is kept as a safe legacy/default option.
   */

  const steelType =
    getValue(
      priceContract,
      [
        "steelType",
        "steel_type",
        "materialType",
        "material_type",
        "productType",
        "product_type",
        "steelCategory",
        "steel_category",
      ],
      "both"
    );


  const normalizedSteelType =
    String(
      steelType || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[&/\\_-]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      );


  const hasToolOrDie =
    normalizedSteelType.includes(
      "tool"
    ) ||
    normalizedSteelType.includes(
      "die"
    );


  const hasAlloy =
    normalizedSteelType.includes(
      "alloy"
    );


  const steelDescription =
    hasToolOrDie && hasAlloy
      ? "Tool Die and Alloy Steel"
      : hasAlloy
      ? "Alloy Steel"
      : hasToolOrDie
      ? "Tool & Die Steel"
      : normalizedSteelType === "both"
      ? "Tool Die and Alloy Steel"
      : "Tool Die and Alloy Steel";


  /*
   * Keep introduction exactly in approved format.
   *
   * IMPORTANT:
   * Customer Name is NOT used here.
   */

  const introduction =
    `Attached is the Price contract for the ${steelDescription} supplied by ${supplierName}`;


  const annexureIntro =
    "Price details as Annexure";


  /*
   * Customer name remains dynamic.
   * It will show in the table above Price.
   */

  const customerName =
    getValue(
      priceContract,
      [
        "customerName",
        "customer_name",
      ]
    );


  /*
   * For now these are intentionally hardcoded.
   */

  const processedBy =
    "Renu";


  const approvedBy =
    "Kumar Nilesh";


  const approvedByDesignation =
    "DIRECTOR";


  /*
   * Validity can now come from frontend as:
   *
   * validityFrom + validityTo
   *
   * Backward compatibility is preserved for the old
   * single "validity" field.
   */

  const validityFrom =
    getValue(
      priceContract,
      [
        "validityFrom",
        "validity_from",
        "fromDate",
        "from_date",
      ]
    );


  const validityTo =
    getValue(
      priceContract,
      [
        "validityTo",
        "validity_to",
        "tillDate",
        "till_date",
        "toDate",
        "to_date",
      ]
    );


  const legacyValidity =
    getValue(
      priceContract,
      [
        "validity",
      ]
    );


  const validityDisplay =
    validityFrom && validityTo
      ? `${validityFrom} TO ${validityTo}`
      : validityFrom
      ? validityFrom
      : validityTo
      ? validityTo
      : legacyValidity;


  /* =======================================================
     TERMS & CONDITIONS
  ======================================================= */

  const rows = [

    /*
     * NEW:
     * Customer Name above Price.
     */

    {
      label:
        "Customer Name",

      value:
        customerName,

      className:
        "row-standard",

      valueClassName:
        "customer-name-value",
    },


    {
      label:
        "Price",

      value:
        getValue(
          priceContract,
          ["price"],
          "As shown in Annexure"
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Price Basis",

      value:
        getValue(
          priceContract,
          [
            "priceBasis",
            "price_basis",
          ]
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Validity",

      value:
        validityDisplay,

      className:
        "row-standard",

      valueClassName:
        "validity-value",
    },


    {
      label:
        "Specification",

      value:
        getValue(
          priceContract,
          ["specification"],
          "As per Standard"
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Taxes and duties",

      value:
        getValue(
          priceContract,
          [
            "taxesAndDuties",
            "taxes",
            "taxesDuties",
          ],
          "Extra as applicable"
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Payment terms",

      value:
        getValue(
          priceContract,
          [
            "paymentTerms",
            "payment_terms",
          ]
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Documents",

      value:
        getValue(
          priceContract,
          ["documents"],
          "Scan copy of documents to be provided thro mail and Hard copies to be provided immediately after despatch separately"
        ),

      className:
        "row-documents",
    },


    {
      label:
        "Penalty",

      value:
        getValue(
          priceContract,
          ["penalty"],
          "Interest cost will be bond by ----, if delay in making payment"
        ),

      className:
        "row-penalty",
    },


    {
      label:
        "Warranty",

      value:
        getValue(
          priceContract,
          ["warranty"],
          "Not Applicable"
        ),

      className:
        "row-standard",
    },


    {
      label:
        "Quality Rejection",

      value:
        getValue(
          priceContract,
          [
            "qualityRejection",
            "quality_rejection",
          ],
          "If there is any rejection in the raw material supplied, free replacement will be made by Bharat Special Steels Pvt.Ltd or debited from payable (BHARAT will only be responsible for the supplied raw material cost. No processing charges or on production loss cost will be applicable in cash of debit is done.)"
        ),

      className:
        "row-quality",
    },


    {
      label:
        "Remarks",

      value:
        getValue(
          priceContract,
          ["remarks"]
        ),

      className:
        "row-remarks",
    },

  ];


  /* =======================================================
     OTHER VALUES
  ======================================================= */

  const specialNote =
    getValue(
      priceContract,
      [
        "specialNote",
        "special_note",
      ],
      "Price can be revised if there is a fluctuation of +/-5% in the steel market price.(Same is applicable within a quarter period)"
    );


  const annexures =
    getValue(
      priceContract,
      [
        "annexures",
        "annexure",
      ],
      "Annexure"
    );


  const address =
    getValue(
      priceContract,
      [
        "companyAddress",
        "address",
      ],
      "107, First Floor SSR Corporate Tower,<br/>near NHPC Metro, Faridabad,<br/>Haryana 121003."
    );


  const phone =
    getValue(
      priceContract,
      [
        "phone",
        "mobile",
        "contactNumber",
      ],
      "084481 19291"
    );


  const email =
    getValue(
      priceContract,
      ["email"],
      "info@bharatspecialsteels.com"
    );


  /* =======================================================
     HTML
  ======================================================= */

  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<style>


/* =========================================================
   FONT
========================================================= */

@font-face {

  font-family:
    "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoRegular}"
    )
    format(
      "woff2"
    );

  font-weight:
    400;
}


@font-face {

  font-family:
    "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoMedium}"
    )
    format(
      "woff2"
    );

  font-weight:
    500;
}


@font-face {

  font-family:
    "RobotoEmbedded";

  src:
    url(
      "data:font/woff2;base64,${robotoBold}"
    )
    format(
      "woff2"
    );

  font-weight:
    700;
}


/* =========================================================
   PAGE
========================================================= */

@page {

  size:
    A4 portrait;

  margin:
    0;
}


* {

  box-sizing:
    border-box;
}


html,
body {

  width:
    210mm;

  min-height:
    297mm;

  margin:
    0;

  padding:
    0;
}


body {

  font-family:
    "RobotoEmbedded",
    Arial,
    sans-serif;

  color:
    #071f3b;

  background:
    #ffffff;

  -webkit-print-color-adjust:
    exact !important;

  print-color-adjust:
    exact !important;
}


.page {

  position:
    relative;

  width:
    210mm;

  height:
    297mm;

  overflow:
    hidden;

  background:
    #ffffff;
}


/* =========================================================
   TOP BAR
========================================================= */

.top-ribbon {

  position:
    absolute;

  top:
    0;

  left:
    0;

  width:
    100%;

  height:
    6.7mm;

  overflow:
    hidden;
}


.top-ribbon .teal {

  position:
    absolute;

  left:
    0;

  top:
    0;

  width:
    57.2%;

  height:
    100%;

  background:
    linear-gradient(
      90deg,
      #0497a7 0%,
      #058a9f 100%
    );
}


.top-ribbon .navy {

  position:
    absolute;

  right:
    0;

  top:
    0;

  width:
    42.2%;

  height:
    100%;

  background:
    #052a4f;
}


.top-ribbon .white-cut {

  position:
    absolute;

  left:
    56%;

  top:
    -2mm;

  width:
    1.4mm;

  height:
    11mm;

  background:
    #ffffff;

  transform:
    rotate(
      44deg
    );

  transform-origin:
    center;
}


/* =========================================================
   HEADER
========================================================= */

.header {

  position:
    absolute;

  left:
    6.1mm;

  right:
    6.2mm;

  top:
    13.7mm;

  height:
    30.8mm;

  display:
    flex;

  align-items:
    flex-start;
}


.brand-area {

  width:
    46.2%;

  height:
    100%;

  display:
    flex;

  align-items:
    center;

  padding-left:
    4.6mm;
}


.brand-area img {

  width:
    77mm;

  max-height:
    28mm;

  object-fit:
    contain;

  object-position:
    left center;
}


.header-divider {

  width:
    0.45mm;

  height:
    27mm;

  margin-top:
    0.1mm;

  background:
    #092d53;
}


.title-area {

  flex:
    1;

  padding-left:
    12.2mm;

  padding-top:
    4.5mm;
}


.document-title {

  display:
    block;

  margin:
    0;

  padding:
    0;

  color:
    #06294e;

  font-size:
    9.4mm;

  line-height:
    1;

  font-weight:
    700;

  letter-spacing:
    0.35mm;

  white-space:
    nowrap;

  transform:
    scaleX(
      0.88
    );

  transform-origin:
    left center;
}


.title-rule-wrap {

  position:
    relative;

  display:
    block;

  width:
    100%;

  height:
    5.1mm;

  margin-top:
    3.25mm;
}


.title-rule-teal {

  position:
    absolute;

  left:
    0;

  top:
    1.3mm;

  width:
    67.5%;

  height:
    0.72mm;

  background:
    #0798a8;
}


.title-rule-navy {

  position:
    absolute;

  left:
    51.5%;

  top:
    1.3mm;

  width:
    31.5%;

  height:
    1.15mm;

  background:
    #06294e;

  clip-path:
    polygon(
      4% 0,
      100% 0,
      95% 100%,
      0 100%
    );
}


.title-rule-blocks {

  position:
    absolute;

  right:
    0;

  top:
    1.3mm;

  width:
    13.6mm;

  height:
    2.8mm;
}


.title-rule-blocks:before,
.title-rule-blocks:after {

  content:
    "";

  position:
    absolute;

  top:
    0;

  width:
    6.8mm;

  height:
    2.8mm;

  background:
    #0798a8;

  transform:
    skewX(
      -38deg
    );
}


.title-rule-blocks:before {
  left:
    0;
}


.title-rule-blocks:after {
  right:
    0;
}


.commercial-document {

  margin-top:
    0.55mm;

  text-align:
    right;

  padding-right:
    1.2mm;

  color:
    #0798a8;

  font-size:
    2.7mm;

  line-height:
    1;

  font-weight:
    500;

  text-transform:
    uppercase;
}


/* =========================================================
   INTRODUCTION
========================================================= */

.intro {

  position:
    absolute;

  left:
    6.15mm;

  right:
    6.15mm;

  top:
    48.5mm;

  font-size:
    3.45mm;

  line-height:
    1.46;

  color:
    #111111;

  font-weight:
    400;
}


.intro .supplier {

  font-weight:
    700;
}


.intro-bottom-rule {

  position:
    absolute;

  left:
    6.15mm;

  right:
    6.15mm;

  top:
    62mm;

  height:
    1.7mm;

  border-top:
    0.65mm solid
    #0798a8;

  border-bottom:
    0.25mm solid
    #0798a8;
}


/* =========================================================
   TERMS TABLE
========================================================= */

.contract-table-wrap {

  position:
    absolute;

  left:
    5.55mm;

  right:
    5.55mm;

  top:
    67mm;
}


.contract-table {

  width:
    100%;

  border-collapse:
    collapse;

  table-layout:
    fixed;

  border:
    0.22mm solid
    #7892a9;
}


.contract-table col.label-col {

  width:
    20.5%;
}


.contract-table col.value-col {

  width:
    79.5%;
}


.contract-table th,
.contract-table td {

  border:
    0.22mm solid
    #93a8bb;

  vertical-align:
    middle;
}


.contract-table .section-title {

  height:
    10.7mm;

  padding:
    0 3.1mm;

  text-align:
    left;

  font-size:
    4.55mm;

  line-height:
    1;

  color:
    #077d90;

  font-weight:
    700;

  letter-spacing:
    -0.05mm;
}


.contract-table td.label {

  padding:
    1.4mm 3.2mm;

  font-size:
    3.45mm;

  line-height:
    1.16;

  color:
    #077d90;

  font-weight:
    700;
}


.contract-table td.value {

  padding:
    1.4mm 3.2mm;

  font-size:
    3.2mm;

  line-height:
    1.45;

  color:
    #111111;

  font-weight:
    400;
}


/* =========================================================
   EMPHASIZED TABLE VALUES
========================================================= */

.contract-table td.value.customer-name-value,
.contract-table td.value.validity-value {

  font-weight:
    700 !important;

  color:
    #111111 !important;
}


/* =========================================================
   ROW HEIGHTS
========================================================= */

.row-standard {

  height:
    10.3mm;
}


.row-documents {

  height:
    15.2mm;
}


.row-penalty {

  height:
    11.4mm;
}


.row-quality {

  height:
    20.5mm;
}


.row-remarks {

  height:
    10.7mm;
}


.special-note-row {

  height:
    9mm;
}


.special-note-cell {

  padding:
    1.25mm 3.1mm
    !important;

  font-size:
    3mm
    !important;

  line-height:
    1.24
    !important;

  font-weight:
    700
    !important;

  color:
    #0a2646
    !important;
}


.annexure-row {

  height:
    6.3mm;
}


.annexure-cell {

  position:
    relative;

  z-index:
    1;

  padding:
    0.75mm 3.1mm
    !important;

  font-size:
    3mm
    !important;

  line-height:
    1.05
    !important;

  color:
    #0a2646
    !important;

  background:
    #ffffff !important;

  vertical-align:
    middle
    !important;
}


/* =========================================================
   SIGNATURE SECTION
========================================================= */

.signatures {

  position:
    absolute;

  left:
    5.55mm;

  right:
    5.55mm;

  bottom:
    31.2mm;

  height:
    31.5mm;

  display:
    grid;

  grid-template-columns:
    1fr 1fr 1fr;

  border:
    0.28mm solid
    #174b77;

  background:
    #ffffff;
}


.signature-box {

  position:
    relative;

  border-right:
    0.22mm solid
    #174b77;

  padding:
    0
    4.2mm
    3.3mm
    4.2mm;
}


.signature-box:last-child {

  border-right:
    0;
}


.signature-content {

  position:
    absolute;

  left:
    4.2mm;

  right:
    4.2mm;

  bottom:
    3.2mm;

  font-size:
    3.05mm;

  line-height:
    1.15;

  color:
    #07375f;

  font-weight:
    700;
}


.signature-line {

  width:
    36mm;

  max-width:
    100%;

  height:
    0.22mm;

  background:
    #174b77;

  margin-bottom:
    3.3mm;
}


.signature-value {

  min-height:
    3.6mm;

  color:
    #111111;

  font-weight:
    500;

  margin-bottom:
    1.2mm;

  overflow-wrap:
    anywhere;
}


/*
 * Only the processed-by box has
 * a signature image for now.
 */

.processed-signature-image {

  position:
    absolute;

  /*
   * Signature image is aligned to the exact
   * horizontal signature-line center.
   *
   * signature-line starts at 4.2mm and is 36mm wide.
   * 5.2mm + 34mm keeps the image centered on that line.
   */

  left:
    5.2mm;

  bottom:
    11.4mm;

  width:
    34mm;

  max-width:
    none;

  height:
    10.5mm;

  object-fit:
    contain;

  object-position:
    center bottom;

  transform:
    none;
}


/*
 * Director goes under
 * Kumar Nilesh.
 */

.approved-by-row {

  display:
    flex;

  align-items:
    flex-start;

  gap:
    1.2mm;
}


.approved-by-person {

  display:
    flex;

  flex-direction:
    column;

  align-items:
    flex-start;
}


.signature-role {

  margin-top:
    0.45mm;

  color:
    #07375f;

  font-size:
    2.75mm;

  line-height:
    1.05;

  font-weight:
    700;

  text-transform:
    uppercase;
}


/* =========================================================
   FOOTER
========================================================= */

.footer-top-line {

  position:
    absolute;

  left:
    5.75mm;

  right:
    5.75mm;

  bottom:
    27.1mm;

  height:
    0.42mm;

  background:
    #0594a7;
}


.footer-top-notch {

  position:
    absolute;

  left:
    49%;

  bottom:
    25.7mm;

  width:
    7mm;

  height:
    2mm;

  background:
    #072d52;

  clip-path:
    polygon(
      0 0,
      100% 0,
      50% 100%
    );
}


.contact-footer {

  position:
    absolute;

  left:
    6mm;

  right:
    5.8mm;

  bottom:
    9.7mm;

  height:
    15.1mm;

  display:
    grid;

  grid-template-columns:
    35%
    27%
    38%;

  align-items:
    center;

  color:
    #0b2e55;
}


.contact-item {

  min-width:
    0;

  height:
    11mm;

  display:
    flex;

  align-items:
    center;
}


.contact-item + .contact-item {

  border-left:
    0.22mm solid
    #7ba0b8;
}


.contact-icon-wrap {

  width:
    13mm;

  flex:
    0 0 13mm;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;
}


.contact-text {

  min-width:
    0;

  padding-left:
    0.7mm;

  font-size:
    2.7mm;

  line-height:
    1.42;

  color:
    #0b2e55;

  font-weight:
    400;
}


.phone-text {

  font-size:
    3mm;

  white-space:
    nowrap;
}


.email-text {

  font-size:
    2.85mm;

  white-space:
    nowrap;
}


.pin-icon {

  position:
    relative;

  width:
    6.2mm;

  height:
    6.2mm;

  border-radius:
    50%
    50%
    50%
    0;

  background:
    #ed111c;

  transform:
    rotate(
      -45deg
    );

  margin-top:
    -2mm;
}


.pin-icon:after {

  content:
    "";

  position:
    absolute;

  width:
    2.6mm;

  height:
    2.6mm;

  border-radius:
    50%;

  background:
    #ffffff;

  left:
    1.8mm;

  top:
    1.8mm;
}


.phone-icon {

  width:
    8.2mm;

  height:
    8.2mm;

  flex:
    0 0 8.2mm;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;
}


.phone-icon svg {

  display:
    block;

  width:
    8.2mm;

  height:
    8.2mm;
}


.mail-icon {

  width:
    8.7mm;

  height:
    6.2mm;

  flex:
    0 0 8.7mm;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;
}


.mail-icon svg {

  display:
    block;

  width:
    8.7mm;

  height:
    6.2mm;
}


.bottom-ribbon {

  position:
    absolute;

  bottom:
    0;

  left:
    0;

  width:
    100%;

  height:
    8.7mm;

  overflow:
    hidden;
}


.bottom-ribbon .teal {

  position:
    absolute;

  left:
    0;

  top:
    0;

  width:
    52.8%;

  height:
    100%;

  background:
    linear-gradient(
      90deg,
      #0497a7 0%,
      #058a9f 100%
    );
}


.bottom-ribbon .navy {

  position:
    absolute;

  right:
    0;

  top:
    0;

  width:
    47%;

  height:
    100%;

  background:
    #052a4f;
}


.bottom-ribbon .white-cut {

  position:
    absolute;

  left:
    51.5%;

  top:
    -2mm;

  width:
    1.2mm;

  height:
    14mm;

  background:
    #ffffff;

  transform:
    rotate(
      44deg
    );

  transform-origin:
    center;
}


@media print {

  html,
  body,
  .page {

    width:
      210mm;

    height:
      297mm;
  }

}

</style>

</head>


<body>


<div class="page">


  <!-- =====================================================
       TOP DESIGN
  ====================================================== -->

  <div class="top-ribbon">

    <div class="teal"></div>

    <div class="navy"></div>

    <div class="white-cut"></div>

  </div>


  <!-- =====================================================
       HEADER
  ====================================================== -->

  <header class="header">


    <div class="brand-area">

      ${
        logoBase64
          ? `
            <img
              src="${logoBase64}"
              alt="Bharat Special Steel"
            />
          `
          : ""
      }

    </div>


    <div class="header-divider"></div>


    <div class="title-area">

      <div class="document-title">
        PRICE CONTRACT
      </div>


      <div class="title-rule-wrap">

        <div class="title-rule-teal"></div>

        <div class="title-rule-navy"></div>

        <div class="title-rule-blocks"></div>

      </div>


      <div class="commercial-document">
        COMMERCIAL DOCUMENT
      </div>

    </div>


  </header>


  <!-- =====================================================
       INTRODUCTION
  ====================================================== -->

  <section class="intro">

    <div>

      ${buildIntroductionHtml(
        introduction,
        supplierName
      )}

    </div>


    <div>

      ${escapeHtml(
        annexureIntro
      )}

    </div>

  </section>


  <div class="intro-bottom-rule"></div>


  <!-- =====================================================
       TERMS AND CONDITIONS
  ====================================================== -->

  <section class="contract-table-wrap">


    <table class="contract-table">


      <colgroup>

        <col class="label-col"/>

        <col class="value-col"/>

      </colgroup>


      <tr>

        <th
          colspan="2"
          class="section-title"
        >
          TERMS &amp; CONDITIONS
        </th>

      </tr>


      ${rows
        .map(
          (
            row
          ) => `
            <tr
              class="${row.className}"
            >

              <td class="label">

                ${escapeHtml(
                  row.label
                )}

              </td>


              <td
                class="value ${row.valueClassName || ""}"
              >

                ${nl2br(
                  row.value
                )}

              </td>

            </tr>
          `
        )
        .join("")}


      <tr class="special-note-row">

        <td
          colspan="2"
          class="special-note-cell"
        >

          Special Note :

          ${nl2br(
            specialNote
          )}

        </td>

      </tr>


      <tr class="annexure-row">

        <td
          colspan="2"
          class="annexure-cell"
        >

          Annexure(s) :

          ${nl2br(
            annexures
          )}

        </td>

      </tr>


    </table>


  </section>


  <!-- =====================================================
       SIGNATURES
  ====================================================== -->

  <section class="signatures">


    <!-- =================================================
         CUSTOMER SIGNATURE
         Blank for now
    ================================================== -->

    <div class="signature-box">


      <div class="signature-content">


        <!--
          Blank intentionally.
          Customer will sign here.
        -->

        <div class="signature-value"></div>


        <div class="signature-line"></div>


        Customer Signature -


      </div>


    </div>


    <!-- =================================================
         PROCESSED BY
         Renu signature + Renu name
    ================================================== -->

    <div class="signature-box">


      ${
        renuSignatureBase64
          ? `
            <img
              class="processed-signature-image"
              src="${renuSignatureBase64}"
              alt="Renu Signature"
            />
          `
          : ""
      }


      <div class="signature-content">


        <!--
          No duplicate text above the line.
          Signature image occupies this space.
        -->

        <div class="signature-value"></div>


        <div class="signature-line"></div>


        Processed By - ${escapeHtml(
          processedBy
        )}


      </div>


    </div>


    <!-- =================================================
         APPROVED BY
         Signature blank for now
    ================================================== -->

    <div class="signature-box">


      <div class="signature-content">


        <!--
          Approved person's actual signature
          stays blank for now.
        -->

        <div class="signature-value"></div>


        <div class="signature-line"></div>


        <div class="approved-by-row">

          <span>
            Approved By -
          </span>

          <span class="approved-by-person">

            <span>
              ${escapeHtml(
                approvedBy
              )}
            </span>

            <span class="signature-role">
              ${escapeHtml(
                approvedByDesignation
              )}
            </span>

          </span>

        </div>


      </div>


    </div>


  </section>


  <!-- =====================================================
       FOOTER TOP LINE
  ====================================================== -->

  <div class="footer-top-line"></div>

  <div class="footer-top-notch"></div>


  <!-- =====================================================
       CONTACT FOOTER
  ====================================================== -->

  <footer class="contact-footer">


    <!-- ADDRESS -->

    <div class="contact-item">


      <div class="contact-icon-wrap">

        <div class="pin-icon"></div>

      </div>


      <div class="contact-text">

        ${
          String(
            address
          ).includes(
            "<br/>"
          )
            ? address
            : nl2br(
                address
              )
        }

      </div>


    </div>


    <!-- PHONE -->

    <div class="contact-item">


      <div class="contact-icon-wrap">


        <div class="phone-icon">


          <svg
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >

            <circle
              cx="16"
              cy="16"
              r="16"
              fill="#ed111c"
            />


            <path
              d="
                M10.15 7.75
                C9.45 7.9 8.93 8.46 8.82 9.17
                C8.08 13.93 9.64 18.74 13.05 22.15
                C16.46 25.56 21.27 27.12 26.03 26.38
                C26.74 26.27 27.3 25.75 27.45 25.05
                L28.08 22.12
                C28.24 21.38 27.86 20.63 27.17 20.33
                L22.76 18.42
                C22.14 18.15 21.42 18.31 20.97 18.81
                L19.22 20.76
                C16.77 19.6 14.8 17.63 13.64 15.18
                L15.59 13.43
                C16.09 12.98 16.25 12.26 15.98 11.64
                L14.07 7.23
                C13.77 6.54 13.02 6.16 12.28 6.32
                Z
              "
              fill="#ffffff"
              transform="translate(-2.45 -0.2) scale(0.98)"
            />

          </svg>


        </div>


      </div>


      <div class="contact-text phone-text">

        ${escapeHtml(
          phone
        )}

      </div>


    </div>


    <!-- EMAIL -->

    <div class="contact-item">


      <div class="contact-icon-wrap">


        <div class="mail-icon">


          <svg
            viewBox="0 0 38 28"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >

            <rect
              x="1.5"
              y="1.5"
              width="35"
              height="25"
              rx="1.8"
              fill="#ffffff"
              stroke="#ed111c"
              stroke-width="3"
            />


            <path
              d="
                M3.5 4
                L19 16
                L34.5 4
              "
              fill="none"
              stroke="#ed111c"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />


            <path
              d="
                M3.5 24
                L14.5 14.8
              "
              fill="none"
              stroke="#ed111c"
              stroke-width="2.2"
              stroke-linecap="round"
            />


            <path
              d="
                M34.5 24
                L23.5 14.8
              "
              fill="none"
              stroke="#ed111c"
              stroke-width="2.2"
              stroke-linecap="round"
            />

          </svg>


        </div>


      </div>


      <div class="contact-text email-text">

        ${escapeHtml(
          email
        )}

      </div>


    </div>


  </footer>


  <!-- =====================================================
       BOTTOM DESIGN
  ====================================================== -->

  <div class="bottom-ribbon">

    <div class="teal"></div>

    <div class="navy"></div>

    <div class="white-cut"></div>

  </div>


</div>


</body>

</html>
`;
};


module.exports =
  priceContractTemplate;