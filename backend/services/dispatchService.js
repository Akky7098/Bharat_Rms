const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Dispatch = require("../model/dispatchModel");
const SalesOrder = require("../model/salesOrderModel");

const {
  sendDispatchCreatedEmail,
  sendPaymentUpdateEmail,
} = require("./dispatchMailService");

let notificationService = null;

try {
  notificationService = require("./notificationService");
} catch (error) {
  console.log("Notification service not loaded =>", error.message);
}

const DISPATCH_UPLOAD_DIR =
  process.env.DISPATCH_UPLOAD_DIR ||
  path.join(process.cwd(), "uploads", "dispatch");

const DISPATCH_UPLOAD_URL =
  process.env.DISPATCH_UPLOAD_URL || "/uploads/dispatch";

const ensureUploadDir = () => {
  if (!fs.existsSync(DISPATCH_UPLOAD_DIR)) {
    fs.mkdirSync(DISPATCH_UPLOAD_DIR, { recursive: true });
  }
};

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) return;
    await notificationService.createNotification(payload);
  } catch (error) {
    console.log("DISPATCH NOTIFICATION ERROR =>", error.message);
  }
};

const getUserId = (user) => user?._id || user?.id;

const isAdminOrSuperAdmin = (user) => {
  return ["admin", "super_admin"].includes(user?.role);
};

const canViewAllDispatches = (user) => {
  return ["admin", "super_admin"].includes(user?.role);
};

const canManageDispatch = (user, dispatch) => {
  if (isAdminOrSuperAdmin(user)) return true;
  return String(dispatch.salesPersonId) === String(getUserId(user));
};

const canDeleteDispatch = (user) => user?.role === "super_admin";

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const cleanEmails = (emails = []) => {
  return [
    ...new Set(
      emails
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase())
        .filter((email) => email.includes("@"))
    ),
  ];
};

const sanitizeFileName = (name) => {
  return String(name || "dispatch-file")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
};

const getFileUrl = (fileName) => {
  return `${DISPATCH_UPLOAD_URL}/${fileName}`;
};

const moveUploadedFileToPersistentDir = (file, title) => {
  ensureUploadDir();

  const ext = path.extname(file.originalname || ".pdf") || ".pdf";
  const safeTitle = sanitizeFileName(title);
  const newFileName = `${safeTitle}-${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}${ext}`;

  const newPath = path.join(DISPATCH_UPLOAD_DIR, newFileName);

  fs.renameSync(file.path, newPath);

  file.filename = newFileName;
  file.path = newPath;

  return file;
};

const buildFileObject = (file) => ({
  originalName: file.originalname,
  fileName: file.filename,
  filePath: file.path,
  fileUrl: getFileUrl(file.filename),
  mimeType: file.mimetype,
  fileSize: file.size,
  uploadedAt: new Date(),
});

const deleteUploadedFiles = (files = []) => {
  files.forEach((file) => {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.log("DISPATCH FILE DELETE ERROR =>", error.message);
    }
  });
};

const parseLocalDateOnly = (dateValue) => {
  if (!dateValue) {
    const today = new Date();
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
      0
    );
  }

  if (dateValue instanceof Date) {
    return new Date(
      dateValue.getFullYear(),
      dateValue.getMonth(),
      dateValue.getDate(),
      12,
      0,
      0,
      0
    );
  }

  const value = String(dateValue).trim();

  // frontend date input format: yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  // Indian display format: dd/mm/yyyy or dd-mm-yyyy
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)) {
    const [day, month, year] = value.split(/[/-]/).map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  throw new Error("Invalid date format. Use yyyy-mm-dd or dd/mm/yyyy.");
};

const calculatePaymentDueDate = (dispatchDate, paymentDueDays) => {
  const dueDate = parseLocalDateOnly(dispatchDate);
  dueDate.setDate(dueDate.getDate() + Number(paymentDueDays || 0));
  dueDate.setHours(12, 0, 0, 0);
  return dueDate;
};

const calculatePaymentStatus = (
  pendingAmount,
  paymentDueDate,
  paidAmount
) => {
  const pending =
    Number(
      pendingAmount || 0
    );

  const paid =
    Number(
      paidAmount || 0
    );

  if (pending <= 0) {
    return "paid";
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const due =
    paymentDueDate
      ? new Date(
          paymentDueDate
        )
      : null;

  if (due) {
    due.setHours(
      0,
      0,
      0,
      0
    );
  }

  if (
    due &&
    due < today
  ) {
    return "overdue";
  }

  if (paid > 0) {
    return "partial";
  }

  return "pending";
};

const getEffectivePaymentDueDate = (
  dispatch
) => {
  return (
    dispatch?.revisedPaymentDueDate ||
    dispatch?.paymentDueDate ||
    null
  );
};

const getShippingAddress = (salesOrder) => {
  if (salesOrder.shippingAddress?.sameAsCompanyAddress) {
    return salesOrder.companyAddress || "";
  }

  return salesOrder.shippingAddress?.address || salesOrder.companyAddress || "";
};

const buildDispatchCcEmails = (salesOrder, additionalCcEmails = [], user) => {
  return cleanEmails([
    salesOrder.salesPersonEmail,
    user?.email,
    process.env.ADMIN_EMAIL,
    process.env.SUPER_ADMIN_EMAIL,
    ...(additionalCcEmails || []),
  ]);
};

const parseQtyFromMaterialText = (text = "") => {
  const raw = String(text || "").replace(/,/g, " ");
  const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms)/gi)];

  if (matches.length === 0) return 0;

  return Number(
    matches.reduce((sum, item) => sum + Number(item[1] || 0), 0).toFixed(3)
  );
};

const getSalesOrderTotalQty = (salesOrder) => {
  return parseQtyFromMaterialText(salesOrder.sizeGradeQuantityRate);
};

const getSalesOrderDispatchSummary = async (salesOrderId, session = null) => {
  const pipeline = [
    {
      $match: {
        salesOrderId: new mongoose.Types.ObjectId(salesOrderId),
        isActive: true,
        dispatchStatus: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: "$salesOrderId",
        totalDispatchedQty: { $sum: "$dispatchQty" },
        dispatchCount: { $sum: 1 },
      },
    },
  ];

  const result = session
    ? await Dispatch.aggregate(pipeline).session(session)
    : await Dispatch.aggregate(pipeline);

  return {
    totalDispatchedQty: Number(result?.[0]?.totalDispatchedQty || 0),
    dispatchCount: Number(result?.[0]?.dispatchCount || 0),
  };
};

/* SEARCH APPROVED SALES ORDERS AVAILABLE FOR DISPATCH */
const searchPendingDispatchSalesOrders = async (query, user) => {
  const {
    search = "",
    limit = 10,
  } = query;

  const keyword = String(search || "")
    .trim()
    .replace(/\s+/g, " ");

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const filter = {
    approvalStatus: "approved",
    isActive: { $ne: false },
  };

  if (!canViewAllDispatches(user)) {
    filter.salesPersonId = getUserId(user);
  }

  if (keyword) {
    filter.$or = [
      {
        companyName: {
          $regex: escapeRegex(keyword),
          $options: "i",
        },
      },
      {
        poNumber: {
          $regex: escapeRegex(keyword),
          $options: "i",
        },
      },
      {
        salesOrderNo: {
          $regex: escapeRegex(keyword),
          $options: "i",
        },
      },
      {
        contactPersonName: {
          $regex: escapeRegex(keyword),
          $options: "i",
        },
      },
    ];
  }

  /*
   * Fetch extra records first because fully dispatched
   * sales orders will be removed after quantity calculation.
   */
  const fetchLimit = Math.min(
    Math.max(safeLimit * 5, 50),
    200
  );

  const salesOrders = await SalesOrder.find(filter)
    .sort({
      "managerApproval.approvedAt": -1,
      createdAt: -1,
    })
    .limit(fetchLimit)
    .select(`
      orderDate
      salesOrderNo
      companyName
      companyAddress
      poNumber
      checklistNumber
      contactPersonName
      contactPersonNumber
      contactPersonEmail
      salesPersonId
      salesPersonName
      salesPersonEmail
      salesPersonMobile
      paymentTerms
      orderValue
      sizeGradeQuantityRate
      supplyCondition
      deliveryTime
      billingAddress
      shippingAddress
      approvalStatus
      managerApproval.approvedAt
      createdAt
      updatedAt
    `)
    .lean();

  if (!salesOrders.length) {
    return [];
  }

  const salesOrderIds = salesOrders.map(
    (item) => item._id
  );

  const dispatchSummary =
    await Dispatch.aggregate([
      {
        $match: {
          salesOrderId: {
            $in: salesOrderIds,
          },
          isActive: true,
          dispatchStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: "$salesOrderId",

          totalDispatchedQty: {
            $sum: {
              $ifNull: [
                "$dispatchQty",
                0,
              ],
            },
          },

          dispatchCount: {
            $sum: 1,
          },
        },
      },
    ]);

  const summaryMap = new Map(
    dispatchSummary.map((item) => [
      String(item._id),
      {
        totalDispatchedQty: Number(
          item.totalDispatchedQty || 0
        ),
        dispatchCount: Number(
          item.dispatchCount || 0
        ),
      },
    ])
  );

  const availableSalesOrders =
    salesOrders
      .map((salesOrder) => {
        const totalOrderQty = Number(
          getSalesOrderTotalQty(
            salesOrder
          ) || 0
        );

        const summary =
          summaryMap.get(
            String(salesOrder._id)
          ) || {
            totalDispatchedQty: 0,
            dispatchCount: 0,
          };

        const totalDispatchedQty =
          Number(
            summary.totalDispatchedQty || 0
          );

        const dispatchCount =
          Number(
            summary.dispatchCount || 0
          );

        const remainingDispatchQty =
          totalOrderQty > 0
            ? Math.max(
                Number(
                  (
                    totalOrderQty -
                    totalDispatchedQty
                  ).toFixed(3)
                ),
                0
              )
            : 0;

        let dispatchAvailabilityStatus =
          "pending_dispatch";

        if (
          totalOrderQty > 0 &&
          remainingDispatchQty <= 0
        ) {
          dispatchAvailabilityStatus =
            "fully_dispatched";
        } else if (
          dispatchCount > 0 ||
          totalDispatchedQty > 0
        ) {
          dispatchAvailabilityStatus =
            "partial_dispatched";
        }

        return {
          ...salesOrder,

          totalOrderQty,
          totalDispatchedQty,
          remainingDispatchQty,
          dispatchCount,

          alreadyDispatched:
            dispatchCount > 0,

          dispatchAvailabilityStatus,
        };
      })
      .filter((salesOrder) => {
        /*
         * Never show fully dispatched orders.
         */
        if (
          salesOrder
            .dispatchAvailabilityStatus ===
          "fully_dispatched"
        ) {
          return false;
        }

        /*
         * If a valid order quantity exists,
         * only show records with remaining quantity.
         */
        if (
          Number(
            salesOrder.totalOrderQty || 0
          ) > 0
        ) {
          return (
            Number(
              salesOrder
                .remainingDispatchQty || 0
            ) > 0
          );
        }

        /*
         * Retain older sales orders where total quantity
         * cannot be parsed, unless they were already marked
         * fully dispatched.
         */
        return true;
      })
      .slice(0, safeLimit);

  return availableSalesOrders;
};

/* CREATE DISPATCH */
/* =========================================================
   CREATE DISPATCH

   TC / MTC SUPPORT:
   - TC not applicable → 0 files
   - TC applicable → minimum 1 file
   - Maximum 10 TC files
   - Stores all in tcCertificatePdfs[]
   - Keeps first file in legacy tcCertificatePdf
========================================================= */

const createDispatch =
  async (
    body,
    files,
    user
  ) => {
    const session =
      await mongoose
        .startSession();

    /*
     * IMPORTANT:
     *
     * Keep references to every uploaded file.
     * If creation fails after files have been moved,
     * deleteUploadedFiles() can still clean them because
     * moveUploadedFileToPersistentDir mutates file.path.
     */
    const uploadedFiles = [
      ...(files?.billPdf ||
        []),

      ...(files?.lrCopyPdf ||
        []),

      ...(files?.tcCertificatePdf ||
        []),
    ];

    try {
      session.startTransaction();

      /* =====================================================
         REQUEST BODY
      ===================================================== */

      const {
        salesOrderId,

        invoiceNumber,

        invoiceDate,

        dispatchDate,

        dispatchQty,

        invoiceValue,

        paymentDueDays,

        paidAmount = 0,

        additionalCcEmails =
          [],

        dispatchStatus =
          "dispatched",

        internalRemark =
          "",

        paymentRemark =
          "",

        tcApplicable =
          "not_applicable",
      } = body;


      /* =====================================================
         NORMALIZE TC APPLICABLE
      ===================================================== */

      const normalizedTcApplicable =
        String(
          tcApplicable
        ).trim() ===
        "applicable"
          ? "applicable"
          : "not_applicable";


      /* =====================================================
         NORMALIZE MULTIPLE TC FILES
      ===================================================== */

      const tcCertificateFiles =
        Array.isArray(
          files?.tcCertificatePdf
        )
          ? files.tcCertificatePdf
          : [];


      /* =====================================================
         BASIC VALIDATION
      ===================================================== */

      if (!salesOrderId) {
        throw new Error(
          "Sales order is required."
        );
      }


      if (
        !invoiceNumber ||
        !String(
          invoiceNumber
        ).trim()
      ) {
        throw new Error(
          "Invoice number is required."
        );
      }


      if (!invoiceDate) {
        throw new Error(
          "Invoice date is required."
        );
      }


      if (
        !files?.billPdf?.[0]
      ) {
        throw new Error(
          "Bill PDF is required."
        );
      }


      /* =====================================================
         TC VALIDATION

         Applicable:
         minimum 1
         maximum 10
      ===================================================== */

      if (
        normalizedTcApplicable ===
          "applicable" &&
        tcCertificateFiles.length ===
          0
      ) {
        throw new Error(
          "At least one MTC / TC PDF is required when TC is applicable."
        );
      }


      if (
        tcCertificateFiles.length >
        10
      ) {
        throw new Error(
          "Maximum 10 MTC / TC PDF files can be uploaded for one dispatch."
        );
      }


      /* =====================================================
         SALES ORDER
      ===================================================== */

      const salesOrder =
        await SalesOrder
          .findById(
            salesOrderId
          )
          .session(
            session
          );


      if (!salesOrder) {
        throw new Error(
          "Sales order not found."
        );
      }


      if (
        salesOrder
          .approvalStatus !==
        "approved"
      ) {
        throw new Error(
          "Dispatch can be created only for approved sales orders."
        );
      }


      /* =====================================================
         ACCESS
      ===================================================== */

      if (
        !isAdminOrSuperAdmin(
          user
        ) &&
        String(
          salesOrder
            .salesPersonId
        ) !==
          String(
            getUserId(
              user
            )
          )
      ) {
        throw new Error(
          "You are not allowed to create dispatch for this sales order."
        );
      }


      /* =====================================================
         DUPLICATE INVOICE CHECK
      ===================================================== */

      const normalizedInvoiceNumber =
        String(
          invoiceNumber
        ).trim();


      const existingInvoice =
        await Dispatch
          .findOne({
            invoiceNumber:
              normalizedInvoiceNumber,

            isActive:
              true,
          })
          .session(
            session
          );


      if (
        existingInvoice
      ) {
        throw new Error(
          "Dispatch with this invoice number already exists."
        );
      }


      /* =====================================================
         NUMBER VALIDATION
      ===================================================== */

      const qty =
        Number(
          dispatchQty
        );


      const value =
        Number(
          invoiceValue
        );


      const days =
        Number(
          paymentDueDays
        );


      const paid =
        Number(
          paidAmount ||
            0
        );


      if (
        !Number.isFinite(
          qty
        ) ||
        qty <= 0
      ) {
        throw new Error(
          "Dispatch quantity must be greater than 0."
        );
      }


      if (
        !Number.isFinite(
          value
        ) ||
        value <= 0
      ) {
        throw new Error(
          "Invoice value must be greater than 0."
        );
      }


      if (
        paymentDueDays ===
          "" ||
        paymentDueDays ===
          undefined ||
        paymentDueDays ===
          null ||
        !Number.isFinite(
          days
        ) ||
        days < 0
      ) {
        throw new Error(
          "Payment due days is required."
        );
      }


      if (
        !Number.isFinite(
          paid
        ) ||
        paid < 0
      ) {
        throw new Error(
          "Paid amount cannot be negative."
        );
      }


      if (
        paid >
        value
      ) {
        throw new Error(
          "Paid amount cannot be greater than invoice value."
        );
      }


      /* =====================================================
         SALES ORDER QUANTITY
      ===================================================== */

      const salesOrderTotalQty =
        getSalesOrderTotalQty(
          salesOrder
        );


      const dispatchSummary =
        await getSalesOrderDispatchSummary(
          salesOrder._id,
          session
        );


      const previousDispatchedQty =
        Number(
          dispatchSummary
            .totalDispatchedQty ||
            0
        );


      const remainingBeforeDispatch =
        salesOrderTotalQty >
        0
          ? Number(
              (
                salesOrderTotalQty -
                previousDispatchedQty
              ).toFixed(
                3
              )
            )
          : 0;


      if (
        salesOrderTotalQty >
          0 &&
        remainingBeforeDispatch <=
          0
      ) {
        throw new Error(
          "This sales order is already fully dispatched."
        );
      }


      if (
        salesOrderTotalQty >
          0 &&
        qty >
          remainingBeforeDispatch
      ) {
        throw new Error(
          `Dispatch quantity cannot be greater than remaining quantity ${remainingBeforeDispatch} Kg.`
        );
      }


      const remainingQtyAfterDispatch =
        salesOrderTotalQty >
        0
          ? Math.max(
              Number(
                (
                  remainingBeforeDispatch -
                  qty
                ).toFixed(
                  3
                )
              ),
              0
            )
          : 0;


      /* =====================================================
         DISPATCH DATE
      ===================================================== */

      const finalDispatchDate =
        parseLocalDateOnly(
          dispatchDate
        );


      if (
        !finalDispatchDate
      ) {
        throw new Error(
          "Invalid dispatch date."
        );
      }


      /* =====================================================
         PAYMENT
      ===================================================== */

      const paymentDueDate =
        calculatePaymentDueDate(
          finalDispatchDate,
          days
        );


      const pendingAmount =
        Number(
          (
            value -
            paid
          ).toFixed(
            2
          )
        );


      const paymentStatus =
        calculatePaymentStatus(
          pendingAmount,
          paymentDueDate,
          paid
        );


      /* =====================================================
         BILL PDF
      ===================================================== */

      const renamedBillFile =
        moveUploadedFileToPersistentDir(
          files.billPdf[0],

          `bill-${normalizedInvoiceNumber}-${salesOrder.companyName}`
        );


      /* =====================================================
         LR COPY
      ===================================================== */

      const renamedLrFile =
        files?.lrCopyPdf?.[0]
          ? moveUploadedFileToPersistentDir(
              files
                .lrCopyPdf[0],

              `lr-${normalizedInvoiceNumber}-${salesOrder.companyName}`
            )
          : null;


      /* =====================================================
         MULTIPLE TC / MTC FILES

         Example:
         tc-certificate-1-INV001-company.pdf
         tc-certificate-2-INV001-company.pdf
         tc-certificate-3-INV001-company.pdf
      ===================================================== */

      const renamedTcCertificateFiles =
        normalizedTcApplicable ===
        "applicable"
          ? tcCertificateFiles.map(
              (
                file,
                index
              ) =>
                moveUploadedFileToPersistentDir(
                  file,

                  `tc-certificate-${
                    index +
                    1
                  }-${normalizedInvoiceNumber}-${salesOrder.companyName}`
                )
            )
          : [];


      /* =====================================================
         BUILD FILE OBJECTS ONCE
      ===================================================== */

      const billFileObject =
        buildFileObject(
          renamedBillFile
        );


      const lrFileObject =
        renamedLrFile
          ? buildFileObject(
              renamedLrFile
            )
          : undefined;


      const tcFileObjects =
        renamedTcCertificateFiles
          .map(
            (file) =>
              buildFileObject(
                file
              )
          );


      /*
       * Legacy first file.
       *
       * Existing code that still reads:
       *
       * dispatch.tcCertificatePdf
       *
       * continues working.
       */
      const legacyTcFileObject =
        tcFileObjects.length >
        0
          ? tcFileObjects[0]
          : undefined;


      /* =====================================================
         CC EMAILS
      ===================================================== */

      const ccEmails =
        buildDispatchCcEmails(
          salesOrder,
          additionalCcEmails,
          user
        );


      /* =====================================================
         CREATE DISPATCH
      ===================================================== */

      const dispatch =
        await Dispatch.create(
          [
            {
              salesOrderId:
                salesOrder._id,

              salesOrderNo:
                salesOrder
                  .salesOrderNo,

              poNumber:
                salesOrder
                  .poNumber,

              companyName:
                salesOrder
                  .companyName,


              /* =============================================
                 SALES PERSON
              ============================================= */

              salesPersonId:
                salesOrder
                  .salesPersonId,

              salesPersonName:
                salesOrder
                  .salesPersonName,

              salesPersonEmail:
                salesOrder
                  .salesPersonEmail,

              salesPersonMobile:
                salesOrder
                  .salesPersonMobile,


              /* =============================================
                 CUSTOMER
              ============================================= */

              contactPersonName:
                salesOrder
                  .contactPersonName,

              contactPersonEmail:
                salesOrder
                  .contactPersonEmail,

              contactPersonNumber:
                salesOrder
                  .contactPersonNumber,

              shippingAddress:
                getShippingAddress(
                  salesOrder
                ),


              /* =============================================
                 CREATED BY
              ============================================= */

              dispatchCreatedBy: {
                userId:
                  getUserId(
                    user
                  ),

                name:
                  user?.name ||
                  "",

                email:
                  user?.email ||
                  "",

                role:
                  user?.role ||
                  "",
              },


              /* =============================================
                 INVOICE
              ============================================= */

              invoiceNumber:
                normalizedInvoiceNumber,

              invoiceDate,

              dispatchDate:
                finalDispatchDate,

              dispatchQty:
                qty,

              invoiceValue:
                value,

              materialDescription:
                salesOrder
                  .sizeGradeQuantityRate ||
                "As per sales order",


              /* =============================================
                 QUANTITY SNAPSHOT
              ============================================= */

              salesOrderTotalQtySnapshot:
                salesOrderTotalQty,

              previousDispatchedQty,

              remainingQtyAfterDispatch,


              dispatchCompletionStatus:
                salesOrderTotalQty >
                  0 &&
                remainingQtyAfterDispatch <=
                  0
                  ? "fully_dispatched"
                  : "partial_dispatched",


              /* =============================================
                 BILL / LR
              ============================================= */

              billPdf:
                billFileObject,

              lrCopyPdf:
                lrFileObject,


              /* =============================================
                 TC / MTC
              ============================================= */

              tcApplicable:
                normalizedTcApplicable,


              /*
               * NEW multiple files
               */
              tcCertificatePdfs:
                normalizedTcApplicable ===
                "applicable"
                  ? tcFileObjects
                  : [],


              /*
               * LEGACY first file.
               */
              tcCertificatePdf:
                normalizedTcApplicable ===
                  "applicable" &&
                legacyTcFileObject
                  ? legacyTcFileObject
                  : undefined,


              /* =============================================
                 PAYMENT
              ============================================= */

              paymentTerms:
                salesOrder
                  .paymentTerms ||
                "",

              paymentDueDays:
                days,

              paymentDueDate,

              paymentStatus,

              paidAmount:
                paid,

              pendingAmount,

              paymentRemark,


              /* =============================================
                 EMAIL
              ============================================= */

              additionalCcEmails:
                cleanEmails(
                  additionalCcEmails
                ),

              notificationEmail: {
                sent:
                  false,

                sentTo:
                  salesOrder
                    .contactPersonEmail,

                cc:
                  ccEmails,
              },


              /* =============================================
                 MOBILE
              ============================================= */

              mobileNotification: {
                sent:
                  false,

                sentTo:
                  salesOrder
                    .contactPersonNumber,
              },


              /* =============================================
                 STATUS
              ============================================= */

              dispatchStatus,

              internalRemark,
            },
          ],
          {
            session,
          }
        );


      /* =====================================================
         COMMIT DATABASE TRANSACTION
      ===================================================== */

      await session
        .commitTransaction();


      const createdDispatch =
        dispatch[0];


      /* =====================================================
         INTERNAL NOTIFICATION
      ===================================================== */

      const dispatchCreatedByAdmin =
        isAdminOrSuperAdmin(
          user
        );


      await safeCreateNotification({
        module:
          "dispatch",

        event:
          "created",

        title:
          "Dispatch Created",

        message:
          `Dispatch created for ${createdDispatch.companyName} | Invoice ${createdDispatch.invoiceNumber}`,

        priority:
          "high",


        targetUserIds:
          dispatchCreatedByAdmin
            ? [
                createdDispatch
                  .salesPersonId,
              ]
            : [],


        targetRoles:
          dispatchCreatedByAdmin
            ? [
                "super_admin",
              ]
            : [
                "admin",
                "super_admin",
              ],


        createdBy:
          getUserId(
            user
          ),

        referenceId:
          createdDispatch._id,

        referenceModel:
          "Dispatch",

        actionUrl:
          "/dashboard#dispatch",


        meta: {
          companyName:
            createdDispatch
              .companyName,

          invoiceNumber:
            createdDispatch
              .invoiceNumber,

          invoiceValue:
            createdDispatch
              .invoiceValue,

          dispatchQty:
            createdDispatch
              .dispatchQty,

          remainingQtyAfterDispatch:
            createdDispatch
              .remainingQtyAfterDispatch,

          dispatchCompletionStatus:
            createdDispatch
              .dispatchCompletionStatus,

          tcApplicable:
            createdDispatch
              .tcApplicable,

          /*
           * Useful for management notification.
           */
          tcCount:
            Array.isArray(
              createdDispatch
                .tcCertificatePdfs
            )
              ? createdDispatch
                  .tcCertificatePdfs
                  .length
              : 0,

          salesPersonName:
            createdDispatch
              .salesPersonName,

          createdByName:
            user?.name ||
            "",

          createdByRole:
            user?.role ||
            "",
        },
      });


      /* =====================================================
         CUSTOMER DISPATCH EMAIL

         IMPORTANT:
         sendDispatchCreatedEmail() must also be updated
         to attach tcCertificatePdfs[].

         Until then its existing legacy code will still
         attach the first TC through tcCertificatePdf.
      ===================================================== */

      try {
        const mailInfo =
          await sendDispatchCreatedEmail(
            createdDispatch
          );


        createdDispatch
          .notificationEmail
          .sent =
          true;


        createdDispatch
          .notificationEmail
          .sentAt =
          new Date();


        createdDispatch
          .notificationEmail
          .messageId =
          mailInfo
            ?.messageId ||
          "";


        createdDispatch
          .notificationEmail
          .errorMessage =
          "";


        await createdDispatch
          .save();

      } catch (
        mailError
      ) {
        createdDispatch
          .notificationEmail
          .sent =
          false;


        createdDispatch
          .notificationEmail
          .errorMessage =
          mailError
            ?.message ||
          "Dispatch email failed.";


        await createdDispatch
          .save();
      }


      return (
        createdDispatch
      );

    } catch (
      error
    ) {
      /* ===================================================
         ABORT DATABASE TRANSACTION
      =================================================== */

      if (
        session
          .inTransaction()
      ) {
        await session
          .abortTransaction();
      }


      /* ===================================================
         REMOVE UPLOADED FILES IF CREATION FAILED
      =================================================== */

      deleteUploadedFiles(
        uploadedFiles
      );


      throw error;

    } finally {
      await session
        .endSession();
    }
  };

const getCurrentISTMonthRange = () => {
  const now = new Date();

  const istNow = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const year = istNow.getFullYear();
  const month = String(istNow.getMonth() + 1).padStart(2, "0");

  const lastDay = new Date(
    year,
    istNow.getMonth() + 1,
    0
  ).getDate();

  return {
    monthStart: new Date(
      `${year}-${month}-01T00:00:00.000+05:30`
    ),

    monthEnd: new Date(
      `${year}-${month}-${String(lastDay).padStart(
        2,
        "0"
      )}T23:59:59.999+05:30`
    ),
  };
};

/* GET ALL DISPATCHES */
const getAllDispatches = async (query, user) => {
  const {
    page = 1,
    limit = 30,
    salesOrderId,
    paymentStatus,
    salesPersonId,
    companyName,
    invoiceNumber,
    fromDate,
    toDate,
    cardFilter,
  } = query;

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Number(limit) || 30,
    100
  );

  const currentUserId = getUserId(user);

  /*
   * =====================================================
   * ACCESS MATCH
   * Used by both table records and insight calculations.
   * =====================================================
   */

  const accessMatch = {
    isActive: true,
  };

  if (!canViewAllDispatches(user)) {
    if (
      !currentUserId ||
      !mongoose.Types.ObjectId.isValid(currentUserId)
    ) {
      throw new Error(
        "Invalid logged-in user."
      );
    }

    accessMatch.salesPersonId =
      new mongoose.Types.ObjectId(
        currentUserId
      );
  }

  /*
   * =====================================================
   * COMMON FILTER MATCH
   * Search and salesperson filters are allowed to affect
   * both table records and insight cards.
   * cardFilter must never affect insight values.
   * =====================================================
   */

  const commonMatch = {
    ...accessMatch,
  };

  if (salesOrderId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        salesOrderId
      )
    ) {
      throw new Error(
        "Invalid sales order ID."
      );
    }

    commonMatch.salesOrderId =
      new mongoose.Types.ObjectId(
        salesOrderId
      );
  }

  if (
    salesPersonId &&
    canViewAllDispatches(user)
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(
        salesPersonId
      )
    ) {
      throw new Error(
        "Invalid sales person ID."
      );
    }

    commonMatch.salesPersonId =
      new mongoose.Types.ObjectId(
        salesPersonId
      );
  }

  if (companyName) {
    commonMatch.companyName = {
      $regex: escapeRegex(
        String(companyName).trim()
      ),
      $options: "i",
    };
  }

  if (invoiceNumber) {
    commonMatch.invoiceNumber = {
      $regex: escapeRegex(
        String(invoiceNumber).trim()
      ),
      $options: "i",
    };
  }

  /*
   * =====================================================
   * TABLE MATCH
   * This match controls only the displayed dispatch list.
   * =====================================================
   */

  const listMatch = {
    ...commonMatch,
  };

  if (
    paymentStatus &&
    paymentStatus !== "all"
  ) {
    listMatch.paymentStatus =
      paymentStatus;
  }

  const {
    monthStart,
    monthEnd,
  } = getCurrentISTMonthRange();

  /*
   * CARD FILTERS
   */

  if (
    cardFilter ===
    "monthly_dispatch"
  ) {
    listMatch.dispatchDate = {
      $gte: monthStart,
      $lte: monthEnd,
    };
  }

  if (
    cardFilter ===
    "monthly_paid"
  ) {
    listMatch.dispatchDate = {
      $gte: monthStart,
      $lte: monthEnd,
    };

    /*
     * Include both fully and partially paid
     * dispatches because both have received
     * payment.
     */
    listMatch.paidAmount = {
      $gt: 0,
    };
  }

  if (
    cardFilter ===
    "total_due"
  ) {
    listMatch.pendingAmount = {
      $gt: 0,
    };

    listMatch.paymentStatus = {
      $in: [
        "pending",
        "partial",
        "overdue",
      ],
    };
  }

  if (
  cardFilter ===
  "overdue_this_month"
) {
  listMatch.pendingAmount = {
    $gt: 0,
  };

  listMatch.dispatchStatus = {
    $ne: "cancelled",
  };

  /*
   * Use revised payment date when available;
   * otherwise use the original payment due date.
   */
  listMatch.$expr = {
    $and: [
      {
        $gte: [
          {
            $ifNull: [
              "$revisedPaymentDueDate",
              "$paymentDueDate",
            ],
          },
          monthStart,
        ],
      },
      {
        $lte: [
          {
            $ifNull: [
              "$revisedPaymentDueDate",
              "$paymentDueDate",
            ],
          },
          monthEnd,
        ],
      },
      {
        $lt: [
          {
            $ifNull: [
              "$revisedPaymentDueDate",
              "$paymentDueDate",
            ],
          },
          new Date(),
        ],
      },
    ],
  };
}
  /*
   * Manual date filters are used only when
   * no insight card is selected.
   */
  if (
    !cardFilter &&
    (fromDate || toDate)
  ) {
    listMatch.dispatchDate = {};

    if (fromDate) {
      const startDate =
        parseLocalDateOnly(fromDate);

      if (!startDate) {
        throw new Error(
          "Invalid from dispatch date."
        );
      }

      startDate.setHours(
        0,
        0,
        0,
        0
      );

      listMatch.dispatchDate.$gte =
        startDate;
    }

    if (toDate) {
      const endDate =
        parseLocalDateOnly(toDate);

      if (!endDate) {
        throw new Error(
          "Invalid to dispatch date."
        );
      }

      endDate.setHours(
        23,
        59,
        59,
        999
      );

      listMatch.dispatchDate.$lte =
        endDate;
    }
  }

  /*
   * =====================================================
   * INSIGHT CALCULATIONS
   *
   * These calculations use commonMatch, not listMatch.
   * Therefore clicking a card does not alter the other
   * card values.
   * =====================================================
   */

/*
 * Keep payment status accurate whenever the
 * Dispatch dashboard is opened.
 *
 * The cron remains responsible for sending email.
 */
const todayForPaymentStatus =
  new Date();

todayForPaymentStatus.setHours(
  0,
  0,
  0,
  0
);

/*
 * Mark invoices overdue using revised date first,
 * otherwise original due date.
 */
await Dispatch.updateMany(
  {
    ...accessMatch,

    paymentStatus: {
      $ne: "paid",
    },

    pendingAmount: {
      $gt: 0,
    },

    dispatchStatus: {
      $ne: "cancelled",
    },

    $expr: {
      $lt: [
        {
          $ifNull: [
            "$revisedPaymentDueDate",
            "$paymentDueDate",
          ],
        },
        todayForPaymentStatus,
      ],
    },
  },
  {
    $set: {
      paymentStatus:
        "overdue",
    },
  }
);

/*
 * If an overdue invoice receives a future revised
 * commitment date, restore it to pending or partial.
 */
await Dispatch.updateMany(
  {
    ...accessMatch,

    paymentStatus:
      "overdue",

    pendingAmount: {
      $gt: 0,
    },

    revisedPaymentDueDate: {
      $exists: true,
      $ne: null,
      $gte:
        todayForPaymentStatus,
    },

    paidAmount: {
      $lte: 0,
    },
  },
  {
    $set: {
      paymentStatus:
        "pending",
    },
  }
);

await Dispatch.updateMany(
  {
    ...accessMatch,

    paymentStatus:
      "overdue",

    pendingAmount: {
      $gt: 0,
    },

    revisedPaymentDueDate: {
      $exists: true,
      $ne: null,
      $gte:
        todayForPaymentStatus,
    },

    paidAmount: {
      $gt: 0,
    },
  },
  {
    $set: {
      paymentStatus:
        "partial",
    },
  }
);

const [
  monthlyDispatchResult,
  monthlyPaidResult,
  totalDueResult,
  overdueThisMonthResult,
  totalRecords,
  dispatches,
] = await Promise.all([
    /*
     * Monthly Dispatch:
     * Total invoice value dispatched during current month.
     */
    Dispatch.aggregate([
      {
        $match: {
          ...commonMatch,
          dispatchDate: {
            $gte: monthStart,
            $lte: monthEnd,
          },
          dispatchStatus: {
            $ne: "cancelled",
          },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $ifNull: [
                "$invoiceValue",
                0,
              ],
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    /*
     * Monthly Paid:
     * Paid amount on dispatches created in current month.
     *
     * This keeps the same business meaning as your
     * existing card implementation while including
     * both partial and fully paid records.
     */
    Dispatch.aggregate([
      {
        $match: {
          ...commonMatch,
          dispatchDate: {
            $gte: monthStart,
            $lte: monthEnd,
          },
          dispatchStatus: {
            $ne: "cancelled",
          },
          paidAmount: {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $ifNull: [
                "$paidAmount",
                0,
              ],
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    /*
     * Total Due:
     * All current pending amounts, regardless of month.
     */
    Dispatch.aggregate([
      {
        $match: {
          ...commonMatch,
          dispatchStatus: {
            $ne: "cancelled",
          },
          pendingAmount: {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $ifNull: [
                "$pendingAmount",
                0,
              ],
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    /*
     * Overdue This Month:
     * Amount whose due date belongs to current month
     * and has already passed.
     */
    Dispatch.aggregate([
      {
        $match: {
          ...commonMatch,
          dispatchStatus: {
            $ne: "cancelled",
          },
          pendingAmount: {
            $gt: 0,
          },
          $expr: {
  $and: [
    {
      $gte: [
        {
          $ifNull: [
            "$revisedPaymentDueDate",
            "$paymentDueDate",
          ],
        },
        monthStart,
      ],
    },
    {
      $lte: [
        {
          $ifNull: [
            "$revisedPaymentDueDate",
            "$paymentDueDate",
          ],
        },
        monthEnd,
      ],
    },
    {
      $lt: [
        {
          $ifNull: [
            "$revisedPaymentDueDate",
            "$paymentDueDate",
          ],
        },
        new Date(),
      ],
    },
  ],
},
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $ifNull: [
                "$pendingAmount",
                0,
              ],
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    Dispatch.countDocuments(
      listMatch
    ),

    Dispatch.find(listMatch)
      .sort({
        dispatchDate: -1,
        createdAt: -1,
      })
      .skip(
        (safePage - 1) *
          safeLimit
      )
      .limit(safeLimit)
      .lean(),
  ]);

  const monthlyDispatch =
    monthlyDispatchResult[0] || {
      amount: 0,
      count: 0,
    };

  const monthlyPaid =
    monthlyPaidResult[0] || {
      amount: 0,
      count: 0,
    };

  const totalDue =
    totalDueResult[0] || {
      amount: 0,
      count: 0,
    };

  const overdueThisMonth =
    overdueThisMonthResult[0] || {
      amount: 0,
      count: 0,
    };

  return {
    dispatches,

    pagination: {
      totalRecords,
      currentPage: safePage,
      totalPages:
        Math.ceil(
          totalRecords / safeLimit
        ) || 1,
      limit: safeLimit,
    },

    /*
     * Values remain unchanged when a card is selected.
     */
    insights: {
      monthlyDispatch: {
        amount: Number(
          monthlyDispatch.amount || 0
        ),
        count: Number(
          monthlyDispatch.count || 0
        ),
      },

      monthlyPaid: {
        amount: Number(
          monthlyPaid.amount || 0
        ),
        count: Number(
          monthlyPaid.count || 0
        ),
      },

      totalDue: {
        amount: Number(
          totalDue.amount || 0
        ),
        count: Number(
          totalDue.count || 0
        ),
      },

      overdueThisMonth: {
        amount: Number(
          overdueThisMonth.amount || 0
        ),
        count: Number(
          overdueThisMonth.count || 0
        ),
      },
    },

    appliedFilter: {
      cardFilter:
        cardFilter || "",
      paymentStatus:
        paymentStatus || "",
      salesPersonId:
        salesPersonId || "",
      fromDate:
        fromDate || "",
      toDate:
        toDate || "",
    },
  };
};
const getDispatchById = async (dispatchId, user) => {
  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  }).lean();

  if (!dispatch) throw new Error("Dispatch not found.");

  if (!canManageDispatch(user, dispatch)) {
    throw new Error("You are not allowed to view this dispatch.");
  }

  return dispatch;
};

const updateDispatchPayment = async (
  dispatchId,
  body,
  file,
  user
) => {
  const uploadedFiles = file
    ? [file]
    : [];

  try {
    const dispatch =
      await Dispatch.findOne({
        _id: dispatchId,
        isActive: true,
      });

    if (!dispatch) {
      throw new Error(
        "Dispatch not found."
      );
    }

    if (
      !canManageDispatch(
        user,
        dispatch
      )
    ) {
      throw new Error(
        "You are not allowed to update this dispatch."
      );
    }

    /*
     * =================================================
     * PAYMENT AMOUNT VALIDATION
     * =================================================
     *
     * Blank or zero means:
     * no payment update.
     *
     * Positive value means:
     * record payment.
     *
     * Negative or invalid value:
     * reject request.
     */
    const rawAmount =
      body.amount;

    const normalizedAmount =
      rawAmount !== undefined &&
      rawAmount !== null
        ? String(rawAmount).trim()
        : "";

    const parsedAmount =
      normalizedAmount !== ""
        ? Number(normalizedAmount)
        : 0;

    if (
      normalizedAmount !== "" &&
      !Number.isFinite(parsedAmount)
    ) {
      throw new Error(
        "Payment amount must be a valid number."
      );
    }

    if (
      normalizedAmount !== "" &&
      parsedAmount < 0
    ) {
      throw new Error(
        "Payment amount cannot be less than 0."
      );
    }

    const hasPaymentAmount =
      parsedAmount > 0;

    const receivedAmount =
      hasPaymentAmount
        ? parsedAmount
        : 0;

    /*
     * Receipt must only be uploaded with
     * an actual payment amount.
     */
    if (
      file &&
      !hasPaymentAmount
    ) {
      throw new Error(
        "Enter a payment amount before uploading a payment receipt."
      );
    }

    /*
     * =================================================
     * REVISED PAYMENT DATE
     * =================================================
     */
    const rawRevisedDate =
      body.revisedPaymentDueDate;

    const normalizedRevisedDate =
      rawRevisedDate !== undefined &&
      rawRevisedDate !== null
        ? String(
            rawRevisedDate
          ).trim()
        : "";

    const submittedRevisedDate =
      normalizedRevisedDate
        ? parseLocalDateOnly(
            normalizedRevisedDate
          )
        : null;

    const existingRevisedDate =
      dispatch.revisedPaymentDueDate
        ? parseLocalDateOnly(
            dispatch.revisedPaymentDueDate
          )
        : null;

    const hasRevisedDate =
      Boolean(
        submittedRevisedDate
      ) &&
      (
        !existingRevisedDate ||
        submittedRevisedDate.getTime() !==
          existingRevisedDate.getTime()
      );

    const revisedPaymentRemark =
      String(
        body.revisedPaymentRemark ||
          ""
      ).trim();

    /*
     * =================================================
     * STATUS CHANGE DETECTION
     * =================================================
     */
    const incomingDispatchStatus =
      body.dispatchStatus !==
      undefined
        ? String(
            body.dispatchStatus ||
              ""
          ).trim()
        : "";

    const incomingInternalRemark =
      body.internalRemark !==
      undefined
        ? String(
            body.internalRemark ||
              ""
          ).trim()
        : "";

    const hasDispatchStatusChange =
      body.dispatchStatus !==
        undefined &&
      incomingDispatchStatus !==
        String(
          dispatch.dispatchStatus ||
            ""
        ).trim();

    const hasInternalRemarkChange =
      body.internalRemark !==
        undefined &&
      incomingInternalRemark !==
        String(
          dispatch.internalRemark ||
            ""
        ).trim();

    const hasStatusUpdate =
      hasDispatchStatusChange ||
      hasInternalRemarkChange;

    if (
      !hasPaymentAmount &&
      !hasRevisedDate &&
      !hasStatusUpdate
    ) {
      throw new Error(
        "No changes detected. Enter payment, revise the payment due date, or update dispatch details."
      );
    }

    /*
     * =================================================
     * PAYMENT DATE REVISION
     * =================================================
     */
    if (hasRevisedDate) {
      if (
        dispatch.paymentStatus ===
          "paid" ||
        Number(
          dispatch.pendingAmount ||
            0
        ) <= 0
      ) {
        throw new Error(
          "Payment due date cannot be revised because this invoice is already paid."
        );
      }

      if (
        !revisedPaymentRemark
      ) {
        throw new Error(
          "Payment revision remark is required when revising the due date."
        );
      }

      const revisedDate =
        submittedRevisedDate;

      const currentEffectiveDate =
        parseLocalDateOnly(
          getEffectivePaymentDueDate(
            dispatch
          )
        );

      const dispatchDateOnly =
        parseLocalDateOnly(
          dispatch.dispatchDate
        );

      if (
        revisedDate <
        dispatchDateOnly
      ) {
        throw new Error(
          "Revised payment due date cannot be earlier than the dispatch date."
        );
      }

      if (
        revisedDate <=
        currentEffectiveDate
      ) {
        throw new Error(
          "Revised payment due date must be later than the current payment due date."
        );
      }

      dispatch.paymentDueDateHistory =
        Array.isArray(
          dispatch.paymentDueDateHistory
        )
          ? dispatch.paymentDueDateHistory
          : [];

      dispatch.paymentDueDateHistory.push(
        {
          previousDate:
            currentEffectiveDate,

          revisedDate,

          remark:
            revisedPaymentRemark,

          revisedAt:
            new Date(),

          revisedBy: {
            userId:
              getUserId(user),

            name:
              user?.name || "",

            email:
              user?.email || "",

            role:
              user?.role || "",
          },
        }
      );

      dispatch.revisedPaymentDueDate =
        revisedDate;

      dispatch.revisedPaymentRemark =
        revisedPaymentRemark;

      dispatch.revisedPaymentAt =
        new Date();

      dispatch.revisedPaymentBy = {
        userId:
          getUserId(user),

        name:
          user?.name || "",

        email:
          user?.email || "",

        role:
          user?.role || "",
      };

      /*
       * Reset reminder milestones for
       * the newly committed date.
       */
      if (
        !dispatch.paymentReminder
      ) {
        dispatch.paymentReminder =
          {};
      }

      dispatch.paymentReminder.beforeDueDateSent =
        false;

      dispatch.paymentReminder.dueDateSent =
        false;

      dispatch.paymentReminder.overdueReminderCount =
        0;

      dispatch.paymentReminder.lastReminderSentAt =
        undefined;

      dispatch.paymentReminder.lastReminderType =
        null;
    }

    /*
     * =================================================
     * PAYMENT RECEIPT
     * =================================================
     */
    let paymentBillPdf;

    if (hasPaymentAmount) {
      if (
        receivedAmount >
        Number(
          dispatch.pendingAmount ||
            0
        )
      ) {
        throw new Error(
          "Payment amount cannot be greater than pending amount."
        );
      }

      if (file) {
        const renamedFile =
          moveUploadedFileToPersistentDir(
            file,
            `payment-${dispatch.invoiceNumber}-${dispatch.companyName}`
          );

        paymentBillPdf =
          buildFileObject(
            renamedFile
          );
      }

      dispatch.paidAmount =
        Number(
          (
            Number(
              dispatch.paidAmount ||
                0
            ) +
            receivedAmount
          ).toFixed(2)
        );

      dispatch.pendingAmount =
        Math.max(
          Number(
            (
              Number(
                dispatch.invoiceValue ||
                  0
              ) -
              Number(
                dispatch.paidAmount ||
                  0
              )
            ).toFixed(2)
          ),
          0
        );

      dispatch.paymentRemark =
        String(
          body.paymentRemark ||
            body.remark ||
            dispatch.paymentRemark ||
            ""
        ).trim();

      dispatch.paymentHistory =
        Array.isArray(
          dispatch.paymentHistory
        )
          ? dispatch.paymentHistory
          : [];

      dispatch.paymentHistory.push(
        {
          amount:
            receivedAmount,

          receivedAt:
            body.receivedAt ||
            new Date(),

          remark:
            String(
              body.paymentRemark ||
                body.remark ||
                ""
            ).trim(),

          paymentBillPdf,

          updatedBy: {
            userId:
              getUserId(user),

            name:
              user?.name || "",

            email:
              user?.email || "",
          },

          mailStatus: {
            sent: false,
          },
        }
      );
    }

    /*
     * =================================================
     * DISPATCH STATUS
     * =================================================
     */
    if (
      hasDispatchStatusChange
    ) {
      const allowedStatuses = [
        "dispatched",
        "delivered",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          incomingDispatchStatus
        )
      ) {
        throw new Error(
          "Invalid dispatch status."
        );
      }

      if (
        dispatch.dispatchStatus ===
          "delivered" &&
        incomingDispatchStatus !==
          "delivered"
      ) {
        throw new Error(
          "Delivered dispatch status cannot be changed."
        );
      }

      dispatch.dispatchStatus =
        incomingDispatchStatus;

      if (
        incomingDispatchStatus ===
        "delivered"
      ) {
        dispatch.deliveredAt =
          dispatch.deliveredAt ||
          new Date();
      }
    }

    if (
      hasInternalRemarkChange
    ) {
      dispatch.internalRemark =
        incomingInternalRemark;
    }

    /*
     * Recalculate payment status using
     * revised date when available.
     */
    const effectiveDueDate =
      getEffectivePaymentDueDate(
        dispatch
      );

    dispatch.paymentStatus =
      calculatePaymentStatus(
        dispatch.pendingAmount,
        effectiveDueDate,
        dispatch.paidAmount
      );

    await dispatch.save();

    /*
     * Revised-date internal notification.
     */
    if (hasRevisedDate) {
      await safeCreateNotification({
        module:
          "dispatch",

        event:
          "payment_due_date_revised",

        title:
          "Payment Due Date Revised",

        message: `${
          dispatch.companyName
        } payment commitment revised to ${new Date(
          dispatch.revisedPaymentDueDate
        ).toLocaleDateString(
          "en-IN"
        )} | Invoice ${
          dispatch.invoiceNumber
        }`,

        priority:
          "high",

        targetUserIds:
          String(
            dispatch.salesPersonId
          ) ===
          String(
            getUserId(user)
          )
            ? []
            : [
                dispatch.salesPersonId,
              ],

        targetRoles:
          isAdminOrSuperAdmin(user)
            ? []
            : [
                "admin",
                "super_admin",
              ],

        createdBy:
          getUserId(user),

        referenceId:
          dispatch._id,

        referenceModel:
          "Dispatch",

        actionUrl:
          "/dashboard#dispatch",

        meta: {
          companyName:
            dispatch.companyName,

          invoiceNumber:
            dispatch.invoiceNumber,

          originalPaymentDueDate:
            dispatch.paymentDueDate,

          revisedPaymentDueDate:
            dispatch.revisedPaymentDueDate,

          revisedPaymentRemark:
            dispatch.revisedPaymentRemark,

          revisedByName:
            user?.name || "",
        },
      });
    }

    /*
     * Payment email and notification run
     * only for a positive payment amount.
     */
    if (hasPaymentAmount) {
      await safeCreateNotification({
        module:
          "dispatch",

        event:
          "payment_updated",

        title:
          dispatch.paymentStatus ===
          "paid"
            ? "Payment Completed"
            : "Payment Updated",

        message: `₹${Number(
          receivedAmount
        ).toLocaleString(
          "en-IN"
        )} received for ${
          dispatch.companyName
        } | Invoice ${
          dispatch.invoiceNumber
        }`,

        priority:
          dispatch.paymentStatus ===
          "paid"
            ? "high"
            : "normal",

        targetUserIds:
          String(
            dispatch.salesPersonId
          ) ===
          String(
            getUserId(user)
          )
            ? []
            : [
                dispatch.salesPersonId,
              ],

        targetRoles:
          isAdminOrSuperAdmin(user)
            ? []
            : [
                "admin",
                "super_admin",
              ],

        createdBy:
          getUserId(user),

        referenceId:
          dispatch._id,

        referenceModel:
          "Dispatch",

        actionUrl:
          "/dashboard#dispatch",

        meta: {
          companyName:
            dispatch.companyName,

          invoiceNumber:
            dispatch.invoiceNumber,

          receivedAmount,

          paidAmount:
            dispatch.paidAmount,

          pendingAmount:
            dispatch.pendingAmount,

          paymentStatus:
            dispatch.paymentStatus,

          updatedByName:
            user?.name || "",
        },
      });

      const lastPaymentIndex =
        dispatch.paymentHistory.length -
        1;

      try {
        const mailInfo =
          await sendPaymentUpdateEmail(
            dispatch,
            {
              amount:
                receivedAmount,

              remark:
                body.paymentRemark ||
                body.remark ||
                "",

              paymentBillPdf,
            }
          );

        dispatch.paymentHistory[
          lastPaymentIndex
        ].mailStatus = {
          sent: true,

          sentAt:
            new Date(),

          messageId:
            mailInfo.messageId ||
            "",
        };

        await dispatch.save();
      } catch (mailError) {
        dispatch.paymentHistory[
          lastPaymentIndex
        ].mailStatus = {
          sent: false,

          errorMessage:
            mailError.message,
        };

        await dispatch.save();
      }
    }

    return dispatch;
  } catch (error) {
    deleteUploadedFiles(
      uploadedFiles
    );

    throw error;
  }
};

const updateDispatchStatus = async (dispatchId, body, user) => {
  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  });

  if (!dispatch) throw new Error("Dispatch not found.");

  if (!canManageDispatch(user, dispatch)) {
    throw new Error("You are not allowed to update status for this dispatch.");
  }

  const allowedStatuses = ["dispatched", "delivered", "cancelled"];

  if (!allowedStatuses.includes(body.dispatchStatus)) {
    throw new Error("Invalid dispatch status.");
  }

  dispatch.dispatchStatus = body.dispatchStatus;

  if (body.dispatchStatus === "delivered") {
    dispatch.deliveredAt = body.deliveredAt || new Date();
  } else {
    dispatch.deliveredAt = undefined;
  }

  if (body.internalRemark !== undefined) {
    dispatch.internalRemark = body.internalRemark;
  }

  await dispatch.save();

  await safeCreateNotification({
    module: "dispatch",
    event: "status_updated",
    title: "Dispatch Status Updated",
    message: `${dispatch.companyName} dispatch marked as ${dispatch.dispatchStatus}`,
    priority: dispatch.dispatchStatus === "cancelled" ? "high" : "normal",
    targetUserIds:
      String(dispatch.salesPersonId) === String(getUserId(user))
        ? []
        : [dispatch.salesPersonId],
    targetRoles: isAdminOrSuperAdmin(user) ? [] : ["admin", "super_admin"],
    createdBy: getUserId(user),
    referenceId: dispatch._id,
    referenceModel: "Dispatch",
    actionUrl: "/dashboard#dispatch",
    meta: {
      companyName: dispatch.companyName,
      invoiceNumber: dispatch.invoiceNumber,
      dispatchStatus: dispatch.dispatchStatus,
      updatedByName: user.name,
    },
  });

  return dispatch;
};

const deleteDispatch = async (dispatchId, user) => {
  if (!canDeleteDispatch(user)) {
    throw new Error("Only super admin can delete dispatch.");
  }

  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  });

  if (!dispatch) throw new Error("Dispatch not found.");

  dispatch.isActive = false;
  await dispatch.save();

  return dispatch;
};

module.exports = {
  searchPendingDispatchSalesOrders,
  createDispatch,
  getAllDispatches,
  getDispatchById,
  updateDispatchPayment,
  updateDispatchStatus,
  deleteDispatch,
};