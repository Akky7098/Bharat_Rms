const Enquiry = require("../model/enquiryModel");
const productGrades = require("../constants/productGrades");

let notificationService = null;
let Notification = null;

try {
  notificationService = require("./notificationService");
  Notification = require("../model/notificationModel");
} catch (error) {
  console.log("Notification service/model not loaded =>", error.message);
}

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) return;
    await notificationService.createNotification(payload);
  } catch (error) {
    console.log("ENQUIRY NOTIFICATION ERROR =>", error.message);
  }
};

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const createEnquiry = async (body, user, file) => {
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
    otherSupplyConditions,
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

  const allowedShapes = ["round", "flat", "square", "rcs"];
  if (!allowedShapes.includes(shape)) {
    throw new Error("Invalid shape selected");
  }

  const allowedSupplyConditions = [
    "as_per_standard",
    "as_rolled",
    "as_forged",
    "as_rolled_or_as_forged",
    "as_rolled_annealed",
    "as_forged_annealed",
    "as_rolled_or_forged_annealed",
    "as_rolled_normalised",
    "as_rolled_or_as_forged_normalised",
    "as_rolled_qt",
    "as_forged_qt",
    "as_rolled_or_as_forged_qt",
    "other",
  ];

  if (!allowedSupplyConditions.includes(supplyCondition)) {
    throw new Error("Invalid supply condition selected");
  }

  if (
    supplyCondition === "other" &&
    !String(otherSupplyConditions || "").trim()
  ) {
    throw new Error("Other supply condition is required");
  }

  const allowedModes = [
    "phone",
    "email",
    "whatsapp",
    "website",
    "walk-in",
    "google-ads",
    "reference",
  ];

  if (!allowedModes.includes(modeOfEnquiry)) {
    throw new Error("Invalid mode of enquiry selected");
  }

  const baseDate = new Date();

  const feasibilityPlanDate = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000);
  const quotationPlanDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const closurePlanDate = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  let sizePdf = {
    fileName: "",
    filePath: "",
    fileUrl: "",
  };

  if (file) {
    sizePdf = {
      fileName: file.filename,
      filePath: file.path,
      fileUrl: `/uploads/enquiry-size-pdf/${file.filename}`,
      uploadedAt: new Date(),
    };
  }

  const firstNameRaw = String(user.name || "User").trim().split(" ")[0] || "User";

  const firstName =
    firstNameRaw.charAt(0).toUpperCase() +
    firstNameRaw.slice(1).toLowerCase();

  const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const existingEnquiries = await Enquiry.find({
    enquiryNumber: {
      $regex: `^${escapedFirstName}-\\d+$`,
      $options: "i",
    },
  })
    .select("enquiryNumber")
    .lean();

  let lastNumber = 0;

  existingEnquiries.forEach((item) => {
    const match = String(item.enquiryNumber || "").match(/-(\d+)$/);

    if (match) {
      const number = Number(match[1]);
      if (number > lastNumber) lastNumber = number;
    }
  });

  let enquiryNumber = `${firstName}-${lastNumber + 1}`;

  while (await Enquiry.exists({ enquiryNumber })) {
    lastNumber += 1;
    enquiryNumber = `${firstName}-${lastNumber + 1}`;
  }

  const enquiry = await Enquiry.create({
    salesPersonId: user.id,
    enquiryNumber,

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
    quantityInKg: Number(quantityInKg),

    supplyCondition,
    otherSupplyConditions:
      supplyCondition === "other"
        ? String(otherSupplyConditions || "").trim()
        : "",

    modeOfEnquiry,

    sizePdf,

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

  if (feasibility) {
    if (
      feasibility.completed === true &&
      (!feasibility.status || feasibility.status === "pending")
    ) {
      throw new Error("Feasibility status is required when completed");
    }

    if (feasibility.status) {
      enquiry.feasibility.status = feasibility.status;
    }

    if (feasibility.completed !== undefined) {
      enquiry.feasibility.completed = feasibility.completed;

      if (feasibility.completed === true && !enquiry.feasibility.actualDate) {
        enquiry.feasibility.actualDate = new Date();
      }

      if (feasibility.completed === false) {
        enquiry.feasibility.actualDate = undefined;
      }
    }
  }

  if (quotation) {
    if (!enquiry.feasibility.completed) {
      throw new Error("Please complete feasibility before quotation update");
    }

    if (quotation.quotationLink !== undefined) {
      enquiry.quotation.quotationLink = quotation.quotationLink;
    }

    if (quotation.completed !== undefined) {
      enquiry.quotation.completed = quotation.completed;

      if (quotation.completed === true && !enquiry.quotation.actualDate) {
        enquiry.quotation.actualDate = new Date();
      }

      if (quotation.completed === false) {
        enquiry.quotation.actualDate = undefined;
      }
    }
  }

  if (closure) {
    if (!enquiry.quotation.completed) {
      throw new Error("Please complete quotation before closure update");
    }

    const allowedLostRemarks = [
      "price",
      "delivery",
      "qty",
      "quality",
      "payment_terms",
      "material_not_available",
      "others",
    ];

    if (closure.status) {
      enquiry.closure.status = closure.status;
    }

    if (closure.status === "lost") {
      if (!closure.lostRemark) {
        throw new Error("Lost remark is required when closure status is lost");
      }

      if (!allowedLostRemarks.includes(closure.lostRemark)) {
        throw new Error("Invalid lost remark selected");
      }

      enquiry.closure.lostRemark = closure.lostRemark;

      if (closure.lostRemark === "others") {
        if (!closure.lostRemarkOtherText || !closure.lostRemarkOtherText.trim()) {
          throw new Error("Other lost remark is required");
        }

        enquiry.closure.lostRemarkOtherText =
          closure.lostRemarkOtherText.trim();
      } else {
        enquiry.closure.lostRemarkOtherText = "";
      }
    }

    if (closure.status && closure.status !== "lost") {
      enquiry.closure.lostRemark = "";
      enquiry.closure.lostRemarkOtherText = "";
    }

    if (closure.completed !== undefined) {
      enquiry.closure.completed = closure.completed;

      if (closure.completed === true && !enquiry.closure.actualDate) {
        enquiry.closure.actualDate = new Date();
      }

      if (closure.completed === false) {
        enquiry.closure.actualDate = undefined;
      }
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

  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      filter.salesPersonId = salesPersonId;
    }
  } else {
    filter.salesPersonId = user.id;
  }

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

const createDailyUniqueEnquiryNotification = async ({
  enquiry,
  step,
  title,
  message,
  priority = "high",
}) => {
  try {
    if (!Notification) return;

    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const alreadyExists = await Notification.exists({
      module: "enquiry",
      event: "workflow_delayed",
      referenceId: enquiry._id,
      "meta.step": step,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    if (alreadyExists) return;

    await safeCreateNotification({
      module: "enquiry",
      event: "workflow_delayed",
      title,
      message,
      priority,
      targetUserIds: [enquiry.salesPersonId],
      targetRoles: [],
      createdBy: null,
      referenceId: enquiry._id,
      referenceModel: "Enquiry",
      actionUrl: "/dashboard#enquiry",
      meta: {
        step,
        enquiryNumber: enquiry.enquiryNumber,
        companyName: enquiry.companyName,
        customerName: enquiry.customerName,
        grade: enquiry.grade,
      },
    });
  } catch (error) {
    console.log("ENQUIRY DAILY NOTIFICATION ERROR =>", error.message);
  }
};

const processDelayedEnquiryNotifications = async () => {
  const now = new Date();

  const delayedEnquiries = await Enquiry.find({
    $or: [
      {
        "feasibility.completed": { $ne: true },
        "feasibility.planDate": { $lt: now },
      },
      {
        "feasibility.completed": true,
        "feasibility.status": "feasible",
        "quotation.completed": { $ne: true },
        "quotation.planDate": { $lt: now },
      },
      {
        "quotation.completed": true,
        "closure.completed": { $ne: true },
        "closure.status": { $nin: ["won", "lost"] },
        "closure.planDate": { $lt: now },
      },
    ],
  })
    .select(
      "salesPersonId enquiryNumber companyName customerName grade feasibility quotation closure"
    )
    .lean();

  const groupedByUser = {};

  delayedEnquiries.forEach((enquiry) => {
    const userId = String(enquiry.salesPersonId);

    if (!groupedByUser[userId]) {
      groupedByUser[userId] = {
        salesPersonId: enquiry.salesPersonId,
        total: 0,
        feasibility: 0,
        quotation: 0,
        closure: 0,
        companies: [],
      };
    }

    const group = groupedByUser[userId];

    if (
      enquiry.feasibility?.completed !== true &&
      enquiry.feasibility?.planDate &&
      new Date(enquiry.feasibility.planDate) < now
    ) {
      group.feasibility += 1;
      group.total += 1;
    } else if (
      enquiry.feasibility?.completed === true &&
      enquiry.feasibility?.status === "feasible" &&
      enquiry.quotation?.completed !== true &&
      enquiry.quotation?.planDate &&
      new Date(enquiry.quotation.planDate) < now
    ) {
      group.quotation += 1;
      group.total += 1;
    } else if (
      enquiry.quotation?.completed === true &&
      enquiry.closure?.completed !== true &&
      !["won", "lost"].includes(enquiry.closure?.status) &&
      enquiry.closure?.planDate &&
      new Date(enquiry.closure.planDate) < now
    ) {
      group.closure += 1;
      group.total += 1;
    }

    if (group.companies.length < 3) {
      group.companies.push(enquiry.companyName);
    }
  });

  let notificationsCreated = 0;

  for (const userId of Object.keys(groupedByUser)) {
    const group = groupedByUser[userId];

    if (!Notification) continue;

    const alreadyExists = await Notification.exists({
      module: "enquiry",
      event: "daily_delay_summary",
      targetUserIds: group.salesPersonId,
      createdAt: {
        $gte: startOfDay(),
        $lte: endOfDay(),
      },
    });

    if (alreadyExists) continue;

    await safeCreateNotification({
      module: "enquiry",
      event: "daily_delay_summary",
      title: "Enquiry Updates Pending",
      message: `You have ${group.total} delayed enquiry update(s): ${group.feasibility} feasibility, ${group.quotation} quotation, ${group.closure} closure.`,
      priority: "high",
      targetUserIds: [group.salesPersonId],
      targetRoles: [],
      createdBy: null,
      referenceId: null,
      referenceModel: "Enquiry",
      actionUrl: "/dashboard#enquiry",
      meta: {
        total: group.total,
        feasibility: group.feasibility,
        quotation: group.quotation,
        closure: group.closure,
        sampleCompanies: group.companies,
      },
    });

    notificationsCreated++;
  }

  return {
    checked: delayedEnquiries.length,
    usersNotified: Object.keys(groupedByUser).length,
    notificationsCreated,
  };
};

module.exports = {
  createEnquiry,
  updateWorkflow,
  getAllEnquiries,
  processDelayedEnquiryNotifications,
};