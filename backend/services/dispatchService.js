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
  const { search = "", limit = 6 } = query;

  const keyword = String(search || "").trim().replace(/\s+/g, " ");
  const safeLimit = Math.min(Number(limit) || 6, 20);

  const filter = {
    approvalStatus: "approved",
    isActive: { $ne: false },
  };

  if (!canViewAllDispatches(user)) {
    filter.salesPersonId = getUserId(user);
  }

  if (keyword) {
    filter.$or = [
      { companyName: { $regex: escapeRegex(keyword), $options: "i" } },
      { poNumber: { $regex: escapeRegex(keyword), $options: "i" } },
      { salesOrderNo: { $regex: escapeRegex(keyword), $options: "i" } },
      { contactPersonName: { $regex: escapeRegex(keyword), $options: "i" } },
    ];
  }

  const salesOrders = await SalesOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select(`
      orderDate salesOrderNo companyName companyAddress poNumber checklistNumber
      contactPersonName contactPersonNumber contactPersonEmail salesPersonId
      salesPersonName salesPersonEmail salesPersonMobile paymentTerms orderValue
      sizeGradeQuantityRate supplyCondition deliveryTime billingAddress
      shippingAddress approvalStatus createdAt updatedAt
    `)
    .lean();

  const salesOrderIds = salesOrders.map((item) => item._id);

  const dispatchSummary = await Dispatch.aggregate([
    {
      $match: {
        salesOrderId: { $in: salesOrderIds },
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
  ]);

  const summaryMap = new Map(
    dispatchSummary.map((item) => [
      String(item._id),
      {
        totalDispatchedQty: Number(item.totalDispatchedQty || 0),
        dispatchCount: Number(item.dispatchCount || 0),
      },
    ])
  );

  return salesOrders
    .map((salesOrder) => {
      const totalOrderQty = getSalesOrderTotalQty(salesOrder);
      const summary = summaryMap.get(String(salesOrder._id)) || {
        totalDispatchedQty: 0,
        dispatchCount: 0,
      };

      const remainingDispatchQty =
        totalOrderQty > 0
          ? Math.max(
              Number((totalOrderQty - summary.totalDispatchedQty).toFixed(3)),
              0
            )
          : 0;

      return {
        ...salesOrder,
        totalOrderQty,
        totalDispatchedQty: summary.totalDispatchedQty,
        remainingDispatchQty,
        dispatchCount: summary.dispatchCount,
        alreadyDispatched: summary.dispatchCount > 0,
        dispatchAvailabilityStatus:
          totalOrderQty > 0 && remainingDispatchQty <= 0
            ? "fully_dispatched"
            : summary.dispatchCount > 0
            ? "partial_dispatched"
            : "pending_dispatch",
      };
    })
    .filter((salesOrder) => {
      if (salesOrder.totalOrderQty <= 0) return true;
      return salesOrder.remainingDispatchQty > 0;
    });
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

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Number(limit) || 30, 100);

  const match = { isActive: true };

  if (salesOrderId) {
    match.salesOrderId = new mongoose.Types.ObjectId(salesOrderId);
  }

  if (paymentStatus) {
    match.paymentStatus = paymentStatus;
  }

  if (salesPersonId && canViewAllDispatches(user)) {
    match.salesPersonId = new mongoose.Types.ObjectId(salesPersonId);
  }

  if (companyName) {
    match.companyName = { $regex: escapeRegex(companyName), $options: "i" };
  }

  if (invoiceNumber) {
    match.invoiceNumber = { $regex: escapeRegex(invoiceNumber), $options: "i" };
  }

  const today = new Date();
  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const monthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  if (cardFilter === "monthly_dispatch") {
    match.dispatchDate = {
      $gte: monthStart,
      $lte: monthEnd,
    };
  }

  if (cardFilter === "monthly_paid") {
    match.dispatchDate = {
      $gte: monthStart,
      $lte: monthEnd,
    };
    match.paymentStatus = "paid";
  }

  if (cardFilter === "total_due") {
    match.pendingAmount = { $gt: 0 };
    match.paymentStatus = { $in: ["pending", "partial", "overdue"] };
  }

  if (cardFilter === "overdue_this_month") {
    match.pendingAmount = { $gt: 0 };
    match.paymentStatus = "overdue";
    match.paymentDueDate = {
      $gte: monthStart,
      $lte: monthEnd,
    };
  }

  if (!cardFilter && (fromDate || toDate)) {
    match.dispatchDate = {};

    if (fromDate) {
      const startDate = parseLocalDateOnly(fromDate);
      startDate.setHours(0, 0, 0, 0);
      match.dispatchDate.$gte = startDate;
    }

    if (toDate) {
      const endDate = parseLocalDateOnly(toDate);
      endDate.setHours(23, 59, 59, 999);
      match.dispatchDate.$lte = endDate;
    }
  }

  if (!canViewAllDispatches(user)) {
    match.salesPersonId = new mongoose.Types.ObjectId(getUserId(user));
  }

  const [totalRecords, dispatches] = await Promise.all([
    Dispatch.countDocuments(match),
    Dispatch.find(match)
      .sort({ dispatchDate: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    dispatches,
    pagination: {
      totalRecords,
      currentPage: safePage,
      totalPages: Math.ceil(totalRecords / safeLimit) || 1,
      limit: safeLimit,
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