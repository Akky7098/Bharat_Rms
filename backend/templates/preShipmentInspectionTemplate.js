const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
};
const extractGradesFromSizeText = (value) => {
  if (!value) return "";

  const knownGrades = [
    "DIN 1.2714/DB6",
    "DIN 1.2344/H13",
    "DIN 1.2344 ESR",
    "DIN 1.2343/H11",
    "DIN 1.2379/D2",
    "DIN 1.2080/D3",
    "DIN 1.2436/X210CRW12",
    "DIN 1.2510/O1",
    "DIN 1.2311/P20",
    "DIN 1.2738/P20+NI",
    "EN31 BRIGHT BAR",
    "P20 PLASTIC MOULD STEEL",
    "H13 ESR",
    "DIN 1.2714",
    "DIN 1.2344",
    "DIN 1.2343",
    "DIN 1.2379",
    "DIN 1.2080",
    "DIN 1.2436",
    "DIN 1.2510",
    "DIN 1.2311",
    "DIN 1.2738",
    "X210CRW12",
    "P20+NI",
    "P20+HH",
    "EN8D",
    "EN31",
    "EN24",
    "EN19",
    "EN18",
    "EN9",
    "EN8",
    "EN36",
    "EN41B",
    "EN47",
    "EN353",
    "16MNCR5",
    "20MNCR5",
    "42CRMO4",
    "4140",
    "4340",
    "8620",
    "C45",
    "C40",
    "C20",
    "IS2062",
    "SAE1045",
    "SAE1018",
    "SS410",
    "SS420",
    "SS431",
    "SS304",
    "SS316",
    "M2",
    "M35",
    "M42",
    "DB6",
    "H13",
    "H11",
    "D2",
    "D3",
    "O1",
    "P20",
  ].sort((a, b) => b.length - a.length);

  const found = [];

  String(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const cleanLine = line
        .replace(/^\s*\d+\s*[\.\)]\s*/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const upperLine = cleanLine.toUpperCase();

      const matchedGrade = knownGrades.find((grade) =>
        upperLine.includes(grade.toUpperCase())
      );

      if (matchedGrade) {
        if (!found.includes(matchedGrade)) found.push(matchedGrade);
        return;
      }

      const fallback = cleanLine
        .split(/\s*(?:,|\s+-\s+|\bDIA\b|\bDIAMETER\b|\bQTY\b|\bSIZE\b|\bPCS\b|\bNOS\b|\bAT\b)\s*/i)[0]
        .trim();

      if (fallback && !found.includes(fallback)) {
        found.push(fallback);
      }
    });

  return found.join("<br/>");
};  
const preShipmentInspectionTemplate = (salesOrder) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>
@page {
  size: A4 portrait;
  margin: 12mm;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  padding: 0;
  color: #000;
}

.wrapper {
  width: 78%;
  margin: 0 auto;
  border: 1px solid #000;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

td {
  border: 1px solid #000;
  padding: 7px;
  font-size: 10px;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}

.header {
  background: #062765;
  color: white;
  font-size: 17px;
  padding: 14px;
}

.section {
  background: #062765;
  color: white;
  font-weight: bold;
  text-align: left;
}

.bold {
  font-weight: bold;
}

.red {
  color: red;
  font-weight: bold;
}

.blank-row {
  height: 35px;
}

.big-row {
  height: 70px;
}

.comment-row {
  height: 55px;
}

.sign-row {
  height: 65px;
}
</style>
</head>

<body>

<div class="wrapper">

<table>

<tr>
  <td colspan="3" class="header">
    Pre- Shipment Inspection Report
  </td>
</tr>

<tr>
  <td colspan="3" style="height:18px;"></td>
</tr>

<tr>
  <td colspan="2" class="section">Basic Information</td>
  <td class="section">Date - ${formatDate(new Date())}</td>
</tr>

<tr>
  <td class="bold">Report Number</td>
  <td>${salesOrder.salesOrderNo || salesOrder._id}</td>
  <td>-</td>
</tr>

<tr>
  <td class="bold">Sales Order Form Number</td>
  <td>${salesOrder.salesOrderNo || salesOrder._id}</td>
  <td>-</td>
</tr>

<tr class="big-row">
  <td class="bold">Customer Name</td>
  <td class="bold">${salesOrder.companyName || ""}</td>
  <td class="bold">${salesOrder.companyName || ""}</td>
</tr>

<tr class="big-row">
  <td class="bold">Address (Location)</td>
  <td>${salesOrder.companyAddress || ""}</td>
  <td>${
    salesOrder.shippingAddress?.sameAsCompanyAddress
      ? salesOrder.companyAddress || ""
      : salesOrder.shippingAddress?.address || salesOrder.companyAddress || ""
  }</td>
</tr>

<tr>
  <td class="bold">Inspection Date:</td>
  <td></td>
  <td></td>
</tr>

<tr>
  <td class="bold">Inspection Start (time):</td>
  <td></td>
  <td></td>
</tr>

<tr>
  <td class="bold">Inspection End (time):</td>
  <td></td>
  <td></td>
</tr>

<tr>
  <td class="bold">Inspector:</td>
  <td></td>
  <td></td>
</tr>

<tr class="blank-row">
  <td></td>
  <td></td>
  <td></td>
</tr>

<tr>
  <td colspan="3" class="section" style="text-align:center;">
    Summary
  </td>
</tr>

<tr>
  <td class="bold">Description</td>
  <td class="bold">Yes/No/ Pending</td>
  <td class="bold">Remarks (If Not Ok)</td>
</tr>

<tr>
  <td class="bold">Grade (As per PO)</td>
  <td class="red">${extractGradesFromSizeText(salesOrder.sizeGradeQuantityRate)}</td>
  <td></td>
</tr>

<tr>
  <td class="bold">Dimensions (As per PO)</td>
  <td class="bold">OK /NOT OK</td>
  <td></td>
</tr>

<tr>
  <td class="bold">Quantity (As per PO)</td>
  <td class="bold">OK /NOT OK</td>
  <td></td>
</tr>

<tr>
  <td class="bold">Surface Cleanliness</td>
  <td class="bold">OK /NOT OK</td>
  <td></td>
</tr>

<tr>
  <td class="bold">Ultrasonic Testing</td>
  <td class="bold">OK /NOT OK</td>
  <td></td>
</tr>

<tr>
  <td colspan="3" class="section">
    Comments(Inspector)
  </td>
</tr>

<tr class="comment-row">
  <td colspan="3"></td>
</tr>

<tr>
  <td colspan="3" class="section">
    Factory Authorised Signatory
  </td>
</tr>

<tr class="sign-row">
  <td colspan="3"></td>
</tr>

</table>

</div>

</body>
</html>
`;
};

module.exports = preShipmentInspectionTemplate;