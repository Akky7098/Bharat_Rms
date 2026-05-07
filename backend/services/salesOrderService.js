const mongoose = require("mongoose");
const SalesOrder = require("../model/salesOrderModel");
const productGrades = require("../constants/productGrades");

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const cleanAdditionalEmails = (additionalEmails = []) => {
  if (!Array.isArray(additionalEmails)) return [];

  return additionalEmails
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);
};

const createSalesOrder = async (body, user) => {
  const {
    orderDate,
    companyName,
    location,
    contactPersonName,
    contactPersonNumber,
    contactPersonEmailId,
    additionalEmails = [],
    productCategory,
    grade,
    size,
    quantityInKg,
    valueInRupees,
    paymentTerms,
  } = body;

  if (!Object.prototype.hasOwnProperty.call(productGrades, productCategory)) {
    throw new Error("Invalid product category");
  }

  if (!grade || !String(grade).trim()) {
    throw new Error("Grade is required");
  }

  if (
    productCategory !== "other" &&
    !productGrades[productCategory].includes(grade)
  ) {
    throw new Error("Invalid grade selected for this product category");
  }

  const qty = Number(quantityInKg);
  const value = Number(valueInRupees);

  if (!qty || qty <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!value || value <= 0) {
    throw new Error("Order value must be greater than 0");
  }

  const cleanedAdditionalEmails = cleanAdditionalEmails(additionalEmails);

  for (const email of cleanedAdditionalEmails) {
    if (!isValidEmail(email)) {
      throw new Error(`Invalid additional email: ${email}`);
    }
  }

  const ratePerKg = Number((value / qty).toFixed(2));

  const salesOrder = await SalesOrder.create({
    salesPersonId: user.id,

    orderDate,
    companyName,
    location,
    contactPersonName,
    contactPersonNumber,
    contactPersonEmailId,
    additionalEmails: cleanedAdditionalEmails,

    productCategory,
    grade: String(grade).trim(),
    size,

    quantityInKg: qty,
    valueInRupees: value,
    ratePerKg,

    paymentTerms,

    totalDispatchedQty: 0,
    pendingDispatchQty: qty,
    orderStatus: "pending_dispatch",
  });

  return salesOrder;
};

const getAllSalesOrders = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    salesPersonId,
    companyName,
    productCategory,
    grade,
    fromDate,
    toDate,
  } = query;

  const filter = {};

  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      filter.salesPersonId = new mongoose.Types.ObjectId(salesPersonId);
    }
  } else {
    filter.salesPersonId = new mongoose.Types.ObjectId(user.id);
  }

  if (companyName) {
    filter.companyName = { $regex: companyName, $options: "i" };
  }

  if (productCategory) {
    filter.productCategory = productCategory;
  }

  if (grade) {
    filter.grade = grade;
  }

  if (fromDate || toDate) {
    filter.orderDate = {};

    if (fromDate) {
      filter.orderDate.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.orderDate.$lte = endDate;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalRecords = await SalesOrder.countDocuments(filter);

  const salesOrders = await SalesOrder.aggregate([
    { $match: filter },

    {
      $lookup: {
        from: "users",
        localField: "salesPersonId",
        foreignField: "_id",
        as: "salesPersonId",
      },
    },
    {
      $unwind: {
        path: "$salesPersonId",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "dispatches",
        localField: "_id",
        foreignField: "salesOrderId",
        as: "dispatchDetails",
      },
    },

    {
      $addFields: {
        dispatchCount: { $size: "$dispatchDetails" },
      },
    },

    { $sort: { orderDate: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: Number(limit) },

    {
      $project: {
        orderDate: 1,
        companyName: 1,
        location: 1,
        contactPersonName: 1,
        contactPersonNumber: 1,
        contactPersonEmailId: 1,
        additionalEmails: 1,
        productCategory: 1,
        grade: 1,
        size: 1,
        quantityInKg: 1,
        valueInRupees: 1,
        ratePerKg: 1,
        paymentTerms: 1,

        totalDispatchedQty: 1,
        pendingDispatchQty: 1,
        orderStatus: 1,
        dispatchCount: 1,
        dispatchDetails: 1,

        createdAt: 1,
        updatedAt: 1,

        "salesPersonId._id": 1,
        "salesPersonId.name": 1,
        "salesPersonId.email": 1,
        "salesPersonId.role": 1,
      },
    },
  ]);

  return {
    salesOrders,
    pagination: {
      totalRecords,
      currentPage: Number(page),
      totalPages: Math.ceil(totalRecords / Number(limit)),
      limit: Number(limit),
    },
  };
};
const escapeRegex = (text = "") => {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const searchPendingDispatchSalesOrders = async (query, user) => {
  const { search = "", limit = 20 } = query;

  const keyword = String(search || "")
    .trim()
    .replace(/\s+/g, " ");

  const safeLimit = Math.min(Number(limit) || 20, 50);

  const filter = {};

  /* ROLE FILTER */
  if (
    user.role !== "admin" &&
    user.role !== "super_admin" &&
    user.role !== "dispatch"
  ) {
    filter.salesPersonId = user.id;
  }

  /* COMPANY NAME START-WITH SEARCH ONLY */
  if (keyword) {
    filter.companyName = {
      $regex: "^" + escapeRegex(keyword),
      $options: "i",
    };
  }

  const salesOrders = await SalesOrder.find(filter)
    .populate("salesPersonId", "name email role")
    .sort({
      companyName: 1,
      createdAt: -1,
    })
    .limit(safeLimit)
    .select(
      `
      orderDate
      companyName
      location
      contactPersonName
      contactPersonNumber
      contactPersonEmailId
      additionalEmails
      productCategory
      grade
      size
      quantityInKg
      valueInRupees
      ratePerKg
      paymentTerms
      totalDispatchedQty
      pendingDispatchQty
      orderStatus
      salesPersonId
      createdAt
      updatedAt
      `
    )
    .lean();

  const formatted = salesOrders.map((item) => {
    const totalQty = Number(item.quantityInKg || 0);
    const dispatchedQty = Number(item.totalDispatchedQty || 0);

    let pendingQty = totalQty;

    /* OLD DATA SUPPORT */
    if (totalQty <= 0) {
      pendingQty = item.pendingDispatchQty
        ? Number(item.pendingDispatchQty)
        : 1;
    }

    /* NEW DATA SUPPORT */
    if (
      item.pendingDispatchQty !== undefined &&
      item.pendingDispatchQty !== null
    ) {
      pendingQty = Number(item.pendingDispatchQty || 0);
    }

    /* PARTIAL DISPATCH SUPPORT */
    if (
      (item.pendingDispatchQty === undefined ||
        item.pendingDispatchQty === null) &&
      dispatchedQty > 0 &&
      totalQty > 0
    ) {
      pendingQty = totalQty - dispatchedQty;
    }

    const finalStatus =
      item.orderStatus ||
      (pendingQty <= 0
        ? "fully_dispatched"
        : dispatchedQty > 0
        ? "partial_dispatch"
        : "pending_dispatch");

    return {
      ...item,
      totalDispatchedQty: dispatchedQty,
      pendingDispatchQty: Math.max(Number(pendingQty || 0), 0),
      orderStatus: finalStatus,
    };
  });

  return formatted.filter((item) => {
    return item.orderStatus !== "fully_dispatched";
  });
};
module.exports = {
  createSalesOrder,
  getAllSalesOrders,
  searchPendingDispatchSalesOrders,
};