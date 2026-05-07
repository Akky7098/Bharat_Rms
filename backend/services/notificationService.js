const SalesOrder = require("../model/salesOrderModel");
const Enquiry = require("../model/enquiryModel");

const isAdminUser = (user) =>
  user.role === "admin" || user.role === "super_admin";

const getDaysDiff = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
};

const getNotifications = async (user) => {
  const salesOrderFilter = {};
  const enquiryFilter = {};

  if (!isAdminUser(user)) {
    salesOrderFilter.salesPersonId = user.id;
    enquiryFilter.salesPersonId = user.id;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  const notifications = [];

  /* PAYMENT OVERDUE */
  const overduePayments = await SalesOrder.find({
    ...salesOrderFilter,
    paymentStatus: { $ne: "paid" },
    paymentDueDate: { $lt: today },
  })
    .populate("salesPersonId", "name email")
    .sort({ paymentDueDate: 1 })
    .limit(10)
    .lean();

  overduePayments.forEach((order) => {
    notifications.push({
      type: "payment_overdue",
      priority: "high",
      title: "Payment overdue",
      message: `${order.companyName} payment of ₹${Number(
        order.pendingAmount || order.valueInRupees || 0
      ).toLocaleString("en-IN")} is overdue by ${getDaysDiff(
        order.paymentDueDate
      )} day(s).`,
      salesPersonName: order.salesPersonId?.name || "-",
      companyName: order.companyName,
      amount: order.pendingAmount || order.valueInRupees || 0,
      dueDate: order.paymentDueDate,
      sourceId: order._id,
      sourceType: "sales_order",
    });
  });

  /* PAYMENT DUE SOON */
  const dueSoonPayments = await SalesOrder.find({
    ...salesOrderFilter,
    paymentStatus: { $ne: "paid" },
    paymentDueDate: {
      $gte: today,
      $lte: next7Days,
    },
  })
    .populate("salesPersonId", "name email")
    .sort({ paymentDueDate: 1 })
    .limit(10)
    .lean();

  dueSoonPayments.forEach((order) => {
    notifications.push({
      type: "payment_due_soon",
      priority: "medium",
      title: "Payment due soon",
      message: `${order.companyName} payment of ₹${Number(
        order.pendingAmount || order.valueInRupees || 0
      ).toLocaleString("en-IN")} is due on ${new Date(
        order.paymentDueDate
      ).toLocaleDateString("en-IN")}.`,
      salesPersonName: order.salesPersonId?.name || "-",
      companyName: order.companyName,
      amount: order.pendingAmount || order.valueInRupees || 0,
      dueDate: order.paymentDueDate,
      sourceId: order._id,
      sourceType: "sales_order",
    });
  });

  /* OVERDUE ENQUIRIES */
  const overdueEnquiries = await Enquiry.find({
    ...enquiryFilter,
    "closure.status": { $nin: ["won", "lost"] },
    $or: [
      {
        "feasibility.planDate": { $lt: today },
        "feasibility.completed": { $ne: true },
      },
      {
        "quotation.planDate": { $lt: today },
        "quotation.completed": { $ne: true },
      },
      {
        "closure.planDate": { $lt: today },
        "closure.completed": { $ne: true },
      },
    ],
  })
    .populate("salesPersonId", "name email")
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  overdueEnquiries.forEach((enquiry) => {
    notifications.push({
      type: "enquiry_overdue",
      priority: "high",
      title: "Enquiry overdue",
      message: `${enquiry.companyName} enquiry needs action.`,
      salesPersonName: enquiry.salesPersonId?.name || "-",
      companyName: enquiry.companyName,
      customerName: enquiry.customerName,
      grade: enquiry.grade,
      sourceId: enquiry._id,
      sourceType: "enquiry",
    });
  });

  /* CUSTOMER REPEAT GRADE DEMAND */
  const repeatGradeDemand = await SalesOrder.aggregate([
    { $match: salesOrderFilter },
    {
      $group: {
        _id: {
          companyName: "$companyName",
          grade: "$grade",
        },
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: "$quantityInKg" },
        totalValue: { $sum: "$valueInRupees" },
      },
    },
    {
      $match: {
        orderCount: { $gte: 2 },
      },
    },
    { $sort: { orderCount: -1, totalValue: -1 } },
    { $limit: 10 },
  ]);

  repeatGradeDemand.forEach((item) => {
    notifications.push({
      type: "repeat_grade_demand",
      priority: "low",
      title: "Repeat grade demand",
      message: `${item._id.companyName} repeatedly orders ${item._id.grade}. Keep stock/watch pricing.`,
      companyName: item._id.companyName,
      grade: item._id.grade,
      orderCount: item.orderCount,
      totalQuantity: item.totalQuantity,
      totalValue: item.totalValue,
      sourceType: "sales_order",
    });
  });

  const priorityRank = {
    high: 1,
    medium: 2,
    low: 3,
  };

  notifications.sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority]
  );

  return {
    total: notifications.length,
    high: notifications.filter((n) => n.priority === "high").length,
    medium: notifications.filter((n) => n.priority === "medium").length,
    low: notifications.filter((n) => n.priority === "low").length,
    notifications,
  };
};

module.exports = {
  getNotifications,
};