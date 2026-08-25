const transporter =
  require("../util/mailTransporter");


/* =========================================================
   CONFIG
========================================================= */

const COMPANY_LOGO_URL =
  process.env.COMPANY_LOGO_URL ||
  "https://dashboard.bharatspecialsteels.com/logo.png";


/* =========================================================
   CUSTOMER TRACKING PAGE BASE URL
========================================================= */

/* LOCAL TESTING */

// const CUSTOMER_TRACKING_BASE_URL =
//   "http://localhost:5000";


/* PRODUCTION */

const CUSTOMER_TRACKING_BASE_URL =
  (
    process.env.CUSTOMER_TRACKING_BASE_URL ||
    "https://bharatspecialsteels.bharatspecialsteels.com"
  ).replace(/\/$/, "");


const MAIL_FROM =
  process.env.MAIL_FROM ||
  '"Bharat Special Steels" <bsspl97@gmail.com>';


/* =========================================================
   HTML ESCAPE
========================================================= */

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


/* =========================================================
   BUILD CUSTOMER TRACKING URL
========================================================= */

const buildTrackingUrl = (rawToken) => {
  if (!rawToken) {
    throw new Error(
      "Customer tracking token is missing"
    );
  }

  return (
    `${CUSTOMER_TRACKING_BASE_URL}` +
    `/track-order/` +
    `${encodeURIComponent(rawToken)}`
  );
};


/* =========================================================
   CUSTOMER ORDER TRACKING EMAIL TEMPLATE
========================================================= */

const buildCustomerTrackingEmail = ({
  salesOrder,
  rawToken,
}) => {
  const customerName = escapeHtml(
    salesOrder?.contactPersonName || "Customer"
  );

  const companyName = escapeHtml(
    salesOrder?.companyName || ""
  );

  const poNumber = escapeHtml(
    salesOrder?.poNumber || "-"
  );

  const salesOrderNo = escapeHtml(
    salesOrder?.salesOrderNo || "-"
  );

  const salesPersonName = escapeHtml(
    salesOrder?.salesPersonName ||
      "Bharat Special Steels Team"
  );

  const trackingUrl = buildTrackingUrl(rawToken);

  return `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Your Order is Now in Process
  </title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f6fa;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    width:100%;
    background:#f3f6fa;
    padding:32px 12px;
  "
>
<tr>
<td align="center">

<table
  role="presentation"
  width="620"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    width:100%;
    max-width:620px;
    background:#ffffff;
    border-radius:22px;
    overflow:hidden;
    box-shadow:0 15px 45px rgba(15,23,42,0.10);
  "
>

<!-- =====================================================
     HEADER
===================================================== -->

<tr>
<td
  style="
    padding:28px 32px;
    background:#092b25;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
>
<tr>

<td
  align="left"
  valign="middle"
>
  <img
    src="${COMPANY_LOGO_URL}"
    alt="Bharat Special Steels"
    width="78"
    style="
      display:block;
      width:78px;
      max-width:78px;
      height:auto;
      padding:8px;
      background:#ffffff;
      border-radius:12px;
    "
  />
</td>

<td
  align="right"
  valign="middle"
  style="
    color:#c8f7db;
    font-size:11px;
    font-weight:bold;
    letter-spacing:1px;
  "
>
  ORDER CONFIRMED
</td>

</tr>
</table>

</td>
</tr>


<!-- =====================================================
     MAIN CONTENT
===================================================== -->

<tr>
<td
  style="
    padding:34px 32px 12px;
  "
>

<div
  style="
    color:#15803d;
    font-size:11px;
    font-weight:bold;
    letter-spacing:1.2px;
    text-transform:uppercase;
    margin-bottom:10px;
  "
>
  YOUR ORDER IS NOW IN PROCESS
</div>


<h1
  style="
    margin:0;
    color:#111827;
    font-size:28px;
    line-height:1.25;
    font-weight:800;
  "
>
  Hello ${customerName},
</h1>


<p
  style="
    margin:16px 0 0;
    color:#536174;
    font-size:15px;
    line-height:1.7;
  "
>
  Thank you for choosing
  <strong style="color:#172033;">
    Bharat Special Steels
  </strong>.
</p>


<p
  style="
    margin:12px 0 0;
    color:#536174;
    font-size:15px;
    line-height:1.7;
  "
>
  We are pleased to inform you that your order has
  completed our internal approval process and has now
  moved into execution.
</p>


<p
  style="
    margin:12px 0 0;
    color:#536174;
    font-size:15px;
    line-height:1.7;
  "
>
  You can follow the latest progress of your order
  through our secure online order tracking portal.
  Production and delivery estimates shown there will
  reflect the latest plan updated by our team.
</p>

</td>
</tr>


<!-- =====================================================
     ORDER INFORMATION
===================================================== -->

<tr>
<td
  style="
    padding:18px 32px 8px;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    width:100%;
    background:#f8fafc;
    border:1px solid #e5eaf1;
    border-radius:16px;
  "
>

<tr>

<td
  width="50%"
  valign="top"
  style="
    padding:18px;
    border-bottom:1px solid #e5eaf1;
  "
>

<div
  style="
    color:#8491a3;
    font-size:10px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.8px;
  "
>
  COMPANY
</div>

<div
  style="
    margin-top:6px;
    color:#172033;
    font-size:14px;
    font-weight:bold;
    line-height:1.4;
  "
>
  ${companyName}
</div>

</td>


<td
  width="50%"
  valign="top"
  style="
    padding:18px;
    border-bottom:1px solid #e5eaf1;
  "
>

<div
  style="
    color:#8491a3;
    font-size:10px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.8px;
  "
>
  PURCHASE ORDER
</div>

<div
  style="
    margin-top:6px;
    color:#172033;
    font-size:14px;
    font-weight:bold;
    line-height:1.4;
  "
>
  ${poNumber}
</div>

</td>

</tr>


<tr>

<td
  width="50%"
  valign="top"
  style="
    padding:18px;
  "
>

<div
  style="
    color:#8491a3;
    font-size:10px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.8px;
  "
>
  SALES ORDER
</div>

<div
  style="
    margin-top:6px;
    color:#172033;
    font-size:14px;
    font-weight:bold;
    line-height:1.4;
  "
>
  ${salesOrderNo}
</div>

</td>


<td
  width="50%"
  valign="top"
  style="
    padding:18px;
  "
>

<div
  style="
    color:#8491a3;
    font-size:10px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:.8px;
  "
>
  BHARAT REPRESENTATIVE
</div>

<div
  style="
    margin-top:6px;
    color:#172033;
    font-size:14px;
    font-weight:bold;
    line-height:1.4;
  "
>
  ${salesPersonName}
</div>

</td>

</tr>

</table>

</td>
</tr>


<!-- =====================================================
     TRACKING CTA
===================================================== -->

<tr>
<td
  align="center"
  style="
    padding:28px 32px 36px;
  "
>

<p
  style="
    margin:0 0 18px;
    color:#536174;
    font-size:13px;
    line-height:1.6;
  "
>
  Click below to view your latest order progress and
  estimated delivery timeline.
</p>


<table
  role="presentation"
  cellspacing="0"
  cellpadding="0"
  border="0"
>
<tr>
<td
  align="center"
  bgcolor="#1769e0"
  style="
    border-radius:12px;
  "
>

<a
  href="${trackingUrl}"
  target="_blank"
  style="
    display:inline-block;
    min-width:220px;
    padding:15px 28px;
    color:#ffffff;
    font-size:15px;
    line-height:20px;
    font-weight:bold;
    text-decoration:none;
    border-radius:12px;
  "
>
  Track Your Order &nbsp;→
</a>

</td>
</tr>
</table>


<p
  style="
    margin:17px auto 0;
    max-width:440px;
    color:#8a96a7;
    font-size:10px;
    line-height:1.6;
  "
>
  This button provides secure access to your order
  tracking page. Please do not forward this email
  outside your organisation.
</p>

</td>
</tr>


<!-- =====================================================
     CONTACT
===================================================== -->

<tr>
<td
  style="
    padding:22px 32px;
    background:#f8fafc;
    border-top:1px solid #e9edf3;
  "
>

<p
  style="
    margin:0;
    color:#536174;
    font-size:12px;
    line-height:1.7;
  "
>
  For any commercial or technical clarification,
  please contact your Bharat representative.
</p>


<p
  style="
    margin:14px 0 0;
    color:#172033;
    font-size:12px;
    line-height:1.7;
  "
>
  Regards,<br />

  <strong>
    ${salesPersonName}
  </strong><br />

  <strong>
    Bharat Special Steels
  </strong>
</p>

</td>
</tr>


<!-- =====================================================
     SYSTEM FOOTER
===================================================== -->

<tr>
<td
  align="center"
  style="
    padding:16px 25px;
    background:#071827;
  "
>

<p
  style="
    margin:0;
    color:#aeb9c7;
    font-size:9px;
    line-height:1.6;
  "
>
  This is an automated order confirmation and tracking
  notification from Bharat Special Steels.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};


/* =========================================================
   SEND CUSTOMER TRACKING EMAIL
========================================================= */

const sendCustomerTrackingEmail = async ({
  salesOrder,
  rawToken,
}) => {
  if (!salesOrder) {
    throw new Error(
      "Sales order is required for customer tracking email"
    );
  }


  /* -------------------------------------------------------
     TO = CUSTOMER EMAIL FROM SALES ORDER
  ------------------------------------------------------- */

  const to = String(
    salesOrder?.contactPersonEmail || ""
  )
    .trim()
    .toLowerCase();


  if (!to) {
    throw new Error(
      "Customer contact email is missing in Sales Order"
    );
  }


  /* -------------------------------------------------------
     CC = SALESPERSON EMAIL FROM SALES ORDER

     salesPersonEmail already exists directly in your
     SalesOrder model, so use that first.

     populate fallback is kept only as a safe fallback.
  ------------------------------------------------------- */

  const cc = String(
    salesOrder?.salesPersonEmail ||
      salesOrder?.salesPersonId?.email ||
      ""
  )
    .trim()
    .toLowerCase();


  /* -------------------------------------------------------
     SUBJECT
  ------------------------------------------------------- */

  const orderReference =
    salesOrder?.salesOrderNo ||
    salesOrder?.poNumber ||
    "";


  const subject = orderReference
    ? `Your Bharat Special Steels Order is Now in Process – ${orderReference}`
    : "Your Bharat Special Steels Order is Now in Process";


  /* -------------------------------------------------------
     SEND USING EXISTING SHARED TRANSPORTER
  ------------------------------------------------------- */

  const result = await transporter.sendMail({
    from: MAIL_FROM,

    to,

    cc: cc || undefined,

    subject,

    html: buildCustomerTrackingEmail({
      salesOrder,
      rawToken,
    }),
  });


  console.log(
    "CUSTOMER TRACKING EMAIL SENT =>",
    {
      salesOrderId:
        salesOrder?._id?.toString?.() ||
        salesOrder?._id,

      companyName:
        salesOrder?.companyName,

      to,

      cc:
        cc || null,

      messageId:
        result?.messageId || "",
    }
  );


  return {
    messageId:
      result?.messageId || "",

    accepted:
      result?.accepted || [],

    rejected:
      result?.rejected || [],

    to,

    cc:
      cc || "",
  };
};


module.exports = {
  sendCustomerTrackingEmail,
  buildCustomerTrackingEmail,
  buildTrackingUrl,
};