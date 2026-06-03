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

const canDeleteDispatch = (user) => {
  return user?.role === "super_admin";
};

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

const getFileUrl = (file) => {
  return `/uploads/dispatch/${file.filename}`;
};

const sanitizeFileName = (name) => {
  return String(name || "dispatch-file")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

const renameUploadedFile = (file, title) => {
  const ext = path.extname(file.originalname || ".pdf");
  const safeTitle = sanitizeFileName(title);
  const newFileName = `${safeTitle}-${Date.now()}${ext}`;
  const newPath = path.join(path.dirname(file.path), newFileName);

  fs.renameSync(file.path, newPath);

  file.filename = newFileName;
  file.path = newPath;

  return file;
};

const buildFileObject = (file) => {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileUrl: getFileUrl(file),
    mimeType: file.mimetype,
    fileSize: file.size,
    uploadedAt: new Date(),
  };
};

const deleteUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

const calculatePaymentDueDate = (dispatchDate, paymentDueDays) => {
  const dueDate = new Date(dispatchDate);
  dueDate.setDate(dueDate.getDate() + Number(paymentDueDays || 0));
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

  if (due < today) return "overdue";

  return "pending";
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

/* =========================
   SEARCH APPROVED SALES ORDERS FOR DISPATCH
========================= */

const searchPendingDispatchSalesOrders = async (query, user) => {
  const { search = "", limit = 6 } = query;

  const keyword = String(search || "").trim().replace(/\s+/g, " ");
  const safeLimit = Math.min(Number(limit) || 6, 20);

  const filter = {
    approvalStatus: "approved",
  };

  if (!canViewAllDispatches(user)) {
    filter.salesPersonId = getUserId(user);
  }

  if (keyword) {
    filter.companyName = {
      $regex: "^" + escapeRegex(keyword),
      $options: "i",
    };
  }

  const salesOrders = await SalesOrder.find(filter)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select(
      `
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
      createdAt
      updatedAt
      `
    )
    .lean();

  const salesOrderIds = salesOrders.map((item) => item._id);

  const dispatchedSalesOrders = await Dispatch.find({
    salesOrderId: { $in: salesOrderIds },
    isActive: true,
  })
    .select("salesOrderId")
    .lean();

  const dispatchedIdSet = new Set(
    dispatchedSalesOrders.map((item) => String(item.salesOrderId))
  );

  const availableSalesOrders = salesOrders.filter((salesOrder) => {
    return !dispatchedIdSet.has(String(salesOrder._id));
  });

  return availableSalesOrders.map((salesOrder) => ({
    ...salesOrder,
    dispatchCount: 0,
    alreadyDispatched: false,
  }));
};

/* =========================
   CREATE DISPATCH
========================= */

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
    } = body;

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

    const salesOrder = await SalesOrder.findById(salesOrderId).session(session);

    if (!salesOrder) {
      throw new Error("Sales order not found.");
    }

    if (salesOrder.approvalStatus !== "approved") {
      throw new Error("Dispatch can be created only for approved sales orders.");
    }

    if (
      !isAdminOrSuperAdmin(user) &&
      String(salesOrder.salesPersonId) !== String(getUserId(user))
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
      throw new Error("Dispatch with this invoice number already exists.");
    }

    const qty = Number(dispatchQty);
    const value = Number(invoiceValue);
    const days = Number(paymentDueDays);
    const paid = Number(paidAmount || 0);

    if (!qty || qty <= 0) {
      throw new Error("Dispatch quantity must be greater than 0.");
    }

    if (!value || value <= 0) {
      throw new Error("Invoice value must be greater than 0.");
    }

    if (paymentDueDays === "" || paymentDueDays === undefined || days < 0) {
      throw new Error("Payment due days is required.");
    }

    if (paid < 0) {
      throw new Error("Paid amount cannot be negative.");
    }

    if (paid > value) {
      throw new Error("Paid amount cannot be greater than invoice value.");
    }

    const finalDispatchDate = dispatchDate ? new Date(dispatchDate) : new Date();
    const paymentDueDate = calculatePaymentDueDate(finalDispatchDate, days);
    const pendingAmount = Number((value - paid).toFixed(2));

    const paymentStatus = calculatePaymentStatus(
      pendingAmount,
      paymentDueDate,
      paid
    );

    const renamedBillFile = renameUploadedFile(
      files.billPdf[0],
      `bill-${invoiceNumber}-${salesOrder.companyName}`
    );

    const renamedLrFile = files?.lrCopyPdf?.[0]
      ? renameUploadedFile(
          files.lrCopyPdf[0],
          `lr-${invoiceNumber}-${salesOrder.companyName}`
        )
      : null;

    const renamedTcCertificateFile = files?.tcCertificatePdf?.[0]
      ? renameUploadedFile(
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
          salesPersonName: salesOrder.salesPersonName,
          salesPersonEmail: salesOrder.salesPersonEmail,
          salesPersonMobile: salesOrder.salesPersonMobile,

          contactPersonName: salesOrder.contactPersonName,
          contactPersonEmail: salesOrder.contactPersonEmail,
          contactPersonNumber: salesOrder.contactPersonNumber,
          shippingAddress: getShippingAddress(salesOrder),

          dispatchCreatedBy: {
            userId: getUserId(user),
            name: user.name,
            email: user.email,
            role: user.role,
          },

          invoiceNumber: String(invoiceNumber).trim(),
          invoiceDate,
          dispatchDate: finalDispatchDate,

          dispatchQty: qty,
          invoiceValue: value,
          materialDescription:
            salesOrder.sizeGradeQuantityRate || "As per sales order",

          billPdf: buildFileObject(renamedBillFile),

          lrCopyPdf: renamedLrFile
            ? buildFileObject(renamedLrFile)
            : undefined,

          tcCertificatePdf: renamedTcCertificateFile
            ? buildFileObject(renamedTcCertificateFile)
            : undefined,

          paymentTerms: salesOrder.paymentTerms || "",
          paymentDueDays: days,
          paymentDueDate,
          paymentStatus,
          paidAmount: paid,
          pendingAmount,
          paymentRemark,

          additionalCcEmails: cleanEmails(additionalCcEmails),

          notificationEmail: {
            sent: false,
            sentTo: salesOrder.contactPersonEmail,
            cc: ccEmails,
          },

          mobileNotification: {
            sent: false,
            sentTo: salesOrder.contactPersonNumber,
          },

          dispatchStatus,
          internalRemark,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const createdDispatch = dispatch[0];

    const dispatchCreatedByAdmin = isAdminOrSuperAdmin(user);

    await safeCreateNotification({
      module: "dispatch",
      event: "created",
      title: "Dispatch Created",
      message: `Dispatch created for ${createdDispatch.companyName} | Invoice ${createdDispatch.invoiceNumber}`,
      priority: "high",
      targetUserIds: dispatchCreatedByAdmin
        ? [createdDispatch.salesPersonId]
        : [],
      targetRoles: dispatchCreatedByAdmin
        ? ["super_admin"]
        : ["admin", "super_admin"],
      createdBy: getUserId(user),
      referenceId: createdDispatch._id,
      referenceModel: "Dispatch",
      actionUrl: "/dashboard#dispatch",
      meta: {
        companyName: createdDispatch.companyName,
        invoiceNumber: createdDispatch.invoiceNumber,
        invoiceValue: createdDispatch.invoiceValue,
        salesPersonName: createdDispatch.salesPersonName,
        createdByName: user.name,
        createdByRole: user.role,
      },
    });

    try {
      const mailInfo = await sendDispatchCreatedEmail(createdDispatch);

      createdDispatch.notificationEmail.sent = true;
      createdDispatch.notificationEmail.sentAt = new Date();
      createdDispatch.notificationEmail.messageId = mailInfo.messageId || "";

      await createdDispatch.save();
    } catch (mailError) {
      createdDispatch.notificationEmail.sent = false;
      createdDispatch.notificationEmail.errorMessage = mailError.message;

      await createdDispatch.save();
    }

    return createdDispatch;
  } catch (error) {
    await session.abortTransaction();
    deleteUploadedFiles(uploadedFiles);
    throw error;
  } finally {
    session.endSession();
  }
};

/* =========================
   GET ALL DISPATCHES
========================= */

const getAllDispatches = async (query, user) => {
  const {
    page = 1,
    limit = 20,
    salesOrderId,
    paymentStatus,
    dispatchStatus,
    companyName,
    invoiceNumber,
    fromDate,
    toDate,
  } = query;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Number(limit) || 10, 100);

  const match = {
    isActive: true,
  };

  if (salesOrderId) {
    match.salesOrderId = new mongoose.Types.ObjectId(salesOrderId);
  }

  if (paymentStatus) {
    match.paymentStatus = paymentStatus;
  }

  if (dispatchStatus) {
    match.dispatchStatus = dispatchStatus;
  }

  if (companyName) {
    match.companyName = {
      $regex: escapeRegex(companyName),
      $options: "i",
    };
  }

  if (invoiceNumber) {
    match.invoiceNumber = {
      $regex: escapeRegex(invoiceNumber),
      $options: "i",
    };
  }

  if (fromDate || toDate) {
    match.dispatchDate = {};

    if (fromDate) {
      match.dispatchDate.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
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
      totalPages: Math.ceil(totalRecords / safeLimit),
      limit: safeLimit,
    },
  };
};

/* =========================
   GET DISPATCH BY ID
========================= */

const getDispatchById = async (dispatchId, user) => {
  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  }).lean();

  if (!dispatch) {
    throw new Error("Dispatch not found.");
  }

  if (!canManageDispatch(user, dispatch)) {
    throw new Error("You are not allowed to view this dispatch.");
  }

  return dispatch;
};

/* =========================
   UPDATE PAYMENT
========================= */

const updateDispatchPayment = async (dispatchId, body, file, user) => {
  const uploadedFiles = file ? [file] : [];

  try {
    const dispatch = await Dispatch.findOne({
      _id: dispatchId,
      isActive: true,
    });

    if (!dispatch) {
      throw new Error("Dispatch not found.");
    }

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

    let paymentBillPdf = undefined;

    if (file) {
      const renamedFile = renameUploadedFile(
        file,
        `payment-${dispatch.invoiceNumber}-${dispatch.companyName}`
      );

      paymentBillPdf = buildFileObject(renamedFile);
    }

    dispatch.paidAmount = Number(
      (Number(dispatch.paidAmount || 0) + receivedAmount).toFixed(2)
    );

    dispatch.pendingAmount = Number(
      (
        Number(dispatch.invoiceValue || 0) -
        Number(dispatch.paidAmount || 0)
      ).toFixed(2)
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
      mailStatus: {
        sent: false,
      },
    });

    await dispatch.save();

    await safeCreateNotification({
      module: "dispatch",
      event: "payment_updated",
      title:
        dispatch.paymentStatus === "paid"
          ? "Payment Completed"
          : "Payment Updated",
      message: `₹${Number(receivedAmount).toLocaleString(
        "en-IN"
      )} received for ${dispatch.companyName} | Invoice ${
        dispatch.invoiceNumber
      }`,
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

/* =========================
   UPDATE DISPATCH STATUS
========================= */

const updateDispatchStatus = async (dispatchId, body, user) => {
  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  });

  if (!dispatch) {
    throw new Error("Dispatch not found.");
  }

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

/* =========================
   SOFT DELETE
========================= */

const deleteDispatch = async (dispatchId, user) => {
  if (!canDeleteDispatch(user)) {
    throw new Error("Only super admin can delete dispatch.");
  }

  const dispatch = await Dispatch.findOne({
    _id: dispatchId,
    isActive: true,
  });

  if (!dispatch) {
    throw new Error("Dispatch not found.");
  }

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