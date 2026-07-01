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
    const imagePath = path.join(__dirname, "..", "asset", fileName);
    const buffer = fs.readFileSync(imagePath);
    const ext = path.extname(fileName).replace(".", "").toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : "png";
    return `data:image/${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.log("MTC IMAGE LOAD ERROR =>", fileName, error.message);
    return "";
  }
};

const getChem = (mtc, element) =>
  mtc.chemicalComposition?.find((item) => item.element === element) || {
    element,
    min: "",
    max: "",
    result: "",
  };

const displaySpecValue = (value, item) => {
  if (item.min === null && item.max === null) return "X";
  if (value === null || value === undefined) return "";
  return value;
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
        ${rows.map((item) => `<td>${displaySpecValue(item.min, item)}</td>`).join("")}
      </tr>
      <tr>
        <td class="label-cell">Max.</td>
        ${rows.map((item) => `<td>${displaySpecValue(item.max, item)}</td>`).join("")}
      </tr>
      <tr>
        <td class="label-cell">Result</td>
        ${rows.map((item) => `<td>${safe(item.result)}</td>`).join("")}
      </tr>
    </table>
  `;
};

const renderHeaderInfo = (mtc) => `
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

const renderTop = ({ mtc, gloriaLogo, gmtcLogo }) => `
  <div class="header">
    <div class="logo-left">
      ${gloriaLogo ? `<img src="${gloriaLogo}" />` : "GLORIA<br/>GROUP"}
    </div>

    <div class="title">
      <div>GLORIA MATERIAL TECHNOLOGY CORP.</div>
      <div>INSPECTION CERTIFICATE</div>
    </div>

    <div class="logo-right">
      ${gmtcLogo ? `<img src="${gmtcLogo}" />` : "GMTC"}
    </div>
  </div>

  ${renderHeaderInfo(mtc)}
`;

const renderFooter = ({ certLogo, signature, qrCode }) => `
  <div class="footer-cert-row">
    <div class="cert-logos">
      ${certLogo ? `<img src="${certLogo}" />` : ""}
    </div>

    <div class="signature">
      ${signature ? `<img src="${signature}" />` : "Kevin Wen<br/>Quality Manager"}
    </div>
  </div>

  <div class="footer-text">
    Our quality and environment management systems have been certified by AS9100, ISO9001 QMS, ISO14001 EMS, OHSAS18001 OH&S, and NADCAP.<br/>
    We hereby certify that the material described herein has been manufactured and tested with satisfactory results in accordance with the requirement<br/>
    of the above material specification. Inspection Certificate comply with EN 10204 3.1.
  </div>

  <div class="footer-bottom">
    <div class="qr-box">
      ${qrCode ? `<img src="${qrCode}" />` : ""}
    </div>

    <div class="address-box">
      <div class="address">台灣台南市新營區新中路35號 / NO.35, HSIN CHUNG RD., HSIN YING, TAINAN, TAIWAN</div>
      <div class="website">http://www.gmtc.com.tw</div>
    </div>
  </div>
`;

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
  page-break-after: always;
}

.certificate {
  position: relative;
  width: 140mm;
  height: 297mm;
  margin: 0 auto;
  padding-top: 28mm;
}

.header {
  display: grid;
  grid-template-columns: 31mm 75mm 31mm;
  align-items: center;
  margin-bottom: 7mm;
}

.logo-left img {
  width: 29mm;
  height: auto;
  display: block;
}

.logo-right {
  text-align: right;
}

.logo-right img {
  width: 24mm;
  height: auto;
  display: inline-block;
  transform: translateX(4mm);
}

.title {
  text-align: center;
  font-weight: 700;
  font-size: 13.7px;
  line-height: 1.45;
  white-space: nowrap;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 26mm;
  font-size: 10.5px;
  line-height: 1.28;
}

.info-row {
  display: grid;
  grid-template-columns: 22mm 4mm 1fr;
  margin-bottom: 2.15mm;
}

.section-line {
  border-top: 1.8px solid #000;
  margin: 3mm 0 0;
}

.chem-title {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  margin: 0.6mm 0 1.4mm;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.chem-table th,
.chem-table td {
  text-align: center;
  padding: 1.05mm 0.8mm;
  font-size: 10.5px;
  line-height: 1.1;
  height: 4.8mm;
}

.label-cell {
  text-align: left !important;
  font-weight: 700;
  width: 17mm;
}

.chem-small {
  width: 43mm;
  margin-top: 4.2mm;
}

.two-table {
  display: grid;
  grid-template-columns: 42mm 42mm;
  column-gap: 22mm;
  margin-left: 17mm;
  margin-top: 3mm;
}

.table-heading {
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  margin-bottom: 1mm;
}

.small-table th,
.small-table td {
  text-align: center;
  font-size: 10.5px;
  padding: 0.9mm;
  height: 4.9mm;
}

.non-metallic {
  margin-top: 2.2mm;
  font-size: 10.5px;
}

.seat-table {
  margin-top: 4mm;
}

.seat-table th,
.seat-table td {
  text-align: center;
  font-size: 10.5px;
  padding: 0.9mm;
  height: 4.8mm;
}

.specification {
  margin-top: 1.3mm;
  font-size: 10.5px;
  line-height: 1.45;
}

.page2-standard {
  font-size: 10.8px;
  line-height: 1.45;
  margin-top: 3mm;
}

.remarks-title {
  margin-top: 8mm;
  margin-bottom: 2mm;
  font-size: 10.8px;
  font-weight: 700;
}

.remarks {
  font-size: 10.8px;
  line-height: 1.55;
}

.footer-cert-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 48mm;
  display: grid;
  grid-template-columns: 1fr 26mm;
  align-items: end;
}

.cert-logos img {
  width: 41mm;
  height: auto;
  display: block;
}

.signature {
  text-align: right;
}

.signature img {
  width: 22mm;
  height: auto;
  display: inline-block;
}

.footer-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 37mm;
  font-size: 6.7px;
  line-height: 1.35;
}

.footer-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24mm;
  display: grid;
  grid-template-columns: 12mm 1fr;
  column-gap: 3mm;
  align-items: start;
}

.qr-box img {
  width: 11mm;
  height: auto;
  display: block;
}

.address-box {
  font-size: 9.3px;
  line-height: 1.25;
  font-weight: 700;
}

.website {
  font-size: 9.6px;
  text-decoration: underline;
  margin-top: 1mm;
}
</style>
</head>

<body>

<div class="page">
  <div class="certificate">
    ${renderTop({ mtc, gloriaLogo, gmtcLogo })}

    <div class="section-line"></div>
    <div class="chem-title">Chemical Composition(wt%)</div>

    ${renderChemTable(mtc, ["C", "Si", "Mn", "P", "S", "Cr", "Mo"])}

    <div class="chem-small">
      ${renderChemTable(mtc, ["V", "Ni+Cu"])}
    </div>

    <div class="non-metallic">Mechanical Properties Spec.</div>

    <div class="two-table">
      <div>
        <div class="table-heading">Hardness&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hardness</div>
        <table class="small-table">
          <tr><th></th><th>1/2R(1)</th><th>1/2R(2)</th></tr>
          <tr><td class="label-cell">Spec. Min.</td><td>${safe(mtc.hardness?.halfR1?.specMin)}</td><td>${safe(mtc.hardness?.halfR2?.specMin)}</td></tr>
          <tr><td class="label-cell">Spec. Max.</td><td>${safe(mtc.hardness?.halfR1?.specMax)}</td><td>${safe(mtc.hardness?.halfR2?.specMax)}</td></tr>
          <tr><td class="label-cell">Result</td><td>${safe(mtc.hardness?.halfR1?.result)}</td><td>${safe(mtc.hardness?.halfR2?.result)}</td></tr>
        </table>
      </div>

      <div>
        <div class="table-heading">Hardenability&nbsp;&nbsp;&nbsp;&nbsp;Hardenability</div>
        <table class="small-table">
          <tr><th></th><th>1/2R</th><th>1/2R</th></tr>
          <tr><td class="label-cell">Spec. Min.</td><td>${safe(mtc.hardenability?.halfR1?.specMin)}</td><td>${safe(mtc.hardenability?.halfR2?.specMin)}</td></tr>
          <tr><td class="label-cell">Spec. Max.</td><td>${safe(mtc.hardenability?.halfR1?.specMax)}</td><td>${safe(mtc.hardenability?.halfR2?.specMax)}</td></tr>
          <tr><td class="label-cell">Result</td><td>${safe(mtc.hardenability?.halfR1?.result)}</td><td>${safe(mtc.hardenability?.halfR2?.result)}</td></tr>
        </table>
      </div>
    </div>

    <div class="non-metallic">Non-Metallic Inclusions : ASTM E45-A</div>

    <table class="seat-table">
      <tr>
        <th></th><th>AT</th><th>AH</th><th>BT</th><th>BH</th><th>CT</th><th>CH</th><th>DT</th><th>DH</th>
      </tr>
      <tr>
        <td class="label-cell">Seat<br/>Max.</td>
        <td>1</td><td>1</td><td>2</td><td>2</td><td>1</td><td>1</td><td>2</td><td>1.5</td>
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

    <div class="specification"><strong>Specification:</strong></div>

    ${renderFooter({ certLogo, signature, qrCode })}
  </div>
</div>

<div class="page">
  <div class="certificate">
    ${renderTop({ mtc, gloriaLogo, gmtcLogo })}

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

    ${renderFooter({ certLogo, signature, qrCode })}
  </div>
</div>

</body>
</html>
`;
};

module.exports = gloriaTemplate;