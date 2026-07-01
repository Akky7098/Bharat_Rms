const fs = require("fs");
const path = require("path");

const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const safe = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const getImageBase64 = (fileName) => {
  try {
    const imagePath = path.join(__dirname, "assets", fileName);
    const buffer = fs.readFileSync(imagePath);

    const ext = path.extname(fileName).replace(".", "").toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : "png";

    return `data:image/${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.log("MTC IMAGE LOAD ERROR =>", fileName, error.message);
    return "";
  }
};

const getChem = (mtc, element) => {
  return (
    mtc.chemicalComposition?.find((item) => item.element === element) || {
      element,
      min: "",
      max: "",
      result: "",
    }
  );
};

const renderChemTable = (mtc, elements) => {
  const rows = elements.map((element) => getChem(mtc, element));

  return `
    <table class="chem-table">
      <tr>
        <th></th>
        ${rows.map((item) => `<th>${safe(item.element)}</th>`).join("")}
      </tr>

      <tr>
        <td class="label-cell">Min.</td>
        ${rows.map((item) => `<td>${safe(item.min)}</td>`).join("")}
      </tr>

      <tr>
        <td class="label-cell">Max.</td>
        ${rows.map((item) => `<td>${safe(item.max)}</td>`).join("")}
      </tr>

      <tr>
        <td class="label-cell">Result</td>
        ${rows.map((item) => `<td>${safe(item.result)}</td>`).join("")}
      </tr>
    </table>
  `;
};

const renderHeaderInfo = (mtc) => {
  return `
    <div class="info-grid">
      <div>
        <div class="info-row"><span>Messers</span><span>:</span><span>${safe(mtc.messers)}</span></div>
        <div class="info-row"><span>Order No.</span><span>:</span><span>${safe(mtc.orderNo)}</span></div>
        <div class="info-row"><span>File No.</span><span>:</span><span>${safe(mtc.fileNo)}</span></div>
        <div class="info-row"><span>Grade</span><span>:</span><span>${safe(mtc.grade)}</span></div>
        <div class="info-row"><span>Size</span><span>:</span><span>${safe(mtc.size)}</span></div>
        <div class="info-row"><span>Heat-Lot No.</span><span>:</span><span>${safe(mtc.heatLotNo)}</span></div>
        <div class="info-row"><span>Condition</span><span>:</span><span>${safe(mtc.condition)}</span></div>
      </div>

      <div>
        <div class="info-row"><span>P.O.No.</span><span>:</span><span>${safe(mtc.poNo)}</span></div>
        <div class="info-row"><span>Date</span><span>:</span><span>${formatDate(mtc.mtcDate)}</span></div>
        <div class="info-row"><span>Weight</span><span>:</span><span>${safe(mtc.weight)}</span></div>
        <div class="info-row"><span>Pcs</span><span>:</span><span>${safe(mtc.pcs)}</span></div>
      </div>
    </div>
  `;
};

const gloriaTemplate = (mtc) => {
  const gloriaLogo = getImageBase64("gloria-logo.png");
  const gmtcLogo = getImageBase64("gmtc-logo.png");
  const certLogo = getImageBase64("cert-logos.png");
  const qrCode = getImageBase64("qr-code.png");
  const signature = getImageBase64("signature.png");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>
@page {
  size: A4 portrait;
  margin: 0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  color: #000;
  background: #fff;
  font-family: "Times New Roman", serif;
}

.page {
  width: 210mm;
  height: 297mm;
  position: relative;
  padding: 27mm 10mm 8mm;
  page-break-after: always;
}

.header {
  display: grid;
  grid-template-columns: 35mm 1fr 35mm;
  align-items: center;
  margin-bottom: 12px;
}

.logo-left img {
  width: 31mm;
  height: auto;
}

.logo-right img {
  width: 27mm;
  height: auto;
}

.fallback-logo-left {
  font-size: 22px;
  font-weight: 700;
  color: #e48321;
  line-height: 18px;
}

.fallback-logo-left span {
  display: block;
  color: #2a9d63;
  font-size: 15px;
  letter-spacing: 4px;
}

.fallback-logo-right {
  color: #e48321;
  font-size: 25px;
  font-weight: 700;
}

.title {
  text-align: center;
  font-weight: 700;
  font-size: 20px;
  line-height: 29px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 45mm;
  font-size: 13px;
  line-height: 1.25;
}

.info-row {
  display: grid;
  grid-template-columns: 24mm 4mm 1fr;
  margin-bottom: 4px;
}

.section-line {
  border-top: 2px solid #000;
  margin: 13px 0 10px;
}

.chem-title {
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 7px;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.chem-table th,
.chem-table td {
  text-align: center;
  padding: 3px 5px;
  font-size: 13px;
  height: 20px;
}

.label-cell {
  text-align: left !important;
  font-weight: 700;
  width: 22mm;
}

.chem-small {
  width: 48mm;
  margin-top: 5px;
}

.two-table {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 32mm;
  margin-top: 9px;
}

.table-heading {
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}

.small-table th,
.small-table td {
  text-align: center;
  font-size: 13px;
  padding: 3px 5px;
  height: 20px;
}

.seat-table {
  margin-top: 10px;
}

.seat-table th,
.seat-table td {
  text-align: center;
  font-size: 13px;
  padding: 3px 5px;
  height: 20px;
}

.specification {
  margin-top: 12px;
  font-size: 13px;
  line-height: 21px;
}

.certification {
  position: absolute;
  left: 10mm;
  right: 10mm;
  bottom: 20mm;
  font-size: 9.2px;
  line-height: 13px;
}

.bottom-footer {
  position: absolute;
  left: 10mm;
  right: 10mm;
  bottom: 5mm;
  display: grid;
  grid-template-columns: 18mm 1fr;
  column-gap: 5mm;
  align-items: end;
  font-size: 10px;
}

.bottom-footer img {
  width: 16mm;
  height: auto;
}

.address {
  font-size: 11px;
  font-weight: 700;
}

.page2-standard {
  font-size: 13px;
  line-height: 21px;
}

.remarks-title {
  margin-top: 22px;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 700;
}

.remarks {
  font-size: 13px;
  line-height: 22px;
}

.cert-logos {
  position: absolute;
  left: 10mm;
  bottom: 30mm;
}

.cert-logos img {
  width: 38mm;
  height: auto;
}

.cert-logos-fallback {
  font-size: 10px;
  font-weight: 700;
}

.signature {
  position: absolute;
  right: 11mm;
  bottom: 28mm;
  width: 28mm;
  min-height: 15mm;
  text-align: center;
  font-size: 9px;
  border: 1px solid #000;
  padding: 3px;
}

.signature img {
  width: 22mm;
  height: auto;
}
</style>
</head>

<body>

<!-- PAGE 1 -->
<div class="page">
  <div class="header">
    <div class="logo-left">
      ${
        gloriaLogo
          ? `<img src="${gloriaLogo}" />`
          : `<div class="fallback-logo-left">GLORIA<span>GROUP</span></div>`
      }
    </div>

    <div class="title">
      GLORIA MATERIAL TECHNOLOGY CORP.<br/>
      INSPECTION CERTIFICATE
    </div>

    <div class="logo-right">
      ${
        gmtcLogo
          ? `<img src="${gmtcLogo}" />`
          : `<div class="fallback-logo-right">GMTC</div>`
      }
    </div>
  </div>

  ${renderHeaderInfo(mtc)}

  <div class="section-line"></div>

  <div class="chem-title">Chemical Composition(wt%)</div>

  ${renderChemTable(mtc, ["C", "Si", "Mn", "P", "S", "Cr", "Mo"])}

  <div class="chem-small">
    ${renderChemTable(mtc, ["V", "Ni+Cu"])}
  </div>

  <div class="two-table">
    <div>
      <div class="table-heading">Hardness</div>
      <table class="small-table">
        <tr>
          <th></th>
          <th>1/2R(1)</th>
          <th>1/2R(2)</th>
        </tr>
        <tr>
          <td class="label-cell">Spec. Min.</td>
          <td>${safe(mtc.hardness?.halfR1?.specMin)}</td>
          <td>${safe(mtc.hardness?.halfR2?.specMin)}</td>
        </tr>
        <tr>
          <td class="label-cell">Spec. Max.</td>
          <td>${safe(mtc.hardness?.halfR1?.specMax)}</td>
          <td>${safe(mtc.hardness?.halfR2?.specMax)}</td>
        </tr>
        <tr>
          <td class="label-cell">Result</td>
          <td>${safe(mtc.hardness?.halfR1?.result)}</td>
          <td>${safe(mtc.hardness?.halfR2?.result)}</td>
        </tr>
      </table>
    </div>

    <div>
      <div class="table-heading">Hardenability</div>
      <table class="small-table">
        <tr>
          <th></th>
          <th>1/2R</th>
          <th>1/2R</th>
        </tr>
        <tr>
          <td class="label-cell">Spec. Min.</td>
          <td>${safe(mtc.hardenability?.halfR1?.specMin)}</td>
          <td>${safe(mtc.hardenability?.halfR2?.specMin)}</td>
        </tr>
        <tr>
          <td class="label-cell">Spec. Max.</td>
          <td>${safe(mtc.hardenability?.halfR1?.specMax)}</td>
          <td>${safe(mtc.hardenability?.halfR2?.specMax)}</td>
        </tr>
        <tr>
          <td class="label-cell">Result</td>
          <td>${safe(mtc.hardenability?.halfR1?.result)}</td>
          <td>${safe(mtc.hardenability?.halfR2?.result)}</td>
        </tr>
      </table>
    </div>
  </div>

  <table class="seat-table">
    <tr>
      <th></th>
      <th>AT</th>
      <th>AH</th>
      <th>BT</th>
      <th>BH</th>
      <th>CT</th>
      <th>CH</th>
      <th>DT</th>
      <th>DH</th>
    </tr>

    <tr>
      <td class="label-cell">Seat<br/>Max.</td>
      <td>1</td>
      <td>1</td>
      <td>2</td>
      <td>2</td>
      <td>1</td>
      <td>1</td>
      <td>2</td>
      <td>1.5</td>
    </tr>

    <tr>
      <td class="label-cell">Result</td>
      <td>${safe(mtc.seat?.at)}</td>
      <td>${safe(mtc.seat?.ah)}</td>
      <td>${safe(mtc.seat?.bt)}</td>
      <td>${safe(mtc.seat?.bh)}</td>
      <td>${safe(mtc.seat?.ct)}</td>
      <td>${safe(mtc.seat?.ch)}</td>
      <td>${safe(mtc.seat?.dt)}</td>
      <td>${safe(mtc.seat?.dh)}</td>
    </tr>
  </table>

  <div class="specification">
    <strong>Specification:</strong><br/>
    Mechanical Properties Spec.<br/>
    Non-Metallic Inclusions : ASTM E45-A
  </div>

  <div class="certification">
    Our quality and environment management systems have been certified by AS9100, ISO9001 QMS, ISO14001 EMS, OHSAS18001 OH&S, and NADCAP.<br/>
    We hereby certify that the material described herein has been manufactured and tested with satisfactory results in accordance with the requirement of the above material specification. Inspection Certificate comply with EN 10204 3.1.
  </div>
</div>

<!-- PAGE 2 -->
<div class="page">
  <div class="header">
    <div class="logo-left">
      ${
        gloriaLogo
          ? `<img src="${gloriaLogo}" />`
          : `<div class="fallback-logo-left">GLORIA<span>GROUP</span></div>`
      }
    </div>

    <div class="title">
      GLORIA MATERIAL TECHNOLOGY CORP.<br/>
      INSPECTION CERTIFICATE
    </div>

    <div class="logo-right">
      ${
        gmtcLogo
          ? `<img src="${gmtcLogo}" />`
          : `<div class="fallback-logo-right">GMTC</div>`
      }
    </div>
  </div>

  ${renderHeaderInfo(mtc)}

  <div class="section-line"></div>

  <div class="page2-standard">
    1. ASTM A681-08 (2015)<br/>
    2. IS 3748:2022
  </div>

  <div class="remarks-title">REMARKS:</div>

  <div class="remarks">
    1. MELTING PROCESS:EAF+LHF+VD.<br/>
    2. ULTRASONIC TEST IS ACCEPTABLE BY SEP 1921 CLASS D/d.<br/>
    3. MICRO & MACRO STRUCTURE:OK.<br/>
    4. CLEANLINESS RATING:OK.<br/>
    5. ALL MATERIAL IS FREE FROM MERCURY CONTAMINATION.<br/>
    6. NO WELD REPAIR DONE.<br/>
    7. IS 3748:2022<br/>
    8. CM/L-4100163471<br/>
    9. AISI H13/X40CrMoV5-1
  </div>

  <div class="cert-logos">
    ${
      certLogo
        ? `<img src="${certLogo}" />`
        : `<div class="cert-logos-fallback">ISO 9001 &nbsp; ISO 14001 &nbsp; Nadcap<br/>ACCREDITED</div>`
    }
  </div>

  <div class="signature">
    ${
      signature
        ? `<img src="${signature}" />`
        : `Kevin Wen<br/>Quality Manager`
    }
  </div>

  <div class="certification">
    Our quality and environment management systems have been certified by AS9100, ISO9001 QMS, ISO14001 EMS, OHSAS18001 OH&S, and NADCAP.<br/>
    We hereby certify that the material described herein has been manufactured and tested with satisfactory results in accordance with the requirement of the above material specification. Inspection Certificate comply with EN 10204 3.1.
  </div>

  <div class="bottom-footer">
    <div>
      ${qrCode ? `<img src="${qrCode}" />` : ""}
    </div>

    <div>
      <div class="address">
        台灣台南市新營區新中路35號 / NO.35, HSIN CHUNG RD., HSIN YING, TAINAN, TAIWAN
      </div>
      <div>http://www.gmtc.com.tw</div>
    </div>
  </div>
</div>

</body>
</html>
`;
};

module.exports = gloriaTemplate;