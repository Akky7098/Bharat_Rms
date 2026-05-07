const mongoose = require("mongoose");
const Dispatch = require("../model/dispatchModel");
const SalesOrder = require("../model/salesOrderModel");

const isPrivilegedUser = (user) => {
  return ["admin", "super_admin", "dispatch"].includes(user.role);
};

const calculatePaymentDueDate = (dispatchDate, paymentDays) => {
  const dueDate = new Date(dispatchDate);
  dueDate.setDate(dueDate.getDate() + Number(paymentDays));
  return dueDate;
};

const calculatePaymentStatus = (pendingAmount, paymentDueDate, paidAmount) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(paymentDueDate);
  due.setHours(0, 0, 0, 0);

  if (pendingAmount <= 0) return "paid";
  if (due < today) return "overdue";
  if (paidAmount > 0) return "partial";

  return "pending";
};

const recalculateSalesOrderDispatchStatus = async (salesOrderId, session = null) => {
  const dispatches = await Dispatch.find({ salesOrderId }).session(session);

  const salesOrder = await SalesOrder.findById(salesOrderId).session(session);

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  const totalDispatchedQty = dispatches.reduce(
    (sum, item) => sum + Number(item.dispatchQty || 0),
    0
  );

  const pendingDispatchQty = Math.max(
    Number(salesOrder.quantityInKg || 0) - totalDispatchedQty,
    0
  );

  let orderStatus = "pending_dispatch";

  if (totalDispatchedQty > 0 && pendingDispatchQty > 0) {
    orderStatus = "partial_dispatch";
  }

  if (totalDispatchedQty >= Number(salesOrder.quantityInKg || 0)) {
    orderStatus = "fully_dispatched";
  }

  salesOrder.totalDispatchedQty = totalDispatchedQty;
  salesOrder.pendingDispatchQty = pendingDispatchQty;
  salesOrder.orderStatus = orderStatus;

  await salesOrder.save({ session });

  return salesOrder;
};

const createDispatch = async (body, user) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      salesOrderId,
      invoiceNumber,
      invoiceDate,
      dispatchDate,
      dispatchQty,
      invoiceValue,
      transporterName,
      vehicleNumber,
      lrNumber,
      ewayBillNumber,
      invoicePdf,
      lrCopyPdf,
      ewayBillPdf,
      paymentDays,
      paidAmount = 0,
      dispatchStatus = "dispatched",
      internalRemark = "",
    } = body;

    const salesOrder = await SalesOrder.findById(salesOrderId).session(session);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    const qty = Number(dispatchQty);
    const value = Number(invoiceValue);
    const days = Number(paymentDays);
    const paid = Number(paidAmount || 0);

    if (!qty || qty <= 0) {
      throw new Error("Dispatch quantity must be greater than 0");
    }

    if (!value || value <= 0) {
      throw new Error("Invoice value must be greater than 0");
    }

    if (days < 0 || paymentDays === "" || paymentDays === undefined) {
      throw new Error("Payment days is required");
    }

    if (paid < 0) {
      throw new Error("Paid amount cannot be negative");
    }

    if (paid > value) {
      throw new Error("Paid amount cannot be greater than invoice value");
    }

    const existingDispatches = await Dispatch.find({ salesOrderId }).session(
      session
    );

    const alreadyDispatchedQty = existingDispatches.reduce(
      (sum, item) => sum + Number(item.dispatchQty || 0),
      0
    );

    const remainingQty = Number(salesOrder.quantityInKg) - alreadyDispatchedQty;

    if (qty > remainingQty) {
      throw new Error(
        `Dispatch quantity cannot exceed pending quantity. Pending quantity is ${remainingQty} Kg`
      );
    }

    const paymentDueDate = calculatePaymentDueDate(dispatchDate, days);
    const pendingAmount = Number((value - paid).toFixed(2));
    const ratePerKg = Number((value / qty).toFixed(2));

    const paymentStatus = calculatePaymentStatus(
      pendingAmount,
      paymentDueDate,
      paid
    );

    const dispatch = await Dispatch.create(
      [
        {
          salesOrderId,
          dispatchPersonId: user.id,

          invoiceNumber,
          invoiceDate,
          dispatchDate,

          dispatchQty: qty,
          invoiceValue: value,
          ratePerKg,

          transporterName,
          vehicleNumber,
          lrNumber,
          ewayBillNumber,

          invoicePdf,
          lrCopyPdf,
          ewayBillPdf,

          paymentDays: days,
          paymentDueDate,
          paymentStatus,
          paidAmount: paid,
          pendingAmount,

          dispatchStatus,
          internalRemark,
        },
      ],
      { session }
    );

    await recalculateSalesOrderDispatchStatus(salesOrderId, session);

    await session.commitTransaction();

    return dispatch[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateDispatch = async (dispatchId, body, user) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const dispatch = await Dispatch.findById(dispatchId).session(session);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    const salesOrder = await SalesOrder.findById(dispatch.salesOrderId).session(
      session
    );

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    const updatedDispatchQty =
      body.dispatchQty !== undefined
        ? Number(body.dispatchQty)
        : Number(dispatch.dispatchQty);

    const updatedInvoiceValue =
      body.invoiceValue !== undefined
        ? Number(body.invoiceValue)
        : Number(dispatch.invoiceValue);

    const updatedPaymentDays =
      body.paymentDays !== undefined
        ? Number(body.paymentDays)
        : Number(dispatch.paymentDays);

    const updatedPaidAmount =
      body.paidAmount !== undefined
        ? Number(body.paidAmount)
        : Number(dispatch.paidAmount || 0);

    const updatedDispatchDate = body.dispatchDate || dispatch.dispatchDate;

    if (!updatedDispatchQty || updatedDispatchQty <= 0) {
      throw new Error("Dispatch quantity must be greater than 0");
    }

    if (!updatedInvoiceValue || updatedInvoiceValue <= 0) {
      throw new Error("Invoice value must be greater than 0");
    }

    if (updatedPaymentDays < 0) {
      throw new Error("Payment days is required");
    }

    if (updatedPaidAmount < 0) {
      throw new Error("Paid amount cannot be negative");
    }

    if (updatedPaidAmount > updatedInvoiceValue) {
      throw new Error("Paid amount cannot be greater than invoice value");
    }

    const otherDispatches = await Dispatch.find({
      salesOrderId: dispatch.salesOrderId,
      _id: { $ne: dispatch._id },
    }).session(session);

    const otherDispatchedQty = otherDispatches.reduce(
      (sum, item) => sum + Number(item.dispatchQty || 0),
      0
    );

    const availableQty =
      Number(salesOrder.quantityInKg || 0) - otherDispatchedQty;

    if (updatedDispatchQty > availableQty) {
      throw new Error(
        `Dispatch quantity cannot exceed available quantity. Available quantity is ${availableQty} Kg`
      );
    }

    const paymentDueDate = calculatePaymentDueDate(
      updatedDispatchDate,
      updatedPaymentDays
    );

    const pendingAmount = Number(
      (updatedInvoiceValue - updatedPaidAmount).toFixed(2)
    );

    const ratePerKg = Number(
      (updatedInvoiceValue / updatedDispatchQty).toFixed(2)
    );

    const paymentStatus = calculatePaymentStatus(
      pendingAmount,
      paymentDueDate,
      updatedPaidAmount
    );

    const allowedFields = [
      "invoiceNumber",
      "invoiceDate",
      "dispatchDate",
      "transporterName",
      "vehicleNumber",
      "lrNumber",
      "ewayBillNumber",
      "invoicePdf",
      "lrCopyPdf",
      "ewayBillPdf",
      "dispatchStatus",
      "internalRemark",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        dispatch[field] = body[field];
      }
    });

    dispatch.dispatchQty = updatedDispatchQty;
    dispatch.invoiceValue = updatedInvoiceValue;
    dispatch.ratePerKg = ratePerKg;

    dispatch.paymentDays = updatedPaymentDays;
    dispatch.paymentDueDate = paymentDueDate;
    dispatch.paidAmount = updatedPaidAmount;
    dispatch.pendingAmount = pendingAmount;
    dispatch.paymentStatus = paymentStatus;

    await dispatch.save({ session });

    await recalculateSalesOrderDispatchStatus(dispatch.salesOrderId, session);

    await session.commitTransaction();

    return dispatch;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getAllDispatches = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    salesOrderId,
    paymentStatus,
    dispatchStatus,
    companyName,
    invoiceNumber,
    fromDate,
    toDate,
  } = query;

  const match = {};

  if (salesOrderId) {
    match.salesOrderId = new mongoose.Types.ObjectId(salesOrderId);
  }

  if (paymentStatus) {
    match.paymentStatus = paymentStatus;
  }

  if (dispatchStatus) {
    match.dispatchStatus = dispatchStatus;
  }

  if (invoiceNumber) {
    match.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
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

  const pipeline = [
    { $match: match },

    {
      $lookup: {
        from: "salesorders",
        localField: "salesOrderId",
        foreignField: "_id",
        as: "salesOrder",
      },
    },
    {
      $unwind: {
        path: "$salesOrder",
        preserveNullAndEmptyArrays: false,
      },
    },
  ];

  if (!isPrivilegedUser(user)) {
    pipeline.push({
      $match: {
        "salesOrder.salesPersonId": new mongoose.Types.ObjectId(user.id),
      },
    });
  }

  if (companyName) {
    pipeline.push({
      $match: {
        "salesOrder.companyName": { $regex: companyName, $options: "i" },
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "totalRecords" }];

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "salesOrder.salesPersonId",
        foreignField: "_id",
        as: "salesPerson",
      },
    },
    {
      $unwind: {
        path: "$salesPerson",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "dispatchPersonId",
        foreignField: "_id",
        as: "dispatchPerson",
      },
    },
    {
      $unwind: {
        path: "$dispatchPerson",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { dispatchDate: -1, createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) },
    {
      $project: {
        invoiceNumber: 1,
        invoiceDate: 1,
        dispatchDate: 1,

        dispatchQty: 1,
        invoiceValue: 1,
        ratePerKg: 1,

        transporterName: 1,
        vehicleNumber: 1,
        lrNumber: 1,
        ewayBillNumber: 1,

        invoicePdf: 1,
        lrCopyPdf: 1,
        ewayBillPdf: 1,

        paymentDays: 1,
        paymentDueDate: 1,
        paymentStatus: 1,
        paidAmount: 1,
        pendingAmount: 1,

        dispatchStatus: 1,
        internalRemark: 1,

        createdAt: 1,
        updatedAt: 1,

        "salesOrder._id": 1,
        "salesOrder.companyName": 1,
        "salesOrder.location": 1,
        "salesOrder.contactPersonName": 1,
        "salesOrder.contactPersonNumber": 1,
        "salesOrder.contactPersonEmailId": 1,
        "salesOrder.additionalEmails": 1,
        "salesOrder.productCategory": 1,
        "salesOrder.grade": 1,
        "salesOrder.size": 1,
        "salesOrder.quantityInKg": 1,
        "salesOrder.valueInRupees": 1,
        "salesOrder.paymentTerms": 1,
        "salesOrder.totalDispatchedQty": 1,
        "salesOrder.pendingDispatchQty": 1,
        "salesOrder.orderStatus": 1,

        "salesPerson._id": 1,
        "salesPerson.name": 1,
        "salesPerson.email": 1,

        "dispatchPerson._id": 1,
        "dispatchPerson.name": 1,
        "dispatchPerson.email": 1,
      },
    }
  );

  const [countResult, dispatches] = await Promise.all([
    Dispatch.aggregate(countPipeline),
    Dispatch.aggregate(pipeline),
  ]);

  const totalRecords = countResult[0]?.totalRecords || 0;

  return {
    dispatches,
    pagination: {
      totalRecords,
      currentPage: Number(page),
      totalPages: Math.ceil(totalRecords / Number(limit)),
      limit: Number(limit),
    },
  };
};

const getDispatchById = async (dispatchId, user) => {
  const result = await getAllDispatches(
    {
      page: 1,
      limit: 1,
    },
    user
  );

  const dispatch = await Dispatch.findById(dispatchId)
    .populate({
      path: "salesOrderId",
      populate: {
        path: "salesPersonId",
        select: "name email role",
      },
    })
    .populate("dispatchPersonId", "name email role")
    .lean();

  if (!dispatch) {
    throw new Error("Dispatch not found");
  }

  if (
    !isPrivilegedUser(user) &&
    String(dispatch.salesOrderId?.salesPersonId?._id) !== String(user.id)
  ) {
    throw new Error("You are not allowed to view this dispatch");
  }

  return dispatch;
};

module.exports = {
  createDispatch,
  updateDispatch,
  getAllDispatches,
  getDispatchById,
  recalculateSalesOrderDispatchStatus,
};