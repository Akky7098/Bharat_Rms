const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
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
  <td class="red">${salesOrder.sizeGradeQuantityRate || ""}</td>
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