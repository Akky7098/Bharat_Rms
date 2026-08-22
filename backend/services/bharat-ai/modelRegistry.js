const path =
  require("path");

const modelRoot =
  path.join(
    __dirname,
    "..",
    "..",
    "model"
  );

/* =========================================================
   LOAD MODEL SAFELY

   Bharat production has used slightly different
   file naming conventions across modules.

   This keeps Bharat AI independent from file-name casing.
========================================================= */

const loadFirst = (
  label,
  candidates
) => {
  let lastError;

  for (
    const filename of
    candidates
  ) {
    try {
      return require(
        path.join(
          modelRoot,
          filename
        )
      );
    } catch (error) {
      /*
       * Only continue when THIS requested model
       * file cannot be located.
       *
       * If the model itself throws another error,
       * let it surface instead of hiding it.
       */

      if (
        error?.code ===
        "MODULE_NOT_FOUND"
      ) {
        lastError =
          error;

        continue;
      }

      throw error;
    }
  }

  const error =
    new Error(
      `Bharat AI could not locate the ${label} model. Tried: ${candidates.join(
        ", "
      )}`
    );

  error.cause =
    lastError;

  throw error;
};

/* =========================================================
   USER
========================================================= */

const User =
  loadFirst(
    "User",
    [
      "userModel.js",
      "User.js",
      "user.js",
    ]
  );

/* =========================================================
   SALES ORDER
========================================================= */

const SalesOrder =
  loadFirst(
    "Sales Order",
    [
      "salesOrderModel.js",
      "SalesOrderForm.js",
      "salesOrderFormModel.js",
      "SalesOrder.js",
    ]
  );

/* =========================================================
   ENQUIRY
========================================================= */

const Enquiry =
  loadFirst(
    "Enquiry",
    [
      "enquiryModel.js",
      "Enquiry.js",
      "enquiry.js",
    ]
  );

/* =========================================================
   DISPATCH
========================================================= */

const Dispatch =
  loadFirst(
    "Dispatch",
    [
      "dispatchModel.js",
      "Dispatch.js",
      "dispatch.js",
    ]
  );

/* =========================================================
   RECEIVABLE
========================================================= */

const Receivable =
  loadFirst(
    "Receivable",
    [
      "receivableModel.js",
      "Receivable.js",
      "receivable.js",
    ]
  );

/* =========================================================
   ORDER TRACKING
========================================================= */

const OrderTracking =
  loadFirst(
    "Order Tracking",
    [
      "orderTrackingModel.js",
      "OrderTracking.js",
      "orderTracking.js",
    ]
  );

/* =========================================================
   ATTENDANCE
========================================================= */

const Attendance =
  loadFirst(
    "Attendance",
    [
      "attendanceModel.js",
      "Attendance.js",
      "attendance.js",
    ]
  );

/* =========================================================
   TIMESHEET
========================================================= */

const Timesheet =
  loadFirst(
    "Timesheet",
    [
      "timesheetModel.js",
      "Timesheet.js",
      "timesheet.js",
    ]
  );

/* =========================================================
   COLD CALL / SALES ACTIVITY
========================================================= */

const ColdCall =
  loadFirst(
    "Cold Call",
    [
      "coldCallModel.js",
      "ColdCall.js",
      "coldCall.js",
    ]
  );

/* =========================================================
   DOCUMENT

   Used for:
   - brochures
   - catalogues
   - MTC
   - technical documents
   - internal reference documents
========================================================= */

const Document =
  loadFirst(
    "Document",
    [
      "documentModel.js",
      "Document.js",
      "document.js",
    ]
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  User,

  SalesOrder,

  Enquiry,

  Dispatch,

  Receivable,

  OrderTracking,

  Attendance,

  Timesheet,

  ColdCall,

  Document,
};