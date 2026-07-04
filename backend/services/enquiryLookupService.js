const Enquiry = require("../model/enquiryModel");
const SalesOrder = require("../model/salesOrderModel");

const lookupEnquiryForSalesOrder = async (enquiryNumber, user) => {
  const cleanEnquiryNumber = String(enquiryNumber || "").trim();

  if (!cleanEnquiryNumber) {
    throw new Error("Enquiry number is required.");
  }

  const enquiry = await Enquiry.findOne({ enquiryNumber: cleanEnquiryNumber })
    .select(`
      enquiryNumber
      companyName
      customerName
      customerContactNo
      customerEmailId
      customerAddress
      grade
      size
      quantityInKg
      salesPersonId
      closure.status
    `)
    .populate("salesPersonId", "name email mobileNumber")
    .lean();

  if (!enquiry) {
    return {
      found: false,
      validForSalesOrder: false,
      message: "No enquiry found with this enquiry number.",
      data: null,
    };
  }

  const enquiryOwnerId = enquiry.salesPersonId?._id || enquiry.salesPersonId;

  if (
    !["admin", "super_admin"].includes(user?.role) &&
    String(enquiryOwnerId) !== String(user?._id || user?.id)
  ) {
    return {
      found: true,
      validForSalesOrder: false,
      message: "This enquiry belongs to another salesperson.",
      data: null,
    };
  }

  const existingSalesOrder = await SalesOrder.findOne({
    enquiryNumber: cleanEnquiryNumber,
    isActive: { $ne: false },
  })
    .select("salesOrderNo poNumber companyName approvalStatus")
    .lean();

  if (existingSalesOrder) {
    return {
      found: true,
      validForSalesOrder: false,
      message: `Sales order already exists for enquiry number ${cleanEnquiryNumber}.`,
      data: {
        enquiryNumber: enquiry.enquiryNumber,
        companyName: enquiry.companyName,
        customerName: enquiry.customerName,
        closureStatus: enquiry.closure?.status || "pending",
        alreadyUsed: true,
        existingSalesOrder,
      },
    };
  }

  const closureStatus = enquiry.closure?.status || "pending";

  if (closureStatus !== "won") {
    return {
      found: true,
      validForSalesOrder: false,
      message: `Sales order can be created only for won enquiries. Current status is ${closureStatus}.`,
      data: {
        enquiryNumber: enquiry.enquiryNumber,
        companyName: enquiry.companyName,
        customerName: enquiry.customerName,
        customerContactNo: enquiry.customerContactNo,
        customerEmailId: enquiry.customerEmailId,
        customerAddress: enquiry.customerAddress,
        grade: enquiry.grade,
        size: enquiry.size,
        quantityInKg: enquiry.quantityInKg,
        closureStatus,
        salesPersonName: enquiry.salesPersonId?.name || "-",
        alreadyUsed: false,
      },
    };
  }

  return {
    found: true,
    validForSalesOrder: true,
    message: "Valid won enquiry found.",
    data: {
      enquiryNumber: enquiry.enquiryNumber,
      companyName: enquiry.companyName,
      customerName: enquiry.customerName,
      customerContactNo: enquiry.customerContactNo,
      customerEmailId: enquiry.customerEmailId,
      customerAddress: enquiry.customerAddress,
      grade: enquiry.grade,
      size: enquiry.size,
      quantityInKg: enquiry.quantityInKg,
      closureStatus,
      salesPersonName: enquiry.salesPersonId?.name || "-",
      alreadyUsed: false,
    },
  };
};

module.exports = {
  lookupEnquiryForSalesOrder,
};