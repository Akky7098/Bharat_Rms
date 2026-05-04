const SalesOrder = require("../model/salesOrderModel");
const productGrades = require("../constants/productGrades");

const createSalesOrder = async (body, user) => {
  const {
    orderDate,
    companyName,
    location,
    contactPersonName,
    contactPersonNumber,
    contactPersonEmailId,
    productCategory,
    grade,
    size,
    quantityInKg,
    valueInRupees,
    paymentTerms,
  } = body;

  if (!productGrades[productCategory]) {
    throw new Error("Invalid product category");
  }

  if (!productGrades[productCategory].includes(grade)) {
    throw new Error("Invalid grade selected for this product category");
  }

  const salesOrder = await SalesOrder.create({
    salesPersonId: user.id,

    orderDate,
    companyName,
    location,
    contactPersonName,
    contactPersonNumber,
    contactPersonEmailId,
    productCategory,
    grade,
    size,
    quantityInKg,
    valueInRupees,
    paymentTerms,
  });

  return salesOrder;
};

const getAllSalesOrders = async (query, user) => {
  const {
    page = 1,
    limit = 1,
    salesPersonId,
    companyName,
    productCategory,
    grade,
    fromDate,
    toDate,
  } = query;

  const filter = {};

  // Role based data access
  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      filter.salesPersonId = salesPersonId;
    }
  } else {
    filter.salesPersonId = user.id;
  }

  // Optional filters
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
      filter.orderDate.$lte = new Date(toDate);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalRecords = await SalesOrder.countDocuments(filter);

  const salesOrders = await SalesOrder.find(filter)
    .populate("salesPersonId", "name email role")
    .sort({ orderDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

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

module.exports = {
  createSalesOrder,
  getAllSalesOrders,
};