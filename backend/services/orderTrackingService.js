const mongoose = require("mongoose");

const OrderTracking = require(
  "../model/OrderTracking"
);

const OrderTrackingMessage = require(
  "../model/OrderTrackingMessage"
);

const SalesOrderForm = require(
  "../model/salesOrderModel"
);

const {
  getFileTypeFromMime,
} = require(
  "../util/uploadOrderTrackingFiles"
);

const PRIVILEGED_ROLES = new Set([
  "super_admin",
  "admin",
  "manager",
  "dispatch",
  "production",
]);

const ALL_STATUSES =
  OrderTracking.ORDER_TRACKING_STATUSES || [
    "order_approved",
    "planning",
    "material_pending",
    "cutting_started",
    "cutting_partial",
    "cutting_completed",
    "machining_started",
    "machining_partial",
    "machining_completed",
    "ready_for_dispatch",
    "loading_started",
    "dispatched",
    "in_transit",
    "reached_destination",
    "delivered",
    "on_hold",
    "cancelled",
  ];

const UPDATE_REQUEST_COOLDOWN_MINUTES = Number(
  process.env
    .ORDER_TRACKING_UPDATE_REQUEST_COOLDOWN_MINUTES ||
    30
);

const escapeRegex = (value = "") =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const getAuthenticatedUserId = (user = {}) =>
  user?._id ||
  user?.id ||
  user?.userId ||
  user?.user?._id ||
  user?.user?.id ||
  user?.user?.userId ||
  null;

const createUserSnapshot = (user = {}) => {
  const userId = getAuthenticatedUserId(user);

  if (!userId) {
    const error = new Error(
      "Authenticated user ID is missing."
    );

    error.statusCode = 401;
    throw error;
  }

  return {
    userId,
    name:
      user.name ||
      user.fullName ||
      user.username ||
      user.user?.name ||
      "",
    email:
      user.email ||
      user.user?.email ||
      "",
    role:
      user.role ||
      user.user?.role ||
      "user",
  };
};

const isPrivilegedUser = (user = {}) =>
  PRIVILEGED_ROLES.has(
    String(
      user.role ||
        user.user?.role ||
        ""
    ).toLowerCase()
  );

const getTrackingAccessFilter = (user = {}) => {
  if (isPrivilegedUser(user)) {
    return {};
  }

  const userId =
    getAuthenticatedUserId(user);

  if (!userId) {
    return {
      _id: null,
    };
  }

  return {
    salesPersonId: userId,
  };
};

const ensureValidObjectId = (
  value,
  fieldName = "ID"
) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(
      `${fieldName} is invalid.`
    );

    error.statusCode = 400;
    throw error;
  }
};

const ensureStatusValid = (status) => {
  if (!ALL_STATUSES.includes(status)) {
    const error = new Error(
      "Invalid order tracking status."
    );

    error.statusCode = 400;
    throw error;
  }
};

const parseOptionalDate = (value) => {
  if (!value) return null;

  const parsedDate = new Date(value);

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    const error = new Error(
      "Invalid date value."
    );

    error.statusCode = 400;
    throw error;
  }

  return parsedDate;
};

const normalizeAddressText = (
  value
) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    return String(
      value.address ||
        value.fullAddress ||
        value.value ||
        ""
    ).trim();
  }

  return String(value).trim();
};

const getSalesOrderMaterialSnapshot = (
  salesOrder = {}
) => {
  /*
   * Current SalesOrderModel stores the full
   * material description in this required field.
   */
  const sizeGradeQuantityRate =
    String(
      salesOrder.sizeGradeQuantityRate ||
        ""
    ).trim();

  if (sizeGradeQuantityRate) {
    return sizeGradeQuantityRate;
  }

  /*
   * Compatibility with old Sales Order records
   * or alternate document structures.
   */
  const directTextCandidates = [
    salesOrder.materialSnapshot,
    salesOrder.materialDescription,
    salesOrder.materialDetails,
    salesOrder.orderMaterialDetails,
    salesOrder.originalMaterialDetails,
    salesOrder.orderMaterial,
    salesOrder.productDescription,
    salesOrder.description,
    salesOrder.gradeSizeDetails,
    salesOrder.sizeDetails,
  ];

  const directText =
    directTextCandidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim()
    );

  if (directText) {
    return directText.trim();
  }

  const arrayCandidates = [
    salesOrder.items,
    salesOrder.materials,
    salesOrder.materialItems,
    salesOrder.orderItems,
    salesOrder.products,
    salesOrder.materialLots,
  ];

  const materialArray =
    arrayCandidates.find(
      (value) =>
        Array.isArray(value) &&
        value.length > 0
    );

  if (materialArray) {
    return materialArray
      .map((item, index) => {
        const grade =
          item?.grade ||
          item?.materialGrade ||
          item?.productGrade ||
          "";

        const size =
          item?.size ||
          item?.materialSize ||
          item?.dimension ||
          item?.dimensions ||
          "";

        const description =
          item?.materialDescription ||
          item?.description ||
          item?.productDescription ||
          "";

        const quantity =
          item?.quantity ??
          item?.qty ??
          item?.orderQty ??
          item?.totalQty ??
          item?.weight ??
          item?.quantityInKgs ??
          "";

        const rate =
          item?.rate ??
          item?.price ??
          item?.unitRate ??
          "";

        const unit =
          item?.unit ||
          item?.quantityUnit ||
          (quantity !== ""
            ? "kg"
            : "");

        const materialParts = [
          grade,
          size,
          description,
        ]
          .map((value) =>
            String(value || "").trim()
          )
          .filter(Boolean);

        const outputParts = [];

        if (materialParts.length) {
          outputParts.push(
            materialParts.join(" · ")
          );
        }

        if (quantity !== "") {
          const parsedQuantity =
            Number(quantity);

          const quantityText =
            Number.isFinite(
              parsedQuantity
            )
              ? parsedQuantity.toLocaleString(
                  "en-IN"
                )
              : String(quantity).trim();

          outputParts.push(
            `${quantityText} ${String(
              unit || ""
            ).toUpperCase()}`.trim()
          );
        }

        if (rate !== "") {
          const parsedRate =
            Number(rate);

          const rateText =
            Number.isFinite(parsedRate)
              ? parsedRate.toLocaleString(
                  "en-IN"
                )
              : String(rate).trim();

          outputParts.push(
            `Rate: ${rateText}`
          );
        }

        if (!outputParts.length) {
          return "";
        }

        return `${index + 1}. ${outputParts.join(
          " — "
        )}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const generateTrackingNumber =
  async () => {
    const year = new Date().getFullYear();

    const prefix = `OT-${year}-`;

    const lastRecord =
      await OrderTracking.findOne({
        trackingNumber: {
          $regex: `^${prefix}`,
        },
      })
        .sort({
          trackingNumber: -1,
        })
        .select("trackingNumber")
        .lean();

    let nextSequence = 1;

    if (lastRecord?.trackingNumber) {
      const currentSequence = Number(
        lastRecord.trackingNumber.split(
          "-"
        )[2]
      );

      if (
        Number.isFinite(currentSequence)
      ) {
        nextSequence =
          currentSequence + 1;
      }
    }

    return `${prefix}${String(
      nextSequence
    ).padStart(5, "0")}`;
  };

const normalizeUploadedFiles = (
  files = [],
  body = {}
) => {
  const durations = [];

  if (
    Array.isArray(body.durationSeconds)
  ) {
    durations.push(
      ...body.durationSeconds
    );
  } else if (
    body.durationSeconds !== undefined
  ) {
    durations.push(body.durationSeconds);
  }

  return files.map((file, index) => {
    const fileType =
      getFileTypeFromMime(
        file.mimetype
      );

    const folder =
      fileType === "image"
        ? "images"
        : fileType === "audio"
        ? "audio"
        : fileType === "video"
        ? "videos"
        : "documents";

    return {
      fileName: file.filename,
      originalName:
        file.originalname || "",
      fileUrl: `/uploads/order-tracking/${folder}/${file.filename}`,
      mimeType: file.mimetype || "",
      fileType,
      fileSize: Number(
        file.size || 0
      ),
      durationSeconds:
        fileType === "audio"
          ? Number(
              durations[index] || 0
            )
          : 0,
    };
  });
};

const buildReplySnapshot = async (
  replyToMessageId,
  trackingId
) => {
  if (!replyToMessageId) {
    return null;
  }

  ensureValidObjectId(
    replyToMessageId,
    "Reply message ID"
  );

  const repliedMessage =
    await OrderTrackingMessage.findOne({
      _id: replyToMessageId,
      trackingId,
      isDeleted: false,
    })
      .select(
        "sender text messageType"
      )
      .lean();

  if (!repliedMessage) {
    const error = new Error(
      "Reply message not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return {
    messageId: repliedMessage._id,
    senderName:
      repliedMessage.sender?.name ||
      "",
    text:
      String(
        repliedMessage.text || ""
      ).slice(0, 250),
    messageType:
      repliedMessage.messageType ||
      "text",
  };
};

const determineMessageType = (
  text,
  attachments = [],
  requestedType = ""
) => {
  if (
    [
      "system",
      "status_update",
      "update_request",
    ].includes(requestedType)
  ) {
    return requestedType;
  }

  const hasText =
    Boolean(String(text || "").trim());

  if (!attachments.length) {
    return hasText ? "text" : "text";
  }

  const types = [
    ...new Set(
      attachments.map(
        (attachment) =>
          attachment.fileType
      )
    ),
  ];

  if (
    hasText ||
    types.length > 1 ||
    attachments.length > 1
  ) {
    return "mixed";
  }

  return types[0] || "document";
};

const clearUpdateRequest = (
  tracking,
  userSnapshot
) => {
  tracking.updateRequested = false;
  tracking.updateRequestedAt = null;
  tracking.updateRequestedBy = null;
  tracking.lastUpdatedBy =
    userSnapshot;
};

const createSystemMessage = async ({
  tracking,
  sender,
  text,
  messageType = "system",
  attachments = [],
}) =>
  OrderTrackingMessage.create({
    trackingId: tracking._id,
    salesOrderId:
      tracking.salesOrderId,
    sender,
    text,
    messageType,
    attachments,
    isSystemMessage: true,
    readBy: [
      {
        userId:
          sender.userId,
        name:
          sender.name || "",
        email:
          sender.email || "",
        role:
          sender.role || "user",
        readAt:
          new Date(),
      },
    ],
  });




  const createTrackingFromSalesOrder = async (
  salesOrderOrId,
  user = {}
) => {
  let salesOrder = salesOrderOrId;

  if (
    typeof salesOrderOrId === "string" ||
    salesOrderOrId instanceof mongoose.Types.ObjectId
  ) {
    ensureValidObjectId(
      salesOrderOrId,
      "Sales Order ID"
    );

    salesOrder =
      await SalesOrderForm.findById(
        salesOrderOrId
      ).lean();
  }

  if (!salesOrder?._id) {
    const error = new Error(
      "Sales order not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const existing =
    await OrderTracking.findOne({
      salesOrderId: salesOrder._id,
      isActive: true,
    });

  if (existing) {
    return existing;
  }

  const creatorSnapshot =
    createUserSnapshot(user);

  const trackingNumber =
    await generateTrackingNumber();

  const materialSnapshot =
    getSalesOrderMaterialSnapshot(
      salesOrder
    );

  const companyAddress =
    normalizeAddressText(
      salesOrder.companyAddress
    );

  let shippingAddress =
    normalizeAddressText(
      salesOrder.shippingAddress
    );

  if (
    salesOrder.shippingAddress &&
    typeof salesOrder.shippingAddress ===
      "object" &&
    salesOrder.shippingAddress
      .sameAsCompanyAddress
  ) {
    shippingAddress =
      companyAddress;
  }

  if (!shippingAddress) {
    shippingAddress =
      companyAddress;
  }

  const tracking =
    await OrderTracking.create({
      trackingNumber,

      salesOrderId:
        salesOrder._id,

      salesOrderNo:
        salesOrder.salesOrderNo ||
        salesOrder.checklistNumber ||
        salesOrder.orderReference ||
        "",

      poNumber:
        salesOrder.poNumber || "",

      companyName:
        salesOrder.companyName ||
        "Unknown Company",

      companyAddress,

      shippingAddress,

      contactPersonName:
        salesOrder.contactPersonName ||
        "",

      contactPersonNumber:
        salesOrder.contactPersonNumber ||
        "",

      contactPersonEmail:
        salesOrder.contactPersonEmail ||
        "",

      salesPersonId:
        salesOrder.salesPersonId ||
        null,

      salesPersonName:
        salesOrder.salesPersonName ||
        "",

      salesPersonEmail:
        salesOrder.salesPersonEmail ||
        "",

      materialSnapshot:
        materialSnapshot ||
        "Material information not available in the Sales Order.",

      currentStatus:
        "order_approved",

      previousStatus: null,

      priority: "normal",

      sourcePlant: {
        plantName: "",
        plantCode: "",
      },

      transporter: {
        transporterName: "",
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
      },

      latestUpdateText:
        "Sales order approved and added to Order Tracking.",

      latestUpdateAt:
        new Date(),

      latestUpdateBy:
        creatorSnapshot,

      updateRequested: false,

      chatStatus: "open",

      unreadCountByUser: [],

      statusHistory: [
        {
          status:
            "order_approved",

          previousStatus: null,

          comment:
            "Sales order approved and added to Order Tracking.",

          transporterName:
            "",

          attachments: [],

          updatedBy:
            creatorSnapshot,

          createdAt:
            new Date(),
        },
      ],

      createdBy:
        creatorSnapshot,

      lastUpdatedBy:
        creatorSnapshot,

      isActive: true,
    });

  await createSystemMessage({
    tracking,
    sender: creatorSnapshot,
    text:
      "Sales order approved and added to Order Tracking.",
    messageType: "system",
  });

  return tracking;
};

const syncApprovedSalesOrders =
  async (user = {}) => {
    const creatorSnapshot =
      createUserSnapshot(user);

    const approvedOrders =
      await SalesOrderForm.find({
        isActive: {
          $ne: false,
        },
        approvalStatus: {
          $in: [
            "approved",
            "finally_approved",
            "manager_approved",
            "manager_direct_approved",
          ],
        },
      }).lean();

    const existingRecords =
      await OrderTracking.find({
        salesOrderId: {
          $in: approvedOrders.map(
            (order) => order._id
          ),
        },
        isActive: true,
      })
        .select(
          "_id salesOrderId materialSnapshot companyAddress shippingAddress"
        )
        .lean();

    const existingBySalesOrderId =
      new Map(
        existingRecords.map(
          (record) => [
            String(
              record.salesOrderId
            ),
            record,
          ]
        )
      );

    let createdCount = 0;
    let updatedCount = 0;

    for (const salesOrder of approvedOrders) {
      const existing =
        existingBySalesOrderId.get(
          String(salesOrder._id)
        );

      if (!existing) {
        await createTrackingFromSalesOrder(
          salesOrder,
          creatorSnapshot
        );

        createdCount += 1;
        continue;
      }

      const materialSnapshot =
        getSalesOrderMaterialSnapshot(
          salesOrder
        );

      const companyAddress =
        normalizeAddressText(
          salesOrder.companyAddress
        );

      let shippingAddress =
        normalizeAddressText(
          salesOrder.shippingAddress
        );

      if (
        salesOrder.shippingAddress &&
        typeof salesOrder.shippingAddress ===
          "object" &&
        salesOrder.shippingAddress
          .sameAsCompanyAddress
      ) {
        shippingAddress =
          companyAddress;
      }

      if (!shippingAddress) {
        shippingAddress =
          companyAddress;
      }

      const updatePayload = {
        materialSnapshot:
          materialSnapshot ||
          "Material information not available in the Sales Order.",
        companyAddress,
        shippingAddress,
      };

      const needsUpdate =
        existing.materialSnapshot !==
          updatePayload.materialSnapshot ||
        existing.companyAddress !==
          updatePayload.companyAddress ||
        existing.shippingAddress !==
          updatePayload.shippingAddress;

      if (needsUpdate) {
        await OrderTracking.updateOne(
          {
            _id: existing._id,
          },
          {
            $set: updatePayload,
          }
        );

        updatedCount += 1;
      }
    }

    return {
      approvedOrders:
        approvedOrders.length,
      createdCount,
      updatedCount,
      alreadyExisting:
        approvedOrders.length -
        createdCount,
    };
  };

const getTrackingDashboard =
  async (user = {}) => {
    const accessFilter =
      getTrackingAccessFilter(user);

    const baseFilter = {
      isActive: true,
      ...accessFilter,
    };

    const [
      statusCounts,
      updateRequestedCount,
      chatClosedCount,
      total,
    ] = await Promise.all([
      OrderTracking.aggregate([
        {
          $match: baseFilter,
        },
        {
          $group: {
            _id: "$currentStatus",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      OrderTracking.countDocuments({
        ...baseFilter,
        updateRequested: true,
      }),

      OrderTracking.countDocuments({
        ...baseFilter,
        chatStatus: "closed",
      }),

      OrderTracking.countDocuments(
        baseFilter
      ),
    ]);

    const result = {
      total,
      updateRequested:
        updateRequestedCount,
      chatClosed: chatClosedCount,
    };

    ALL_STATUSES.forEach((status) => {
      result[status] = 0;
    });

    statusCounts.forEach((item) => {
      result[item._id] = item.count;
    });

    return result;
  };

const getTrackingList = async ({
  query = {},
  user = {},
}) => {
  const page = Math.max(
    Number(query.page || 1),
    1
  );

  const limit = Math.min(
    Math.max(
      Number(query.limit || 30),
      1
    ),
    100
  );

  const skip =
    (page - 1) * limit;

  const filter = {
    isActive: true,
    ...getTrackingAccessFilter(user),
  };

  if (query.status) {
    ensureStatusValid(query.status);

    filter.currentStatus =
      query.status;
  }

  if (query.priority) {
    filter.priority =
      query.priority;
  }

  if (query.updateRequested !== undefined) {
    filter.updateRequested =
      String(
        query.updateRequested
      ) === "true";
  }

  if (query.chatStatus) {
    filter.chatStatus =
      query.chatStatus;
  }

  if (query.salesPersonId) {
    ensureValidObjectId(
      query.salesPersonId,
      "Sales person ID"
    );

    filter.salesPersonId =
      query.salesPersonId;
  }

  if (query.fromDate || query.toDate) {
    filter.latestUpdateAt = {};

    if (query.fromDate) {
      filter.latestUpdateAt.$gte =
        new Date(query.fromDate);
    }

    if (query.toDate) {
      const endDate =
        new Date(query.toDate);

      endDate.setHours(
        23,
        59,
        59,
        999
      );

      filter.latestUpdateAt.$lte =
        endDate;
    }
  }

  if (query.search) {
    const searchRegex = new RegExp(
      escapeRegex(query.search),
      "i"
    );

    filter.$or = [
      {
        trackingNumber:
          searchRegex,
      },
      {
        salesOrderNo:
          searchRegex,
      },
      {
        poNumber: searchRegex,
      },
      {
        companyName:
          searchRegex,
      },
      {
        salesPersonName:
          searchRegex,
      },
      {
        materialSnapshot:
          searchRegex,
      },
      {
        latestUpdateText:
          searchRegex,
      },
      {
        "sourcePlant.plantName":
          searchRegex,
      },
      {
        "transporter.transporterName":
          searchRegex,
      },
    ];
  }

  const [data, total] =
    await Promise.all([
      OrderTracking.find(filter)
        .sort({
          updateRequested: -1,
          latestUpdateAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      OrderTracking.countDocuments(
        filter
      ),
    ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(
        Math.ceil(total / limit),
        1
      ),
    },
  };
};

const getTrackingById =
  async ({
    trackingId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(user),
      }).lean();

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    const messageCount =
      await OrderTrackingMessage.countDocuments(
        {
          trackingId,
          isDeleted: false,
        }
      );

    return {
      tracking,
      messageCount,
    };
  };

const updateTrackingStatus =
  async ({
    trackingId,
    payload = {},
    files = [],
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const newStatus =
      String(
        payload.status || ""
      ).trim();

    ensureStatusValid(newStatus);

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(user),
      });

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    if (
      tracking.chatStatus ===
        "closed" &&
      !isPrivilegedUser(user)
    ) {
      const error = new Error(
        "This order tracking chat is closed."
      );

      error.statusCode = 403;
      throw error;
    }

    const attachments =
      normalizeUploadedFiles(
        files,
        payload
      );

    const previousStatus =
      tracking.currentStatus;

    const comment =
      String(
        payload.comment || ""
      ).trim();

    tracking.previousStatus =
      previousStatus;

    tracking.currentStatus =
      newStatus;

    tracking.latestUpdateText =
      comment ||
      `Status updated to ${newStatus.replaceAll(
        "_",
        " "
      )}.`;

    tracking.latestUpdateAt =
      new Date();

    tracking.latestUpdateBy =
      userSnapshot;

    tracking.lastUpdatedBy =
      userSnapshot;

    if (payload.priority) {
      tracking.priority =
        payload.priority;
    }

    if (payload.plantName !== undefined) {
      tracking.sourcePlant.plantName =
        String(
          payload.plantName || ""
        ).trim();
    }

    if (payload.plantCode !== undefined) {
      tracking.sourcePlant.plantCode =
        String(
          payload.plantCode || ""
        ).trim();
    }

    if (
      payload.expectedReadyDate !==
      undefined
    ) {
      tracking.expectedReadyDate =
        parseOptionalDate(
          payload.expectedReadyDate
        );
    }

    if (
      payload.expectedDispatchDate !==
      undefined
    ) {
      tracking.expectedDispatchDate =
        parseOptionalDate(
          payload.expectedDispatchDate
        );
    }

    if (
      payload.expectedDeliveryDateTime !==
      undefined
    ) {
      tracking.expectedDeliveryDateTime =
        parseOptionalDate(
          payload.expectedDeliveryDateTime
        );
    }

    if (
      payload.transporterName !==
      undefined
    ) {
      tracking.transporter.transporterName =
        String(
          payload.transporterName || ""
        ).trim();
    }

    if (
      payload.vehicleNumber !==
      undefined
    ) {
      tracking.transporter.vehicleNumber =
        String(
          payload.vehicleNumber || ""
        ).trim();
    }

    if (
      payload.driverName !==
      undefined
    ) {
      tracking.transporter.driverName =
        String(
          payload.driverName || ""
        ).trim();
    }

    if (
      payload.driverPhone !==
      undefined
    ) {
      tracking.transporter.driverPhone =
        String(
          payload.driverPhone || ""
        ).trim();
    }

    if (newStatus === "dispatched") {
      tracking.dispatchDateTime =
        parseOptionalDate(
          payload.dispatchDateTime
        ) || new Date();
    }

    if (newStatus === "delivered") {
      tracking.deliveredAt =
        parseOptionalDate(
          payload.deliveredAt
        ) || new Date();

      tracking.deliveredBy =
        userSnapshot;

      tracking.receiverName =
        String(
          payload.receiverName || ""
        ).trim();

      tracking.chatStatus =
        "closed";
    }

    clearUpdateRequest(
      tracking,
      userSnapshot
    );

    tracking.statusHistory.push({
      status: newStatus,
      previousStatus,
      comment,
      transporterName:
        String(
          payload.transporterName ||
            ""
        ).trim(),
      expectedDateTime:
        parseOptionalDate(
          payload.expectedDateTime ||
            payload.expectedDeliveryDateTime
        ),
      attachments,
      updatedBy:
        userSnapshot,
      createdAt: new Date(),
    });

    await tracking.save();

    const statusLabel =
      newStatus.replaceAll("_", " ");

    await createSystemMessage({
      tracking,
      sender: userSnapshot,
      text:
        comment ||
        `Order status updated to ${statusLabel}.`,
      messageType:
        "status_update",
      attachments,
    });

    return tracking;
  };

const requestOrderUpdate =
  async ({
    trackingId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(user),
      });

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    if (
      tracking.chatStatus ===
      "closed"
    ) {
      const error = new Error(
        "Update cannot be requested because the order chat is closed."
      );

      error.statusCode = 400;
      throw error;
    }

    if (
      tracking.updateRequested &&
      tracking.updateRequestedAt
    ) {
      const cooldownMilliseconds =
        UPDATE_REQUEST_COOLDOWN_MINUTES *
        60 *
        1000;

      const elapsed =
        Date.now() -
        new Date(
          tracking.updateRequestedAt
        ).getTime();

      if (
        elapsed <
        cooldownMilliseconds
      ) {
        const remainingMinutes =
          Math.ceil(
            (cooldownMilliseconds -
              elapsed) /
              60000
          );

        const error = new Error(
          `An update was already requested. Please wait ${remainingMinutes} minute(s).`
        );

        error.statusCode = 429;
        throw error;
      }
    }

    tracking.updateRequested = true;
    tracking.updateRequestedAt =
      new Date();

    tracking.updateRequestedBy =
      userSnapshot;

    tracking.latestUpdateText =
      `${userSnapshot.name || "A team member"} requested an order update.`;

    tracking.latestUpdateAt =
      new Date();

    tracking.latestUpdateBy =
      userSnapshot;

    tracking.lastUpdatedBy =
      userSnapshot;

    await tracking.save();

    const message =
      await createSystemMessage({
        tracking,
        sender: userSnapshot,
        text: `${
          userSnapshot.name ||
          "A team member"
        } requested an order update.`,
        messageType:
          "update_request",
      });

    return {
      tracking,
      message,
    };
  };

const addTrackingParticipant = async (
  trackingId,
  userSnapshot
) => {
  const existingParticipant =
    await OrderTracking.exists({
      _id: trackingId,
      "chatParticipants.userId":
        userSnapshot.userId,
    });

  if (existingParticipant) {
    await OrderTracking.updateOne(
      {
        _id: trackingId,
        "chatParticipants.userId":
          userSnapshot.userId,
      },
      {
        $set: {
          "chatParticipants.$.name":
            userSnapshot.name || "",

          "chatParticipants.$.email":
            userSnapshot.email || "",

          "chatParticipants.$.role":
            userSnapshot.role ||
            "user",

          "chatParticipants.$.lastSeenAt":
            new Date(),
        },
      }
    );

    return;
  }

  await OrderTracking.updateOne(
    {
      _id: trackingId,
    },
    {
      $push: {
        chatParticipants: {
          userId:
            userSnapshot.userId,

          name:
            userSnapshot.name || "",

          email:
            userSnapshot.email || "",

          role:
            userSnapshot.role ||
            "user",

          joinedAt:
            new Date(),

          lastSeenAt:
            new Date(),
        },
      },
    }
  );
};

const getExpectedMessageReaders = (
  tracking,
  senderId
) => {
  const readerIds = new Set();

  const addReader = (value) => {
    if (
      value &&
      String(value) !==
        String(senderId)
    ) {
      readerIds.add(
        String(value)
      );
    }
  };

  (
    tracking.chatParticipants ||
    []
  ).forEach((participant) => {
    addReader(
      participant.userId
    );
  });

  addReader(
    tracking.salesPersonId
  );

  addReader(
    tracking.createdBy?.userId
  );

  addReader(
    tracking.lastUpdatedBy
      ?.userId
  );

  return Array.from(readerIds);
};

const sendTrackingMessage =
  async ({
    trackingId,
    payload = {},
    files = [],
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(user),
      });

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }
    await addTrackingParticipant(
      tracking._id,
      userSnapshot
    );

    if (
      tracking.chatStatus ===
        "closed" &&
      !isPrivilegedUser(user)
    ) {
      const error = new Error(
        "This chat is closed."
      );

      error.statusCode = 403;
      throw error;
    }

    const text =
      String(
        payload.text || ""
      ).trim();

    const attachments =
      normalizeUploadedFiles(
        files,
        payload
      );

    if (
      !text &&
      !attachments.length
    ) {
      const error = new Error(
        "Message text or attachment is required."
      );

      error.statusCode = 400;
      throw error;
    }

    const replyTo =
      await buildReplySnapshot(
        payload.replyToMessageId,
        trackingId
      );

    const messageType =
      determineMessageType(
        text,
        attachments,
        payload.messageType
      );

    const message =
      await OrderTrackingMessage.create(
        {
          trackingId:
            tracking._id,
          salesOrderId:
            tracking.salesOrderId,
          sender: userSnapshot,
          text,
          messageType,
          attachments,
          replyTo,
          readBy: [
            {
              userId:
                userSnapshot.userId,
              name:
                userSnapshot.name,
              email:
                userSnapshot.email,
              role:
                userSnapshot.role,
              readAt:
                new Date(),
            },
          ],
        }
      );

    tracking.latestUpdateText =
      text ||
      `${userSnapshot.name || "User"} uploaded ${attachments.length} file(s).`;

    tracking.latestUpdateAt =
      new Date();

    tracking.latestUpdateBy =
      userSnapshot;

    tracking.lastUpdatedBy =
      userSnapshot;

    clearUpdateRequest(
      tracking,
      userSnapshot
    );

    await tracking.save();

    return message;
  };

const getTrackingMessages =
  async ({
    trackingId,
    query = {},
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(
          user
        ),
      }).lean();

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    await addTrackingParticipant(
      trackingId,
      userSnapshot
    );

    const page = Math.max(
      Number(query.page || 1),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(query.limit || 50),
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    /*
     * Do not filter out messages deleted
     * for everyone. The frontend needs
     * the record to display the deleted
     * message placeholder.
     */
    const filter = {
      trackingId,
      isDeleted: {
        $ne: true,
      },
    };

    if (query.before) {
      ensureValidObjectId(
        query.before,
        "Before message ID"
      );

      const beforeMessage =
        await OrderTrackingMessage
          .findById(query.before)
          .select("createdAt")
          .lean();

      if (beforeMessage) {
        filter.createdAt = {
          $lt:
            beforeMessage.createdAt,
        };
      }
    }

    const [messages, total] =
      await Promise.all([
        OrderTrackingMessage.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        OrderTrackingMessage
          .countDocuments(filter),
      ]);

    const refreshedTracking =
      await OrderTracking.findById(
        trackingId
      )
        .select(
          [
            "chatParticipants",
            "salesPersonId",
            "createdBy",
            "lastUpdatedBy",
          ].join(" ")
        )
        .lean();

    const enrichedMessages =
      messages
        .reverse()
        .map((message) => {
          const senderId =
            message.sender?.userId;

          const expectedReaders =
            getExpectedMessageReaders(
              refreshedTracking ||
                tracking,
              senderId
            );

          const actualReaderIds =
            new Set(
              (
                message.readBy || []
              ).map((receipt) =>
                String(
                  receipt.userId
                )
              )
            );

          const seenReaderCount =
            expectedReaders.filter(
              (readerId) =>
                actualReaderIds.has(
                  readerId
                )
            ).length;

          const isSeenByAll =
            expectedReaders.length >
              0 &&
            seenReaderCount ===
              expectedReaders.length;

          if (
            message
              .deletedForEveryone
          ) {
            return {
              ...message,

              text: "",

              attachments: [],

              isDeleted: true,

              participantCount:
                expectedReaders.length,

              seenReaderCount,

              isSeenByAll,
            };
          }

          return {
            ...message,

            participantCount:
              expectedReaders.length,

            seenReaderCount,

            isSeenByAll,
          };
        });

    return {
      data: enrichedMessages,

      pagination: {
        page,
        limit,
        total,

        totalPages: Math.max(
          Math.ceil(
            total / limit
          ),
          1
        ),
      },
    };
  };

const markMessagesRead =
  async ({
    trackingId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(
          user
        ),
      }).lean();

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    await addTrackingParticipant(
      trackingId,
      userSnapshot
    );

    await OrderTrackingMessage
      .updateMany(
        {
          trackingId,

          isDeleted: {
            $ne: true,
          },

          deletedForEveryone: {
            $ne: true,
          },

          /*
           * Do not add a read receipt
           * to the user's own messages.
           */
          "sender.userId": {
            $ne:
              userSnapshot.userId,
          },

          "readBy.userId": {
            $ne:
              userSnapshot.userId,
          },
        },
        {
          $push: {
            readBy: {
              userId:
                userSnapshot.userId,

              name:
                userSnapshot.name,

              email:
                userSnapshot.email,

              role:
                userSnapshot.role,

              readAt:
                new Date(),
            },
          },
        }
      );

    await OrderTracking.updateOne(
      {
        _id: trackingId,
      },
      {
        $set: {
          "unreadCountByUser.$[item].count":
            0,
        },
      },
      {
        arrayFilters: [
          {
            "item.userId":
              userSnapshot.userId,
          },
        ],
      }
    );

    return {
      success: true,
    };
  };

const closeTrackingChat =
  async ({
    trackingId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    if (!isPrivilegedUser(user)) {
      const error = new Error(
        "You are not allowed to close this chat."
      );

      error.statusCode = 403;
      throw error;
    }

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
      });

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    tracking.chatStatus = "closed";
    tracking.lastUpdatedBy =
      userSnapshot;
    tracking.latestUpdateAt =
      new Date();

    await tracking.save();

    await createSystemMessage({
      tracking,
      sender: userSnapshot,
      text: "Order chat closed.",
      messageType: "system",
    });

    return tracking;
  };

const deleteTrackingMessage =
  async ({
    trackingId,
    messageId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    ensureValidObjectId(
      messageId,
      "Message ID"
    );

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
        ...getTrackingAccessFilter(
          user
        ),
      }).lean();

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    const message =
      await OrderTrackingMessage
        .findOne({
          _id: messageId,
          trackingId,
          isDeleted: {
            $ne: true,
          },
        });

    if (!message) {
      const error = new Error(
        "Message not found."
      );

      error.statusCode = 404;
      throw error;
    }

    if (
      message.isSystemMessage ||
      [
        "system",
        "status_update",
        "update_request",
      ].includes(
        message.messageType
      )
    ) {
      const error = new Error(
        "System and status messages cannot be deleted."
      );

      error.statusCode = 400;
      throw error;
    }

    const currentRole =
      String(
        userSnapshot.role || ""
      ).toLowerCase();

    const isSender =
      String(
        message.sender?.userId ||
          ""
      ) ===
      String(
        userSnapshot.userId
      );

    const isAdministrator =
      [
        "super_admin",
        "admin",
      ].includes(currentRole);

    if (
      !isSender &&
      !isAdministrator
    ) {
      const error = new Error(
        "Only the sender or an administrator can delete this message."
      );

      error.statusCode = 403;
      throw error;
    }

    if (
      message.deletedForEveryone
    ) {
      return message;
    }

    message.text = "";

    message.attachments = [];

    message.deletedForEveryone =
      true;

    message.deletedAt =
      new Date();

    message.deletedBy =
      userSnapshot;

    /*
     * Keep isDeleted false so the
     * placeholder remains visible.
     */
    message.isDeleted = false;

    await message.save();

    return message;
  };

const reopenTrackingChat =
  async ({
    trackingId,
    user = {},
  }) => {
    ensureValidObjectId(
      trackingId,
      "Tracking ID"
    );

    const role = String(
      user.role ||
        user.user?.role ||
        ""
    ).toLowerCase();

    if (
      ![
        "super_admin",
        "admin",
      ].includes(role)
    ) {
      const error = new Error(
        "Only admin or super admin can reopen this chat."
      );

      error.statusCode = 403;
      throw error;
    }

    const userSnapshot =
      createUserSnapshot(user);

    const tracking =
      await OrderTracking.findOne({
        _id: trackingId,
        isActive: true,
      });

    if (!tracking) {
      const error = new Error(
        "Order tracking record not found."
      );

      error.statusCode = 404;
      throw error;
    }

    tracking.chatStatus = "open";
    tracking.lastUpdatedBy =
      userSnapshot;
    tracking.latestUpdateAt =
      new Date();

    await tracking.save();

    await createSystemMessage({
      tracking,
      sender: userSnapshot,
      text: "Order chat reopened.",
      messageType: "system",
    });

    return tracking;
  };

module.exports = {
  createTrackingFromSalesOrder,
  syncApprovedSalesOrders,
  getTrackingDashboard,
  getTrackingList,
  getTrackingById,
  updateTrackingStatus,
  requestOrderUpdate,
  sendTrackingMessage,
  getTrackingMessages,
  markMessagesRead,
  deleteTrackingMessage,
  closeTrackingChat,
  reopenTrackingChat,
};
