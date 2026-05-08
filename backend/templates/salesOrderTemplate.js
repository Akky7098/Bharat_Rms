const fs = require("fs");
const path = require("path");

const formatDate = (date) => {
  if (!date) return "";

  const newDate = new Date(date);

  return `${String(newDate.getDate()).padStart(2, "0")}.${String(
    newDate.getMonth() + 1
  ).padStart(2, "0")}.${newDate.getFullYear()}`;
};

const formatText = (value) => {
  if (!value) return "";
  return String(value).replaceAll("_", " ");
};

const formatSizeGradeText = (value) => {
  if (!value) return "";

  return String(value)
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => `<div>${line}</div>`)
    .join("");
};

const getWatermark = (status) => {
  if (status === "approved") return "APPROVED";

  if (
    status === "rejected_by_admin" ||
    status === "rejected_by_manager"
  ) {
    return "REJECTED";
  }

  return "DRAFT";
};

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(
      __dirname,
      "..",
      "public",
      "logo.png"
    );

    const logoBuffer = fs.readFileSync(logoPath);

    return `data:image/png;base64,${logoBuffer.toString(
      "base64"
    )}`;
  } catch (error) {
    console.log(
      "LOGO LOAD ERROR =>",
      error.message
    );

    return "";
  }
};

const salesOrderTemplate = (salesOrder) => {
  const logoBase64 = getLogoBase64();

  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8" />

<style>

@page {
  size: A4 portrait;
  margin: 8mm;
}

* {
  box-sizing: border-box;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  padding: 0;
  color: #000;
  background: #fff;
}

.main-container {
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

td {
  border: 1px solid #000;
  padding: 3px 4px;
  font-size: 9.2px;
  line-height: 1.15;
  vertical-align: middle;
  word-wrap: break-word;
  word-break: break-word;
}

.logo-section {
  text-align: center;
  padding: 7px 4px 6px 4px;
}

.logo-section img {
  width: 145px;
  height: auto;
  object-fit: contain;
}

.heading {
  text-align: center;
  font-size: 19px;
  line-height: 1.1;
  font-weight: bold;
  color: #06429c;
  margin-top: 3px;
}

.center {
  text-align: center;
}

.left {
  text-align: left;
}

.bold {
  font-weight: bold;
}

.red {
  color: red;
  font-weight: bold;
}

.yellow {
  background-color: yellow;
}

.small-text {
  font-size: 8px;
  line-height: 1.08;
}

.large-text {
  font-size: 11px;
}

.sno {
  width: 5%;
  text-align: center;
  font-weight: bold;
}

.label-col {
  width: 30%;
  text-align: center;
  font-weight: bold;
}

.value-col {
  width: 65%;
  text-align: center;
}

.supply-size-box {
  padding: 8px 7px;
  line-height: 1.35;
  vertical-align: middle;
  white-space: normal;
}

.supply-title {
  color: red;
  font-weight: bold;
  text-align: center;
  font-size: 13px;
  margin-bottom: 6px;
}

.size-rate-text {
  font-size: 10px;
  line-height: 1.45;
  text-align: left;
}

.footer-signature {
  height: 42px;
}

.watermark {
  position: fixed;
  top: 42%;
  left: 19%;
  transform: rotate(-30deg);
  font-size: 82px;
  color: rgba(255, 0, 0, 0.08);
  z-index: -1;
  font-weight: bold;
}

</style>
</head>

<body>

<div class="watermark">
  ${getWatermark(salesOrder.approvalStatus)}
</div>

<div class="main-container">

<table>

<colgroup>
  <col style="width:5%">
  <col style="width:30%">
  <col style="width:65%">
</colgroup>

<tr>
  <td colspan="3" class="logo-section">

    ${
      logoBase64
        ? `<img src="${logoBase64}" />`
        : ""
    }

    <div class="heading">
      SALES ORDER FORM
    </div>

  </td>
</tr>

<tr>
  <td class="bold small-text center">
    Customer<br/>Name:
  </td>

  <td class="center bold">
    ${salesOrder.companyName || ""}
    <br/>
    ${salesOrder.companyAddress || ""}
    <br/>
    GSTIN - ${salesOrder.gstinNumber || ""}
  </td>

  <td class="small-text bold">

    <table style="width:100%; border-collapse:collapse;">

      <tr>

        <td style="border:none; width:60%;">
          PO No - ${salesOrder.poNumber || ""}
          <br/>
          PO Checklist Number - ${salesOrder.checklistNumber || ""}
        </td>

        <td style="border:none; width:40%; text-align:center;">
          Dated - ${formatDate(salesOrder.orderDate)}
        </td>

      </tr>

    </table>

  </td>
</tr>

<tr>
  <td colspan="2" class="center bold">
    Sales Person - ${salesOrder.salesPersonName || ""}
  </td>

  <td class="center bold">
    Data required
  </td>
</tr>

<tr>
  <td class="sno">S.No</td>
  <td class="label-col"></td>
  <td class="center bold">Remark Yes/No</td>
</tr>

<tr>
  <td class="sno">1.</td>
  <td class="label-col">Payment Terms</td>
  <td class="value-col">
    ${formatText(salesOrder.paymentTerms)}
  </td>
</tr>

<tr>
  <td class="sno">2.</td>
  <td class="label-col">Order Value</td>
  <td class="value-col large-text">
    ₹ ${salesOrder.orderValue || 0}
  </td>
</tr>

<tr>
  <td class="sno">3.</td>

  <td class="label-col">
    Customer Type
    <br/>
    (Existing/New)
  </td>

  <td class="value-col">
    ${formatText(salesOrder.customerType)}
  </td>
</tr>

<tr>
  <td class="sno">4.</td>

  <td class="label-col small-text">
    Is payment terms approved by management,
    if yes then name of approved person
  </td>

  <td class="value-col">
    ${
      salesOrder.isPaymentTermsApprovedByManagement
        ? `Yes, By ${formatText(
            salesOrder.paymentTermsApprovedBy
          )}`
        : "No"
    }
  </td>
</tr>

<tr>
  <td class="sno">5.</td>

  <td class="label-col small-text">
    Previous payment due if any Yes/No
    <br/>
    (Invoice details/Invoice date/amount/Due date)
  </td>

  <td class="value-col">
    ${salesOrder.previousPaymentStatus || "NO"}
  </td>
</tr>

<tr>
  <td class="sno">6.</td>

  <td class="label-col">
    PO is as per quotation
    <br/>
    (Yes/No)
  </td>

  <td class="value-col">
    ${formatText(salesOrder.poAsPerQuotation)}
  </td>
</tr>

<tr>

  <td class="sno">7.</td>

  <td class="label-col">
    Size/Grade/Qty/Rate
  </td>

  <td class="supply-size-box">

    <div class="supply-title">
      Supply Size
    </div>

    <div class="size-rate-text">
      ${formatSizeGradeText(
        salesOrder.sizeGradeQuantityRate
      )}
    </div>

  </td>

</tr>

<tr>
  <td class="sno">8.</td>

  <td class="label-col">
    Supply Condition
  </td>

  <td class="value-col">
    ${
      salesOrder.supplyCondition === "as_per_standard"
        ? "As Per Standard size"
        : salesOrder.otherSupplyConditions?.join(", ") || ""
    }
  </td>
</tr>

<tr>
  <td class="sno">9.</td>

  <td class="label-col">
    Cut Length
    <br/>
    (Yes/No)
  </td>

  <td class="value-col">
    ${formatText(salesOrder.cutLengthRequired)}
  </td>
</tr>

<tr>
  <td class="sno">10.</td>

  <td class="label-col">
    Cutting cost
    <br/>
    (Extra/Inclusive)
  </td>

  <td class="value-col">
    ${formatText(salesOrder.cuttingCost)}
  </td>
</tr>

<tr>
  <td class="sno">11.</td>

  <td class="label-col">
    Freight
    <br/>
    (Extra/Self)
  </td>

  <td class="value-col">
    ${formatText(salesOrder.freight)}
  </td>
</tr>

<tr>
  <td class="sno">12.</td>

  <td class="label-col">
    Billing Address
    <br/>
    <span class="small-text">
      (As per PO, if different then mention)
    </span>
  </td>

  <td class="value-col">
    ${
      salesOrder.billingAddress?.sameAsCompanyAddress
        ? salesOrder.companyAddress
        : salesOrder.billingAddress?.address || ""
    }
  </td>
</tr>

<tr>
  <td class="sno">13.</td>

  <td class="label-col">
    Shipping Address
    <br/>
    <span class="small-text">
      (As per PO, if different then mention)
    </span>
  </td>

  <td class="value-col">
    ${
      salesOrder.shippingAddress?.sameAsCompanyAddress
        ? salesOrder.companyAddress
        : salesOrder.shippingAddress?.address || ""
    }
  </td>
</tr>

<tr>
  <td class="sno">14.</td>

  <td class="label-col">
    Tolerance
    <br/>
    <span class="small-text">
      (diameter and cut length)
    </span>
  </td>

  <td class="value-col">
    ${salesOrder.tolerance || ""}
  </td>
</tr>

<tr>
  <td class="sno">15.</td>

  <td class="label-col">
    End use of customer
    <br/>
    <span class="small-text">
      (Machining/Forging)
    </span>
  </td>

  <td class="value-col">
    ${formatText(salesOrder.endUseOfCustomer)}
  </td>
</tr>

<tr>
  <td class="sno">16.</td>

  <td class="label-col">
    Standard Delivery Time/committed
    <br/>
    <span class="small-text">
      by the sales person
    </span>
  </td>

  <td class="value-col yellow red">
    ${salesOrder.deliveryTime || ""}
  </td>
</tr>

<tr>
  <td class="sno">17.</td>

  <td class="label-col">
    Test Certificate (TC)
  </td>

  <td class="value-col yellow red">
    ${formatText(
      salesOrder.testCertificateRequired
    )}
  </td>
</tr>

<tr>
  <td class="sno">18.</td>

  <td class="label-col">
    Enquiry Form Fill or Not
  </td>

  <td class="value-col">
    ${
      salesOrder.enquiryFormFilled === "yes"
        ? `YES ${
            salesOrder.enquiryNumber
              ? `- ${salesOrder.enquiryNumber}`
              : ""
          }`
        : "NO"
    }
  </td>
</tr>

<tr>
  <td colspan="3">

    Contact Person -
    ${salesOrder.contactPersonName || ""}
    (${salesOrder.contactPersonNumber || ""})

  </td>
</tr>

<tr class="footer-signature">

  <td colspan="2" class="center bold">
    Prepared By
    <br/>
    (${salesOrder.salesPersonName || ""})
  </td>

  <td class="center bold">
    Checked By
    <br/>
    ${salesOrder.checkedByAdminName || ""}
  </td>

</tr>

</table>

</div>

</body>
</html>
`;
};

module.exports = salesOrderTemplate;