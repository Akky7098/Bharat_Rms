const Enquiry = require("../model/enquiryModel");
const productGrades = require("../constants/productGrades");

const createEnquiry = async (body, user) => {
  const {
    enquiryDate,
    companyName,
    customerName,
    customerContactNo,
    customerEmailId,
    customerAddress,
    productCategory,
    grade,
    shape,
    size,
    quantityInKg,
    supplyCondition,
    modeOfEnquiry,
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

  // Base date (enquiry created date)
  const baseDate = new Date();

  // Auto plan dates
  const feasibilityPlanDate = new Date(
    baseDate.getTime() + 1 * 60 * 60 * 1000
  ); // +1 hour

  const quotationPlanDate = new Date(
    baseDate.getTime() + 24 * 60 * 60 * 1000
  ); // +1 day

  const closurePlanDate = new Date(
    baseDate.getTime() + 2 * 24 * 60 * 60 * 1000
  ); // +2 days

  const enquiry = await Enquiry.create({
    salesPersonId: user.id,
    enquiryDate,
    companyName,
    customerName,
    customerContactNo,
    customerEmailId,
    customerAddress,
    productCategory,
    grade,
    shape,
    size,
    quantityInKg,
    supplyCondition,
    modeOfEnquiry,

    feasibility: {
      planDate: feasibilityPlanDate,
      completed: false,
      status: "pending",
    },

    quotation: {
      planDate: quotationPlanDate,
      completed: false,
    },

    closure: {
      planDate: closurePlanDate,
      completed: false,
      status: "pending",
      lostRemark: "",
    },
  });

  return enquiry;
};
const updateWorkflow = async (id, body) => {
  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  const { feasibility, quotation, closure } = body;

  if (!feasibility && !quotation && !closure) {
    throw new Error("No workflow data provided");
  }

  // FEASIBILITY PARTIAL UPDATE
  if (feasibility) {
    if (feasibility.completed === true && !feasibility.actualDate) {
      throw new Error("Feasibility actual date is required when completed");
    }

    if (
      feasibility.completed === true &&
      (!feasibility.status || feasibility.status === "pending")
    ) {
      throw new Error("Feasibility status is required when completed");
    }

    if (feasibility.status) {
      enquiry.feasibility.status = feasibility.status;
    }

    if (feasibility.actualDate) {
      enquiry.feasibility.actualDate = feasibility.actualDate;
    }

    if (feasibility.completed !== undefined) {
      enquiry.feasibility.completed = feasibility.completed;
    }
  }

  // QUOTATION PARTIAL UPDATE
  if (quotation) {
    if (!enquiry.feasibility.completed) {
      throw new Error("Please complete feasibility before quotation update");
    }

    if (quotation.completed === true && !quotation.actualDate) {
      throw new Error("Quotation actual date is required when completed");
    }

    if (quotation.actualDate) {
      enquiry.quotation.actualDate = quotation.actualDate;
    }

    if (quotation.quotationLink) {
      enquiry.quotation.quotationLink = quotation.quotationLink;
    }

    if (quotation.completed !== undefined) {
      enquiry.quotation.completed = quotation.completed;
    }
  }

  // CLOSURE PARTIAL UPDATE
  if (closure) {
    if (!enquiry.quotation.completed) {
      throw new Error("Please complete quotation before closure update");
    }

    if (closure.completed === true && !closure.actualDate) {
      throw new Error("Closure actual date is required when completed");
    }

    if (closure.status === "lost" && !closure.lostRemark) {
      throw new Error("Lost remark is required when closure status is lost");
    }

    if (closure.actualDate) {
      enquiry.closure.actualDate = closure.actualDate;
    }

    if (closure.status) {
      enquiry.closure.status = closure.status;
    }

    if (closure.lostRemark) {
      enquiry.closure.lostRemark = closure.lostRemark;
    }

    if (closure.completed !== undefined) {
      enquiry.closure.completed = closure.completed;
    }
  }

  await enquiry.save();

  return enquiry;
};
const getAllEnquiries = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    salesPersonId,
    fromDate,
    toDate,
  } = query;

  const filter = {};

  // role-based access
  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      filter.salesPersonId = salesPersonId;
    }
  } else {
    filter.salesPersonId = user.id;
  }

  // date filter on enquiryDate
  if (fromDate || toDate) {
    filter.enquiryDate = {};

    if (fromDate) {
      filter.enquiryDate.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.enquiryDate.$lte = endDate;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalRecords = await Enquiry.countDocuments(filter);

  const enquiries = await Enquiry.find(filter)
    .populate("salesPersonId", "name email role")
    .sort({ enquiryDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return {
    enquiries,
    pagination: {
      totalRecords,
      currentPage: Number(page),
      totalPages: Math.ceil(totalRecords / Number(limit)),
      limit: Number(limit),
    },
  };
};

module.exports = {
  createEnquiry,
  updateWorkflow,
  getAllEnquiries,
};
