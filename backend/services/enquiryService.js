const mongoose = require("mongoose");
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
const whatsappApprovalService = require("./whatsappApprovalService");

const enquiryWhatsappQueue = [];
let enquiryWhatsappQueueRunning = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runEnquiryWhatsappQueue = async () => {
  if (enquiryWhatsappQueueRunning) return;

  enquiryWhatsappQueueRunning = true;

  while (enquiryWhatsappQueue.length > 0) {
    const job = enquiryWhatsappQueue.shift();

    try {
      await job();
    } catch (error) {
      console.log("ENQUIRY WHATSAPP QUEUE ERROR =>", error.message);
    }

    await sleep(1500);
  }

  enquiryWhatsappQueueRunning = false;
};

const enqueueEnquiryWhatsapp = (job) => {
  enquiryWhatsappQueue.push(job);
  runEnquiryWhatsappQueue();
};

const cleanWhatsappNumber = (number = "") => {
  const cleaned = String(number || "").replace(/\D/g, "");

  if (!cleaned) return "";

  if (cleaned.length === 10) return `91${cleaned}`;

  return cleaned;
};

const getWhatsappChatId = (number = "") => {
  const cleaned = cleanWhatsappNumber(number);

  if (!cleaned) return "";

  return `${cleaned}@c.us`;
};

const sendSafeEnquiryWhatsapp = async (number, message) => {
  const chatId = getWhatsappChatId(number);

  if (!chatId) {
    throw new Error("Customer WhatsApp number missing");
  }

  return whatsappApprovalService.sendPlainWhatsappMessage(chatId, message);
};

const formatShape = (shape = "") => {
  return String(shape || "-").toUpperCase();
};

const buildEnquiryMaterialBlock = (enquiry) => {
  return `📦 *Material:* ${enquiry.grade || "-"} ${formatShape(enquiry.shape)}
📏 *Size:* ${enquiry.size || "-"}
⚖️ *Quantity:* ${enquiry.quantityInKg || "-"} Kg`;
};

const sendEnquiryCreatedWhatsapp = async (enquiry, user) => {
  const message = `🙏 Hello *${enquiry.customerName || "Sir/Madam"}*,

Thank you for your enquiry with *Bharat Special Steels Pvt. Ltd.*

Your enquiry has been received and is now under process.

🧾 *Enquiry No:* ${enquiry.enquiryNumber || "-"}
🏢 *Company:* ${enquiry.companyName || "-"}
${buildEnquiryMaterialBlock(enquiry)}

👤 *Sales Person:* ${user?.name || "Our Sales Team"}

Our sales team will review your requirement and share the quotation shortly, usually within *24 hours*.

Thank you,
*Bharat Special Steels Pvt. Ltd.*`;

  return sendSafeEnquiryWhatsapp(enquiry.customerContactNo, message);
};

const sendQuotationDoneWhatsapp = async (enquiry) => {
  const quotationLink = enquiry.quotation?.quotationLink || "";

  const message = `📄 Hello *${enquiry.customerName || "Sir/Madam"}*,

Your quotation from *Bharat Special Steels Pvt. Ltd.* is ready.

🧾 *Enquiry No:* ${enquiry.enquiryNumber || "-"}
🏢 *Company:* ${enquiry.companyName || "-"}
${buildEnquiryMaterialBlock(enquiry)}

${quotationLink ? `🔗 *Quotation Link:*\n${quotationLink}` : ""}

Please review the quotation. For any clarification, our sales team will assist you.

Thank you,
*Bharat Special Steels Pvt. Ltd.*`;

  return sendSafeEnquiryWhatsapp(enquiry.customerContactNo, message);
};

const sendOrderWonWhatsapp = async (enquiry) => {
  const message = `✅ Hello *${enquiry.customerName || "Sir/Madam"}*,

Thank you for confirming your order with *Bharat Special Steels Pvt. Ltd.*

Your requirement has been taken into process.

🧾 *Enquiry No:* ${enquiry.enquiryNumber || "-"}
🏢 *Company:* ${enquiry.companyName || "-"}
${buildEnquiryMaterialBlock(enquiry)}

Our team will process the order and keep you informed once it is ready for dispatch.

Thank you for choosing us,
*Bharat Special Steels Pvt. Ltd.*`;

  return sendSafeEnquiryWhatsapp(enquiry.customerContactNo, message);
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
  /* Existing Supply Conditions */
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

  /* New General Supply Conditions - Hot Rolled */

  "hot_rolled",
  "hot_rolled_annealed",
  "hot_rolled_normalized",
  "hot_rolled_qt_ht",
  "hot_rolled_annealed_cold_drawn",
  "hot_rolled_annealed_peeled",
  "hot_rolled_normalized_peeled",
  "hot_rolled_normalized_cold_drawn",
  "hot_rolled_annealed_qt_ht",
  "hot_rolled_normalized_qt_ht",
  "hot_rolled_qt_peeled",
  "double_rolled_condition",

  /* New General Supply Conditions - Hot Forged */

  "hot_forged",
  "hot_forged_annealed",
  "hot_forged_normalized",
  "hot_forged_annealed_machined",
  "hot_forged_normalized_machined",
  "hot_forged_qt_ht",
  "hot_forged_qt_ht_machined",
  "hot_forged_rolled",

  /* Custom */

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
//   setImmediate(() => {
//   enqueueEnquiryWhatsapp(async () => {
//     try {
//       await sendEnquiryCreatedWhatsapp(enquiry, user);
//       console.log("ENQUIRY CREATED WHATSAPP SENT =>", enquiry.enquiryNumber);
//     } catch (waError) {
//       console.log("ENQUIRY CREATED WHATSAPP ERROR =>", waError.message);
//     }
//   });
// });
  return enquiry;
};

const updateWorkflow = async (id, body) => {
  const enquiry = await Enquiry.findById(id).populate(
    "salesPersonId",
    "name email mobileNumber whatsappNumber"
  );

  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  const wasQuotationCompleted = enquiry.quotation.completed === true;
  const previousClosureStatus = enquiry.closure.status;

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

  // const isQuotationCompletedNow =
  //   wasQuotationCompleted === false &&
  //   enquiry.quotation.completed === true &&
  //   enquiry.quotation.quotationLink;

  // const isWonNow =
  //   previousClosureStatus !== "won" &&
  //   enquiry.closure.status === "won" &&
  //   enquiry.closure.completed === true;

  // if (isQuotationCompletedNow) {
  //   setImmediate(() => {
  //     enqueueEnquiryWhatsapp(async () => {
  //       try {
  //         await sendQuotationDoneWhatsapp(enquiry);
  //         console.log("QUOTATION WHATSAPP SENT =>", enquiry.enquiryNumber);
  //       } catch (waError) {
  //         console.log("QUOTATION WHATSAPP ERROR =>", waError.message);
  //       }
  //     });
  //   });
  // }

  // if (isWonNow) {
  //   setImmediate(() => {
  //     enqueueEnquiryWhatsapp(async () => {
  //       try {
  //         await sendOrderWonWhatsapp(enquiry);
  //         console.log("ORDER WON WHATSAPP SENT =>", enquiry.enquiryNumber);
  //       } catch (waError) {
  //         console.log("ORDER WON WHATSAPP ERROR =>", waError.message);
  //       }
  //     });
  //   });
  // }

  return enquiry;
};
const escapeRegex = (text = "") => {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

const getEndOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
};

const buildStatusFilter = (status) => {
  switch (status) {
    case "pending":
      return {
        $and: [
          { "feasibility.status": { $ne: "not_feasible" } },
          { "closure.status": { $nin: ["won", "lost"] } },
          {
            $or: [
              { "feasibility.status": "pending" },
              { "quotation.completed": { $ne: true } },
              { "closure.status": "pending" },
            ],
          },
        ],
      };

    case "feasible":
      return {
        "feasibility.status": "feasible",
      };

    case "not_feasible":
      return {
        "feasibility.status": "not_feasible",
      };

    case "quotation_done":
      return {
        "quotation.completed": true,
      };

    case "won":
      return {
        "closure.status": "won",
      };

    case "lost":
      return {
        "closure.status": "lost",
      };

    default:
      return null;
  }
};

const getAllEnquiries = async (query, user) => {
  const {
  page = 1,
  limit = 30,
  salesPersonId,
  fromDate,
  toDate,
  companyName,
  search,
  status = "all",
  lostReason,
} = query;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Number(limit) || 30, 100);
  const skip = (safePage - 1) * safeLimit;

  const baseFilter = {
    isActive: { $ne: false },
  };

  if (user.role === "admin" || user.role === "super_admin") {
    if (salesPersonId) {
      baseFilter.salesPersonId = salesPersonId;
    }
  } else {
    baseFilter.salesPersonId = user._id || user.id;
  }

  // Default current month until date filter is applied
  baseFilter.enquiryDate = {};

  if (fromDate || toDate) {
    if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      baseFilter.enquiryDate.$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      baseFilter.enquiryDate.$lte = endDate;
    }
  } else {
    baseFilter.enquiryDate.$gte = getStartOfMonth();
    baseFilter.enquiryDate.$lte = getEndOfMonth();
  }

  const searchText = String(companyName || search || "").trim();

  if (searchText) {
    const regex = new RegExp(escapeRegex(searchText), "i");

    baseFilter.$or = [
  { companyName: regex },
  { customerName: regex },
  { customerContactNo: regex },
  { customerEmailId: regex },
  { enquiryNumber: regex },
  { grade: regex },
];
  }

  const finalFilter = { ...baseFilter };
  const cleanStatus = String(status || "all").trim();

  const selectedStatusFilter = buildStatusFilter(cleanStatus);

  if (selectedStatusFilter) {
    finalFilter.$and = [...(finalFilter.$and || []), selectedStatusFilter];
  }
   // =========================================================
// LOST REASON DRILL-DOWN FILTER
//
// Example:
// status=lost&lostReason=price
//
// This will show only enquiries lost due to price.
// =========================================================
if (
  cleanStatus === "lost" &&
  lostReason
) {
  const allowedLostReasons = [
    "price",
    "delivery",
    "qty",
    "quality",
    "payment_terms",
    "material_not_available",
    "others",
  ];

  const cleanLostReason =
    String(
      lostReason
    ).trim();

  if (
    !allowedLostReasons.includes(
      cleanLostReason
    )
  ) {
    throw new Error(
      "Invalid lost reason"
    );
  }

  finalFilter[
    "closure.lostRemark"
  ] = cleanLostReason;
}
  const summaryBaseFilter = { ...baseFilter };
  delete summaryBaseFilter.$and;

  const [
    totalRecords,
    enquiries,
    totalEnquiries,
    feasibleEnquiries,
    notFeasibleEnquiries,
    quotationDoneEnquiries,
    wonEnquiries,
    lostEnquiries,
    pendingEnquiries,
  ] = await Promise.all([
    Enquiry.countDocuments(finalFilter),

    Enquiry.find(finalFilter)
      .populate("salesPersonId", "name email role")
      .sort({ enquiryDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Enquiry.countDocuments(summaryBaseFilter),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("feasible")],
    }),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("not_feasible")],
    }),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("quotation_done")],
    }),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("won")],
    }),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("lost")],
    }),

    Enquiry.countDocuments({
      ...summaryBaseFilter,
      $and: [buildStatusFilter("pending")],
    }),
  ]);

  return {
    enquiries,
    summary: {
      totalEnquiries,
      feasibleEnquiries,
      notFeasibleEnquiries,
      quotationDoneEnquiries,
      wonEnquiries,
      lostEnquiries,
      pendingEnquiries,
      activeFilter: cleanStatus,
      defaultRange: fromDate || toDate ? "custom" : "current_month",
    },
    pagination: {
      totalRecords,
      currentPage: safePage,
      totalPages: Math.ceil(totalRecords / safeLimit),
      limit: safeLimit,
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

const getLostEnquiryReasons = async (query, user) => {
  const {
    fromDate,
    toDate,
    salesPersonId,
  } = query;

  const matchFilter = {
    "closure.status": "lost",
  };

  // =========================================================
  // ROLE BASED ACCESS
  //
  // Salesperson -> own data only
  // Admin / Super Admin -> all data
  // Admin / Super Admin can optionally filter salesperson
  // =========================================================
  if (
    user.role === "admin" ||
    user.role === "super_admin"
  ) {
    if (salesPersonId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          salesPersonId
        )
      ) {
        throw new Error(
          "Invalid sales person id"
        );
      }

      matchFilter.salesPersonId =
        new mongoose.Types.ObjectId(
          salesPersonId
        );
    }
  } else {
    const loggedInUserId =
      user._id || user.id;

    if (
      !mongoose.Types.ObjectId.isValid(
        loggedInUserId
      )
    ) {
      throw new Error(
        "Invalid logged in user id"
      );
    }

    matchFilter.salesPersonId =
      new mongoose.Types.ObjectId(
        loggedInUserId
      );
  }

  // =========================================================
  // DATE FILTER
  //
  // Custom dates when supplied.
  // Otherwise use current month.
  // =========================================================
  if (fromDate || toDate) {
    matchFilter.enquiryDate = {};

    if (fromDate) {
      matchFilter.enquiryDate.$gte =
        new Date(
          `${fromDate}T00:00:00.000+05:30`
        );
    }

    if (toDate) {
      matchFilter.enquiryDate.$lte =
        new Date(
          `${toDate}T23:59:59.999+05:30`
        );
    }
  } else {
    const now = new Date();

    const istNow = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const year =
      istNow.getFullYear();

    const month =
      istNow.getMonth() + 1;

    const lastDay =
      new Date(
        year,
        month,
        0
      ).getDate();

    matchFilter.enquiryDate = {
      $gte: new Date(
        `${year}-${String(
          month
        ).padStart(
          2,
          "0"
        )}-01T00:00:00.000+05:30`
      ),

      $lte: new Date(
        `${year}-${String(
          month
        ).padStart(
          2,
          "0"
        )}-${String(
          lastDay
        ).padStart(
          2,
          "0"
        )}T23:59:59.999+05:30`
      ),
    };
  }

  // =========================================================
  // STANDARD LOST REASONS
  // =========================================================
  const LOST_REASONS = [
    "price",
    "delivery",
    "qty",
    "quality",
    "payment_terms",
    "material_not_available",
    "others",
  ];

  const REASON_LABELS = {
    price: "Price",
    delivery: "Delivery",
    qty: "Quantity",
    quality: "Quality",
    payment_terms: "Payment Terms",
    material_not_available:
      "Material Not Available",
    others: "Others",
  };

  // =========================================================
  // AGGREGATE
  // =========================================================
  const result =
    await Enquiry.aggregate([
      {
        $match: matchFilter,
      },

      {
        $match: {
          "closure.lostRemark": {
            $in: LOST_REASONS,
          },
        },
      },

      {
        $group: {
          _id:
            "$closure.lostRemark",

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

  const totalLost =
    result.reduce(
      (sum, item) =>
        sum +
        Number(item.count || 0),
      0
    );

  // =========================================================
  // FORMAT PIE CHART RESPONSE
  //
  // No custom remarks / other text included.
  // =========================================================
  const reasons =
    result.map((item) => {
      const count =
        Number(
          item.count || 0
        );

      const percentage =
        totalLost > 0
          ? Number(
              (
                (count /
                  totalLost) *
                100
              ).toFixed(1)
            )
          : 0;

      return {
        reason: item._id,

        label:
          REASON_LABELS[
            item._id
          ] ||
          item._id,

        count,

        percentage,
      };
    });

  return {
    totalLost,

    reasons,

    dateRange: {
      fromDate:
        matchFilter
          .enquiryDate
          ?.$gte || null,

      toDate:
        matchFilter
          .enquiryDate
          ?.$lte || null,
    },

    salesPersonId:
      user.role === "admin" ||
      user.role ===
        "super_admin"
        ? salesPersonId ||
          null
        : String(
            user._id ||
              user.id
          ),
  };
};

module.exports = {
  createEnquiry,
  updateWorkflow,
  getAllEnquiries,
  getLostEnquiryReasons,
  processDelayedEnquiryNotifications,
};