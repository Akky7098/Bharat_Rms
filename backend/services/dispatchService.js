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

const calculatePaymentStatus = (pendingAmount, paymentDueDate, paidAmount) => {
  const pending = Number(pendingAmount || 0);
  const paid = Number(paidAmount || 0);

  if (pending <= 0) return "paid";
  if (paid > 0) return "partial";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(paymentDueDate);
  due.setHours(0, 0, 0, 0);

  return due < today ? "overdue" : "pending";
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
const createDispatch = async (body, files, user) => {
  const session = await mongoose.startSession();

  const uploadedFiles = [
    ...(files?.billPdf || []),
    ...(files?.lrCopyPdf || []),
    ...(files?.tcCertificatePdf || []),
  ];

  try {
    session.startTransaction();

    const {
      salesOrderId,
      invoiceNumber,
      invoiceDate,
      dispatchDate,
      dispatchQty,
      invoiceValue,
      paymentDueDays,
      paidAmount = 0,
      additionalCcEmails = [],
      dispatchStatus = "dispatched",
      internalRemark = "",
      paymentRemark = "",
      tcApplicable = "not_applicable",
    } = body;

    const normalizedTcApplicable =
      String(tcApplicable).trim() === "applicable"
        ? "applicable"
        : "not_applicable";

    if (!salesOrderId) {
      throw new Error("Sales order is required.");
    }

    if (!invoiceNumber || !String(invoiceNumber).trim()) {
      throw new Error("Invoice number is required.");
    }

    if (!invoiceDate) {
      throw new Error("Invoice date is required.");
    }

    if (!files?.billPdf?.[0]) {
      throw new Error("Bill PDF is required.");
    }

    if (
      normalizedTcApplicable === "applicable" &&
      !files?.tcCertificatePdf?.[0]
    ) {
      throw new Error(
        "MTC / TC PDF is required when TC is applicable."
      );
    }

    const salesOrder = await SalesOrder.findById(
      salesOrderId
    ).session(session);

    if (!salesOrder) {
      throw new Error("Sales order not found.");
    }

    if (salesOrder.approvalStatus !== "approved") {
      throw new Error(
        "Dispatch can be created only for approved sales orders."
      );
    }

    if (
      !isAdminOrSuperAdmin(user) &&
      String(salesOrder.salesPersonId) !==
        String(getUserId(user))
    ) {
      throw new Error(
        "You are not allowed to create dispatch for this sales order."
      );
    }

    const existingInvoice = await Dispatch.findOne({
      invoiceNumber: String(invoiceNumber).trim(),
      isActive: true,
    }).session(session);

    if (existingInvoice) {
      throw new Error(
        "Dispatch with this invoice number already exists."
      );
    }

    const qty = Number(dispatchQty);
    const value = Number(invoiceValue);
    const days = Number(paymentDueDays);
    const paid = Number(paidAmount || 0);

    if (!qty || qty <= 0) {
      throw new Error(
        "Dispatch quantity must be greater than 0."
      );
    }

    if (!value || value <= 0) {
      throw new Error(
        "Invoice value must be greater than 0."
      );
    }

    if (
      paymentDueDays === "" ||
      paymentDueDays === undefined ||
      days < 0
    ) {
      throw new Error("Payment due days is required.");
    }

    if (paid < 0) {
      throw new Error(
        "Paid amount cannot be negative."
      );
    }

    if (paid > value) {
      throw new Error(
        "Paid amount cannot be greater than invoice value."
      );
    }

    const salesOrderTotalQty =
      getSalesOrderTotalQty(salesOrder);

    const dispatchSummary =
      await getSalesOrderDispatchSummary(
        salesOrder._id,
        session
      );

    const previousDispatchedQty =
      dispatchSummary.totalDispatchedQty;

    const remainingBeforeDispatch =
      salesOrderTotalQty > 0
        ? Number(
            (
              salesOrderTotalQty -
              previousDispatchedQty
            ).toFixed(3)
          )
        : 0;

    if (
      salesOrderTotalQty > 0 &&
      remainingBeforeDispatch <= 0
    ) {
      throw new Error(
        "This sales order is already fully dispatched."
      );
    }

    if (
      salesOrderTotalQty > 0 &&
      qty > remainingBeforeDispatch
    ) {
      throw new Error(
        `Dispatch quantity cannot be greater than remaining quantity ${remainingBeforeDispatch} Kg.`
      );
    }

    const remainingQtyAfterDispatch =
      salesOrderTotalQty > 0
        ? Math.max(
            Number(
              (
                remainingBeforeDispatch -
                qty
              ).toFixed(3)
            ),
            0
          )
        : 0;

    const finalDispatchDate =
      parseLocalDateOnly(dispatchDate);

    if (!finalDispatchDate) {
      throw new Error("Invalid dispatch date.");
    }

    const paymentDueDate =
      calculatePaymentDueDate(
        finalDispatchDate,
        days
      );

    const pendingAmount = Number(
      (value - paid).toFixed(2)
    );

    const paymentStatus =
      calculatePaymentStatus(
        pendingAmount,
        paymentDueDate,
        paid
      );

    const renamedBillFile =
      moveUploadedFileToPersistentDir(
        files.billPdf[0],
        `bill-${invoiceNumber}-${salesOrder.companyName}`
      );

    const renamedLrFile =
      files?.lrCopyPdf?.[0]
        ? moveUploadedFileToPersistentDir(
            files.lrCopyPdf[0],
            `lr-${invoiceNumber}-${salesOrder.companyName}`
          )
        : null;

    const renamedTcCertificateFile =
      normalizedTcApplicable === "applicable" &&
      files?.tcCertificatePdf?.[0]
        ? moveUploadedFileToPersistentDir(
            files.tcCertificatePdf[0],
            `tc-certificate-${invoiceNumber}-${salesOrder.companyName}`
          )
        : null;

    const ccEmails = buildDispatchCcEmails(
      salesOrder,
      additionalCcEmails,
      user
    );

    const dispatch = await Dispatch.create(
      [
        {
          salesOrderId: salesOrder._id,
          salesOrderNo: salesOrder.salesOrderNo,
          poNumber: salesOrder.poNumber,
          companyName: salesOrder.companyName,

          salesPersonId: salesOrder.salesPersonId,
          salesPersonName:
            salesOrder.salesPersonName,
          salesPersonEmail:
            salesOrder.salesPersonEmail,
          salesPersonMobile:
            salesOrder.salesPersonMobile,

          contactPersonName:
            salesOrder.contactPersonName,
          contactPersonEmail:
            salesOrder.contactPersonEmail,
          contactPersonNumber:
            salesOrder.contactPersonNumber,
          shippingAddress:
            getShippingAddress(salesOrder),

          dispatchCreatedBy: {
            userId: getUserId(user),
            name: user.name,
            email: user.email,
            role: user.role,
          },

          invoiceNumber:
            String(invoiceNumber).trim(),
          invoiceDate,
          dispatchDate: finalDispatchDate,
          dispatchQty: qty,
          invoiceValue: value,
          materialDescription:
            salesOrder.sizeGradeQuantityRate ||
            "As per sales order",

          salesOrderTotalQtySnapshot:
            salesOrderTotalQty,
          previousDispatchedQty,
          remainingQtyAfterDispatch,

          dispatchCompletionStatus:
            salesOrderTotalQty > 0 &&
            remainingQtyAfterDispatch <= 0
              ? "fully_dispatched"
              : "partial_dispatched",

          billPdf:
            buildFileObject(renamedBillFile),

          lrCopyPdf: renamedLrFile
            ? buildFileObject(renamedLrFile)
            : undefined,

          tcApplicable:
            normalizedTcApplicable,

          tcCertificatePdf:
            normalizedTcApplicable ===
              "applicable" &&
            renamedTcCertificateFile
              ? buildFileObject(
                  renamedTcCertificateFile
                )
              : undefined,

          paymentTerms:
            salesOrder.paymentTerms || "",
          paymentDueDays: days,
          paymentDueDate,
          paymentStatus,
          paidAmount: paid,
          pendingAmount,
          paymentRemark,

          additionalCcEmails:
            cleanEmails(additionalCcEmails),

          notificationEmail: {
            sent: false,
            sentTo:
              salesOrder.contactPersonEmail,
            cc: ccEmails,
          },

          mobileNotification: {
            sent: false,
            sentTo:
              salesOrder.contactPersonNumber,
          },

          dispatchStatus,
          internalRemark,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const createdDispatch = dispatch[0];

    const dispatchCreatedByAdmin =
      isAdminOrSuperAdmin(user);

    await safeCreateNotification({
      module: "dispatch",
      event: "created",
      title: "Dispatch Created",
      message: `Dispatch created for ${createdDispatch.companyName} | Invoice ${createdDispatch.invoiceNumber}`,
      priority: "high",

      targetUserIds:
        dispatchCreatedByAdmin
          ? [createdDispatch.salesPersonId]
          : [],

      targetRoles:
        dispatchCreatedByAdmin
          ? ["super_admin"]
          : ["admin", "super_admin"],

      createdBy: getUserId(user),
      referenceId: createdDispatch._id,
      referenceModel: "Dispatch",
      actionUrl: "/dashboard#dispatch",

      meta: {
        companyName:
          createdDispatch.companyName,
        invoiceNumber:
          createdDispatch.invoiceNumber,
        invoiceValue:
          createdDispatch.invoiceValue,
        dispatchQty:
          createdDispatch.dispatchQty,
        remainingQtyAfterDispatch:
          createdDispatch.remainingQtyAfterDispatch,
        dispatchCompletionStatus:
          createdDispatch.dispatchCompletionStatus,
        tcApplicable:
          createdDispatch.tcApplicable,
        salesPersonName:
          createdDispatch.salesPersonName,
        createdByName: user.name,
        createdByRole: user.role,
      },
    });

    try {
      const mailInfo =
        await sendDispatchCreatedEmail(
          createdDispatch
        );

      createdDispatch.notificationEmail.sent =
        true;

      createdDispatch.notificationEmail.sentAt =
        new Date();

      createdDispatch.notificationEmail.messageId =
        mailInfo.messageId || "";

      await createdDispatch.save();
    } catch (mailError) {
      createdDispatch.notificationEmail.sent =
        false;

      createdDispatch.notificationEmail.errorMessage =
        mailError.message;

      await createdDispatch.save();
    }

    return createdDispatch;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    deleteUploadedFiles(uploadedFiles);
    throw error;
  } finally {
    await session.endSession();
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

    /*
     * Do not depend only on saved paymentStatus.
     * A dispatch can become overdue after it was
     * originally stored as pending.
     */
    listMatch.paymentDueDate = {
      $gte: monthStart,
      $lte: monthEnd,
      $lt: new Date(),
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
          paymentDueDate: {
            $gte: monthStart,
            $lte: monthEnd,
            $lt: new Date(),
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

const updateDispatchPayment = async (dispatchId, body, file, user) => {
  const uploadedFiles = file ? [file] : [];

  try {
    const dispatch = await Dispatch.findOne({
      _id: dispatchId,
      isActive: true,
    });

    if (!dispatch) throw new Error("Dispatch not found.");

    if (!canManageDispatch(user, dispatch)) {
      throw new Error("You are not allowed to update payment for this dispatch.");
    }

    const receivedAmount = Number(body.amount || 0);

    if (!receivedAmount || receivedAmount <= 0) {
      throw new Error("Payment amount must be greater than 0.");
    }

    if (receivedAmount > Number(dispatch.pendingAmount || 0)) {
      throw new Error("Payment amount cannot be greater than pending amount.");
    }

    let paymentBillPdf;

    if (file) {
      const renamedFile = moveUploadedFileToPersistentDir(
        file,
        `payment-${dispatch.invoiceNumber}-${dispatch.companyName}`
      );

      paymentBillPdf = buildFileObject(renamedFile);
    }

    dispatch.paidAmount = Number(
      (Number(dispatch.paidAmount || 0) + receivedAmount).toFixed(2)
    );

    dispatch.pendingAmount = Number(
      (Number(dispatch.invoiceValue || 0) - Number(dispatch.paidAmount || 0)).toFixed(2)
    );

    dispatch.paymentStatus = calculatePaymentStatus(
      dispatch.pendingAmount,
      dispatch.paymentDueDate,
      dispatch.paidAmount
    );

    dispatch.paymentRemark = body.remark || dispatch.paymentRemark;

    dispatch.paymentHistory.push({
      amount: receivedAmount,
      receivedAt: body.receivedAt || new Date(),
      remark: body.remark || "",
      paymentBillPdf,
      updatedBy: {
        userId: getUserId(user),
        name: user.name,
        email: user.email,
      },
      mailStatus: { sent: false },
    });

    await dispatch.save();

    await safeCreateNotification({
      module: "dispatch",
      event: "payment_updated",
      title: dispatch.paymentStatus === "paid" ? "Payment Completed" : "Payment Updated",
      message: `₹${Number(receivedAmount).toLocaleString("en-IN")} received for ${
        dispatch.companyName
      } | Invoice ${dispatch.invoiceNumber}`,
      priority: dispatch.paymentStatus === "paid" ? "high" : "normal",
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
        receivedAmount,
        paidAmount: dispatch.paidAmount,
        pendingAmount: dispatch.pendingAmount,
        paymentStatus: dispatch.paymentStatus,
        updatedByName: user.name,
      },
    });

    const lastPaymentIndex = dispatch.paymentHistory.length - 1;

    try {
      const mailInfo = await sendPaymentUpdateEmail(dispatch, {
        amount: receivedAmount,
        remark: body.remark || "",
        paymentBillPdf,
      });

      dispatch.paymentHistory[lastPaymentIndex].mailStatus = {
        sent: true,
        sentAt: new Date(),
        messageId: mailInfo.messageId || "",
      };

      await dispatch.save();
    } catch (mailError) {
      dispatch.paymentHistory[lastPaymentIndex].mailStatus = {
        sent: false,
        errorMessage: mailError.message,
      };

      await dispatch.save();
    }

    return dispatch;
  } catch (error) {
    deleteUploadedFiles(uploadedFiles);
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