const mongoose = require("mongoose");

const OrderTracking =
  require("../model/OrderTracking");

const SalesOrder =
  require("../model/salesOrderModel");

const {
  PROCESS_TYPES,
  PROCESS_FLOWS,
} = require("../util/orderTrackingConfig");

/* =========================================================
   HELPERS
========================================================= */

const addDays = (
  date,
  days
) => {
  const result =
    new Date(date);

  if (
    Number.isNaN(
      result.getTime()
    )
  ) {
    throw new Error(
      "Invalid base date"
    );
  }

  result.setDate(
    result.getDate() +
      Number(days || 0)
  );

  return result;
};

const shiftDateByDays = (
  date,
  days
) => {
  if (!date) {
    return null;
  }

  return addDays(
    date,
    days
  );
};

const startOfDay = (
  value
) => {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const differenceInCalendarDays =
  (
    actualDate,
    estimatedDate
  ) => {
    if (
      !actualDate ||
      !estimatedDate
    ) {
      return 0;
    }

    const actual =
      startOfDay(
        actualDate
      );

    const estimated =
      startOfDay(
        estimatedDate
      );

    return Math.round(
      (
        actual.getTime() -
        estimated.getTime()
      ) /
        86400000
    );
  };

const createUserSnapshot = (
  user
) => {
  if (
    !user ||
    !(user._id || user.id)
  ) {
    throw new Error(
      "Valid authenticated user is required"
    );
  }

  return {
    userId:
      user._id ||
      user.id,

    name:
      user.name ||
      user.fullName ||
      "",

    email:
      user.email ||
      "",

    role:
      user.role ||
      "user",
  };
};

const normalizeText = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const escapeRegex = (
  value
) =>
  String(value || "")
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

const getEstimatedDate = (
  milestones,
  code
) =>
  milestones.find(
    (item) =>
      item.code === code
  )?.estimatedDate ||
  null;

/* =========================================================
   ORDER TYPE

   Sales Order has:
   trackingOrderType: "H.O." | "N.H.O."

   IMPORTANT:
   Never use salesOrder.orderType here because that field
   means domestic / international / special_economic_zone.
========================================================= */

const normalizeOrderType = (
  value
) => {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    normalized === "H.O." ||
    normalized === "HO"
  ) {
    return "H.O.";
  }

  if (
    normalized === "N.H.O." ||
    normalized === "NHO"
  ) {
    return "N.H.O.";
  }

  throw new Error(
    "Order type is required. Use H.O. or N.H.O."
  );
};

/* =========================================================
   TRACKING NUMBER
========================================================= */

const generateTrackingNumber =
  async () => {
    const year =
      new Date().getFullYear();

    const prefix =
      `BST-${year}-`;

    const lastTracking =
      await OrderTracking.findOne({
        trackingNumber: {
          $regex:
            `^${prefix}`,
        },
      })
        .sort({
          trackingNumber:
            -1,
        })
        .select(
          "trackingNumber"
        )
        .lean();

    let nextNumber = 1;

    if (
      lastTracking
        ?.trackingNumber
    ) {
      const parts =
        lastTracking
          .trackingNumber
          .split("-");

      const currentNumber =
        Number(
          parts[
            parts.length - 1
          ]
        );

      if (
        Number.isFinite(
          currentNumber
        )
      ) {
        nextNumber =
          currentNumber + 1;
      }
    }

    return `${prefix}${String(
      nextNumber
    ).padStart(
      6,
      "0"
    )}`;
  };

/* =========================================================
   PROCESS TYPE RESOLVER

   IMPORTANT:
   supplyCondition always comes from Sales Order.

   Mapping:

   as_rolled
   -> AS_ROLLED

   as_forged
   -> AS_FORGED

   as_rolled_annealed
   -> AS_ROLLED_ANNEALED_NORMALIZED

   as_rolled_normalised
   -> AS_ROLLED_ANNEALED_NORMALIZED

   as_forged_annealed
   -> AS_FORGED_ANNEALED_NORMALIZED

   as_rolled_qt
   -> AS_ROLLED_QT

   as_forged_qt
   -> AS_FORGED_QT
========================================================= */

const resolveProcessType = ({
  orderType,
  supplyCondition,
  otherSupplyConditions = "",
}) => {
  const finalOrderType =
    normalizeOrderType(
      orderType
    );

  /* -------------------------------------------------------
     H.O.
  ------------------------------------------------------- */

  if (
    finalOrderType ===
    "H.O."
  ) {
    return PROCESS_TYPES.H_O;
  }

  /* -------------------------------------------------------
     N.H.O.
  ------------------------------------------------------- */

  const condition =
    normalizeText(
      supplyCondition
    );

  const otherText =
    normalizeText(
      otherSupplyConditions
    );

  if (!condition) {
    throw new Error(
      "Supply condition is missing in Sales Order"
    );
  }

  /* -------------------------------------------------------
     DIRECT MAPPINGS
  ------------------------------------------------------- */

  const directMappings = {
    as_rolled:
      PROCESS_TYPES
        .AS_ROLLED,

    as_forged:
      PROCESS_TYPES
        .AS_FORGED,

    /*
     * Annealed and Normalised use
     * the SAME lead-time process.
     */
    as_rolled_annealed:
      PROCESS_TYPES
        .AS_ROLLED_ANNEALED_NORMALIZED,

    as_rolled_normalised:
      PROCESS_TYPES
        .AS_ROLLED_ANNEALED_NORMALIZED,

    as_rolled_normalized:
      PROCESS_TYPES
        .AS_ROLLED_ANNEALED_NORMALIZED,

    as_forged_annealed:
      PROCESS_TYPES
        .AS_FORGED_ANNEALED_NORMALIZED,

    as_forged_normalised:
      PROCESS_TYPES
        .AS_FORGED_ANNEALED_NORMALIZED,

    as_forged_normalized:
      PROCESS_TYPES
        .AS_FORGED_ANNEALED_NORMALIZED,

    as_rolled_qt:
      PROCESS_TYPES
        .AS_ROLLED_QT,

    as_forged_qt:
      PROCESS_TYPES
        .AS_FORGED_QT,
  };

  if (
    directMappings[
      condition
    ]
  ) {
    return directMappings[
      condition
    ];
  }

  /* -------------------------------------------------------
     ROLLED OR FORGED CONDITIONS

     These cannot be guessed.

     otherSupplyConditions must tell us whether actual
     production route is rolled or forged.
  ------------------------------------------------------- */

  const ambiguousConditions =
    [
      "as_rolled_or_as_forged",
      "as_rolled_or_forged",

      "as_rolled_or_forged_annealed",
      "as_rolled_or_as_forged_annealed",

      "as_rolled_or_as_forged_normalised",
      "as_rolled_or_as_forged_normalized",

      "as_rolled_or_as_forged_qt",
    ];

  if (
    ambiguousConditions.includes(
      condition
    )
  ) {
    const otherIsRolled =
      otherText.includes(
        "rolled"
      ) ||
      otherText.includes(
        "roll"
      );

    const otherIsForged =
      otherText.includes(
        "forged"
      ) ||
      otherText.includes(
        "forge"
      );

    if (
      otherIsRolled &&
      otherIsForged
    ) {
      throw new Error(
        "Sales Order manufacturing route is ambiguous. Specify either Rolled or Forged in otherSupplyConditions."
      );
    }

    if (
      !otherIsRolled &&
      !otherIsForged
    ) {
      throw new Error(
        `Supply condition "${supplyCondition}" allows Rolled or Forged. Specify the actual manufacturing route before syncing.`
      );
    }

    const isQT =
      condition.includes(
        "qt"
      );

    const isAnnealedOrNormalised =
      condition.includes(
        "annealed"
      ) ||
      condition.includes(
        "normalised"
      ) ||
      condition.includes(
        "normalized"
      );

    if (
      otherIsRolled &&
      isQT
    ) {
      return PROCESS_TYPES
        .AS_ROLLED_QT;
    }

    if (
      otherIsForged &&
      isQT
    ) {
      return PROCESS_TYPES
        .AS_FORGED_QT;
    }

    if (
      otherIsRolled &&
      isAnnealedOrNormalised
    ) {
      return PROCESS_TYPES
        .AS_ROLLED_ANNEALED_NORMALIZED;
    }

    if (
      otherIsForged &&
      isAnnealedOrNormalised
    ) {
      return PROCESS_TYPES
        .AS_FORGED_ANNEALED_NORMALIZED;
    }

    if (
      otherIsRolled
    ) {
      return PROCESS_TYPES
        .AS_ROLLED;
    }

    return PROCESS_TYPES
      .AS_FORGED;
  }

  /* -------------------------------------------------------
     OTHER / AS PER STANDARD

     Try free-text resolution from:
     supplyCondition + otherSupplyConditions.
  ------------------------------------------------------- */

  const combined =
    `${condition} ${otherText}`;

  const isForged =
    combined.includes(
      "forged"
    ) ||
    combined.includes(
      "forge"
    );

  const isRolled =
    combined.includes(
      "rolled"
    ) ||
    combined.includes(
      "roll"
    );

  const isQT =
    combined.includes(
      "q&t"
    ) ||
    combined.includes(
      "q & t"
    ) ||
    combined.includes(
      "qt"
    ) ||
    combined.includes(
      "quench"
    ) ||
    combined.includes(
      "temper"
    );

  const hasAnnealing =
    combined.includes(
      "anneal"
    );

  const hasNormalising =
    combined.includes(
      "normalis"
    ) ||
    combined.includes(
      "normaliz"
    );

  const hasHeatTreatment =
    hasAnnealing ||
    hasNormalising;

  if (
    isRolled &&
    !isForged &&
    isQT
  ) {
    return PROCESS_TYPES
      .AS_ROLLED_QT;
  }

  if (
    isForged &&
    !isRolled &&
    isQT
  ) {
    return PROCESS_TYPES
      .AS_FORGED_QT;
  }

  if (
    isRolled &&
    !isForged &&
    hasHeatTreatment
  ) {
    return PROCESS_TYPES
      .AS_ROLLED_ANNEALED_NORMALIZED;
  }

  if (
    isForged &&
    !isRolled &&
    hasHeatTreatment
  ) {
    return PROCESS_TYPES
      .AS_FORGED_ANNEALED_NORMALIZED;
  }

  if (
    isRolled &&
    !isForged
  ) {
    return PROCESS_TYPES
      .AS_ROLLED;
  }

  if (
    isForged &&
    !isRolled
  ) {
    return PROCESS_TYPES
      .AS_FORGED;
  }

  throw new Error(
    `Unable to identify tracking process from Sales Order supply condition "${supplyCondition}".`
  );
};

/* =========================================================
   GENERATE MILESTONES

   Estimated dates are generated from Sales Order approval.

   Example:
   stage.day = 10
   approvedAt = 08 Aug
   estimatedDate = 18 Aug
========================================================= */

const generateMilestones = ({
  processType,
  approvedAt,
}) => {
  const flow =
    PROCESS_FLOWS[
      processType
    ];

  if (
    !Array.isArray(flow) ||
    flow.length === 0
  ) {
    throw new Error(
      `Tracking configuration not found for process: ${processType}`
    );
  }

  const baseDate =
    new Date(
      approvedAt
    );

  if (
    Number.isNaN(
      baseDate.getTime()
    )
  ) {
    throw new Error(
      "Invalid Sales Order approval date"
    );
  }

  return flow.map(
    (
      stage,
      index
    ) => {
      /*
       * Generate this stage's
       * initial ETA only once.
       */
      const initialEstimatedDate =
        addDays(
          baseDate,
          stage.day
        );

      return {
        sequence:
          index + 1,

        code:
          stage.code,

        label:
          stage.label,

        targetDay:
          stage.day,

        /*
         * ORIGINAL ETA
         *
         * Never modify this later.
         *
         * Example:
         * 24 Jun 2026
         */
        originalEstimatedDate:
          new Date(
            initialEstimatedDate
          ),

        /*
         * CURRENT WORKING ETA
         *
         * This may later become:
         * 19 Aug 2026
         */
        estimatedDate:
          new Date(
            initialEstimatedDate
          ),

        actualDate:
          null,

        status:
          index === 0
            ? "in_progress"
            : "pending",

        isCurrent:
          index === 0,

        completedBy:
          null,

        comment:
          "",

        attachments:
          [],

        updatedAt:
          index === 0
            ? new Date()
            : null,
      };
    }
  );
};

/* =========================================================
   ESTIMATED SUMMARY DATES

   These are duplicate summary fields used by list/table UI.
========================================================= */

const syncEstimatedSummaryDates =
  (tracking) => {
    tracking.estimatedReadyDate =
      getEstimatedDate(
        tracking.milestones,
        "ready_for_dispatch"
      );

    tracking.estimatedLoadingDate =
      getEstimatedDate(
        tracking.milestones,
        "loading"
      );

    tracking.estimatedShipDate =
      getEstimatedDate(
        tracking.milestones,
        "shipped"
      );

    tracking.estimatedDeliveryDate =
      getEstimatedDate(
        tracking.milestones,
        "delivered"
      );
  };

/* =========================================================
   ACTUAL SUMMARY DATES
========================================================= */

const syncActualSummaryDate =
  (
    tracking,
    milestone
  ) => {
    if (
      milestone.code ===
      "ready_for_dispatch"
    ) {
      tracking.actualReadyDate =
        milestone.actualDate;
    }

    if (
      milestone.code ===
      "loading"
    ) {
      tracking.actualLoadingDate =
        milestone.actualDate;
    }

    if (
      milestone.code ===
      "shipped"
    ) {
      tracking.actualShipDate =
        milestone.actualDate;
    }

    if (
      milestone.code ===
      "delivered"
    ) {
      tracking.actualDeliveryDate =
        milestone.actualDate;
    }
  };

/* =========================================================
   SALES ORDER APPROVAL DATE
========================================================= */

const getSalesOrderApprovedAt =
  (salesOrder) => {
    const approvedAt =
      salesOrder
        ?.managerApproval
        ?.approvedAt ||
      salesOrder
        ?.approvedAt ||
      salesOrder
        ?.updatedAt ||
      new Date();

    const date =
      new Date(
        approvedAt
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw new Error(
        "Unable to determine Sales Order approval date"
      );
    }

    return date;
  };

/* =========================================================
   SHIPPING ADDRESS
========================================================= */

const getShippingAddress =
  (salesOrder) => {
    if (
      typeof salesOrder
        ?.shippingAddress ===
      "string"
    ) {
      return (
        salesOrder.shippingAddress ||
        ""
      );
    }

    if (
      salesOrder
        ?.shippingAddress
        ?.sameAsCompanyAddress ===
      true
    ) {
      return (
        salesOrder.companyAddress ||
        ""
      );
    }

    return (
      salesOrder
        ?.shippingAddress
        ?.address ||
      salesOrder
        ?.companyAddress ||
      salesOrder
        ?.deliveryAddress ||
      ""
    );
  };

/* =========================================================
   MATERIAL SNAPSHOT
========================================================= */

const buildMaterialSnapshot =
  (salesOrder) => ({
    grade:
      salesOrder.grade ||
      salesOrder.materialGrade ||
      "",

    size:
      salesOrder.size ||
      salesOrder.materialSize ||
      "",

    quantity:
      Number(
        salesOrder.quantity ||
          salesOrder.qty ||
          0
      ),

    quantityUnit:
      salesOrder.quantityUnit ||
      salesOrder.unit ||
      "KG",

    /*
     * Your current Sales Order commonly stores the
     * combined material information here.
     */
    description:
      salesOrder
        .sizeGradeQuantityRate ||
      salesOrder
        .materialDescription ||
      salesOrder
        .description ||
      "",
  });

/* =========================================================
   ENSURE PLANNING IS AUTO-COMPLETED

   BUSINESS RULE:
   Final Sales Order approval itself completes Planning.

   This also repairs existing/older tracking records where
   Planning was incorrectly left as the current milestone.
========================================================= */

const ensurePlanningAutoCompleted =
  async ({
    tracking,
    salesOrder,
    user,
    session = null,
  }) => {
    if (
      !tracking ||
      !tracking.milestones ||
      tracking.milestones.length === 0
    ) {
      return tracking;
    }

    const planning =
      tracking.milestones.find(
        (milestone) =>
          milestone.code ===
          "planning"
      );

    if (!planning) {
      return tracking;
    }

    const approvedAt =
      getSalesOrderApprovedAt(
        salesOrder
      );

    const alreadyCorrect =
      planning.status ===
        "completed" &&
      planning.isCurrent !==
        true &&
      tracking.currentStatus !==
        "planning";

    if (alreadyCorrect) {
      return tracking;
    }

    let approvalSnapshot;

    if (
      tracking.approvedBy &&
      tracking.approvedBy.userId
    ) {
      approvalSnapshot = {
        userId:
          tracking.approvedBy.userId,

        name:
          tracking.approvedBy.name ||
          "",

        email:
          tracking.approvedBy.email ||
          "",

        role:
          tracking.approvedBy.role ||
          "user",
      };
    } else {
      approvalSnapshot =
        createUserSnapshot(
          user
        );
    }

    /* -----------------------------------------------------
       COMPLETE PLANNING AT SALES ORDER APPROVAL TIME
    ----------------------------------------------------- */

    planning.actualDate =
      new Date(
        approvedAt
      );

    planning.status =
      "completed";

    planning.isCurrent =
      false;

    planning.completedBy =
      approvalSnapshot;

    planning.comment =
      "Planning completed automatically on Sales Order approval.";

    planning.updatedAt =
      new Date(
        approvedAt
      );

    /* -----------------------------------------------------
       CLEAR STALE CURRENT FLAGS ON INCOMPLETE STAGES
    ----------------------------------------------------- */

    tracking.milestones.forEach(
      (milestone) => {
        if (
          milestone.code ===
          "planning"
        ) {
          milestone.isCurrent =
            false;

          return;
        }

        if (
          ![
            "completed",
            "skipped",
          ].includes(
            milestone.status
          )
        ) {
          milestone.status =
            "pending";

          milestone.isCurrent =
            false;
        }
      }
    );

    const orderedMilestones =
      [...tracking.milestones]
        .sort(
          (a, b) =>
            Number(
              a.sequence || 0
            ) -
            Number(
              b.sequence || 0
            )
        );

    const nextMilestone =
      orderedMilestones.find(
        (milestone) =>
          milestone.code !==
            "planning" &&
          ![
            "completed",
            "skipped",
          ].includes(
            milestone.status
          )
      );

    if (nextMilestone) {
      nextMilestone.status =
        "in_progress";

      nextMilestone.isCurrent =
        true;

      nextMilestone.updatedAt =
        new Date(
          approvedAt
        );

      tracking.currentStatus =
        nextMilestone.code;

      tracking.currentStatusLabel =
        nextMilestone.label;

      tracking.currentMilestoneId =
        nextMilestone._id;
    } else {
      tracking.currentStatus =
        planning.code;

      tracking.currentStatusLabel =
        planning.label;

      tracking.currentMilestoneId =
        planning._id;
    }

    /* -----------------------------------------------------
       RECALCULATE PROGRESS
    ----------------------------------------------------- */

    const completedCount =
      tracking.milestones.filter(
        (milestone) =>
          [
            "completed",
            "skipped",
          ].includes(
            milestone.status
          )
      ).length;

    tracking.progressPercentage =
      tracking.milestones.length
        ? Math.round(
            (
              completedCount /
              tracking.milestones.length
            ) *
              100
          )
        : 0;

    syncEstimatedSummaryDates(
      tracking
    );

    tracking.lastUpdatedBy =
      approvalSnapshot;

    if (
      !Array.isArray(
        tracking.activityHistory
      )
    ) {
      tracking.activityHistory =
        [];
    }

    const autoPlanningHistoryExists =
      tracking.activityHistory.some(
        (item) =>
          item.type ===
            "milestone_completed" &&
          item.status ===
            "planning" &&
          item.newValue &&
          item.newValue.autoCompleted ===
            true
      );

    if (
      !autoPlanningHistoryExists
    ) {
      tracking.activityHistory.push({
        type:
          "milestone_completed",

        status:
          "planning",

        message:
          `${
            approvalSnapshot.name ||
            "Approver"
          } completed Planning automatically through Sales Order approval.`,

        previousValue: {
          estimatedDate:
            planning.estimatedDate,

          originalEstimatedDate:
            planning.originalEstimatedDate,
        },

        newValue: {
          actualDate:
            new Date(
              approvedAt
            ),

          autoCompleted:
            true,
        },

        updatedBy:
          approvalSnapshot,

        createdAt:
          new Date(
            approvedAt
          ),
      });
    }

    await tracking.save(
      session
        ? {
            session,
          }
        : {}
    );

    return tracking;
  };

/* =========================================================
   CREATE TRACKING FROM APPROVED SALES ORDER

   trackingOrderType comes directly from Sales Order.
   supplyCondition comes directly from Sales Order.
   processType is resolved automatically from them.
========================================================= */

/* =========================================================
   CREATE TRACKING FROM APPROVED SALES ORDER

   BUSINESS RULES:

   1. trackingOrderType comes directly from Sales Order.

   2. supplyCondition comes directly from Sales Order.

   3. processType is resolved automatically.

   4. Sales Order approval date is the ORIGINAL timeline
      baseline for every milestone.

   5. PLANNING IS AUTOMATICALLY COMPLETED when the Sales
      Order is approved.

      Therefore:
      - Planning does NOT need "Mark Done"
      - Planning actualDate = Sales Order approval date
      - Planning completedBy = approving/current user snapshot
      - First operational milestone after Planning becomes current

   6. originalEstimatedDate NEVER changes later.

   7. estimatedDate remains the working/revised plan.
========================================================= */

const createFromApprovedSalesOrder =
  async ({
    salesOrder,
    approvedBy,
    session = null,
  }) => {
    /* =====================================================
       SALES ORDER REQUIRED
    ===================================================== */

    if (
      !salesOrder ||
      !salesOrder._id
    ) {
      throw new Error(
        "Sales order is required"
      );
    }

    /* =====================================================
       ONLY APPROVED SALES ORDERS
    ===================================================== */

    if (
      salesOrder
        .approvalStatus &&
      salesOrder
        .approvalStatus !==
        "approved"
    ) {
      throw new Error(
        "Only approved Sales Orders can be added to Order Tracking"
      );
    }

    /* =====================================================
       ALREADY SYNCED CHECK
    ===================================================== */

    const existingQuery =
      OrderTracking.findOne({
        salesOrderId:
          salesOrder._id,

        isActive:
          true,
      });

    if (session) {
      existingQuery.session(
        session
      );
    }

    const existing =
      await existingQuery;

    if (existing) {
      return await ensurePlanningAutoCompleted({
        tracking:
          existing,

        salesOrder,

        user:
          approvedBy,

        session,
      });
    }

    /* =====================================================
       ORDER TYPE

       IMPORTANT:
       DO NOT use salesOrder.orderType.

       salesOrder.orderType means:
       domestic / international / SEZ.

       Order Tracking uses:
       trackingOrderType:
       H.O. / N.H.O.
    ===================================================== */

    const finalOrderType =
      normalizeOrderType(
        salesOrder
          .trackingOrderType ||
          "N.H.O."
      );

    /* =====================================================
       SUPPLY CONDITION
    ===================================================== */

    const supplyCondition =
      salesOrder
        .supplyCondition ||
      "";

    const otherSupplyConditions =
      salesOrder
        .otherSupplyConditions ||
      "";

    if (
      finalOrderType ===
        "N.H.O." &&
      !supplyCondition
    ) {
      throw new Error(
        "Supply condition is missing in the Sales Order"
      );
    }

    /* =====================================================
       RESOLVE PROCESS TYPE
    ===================================================== */

    const processType =
      resolveProcessType({
        orderType:
          finalOrderType,

        supplyCondition,

        otherSupplyConditions,
      });

    /* =====================================================
       APPROVAL DATE

       This is the permanent timeline baseline.

       Example:
       Manager approved:
       03 Sept 2026

       Planning actual:
       03 Sept 2026

       Stage Day 2:
       originalEstimatedDate = 05 Sept 2026
    ===================================================== */

    const approvedAt =
      getSalesOrderApprovedAt(
        salesOrder
      );

    /* =====================================================
       USER SNAPSHOT
    ===================================================== */

    const userSnapshot =
      createUserSnapshot(
        approvedBy
      );

    /* =====================================================
       GENERATE MILESTONES
    ===================================================== */

    const milestones =
      generateMilestones({
        processType,
        approvedAt,
      });

    if (
      !milestones.length
    ) {
      throw new Error(
        `No milestones generated for process ${processType}`
      );
    }

    /* =====================================================
       AUTO COMPLETE PLANNING

       Planning represents:
       order received + manager approval + production
       planning initiated.

       Therefore approval itself closes Planning.
    ===================================================== */

    const planningIndex =
      milestones.findIndex(
        (
          milestone
        ) =>
          milestone.code ===
          "planning"
      );

    let planningMilestone =
      null;

    if (
      planningIndex !== -1
    ) {
      planningMilestone =
        milestones[
          planningIndex
        ];

      /*
       * Planning completes exactly at Sales Order approval.
       */
      planningMilestone.actualDate =
        new Date(
          approvedAt
        );

      planningMilestone.status =
        "completed";

      planningMilestone.isCurrent =
        false;

      planningMilestone.completedBy =
        userSnapshot;

      planningMilestone.comment =
        "Planning completed automatically on Sales Order approval.";

      planningMilestone.updatedAt =
        new Date(
          approvedAt
        );
    }

    /* =====================================================
       RESET NON-PLANNING MILESTONES

       generateMilestones() currently makes index 0 current.

       Because Planning is now automatically completed,
       we explicitly reset remaining stages before selecting
       the actual current operational milestone.
    ===================================================== */

    milestones.forEach(
      (
        milestone
      ) => {
        if (
          milestone.code ===
          "planning"
        ) {
          return;
        }

        milestone.status =
          "pending";

        milestone.isCurrent =
          false;

        milestone.actualDate =
          milestone.actualDate ||
          null;

        milestone.completedBy =
          milestone.completedBy ||
          null;
      }
    );

    /* =====================================================
       FIRST REAL OPERATIONAL MILESTONE

       Example:

       Planning          -> completed automatically
       Under Casting     -> current

       or

       Planning          -> completed automatically
       Cutting           -> current

       depending upon PROCESS_FLOWS.
    ===================================================== */

    const firstOperationalMilestone =
      milestones.find(
        (
          milestone
        ) =>
          milestone.code !==
            "planning" &&
          milestone.status !==
            "completed"
      );

    /*
     * Normal case:
     * activate first stage after Planning.
     */
    if (
      firstOperationalMilestone
    ) {
      firstOperationalMilestone.status =
        "in_progress";

      firstOperationalMilestone.isCurrent =
        true;

      firstOperationalMilestone.updatedAt =
        new Date(
          approvedAt
        );
    }

    /* =====================================================
       CURRENT MILESTONE FALLBACK

       In case a future process configuration contains only
       Planning, keep the completed Planning milestone as the
       final reference instead of crashing.
    ===================================================== */

    const initialCurrentMilestone =
      firstOperationalMilestone ||
      planningMilestone ||
      milestones[0];

    /* =====================================================
       INITIAL PROGRESS

       Planning now counts as completed.

       Example:
       1 completed stage / 8 total = 13%
    ===================================================== */

    const initialCompletedCount =
      milestones.filter(
        (
          milestone
        ) =>
          [
            "completed",
            "skipped",
          ].includes(
            milestone.status
          )
      ).length;

    const initialProgressPercentage =
      milestones.length
        ? Math.round(
            (
              initialCompletedCount /
              milestones.length
            ) *
              100
          )
        : 0;

    /* =====================================================
       TRACKING NUMBER
    ===================================================== */

    const trackingNumber =
      await generateTrackingNumber();

    /* =====================================================
       BUILD TRACKING DOCUMENT
    ===================================================== */

    const trackingData = {
      trackingNumber,

      salesOrderId:
        salesOrder._id,

      salesOrderNo:
        salesOrder
          .salesOrderNo ||
        salesOrder
          .orderNo ||
        "",

      poNumber:
        salesOrder
          .poNumber ||
        salesOrder
          .customerPONumber ||
        "",

      /* ===================================================
         ORDER / PROCESS
      =================================================== */

      orderType:
        finalOrderType,

      processType,

      supplyCondition,

      /* ===================================================
         CUSTOMER
      =================================================== */

      companyName:
        salesOrder
          .companyName ||
        salesOrder
          .customerName ||
        "",

      companyAddress:
        salesOrder
          .companyAddress ||
        salesOrder
          .customerAddress ||
        "",

      shippingAddress:
        getShippingAddress(
          salesOrder
        ),

      contactPersonName:
        salesOrder
          .contactPersonName ||
        "",

      contactPersonNumber:
        salesOrder
          .contactPersonNumber ||
        salesOrder
          .contactNumber ||
        "",

      contactPersonEmail:
        salesOrder
          .contactPersonEmail ||
        "",

      /* ===================================================
         SALES PERSON
      =================================================== */

      salesPersonId:
        salesOrder
          .salesPersonId ||
        null,

      salesPersonName:
        salesOrder
          .salesPersonName ||
        "",

      salesPersonEmail:
        salesOrder
          .salesPersonEmail ||
        "",

      /* ===================================================
         MATERIAL
      =================================================== */

      material:
        buildMaterialSnapshot(
          salesOrder
        ),

      /* ===================================================
         APPROVAL
      =================================================== */

      approvedAt,

      approvedBy:
        userSnapshot,

      /* ===================================================
         CURRENT STATUS

         Planning is already completed.

         Therefore this points at the first actual production
         stage.
      =================================================== */

      currentStatus:
        initialCurrentMilestone
          .code,

      currentStatusLabel:
        initialCurrentMilestone
          .label,

      /*
       * Planning already contributes to progress.
       */
      progressPercentage:
        initialProgressPercentage,

      /* ===================================================
         FULL TIMELINE
      =================================================== */

      milestones,

      /* ===================================================
         ESTIMATED SUMMARY CARDS

         These always use current working estimatedDate.

         originalEstimatedDate remains inside milestones for
         baseline/management health calculation.
      =================================================== */

      estimatedReadyDate:
        getEstimatedDate(
          milestones,
          "ready_for_dispatch"
        ),

      estimatedLoadingDate:
        getEstimatedDate(
          milestones,
          "loading"
        ),

      estimatedShipDate:
        getEstimatedDate(
          milestones,
          "shipped"
        ),

      estimatedDeliveryDate:
        getEstimatedDate(
          milestones,
          "delivered"
        ),

      /* ===================================================
         ACTUAL SUMMARY
      =================================================== */

      actualReadyDate:
        null,

      actualLoadingDate:
        null,

      actualShipDate:
        null,

      actualDeliveryDate:
        null,

      /* ===================================================
         AUDIT
      =================================================== */

      createdBy:
        userSnapshot,

      lastUpdatedBy:
        userSnapshot,

      /* ===================================================
         HISTORY
      =================================================== */

      activityHistory: [
        {
          type:
            "tracking_created",

          status:
            initialCurrentMilestone
              .code,

          message:
            planningMilestone
              ? (
                  `Order tracking created after Sales Order approval. ` +
                  `Planning was completed automatically on ${approvedAt.toLocaleString(
                    "en-IN"
                  )}. ` +
                  `${initialCurrentMilestone.label} is now the current stage. ` +
                  `Process: ${processType}. ` +
                  `Supply condition: ${
                    supplyCondition ||
                    "H.O."
                  }.`
                )
              : (
                  `Order tracking created with ${milestones.length} milestones. ` +
                  `Current stage: ${initialCurrentMilestone.label}. ` +
                  `Process: ${processType}. ` +
                  `Supply condition: ${
                    supplyCondition ||
                    "H.O."
                  }.`
                ),

          updatedBy:
            userSnapshot,

          createdAt:
            new Date(),
        },

        /*
         * Separate Planning audit event.
         *
         * Useful later for management popup/history.
         */
        ...(planningMilestone
          ? [
              {
                type:
                  "milestone_completed",

                status:
                  "planning",

                message:
                  `${userSnapshot.name || "User"} completed Planning automatically through Sales Order approval.`,

                previousValue: {
                  estimatedDate:
                    planningMilestone
                      .estimatedDate,

                  originalEstimatedDate:
                    planningMilestone
                      .originalEstimatedDate,
                },

                newValue: {
                  actualDate:
                    new Date(
                      approvedAt
                    ),

                  autoCompleted:
                    true,
                },

                updatedBy:
                  userSnapshot,

                createdAt:
                  new Date(
                    approvedAt
                  ),
              },
            ]
          : []),
      ],
    };

    /* =====================================================
       CREATE TRACKING DOCUMENT
    ===================================================== */

    let tracking;

    if (session) {
      const documents =
        await OrderTracking.create(
          [
            trackingData,
          ],
          {
            session,
          }
        );

      tracking =
        documents[0];

    } else {
      tracking =
        await OrderTracking.create(
          trackingData
        );
    }

    /* =====================================================
       VERIFY MILESTONES
    ===================================================== */

    if (
      !tracking.milestones ||
      !tracking
        .milestones
        .length
    ) {
      throw new Error(
        "Tracking was created without milestones"
      );
    }

    /* =====================================================
       FIND STORED CURRENT MILESTONE

       Mongoose creates subdocument IDs only after document
       creation, so currentMilestoneId must be set here.
    ===================================================== */

    const storedCurrentMilestone =
      tracking
        .milestones
        .find(
          (
            milestone
          ) =>
            milestone
              .isCurrent ===
            true
        );

    /*
     * Normal:
     * first operational stage ID.

     * Fallback:
     * planning/first milestone.
     */
    tracking.currentMilestoneId =
      storedCurrentMilestone
        ?._id ||
      tracking
        .milestones[
          0
        ]
        ._id;

    /* =====================================================
       SUMMARY DATES

       Use stored Mongoose milestone subdocuments.
    ===================================================== */

    syncEstimatedSummaryDates(
      tracking
    );

    /* =====================================================
       SAVE CURRENT MILESTONE ID
    ===================================================== */

    await tracking.save(
      session
        ? {
            session,
          }
        : {}
    );

    return tracking;
  };

/* =========================================================
   SYNC ONE SALES ORDER

   POST:
   /api/order-tracking/sync/:salesOrderId

   BODY:
   {}

   trackingOrderType and supplyCondition both come
   directly from Sales Order.
========================================================= */

const syncSalesOrder =
  async ({
    salesOrderId,
    user,
  }) => {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          salesOrderId
        )
    ) {
      throw new Error(
        "Invalid sales order ID"
      );
    }

    const salesOrder =
      await SalesOrder.findById(
        salesOrderId
      );

    if (!salesOrder) {
      throw new Error(
        "Sales order not found"
      );
    }

    if (
      salesOrder
        .approvalStatus !==
      "approved"
    ) {
      throw new Error(
        "Only approved Sales Orders can be synced"
      );
    }

    const existing =
      await OrderTracking.findOne({
        salesOrderId:
          salesOrder._id,

        isActive:
          true,
      });

    if (existing) {
      const repairedTracking =
        await ensurePlanningAutoCompleted({
          tracking:
            existing,

          salesOrder,

          user,
        });

      return {
        alreadySynced:
          true,

        tracking:
          repairedTracking,
      };
    }

    const tracking =
      await createFromApprovedSalesOrder(
        {
          salesOrder,

          approvedBy:
            user,
        }
      );

    return {
      alreadySynced:
        false,

      tracking,
    };
  };

/* =========================================================
   AUTO SYNC ALL APPROVED SALES ORDERS

   POST:
   /api/order-tracking/sync

   BODY:
   {}

   This:
   1. Finds all approved active Sales Orders.
   2. Skips Sales Orders already tracked.
   3. Reads trackingOrderType from Sales Order.
   4. Reads supplyCondition from Sales Order.
   5. Resolves processType automatically.
   6. Creates every estimated milestone immediately.
========================================================= */

const syncApprovedSalesOrders =
  async ({
    user,
  }) => {
    const approvedSalesOrders =
      await SalesOrder.find({
        approvalStatus:
          "approved",

        /*
         * Supports both current and older Sales Orders.
         * Older records may not contain isActive.
         */
        isActive: {
          $ne:
            false,
        },
      })
        .sort({
          updatedAt:
            -1,
        });

    const result = {
      totalApproved:
        approvedSalesOrders.length,

      synced:
        [],

      alreadySynced:
        [],

      failed:
        [],
    };

    if (
      approvedSalesOrders.length ===
      0
    ) {
      return {
        ...result,

        syncedCount:
          0,

        alreadySyncedCount:
          0,

        failedCount:
          0,
      };
    }

    /*
     * Fetch existing tracking records once.
     * This avoids one extra find query for every Sales Order.
     */
    const salesOrderIds =
      approvedSalesOrders.map(
        (salesOrder) =>
          salesOrder._id
      );

    const existingTrackings =
      await OrderTracking.find({
        salesOrderId: {
          $in:
            salesOrderIds,
        },

        isActive:
          true,
      })
        .select(
          "_id salesOrderId trackingNumber salesOrderNo poNumber companyName orderType supplyCondition processType currentStatus currentStatusLabel currentMilestoneId progressPercentage milestones approvedAt approvedBy lastUpdatedBy activityHistory estimatedReadyDate estimatedLoadingDate estimatedShipDate estimatedDeliveryDate"
        );

    const existingMap =
      new Map();

    existingTrackings.forEach(
      (tracking) => {
        existingMap.set(
          String(
            tracking.salesOrderId
          ),
          tracking
        );
      }
    );

    for (
      const salesOrder
      of approvedSalesOrders
    ) {
      try {
        const existing =
          existingMap.get(
            String(
              salesOrder._id
            )
          );

        if (existing) {
          const repairedTracking =
            await ensurePlanningAutoCompleted({
              tracking:
                existing,

              salesOrder,

              user,
            });

          result.alreadySynced.push({
            salesOrderId:
              salesOrder._id,

            trackingId:
              repairedTracking._id,

            trackingNumber:
              repairedTracking.trackingNumber,

            salesOrderNo:
              repairedTracking.salesOrderNo,

            poNumber:
              repairedTracking.poNumber,

            companyName:
              repairedTracking.companyName,

            orderType:
              repairedTracking.orderType,

            supplyCondition:
              repairedTracking.supplyCondition,

            processType:
              repairedTracking.processType,

            currentStatus:
              repairedTracking.currentStatus,

            milestoneCount:
              repairedTracking.milestones
                ?.length ||
              0,

            estimatedReadyDate:
              repairedTracking.estimatedReadyDate,

            estimatedLoadingDate:
              repairedTracking.estimatedLoadingDate,

            estimatedShipDate:
              repairedTracking.estimatedShipDate,

            estimatedDeliveryDate:
              repairedTracking.estimatedDeliveryDate,
          });

          continue;
        }

        /*
         * No request-body mapping is needed.
         * All process data comes directly from Sales Order.
         */
        const tracking =
          await createFromApprovedSalesOrder({
            salesOrder,

            approvedBy:
              user,
          });

        result.synced.push({
          salesOrderId:
            tracking.salesOrderId,

          trackingId:
            tracking._id,

          trackingNumber:
            tracking.trackingNumber,

          salesOrderNo:
            tracking.salesOrderNo,

          poNumber:
            tracking.poNumber,

          companyName:
            tracking.companyName,

          orderType:
            tracking.orderType,

          supplyCondition:
            tracking.supplyCondition,

          processType:
            tracking.processType,

          currentStatus:
            tracking.currentStatus,

          milestoneCount:
            tracking.milestones
              ?.length ||
            0,

          estimatedReadyDate:
            tracking.estimatedReadyDate,

          estimatedLoadingDate:
            tracking.estimatedLoadingDate,

          estimatedShipDate:
            tracking.estimatedShipDate,

          estimatedDeliveryDate:
            tracking.estimatedDeliveryDate,
        });
      } catch (error) {
        /*
         * One legacy/bad order must not stop the full sync.
         */
        result.failed.push({
          salesOrderId:
            salesOrder._id,

          salesOrderNo:
            salesOrder.salesOrderNo ||
            "",

          poNumber:
            salesOrder.poNumber ||
            "",

          companyName:
            salesOrder.companyName ||
            "",

          trackingOrderType:
            salesOrder.trackingOrderType ||
            "N.H.O.",

          supplyCondition:
            salesOrder.supplyCondition ||
            "",

          otherSupplyConditions:
            salesOrder.otherSupplyConditions ||
            "",

          message:
            error.message,
        });
      }
    }

    return {
      ...result,

      syncedCount:
        result.synced.length,

      alreadySyncedCount:
        result
          .alreadySynced
          .length,

      failedCount:
        result.failed.length,
    };
  };

/* =========================================================
   GET ALL TRACKING ORDERS
========================================================= */

const getAllOrderTrackings =
  async (
    queryParams = {},
    user
  ) => {
    const {
      page = 1,
      limit = 20,
      status,
      orderType,
      processType,
      supplyCondition,
      search,
    } = queryParams;

    const filter = {
      isActive:
        true,
    };

    if (status) {
      filter.currentStatus =
        status;
    }

    if (orderType) {
      filter.orderType =
        orderType;
    }

    if (processType) {
      filter.processType =
        processType;
    }

    if (supplyCondition) {
      filter.supplyCondition =
        supplyCondition;
    }

    if (
      search &&
      String(search).trim()
    ) {
      const regex =
        new RegExp(
          escapeRegex(
            String(
              search
            ).trim()
          ),
          "i"
        );

      filter.$or = [
        {
          trackingNumber:
            regex,
        },

        {
          salesOrderNo:
            regex,
        },

        {
          poNumber:
            regex,
        },

        {
          companyName:
            regex,
        },

        {
          processType:
            regex,
        },

        {
          supplyCondition:
            regex,
        },

        {
          "material.grade":
            regex,
        },

        {
          "material.size":
            regex,
        },

        {
          "material.description":
            regex,
        },
      ];
    }

    const currentPage =
      Math.max(
        Number(page) ||
          1,
        1
      );

    const pageLimit =
      Math.min(
        Math.max(
          Number(limit) ||
            20,
          1
        ),
        100
      );

    const skip =
      (
        currentPage -
        1
      ) *
      pageLimit;

    const [
      items,
      total,
    ] =
      await Promise.all([
        OrderTracking.find(
          filter
        )
          .sort({
            updatedAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            pageLimit
          )
          .lean(),

        OrderTracking
          .countDocuments(
            filter
          ),
      ]);

    return {
      items,

      pagination: {
        page:
          currentPage,

        limit:
          pageLimit,

        total,

        totalPages:
          Math.max(
            Math.ceil(
              total /
                pageLimit
            ),
            1
          ),
      },
    };
  };

/* =========================================================
   GET SINGLE
========================================================= */

const getOrderTrackingById =
  async (
    id
  ) => {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(id)
    ) {
      throw new Error(
        "Invalid order tracking ID"
      );
    }

    const tracking =
      await OrderTracking.findOne({
        _id:
          id,

        isActive:
          true,
      }).lean();

    if (!tracking) {
      throw new Error(
        "Order tracking not found"
      );
    }

    return tracking;
  };

/* =========================================================
   GET BY SALES ORDER
========================================================= */

const getTrackingBySalesOrderId =
  async (
    salesOrderId
  ) => {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          salesOrderId
        )
    ) {
      throw new Error(
        "Invalid Sales Order ID"
      );
    }

    const tracking =
      await OrderTracking.findOne({
        salesOrderId,

        isActive:
          true,
      }).lean();

    if (!tracking) {
      throw new Error(
        "Tracking not found for this Sales Order"
      );
    }

    return tracking;
  };

/* =========================================================
   GET BY TRACKING NUMBER
========================================================= */

const getTrackingByNumber =
  async (
    trackingNumber
  ) => {
    const normalizedTrackingNumber =
      String(
        trackingNumber ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !normalizedTrackingNumber
    ) {
      throw new Error(
        "Tracking number is required"
      );
    }

    const tracking =
      await OrderTracking.findOne({
        trackingNumber:
          normalizedTrackingNumber,

        isActive:
          true,
      }).lean();

    if (!tracking) {
      throw new Error(
        "Order tracking not found"
      );
    }

    return tracking;
  };

/* =========================================================
   COMPLETE CURRENT MILESTONE

   Example:

   Estimated Planning = 10 Aug
   Actual Planning    = 12 Aug

   Difference = +2 days.

   EVERY future incomplete milestone moves +2 days.

   Conversely:

   Estimated = 10 Aug
   Actual    = 08 Aug

   Difference = -2 days.

   EVERY future incomplete milestone moves -2 days.
========================================================= */

const completeMilestone =
  async ({
    trackingId,
    milestoneId,
    actualDate,
    comment,
    attachments = [],
    user,
  }) => {
    const tracking =
      await OrderTracking.findOne({
        _id:
          trackingId,

        isActive:
          true,
      });

    if (!tracking) {
      throw new Error(
        "Order tracking not found"
      );
    }

    if (
      tracking.currentStatus ===
      "cancelled"
    ) {
      throw new Error(
        "Cancelled order cannot be updated"
      );
    }

    if (
      tracking.currentStatus ===
        "delivered" &&
      tracking.progressPercentage ===
        100
    ) {
      throw new Error(
        "Order is already delivered"
      );
    }

    const milestone =
      tracking.milestones.id(
        milestoneId
      );

    if (!milestone) {
      throw new Error(
        "Milestone not found"
      );
    }

    /*
     * Planning is controlled by final Sales Order approval.
     * It must never be manually completed later.
     */
    if (
      milestone.code ===
      "planning"
    ) {
      throw new Error(
        "Planning is completed automatically on final Sales Order approval and cannot be completed manually."
      );
    }

    /*
     * Sequential workflow:
     * only current milestone can be completed.
     */
    if (
      !milestone.isCurrent ||
      String(
        tracking.currentMilestoneId ||
          ""
      ) !==
        String(
          milestone._id
        )
    ) {
      throw new Error(
        `Only current milestone "${tracking.currentStatusLabel}" can be completed`
      );
    }

    if (
      milestone.status ===
      "completed"
    ) {
      throw new Error(
        `${milestone.label} is already completed`
      );
    }

    const milestoneIndex =
      tracking.milestones
        .findIndex(
          (item) =>
            String(
              item._id
            ) ===
            String(
              milestoneId
            )
        );

    if (
      milestoneIndex === -1
    ) {
      throw new Error(
        "Milestone not found"
      );
    }

    const snapshot =
      createUserSnapshot(
        user
      );

    /*
     * If frontend sends no actualDate,
     * server date/time is used automatically.
     */
    const finalActualDate =
      actualDate
        ? new Date(
            actualDate
          )
        : new Date();

    if (
      Number.isNaN(
        finalActualDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid actual date"
      );
    }

    /*
     * Compare actual completion against
     * CURRENT working ETA.
     *
     * Do not compare against originalEstimatedDate,
     * because cascading works from the current plan.
     */
    const previousEstimatedDate =
      milestone.estimatedDate
        ? new Date(
            milestone.estimatedDate
          )
        : null;

    /*
     * IMPORTANT FOR OLD RECORDS
     *
     * Records created before originalEstimatedDate
     * existed may not contain it.
     *
     * Preserve the current ETA before any future
     * change if original is missing.
     */
    if (
      !milestone.originalEstimatedDate &&
      milestone.estimatedDate
    ) {
      milestone.originalEstimatedDate =
        new Date(
          milestone.estimatedDate
        );
    }

    const shiftDays =
      previousEstimatedDate
        ? differenceInCalendarDays(
            finalActualDate,
            previousEstimatedDate
          )
        : 0;

    /* -----------------------------------------------------
       COMPLETE CURRENT
    ----------------------------------------------------- */

    milestone.actualDate =
      finalActualDate;

    milestone.status =
      "completed";

    milestone.isCurrent =
      false;

    milestone.completedBy =
      snapshot;

    milestone.comment =
      comment ||
      milestone.comment ||
      "";

    if (
      Array.isArray(
        attachments
      ) &&
      attachments.length
    ) {
      milestone.attachments.push(
        ...attachments
      );
    }

    milestone.updatedAt =
      new Date();

    syncActualSummaryDate(
      tracking,
      milestone
    );

    /* -----------------------------------------------------
       SHIFT EVERY FUTURE INCOMPLETE ETA

       IMPORTANT:

       originalEstimatedDate remains untouched.

       estimatedDate moves.
    ----------------------------------------------------- */

    if (
      shiftDays !== 0
    ) {
      tracking.milestones.forEach(
        (
          futureMilestone
        ) => {
          /*
           * Do not modify current/completed
           * or earlier stages.
           */
          if (
            Number(
              futureMilestone.sequence
            ) <=
            Number(
              milestone.sequence
            )
          ) {
            return;
          }

          /*
           * Completed/skipped stages
           * must not move.
           */
          if (
            [
              "completed",
              "skipped",
            ].includes(
              futureMilestone.status
            )
          ) {
            return;
          }

          if (
            !futureMilestone.estimatedDate
          ) {
            return;
          }

          /*
           * IMPORTANT:
           *
           * For older DB records created before
           * originalEstimatedDate existed,
           * preserve the ETA BEFORE shifting.
           */
          if (
            !futureMilestone.originalEstimatedDate
          ) {
            futureMilestone.originalEstimatedDate =
              new Date(
                futureMilestone.estimatedDate
              );
          }

          /*
           * ONLY current working ETA changes.
           *
           * originalEstimatedDate NEVER changes.
           */
          futureMilestone.estimatedDate =
            shiftDateByDays(
              futureMilestone.estimatedDate,
              shiftDays
            );

          futureMilestone.updatedAt =
            new Date();
        }
      );
    }

    /* -----------------------------------------------------
       ACTIVATE NEXT
    ----------------------------------------------------- */

    const nextMilestone =
      tracking.milestones[
        milestoneIndex + 1
      ];

    if (
      nextMilestone
    ) {
      nextMilestone.status =
        "in_progress";

      nextMilestone.isCurrent =
        true;

      nextMilestone.updatedAt =
        new Date();

      tracking.currentStatus =
        nextMilestone.code;

      tracking.currentStatusLabel =
        nextMilestone.label;

      tracking.currentMilestoneId =
        nextMilestone._id;
    } else {
      /*
       * Last milestone completed.
       */
      tracking.currentStatus =
        milestone.code;

      tracking.currentStatusLabel =
        milestone.label;

      tracking.currentMilestoneId =
        milestone._id;
    }

    /* -----------------------------------------------------
       PROGRESS
    ----------------------------------------------------- */

    const completedCount =
      tracking.milestones.filter(
        (item) =>
          [
            "completed",
            "skipped",
          ].includes(
            item.status
          )
      ).length;

    tracking.progressPercentage =
      tracking.milestones.length
        ? Math.round(
            (
              completedCount /
              tracking.milestones
                .length
            ) *
              100
          )
        : 0;

    /*
     * Summary ETA cards use CURRENT
     * estimatedDate values.
     */
    syncEstimatedSummaryDates(
      tracking
    );

    tracking.lastUpdatedBy =
      snapshot;

    /* -----------------------------------------------------
       HISTORY MESSAGE
    ----------------------------------------------------- */

    let timingMessage =
      "";

    if (
      shiftDays > 0
    ) {
      timingMessage =
        ` Completed ${shiftDays} day${
          shiftDays === 1
            ? ""
            : "s"
        } later than estimated. Future estimated dates moved forward by ${shiftDays} day${
          shiftDays === 1
            ? ""
            : "s"
        }.`;
    } else if (
      shiftDays < 0
    ) {
      const earlyDays =
        Math.abs(
          shiftDays
        );

      timingMessage =
        ` Completed ${earlyDays} day${
          earlyDays === 1
            ? ""
            : "s"
        } earlier than estimated. Future estimated dates moved earlier by ${earlyDays} day${
          earlyDays === 1
            ? ""
            : "s"
        }.`;
    } else {
      timingMessage =
        " Completed on the estimated date.";
    }

    tracking.activityHistory.push(
      {
        type:
          "milestone_completed",

        status:
          milestone.code,

        message:
          (
            comment ||
            `${milestone.label} completed.`
          ) +
          timingMessage,

        previousValue: {
          /*
           * ETA immediately before
           * this completion.
           */
          estimatedDate:
            previousEstimatedDate,

          /*
           * First-ever plan.
           */
          originalEstimatedDate:
            milestone.originalEstimatedDate,
        },

        newValue: {
          actualDate:
            finalActualDate,

          shiftDays,
        },

        updatedBy:
          snapshot,

        createdAt:
          new Date(),
      }
    );

    await tracking.save();

    return tracking;
  };

/* =========================================================
   UPDATE ESTIMATED DATE

   Dispatch/production can manually revise an estimate.

   Example:

   Current Forging ETA = 20 Aug
   Revised = 23 Aug

   +3 days

   All future pending milestones move +3.
========================================================= */

const updateEstimatedDate =
  async ({
    trackingId,
    milestoneId,
    estimatedDate,
    comment,
    user,
  }) => {
    const tracking =
      await OrderTracking.findOne({
        _id:
          trackingId,

        isActive:
          true,
      });

    if (!tracking) {
      throw new Error(
        "Order tracking not found"
      );
    }

    const milestone =
      tracking.milestones.id(
        milestoneId
      );

    if (!milestone) {
      throw new Error(
        "Milestone not found"
      );
    }

    if (
      milestone.status ===
      "completed"
    ) {
      throw new Error(
        "Estimated date cannot be changed after milestone completion"
      );
    }

    const newDate =
      new Date(
        estimatedDate
      );

    if (
      Number.isNaN(
        newDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid estimated date"
      );
    }

    /*
     * Current working ETA before
     * manual revision.
     */
    const previousDate =
      milestone.estimatedDate
        ? new Date(
            milestone.estimatedDate
          )
        : null;

    /*
     * IMPORTANT:
     *
     * Preserve original system estimate
     * before manually changing it.
     *
     * This also supports older DB records.
     */
    if (
      !milestone.originalEstimatedDate &&
      milestone.estimatedDate
    ) {
      milestone.originalEstimatedDate =
        new Date(
          milestone.estimatedDate
        );
    }

    const shiftDays =
      previousDate
        ? differenceInCalendarDays(
            newDate,
            previousDate
          )
        : 0;

    /*
     * Change only CURRENT ETA.
     *
     * Never overwrite originalEstimatedDate.
     */
    milestone.estimatedDate =
  newDate;

/*
 * Save reason entered from
 * Revise ETA modal.
 */
milestone.estimatedDateComment =
  comment
    ? String(comment).trim()
    : "";

milestone.updatedAt =
  new Date();

    /* -----------------------------------------------------
       SHIFT FUTURE PENDING MILESTONES
    ----------------------------------------------------- */

    if (
      previousDate &&
      shiftDays !== 0
    ) {
      tracking.milestones.forEach(
        (
          futureMilestone
        ) => {
          if (
            Number(
              futureMilestone.sequence
            ) <=
            Number(
              milestone.sequence
            )
          ) {
            return;
          }

          if (
            [
              "completed",
              "skipped",
            ].includes(
              futureMilestone.status
            )
          ) {
            return;
          }

          if (
            !futureMilestone.estimatedDate
          ) {
            return;
          }

          /*
           * Preserve original ETA before
           * applying cascade.
           *
           * Important for old records.
           */
          if (
            !futureMilestone.originalEstimatedDate
          ) {
            futureMilestone.originalEstimatedDate =
              new Date(
                futureMilestone.estimatedDate
              );
          }

          /*
           * Change only current working ETA.
           */
          futureMilestone.estimatedDate =
            shiftDateByDays(
              futureMilestone.estimatedDate,
              shiftDays
            );

          futureMilestone.updatedAt =
            new Date();
        }
      );
    }

    /*
     * Update Ready / Loading /
     * Shipped / Delivery summary cards.
     */
    syncEstimatedSummaryDates(
      tracking
    );

    const snapshot =
      createUserSnapshot(
        user
      );

    tracking.lastUpdatedBy =
      snapshot;

    tracking.activityHistory.push(
      {
        type:
          "estimated_date_changed",

        status:
          milestone.code,

        message:
          comment ||
          (
            shiftDays !== 0
              ? `${milestone.label} estimated date updated. Future milestones shifted by ${shiftDays} day(s).`
              : `${milestone.label} estimated date updated.`
          ),

        previousValue: {
          /*
           * Working ETA immediately
           * before revision.
           */
          estimatedDate:
            previousDate,

          /*
           * Initial approved plan.
           */
          originalEstimatedDate:
            milestone.originalEstimatedDate,
        },

        newValue: {
          estimatedDate:
            newDate,

          shiftDays,
        },

        updatedBy:
          snapshot,

        createdAt:
          new Date(),
      }
    );

    await tracking.save();

    return tracking;
  };

/* =========================================================
   UPDATE TRANSPORTER
========================================================= */

const updateTransporter =
  async ({
    trackingId,
    transporter = {},
    user,
  }) => {
    const tracking =
      await OrderTracking.findOne({
        _id:
          trackingId,

        isActive:
          true,
      });

    if (!tracking) {
      throw new Error(
        "Order tracking not found"
      );
    }

    const snapshot =
      createUserSnapshot(
        user
      );

    const previousValue =
      tracking.transporter
        ?.toObject
        ? tracking.transporter
            .toObject()
        : {
            transporterName:
              tracking
                .transporter
                ?.transporterName ||
              "",

            vehicleNumber:
              tracking
                .transporter
                ?.vehicleNumber ||
              "",

            driverName:
              tracking
                .transporter
                ?.driverName ||
              "",

            driverPhone:
              tracking
                .transporter
                ?.driverPhone ||
              "",

            lrNumber:
              tracking
                .transporter
                ?.lrNumber ||
              "",
          };

    /*
     * ?? allows intentional clearing of an existing value.
     */
    tracking.transporter = {
      transporterName:
        transporter
          .transporterName ??
        tracking
          .transporter
          ?.transporterName ??
        "",

      vehicleNumber:
        transporter
          .vehicleNumber ??
        tracking
          .transporter
          ?.vehicleNumber ??
        "",

      driverName:
        transporter
          .driverName ??
        tracking
          .transporter
          ?.driverName ??
        "",

      driverPhone:
        transporter
          .driverPhone ??
        tracking
          .transporter
          ?.driverPhone ??
        "",

      lrNumber:
        transporter
          .lrNumber ??
        tracking
          .transporter
          ?.lrNumber ??
        "",
    };

    tracking.lastUpdatedBy =
      snapshot;

    tracking.activityHistory.push(
      {
        type:
          "transporter_updated",

        status:
          tracking.currentStatus,

        message:
          "Transporter details updated.",

        previousValue,

        newValue: {
          transporterName:
            tracking.transporter
              .transporterName,

          vehicleNumber:
            tracking.transporter
              .vehicleNumber,

          driverName:
            tracking.transporter
              .driverName,

          driverPhone:
            tracking.transporter
              .driverPhone,

          lrNumber:
            tracking.transporter
              .lrNumber,
        },

        updatedBy:
          snapshot,

        createdAt:
          new Date(),
      }
    );

    await tracking.save();

    return tracking;
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  /* GET */
  getAllOrderTrackings,
  getOrderTrackingById,
  getTrackingBySalesOrderId,
  getTrackingByNumber,

  /* SYNC */
  syncSalesOrder,
  syncApprovedSalesOrders,
  createFromApprovedSalesOrder,

  /* UPDATE */
  completeMilestone,
  updateEstimatedDate,
  updateTransporter,

  /* HELPERS */
  resolveProcessType,
  generateMilestones,
  ensurePlanningAutoCompleted,
};