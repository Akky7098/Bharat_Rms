/* =========================================================
   DATE FORMATTERS
========================================================= */

export const formatDate = (
  value,
  short = false
) => {
  if (!value) {
    return "Not set";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not set";
  }

  return date.toLocaleDateString(
    "en-IN",
    short
      ? {
          day: "2-digit",
          month: "short",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  );
};

export const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

export const formatOrderDate = (
  tracking
) =>
  formatDate(
    tracking?.approvedAt ||
      tracking?.createdAt ||
      tracking?.updatedAt
  );

/* =========================================================
   ORDER TYPE DISPLAY

   IMPORTANT:
   Backend still stores:
   N.H.O.

   Frontend displays:
   Steel Plant
========================================================= */

export const prettyOrderType = (
  value
) => {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    normalized === "N.H.O." ||
    normalized === "NHO"
  ) {
    return "Steel Plant";
  }

  if (
    normalized === "H.O." ||
    normalized === "HO"
  ) {
    return "H.O.";
  }

  return value || "—";
};

/* =========================================================
   PROCESS TYPE
========================================================= */

export const prettyProcessType = (
  value
) => {
  const map = {
    AS_ROLLED:
      "As Rolled",

    AS_FORGED:
      "As Forged",

    AS_ROLLED_ANNEALED_NORMALIZED:
      "As Rolled + Annealed / Normalized",

    AS_FORGED_ANNEALED_NORMALIZED:
      "As Forged + Annealed / Normalized",

    AS_ROLLED_QT:
      "As Rolled + Q&T",

    AS_FORGED_QT:
      "As Forged + Q&T",

    H_O:
      "H.O.",
  };

  return (
    map[value] ||
    String(value || "—")
      .replaceAll(
        "_",
        " "
      )
  );
};

/* =========================================================
   SUPPLY CONDITION
========================================================= */

export const prettySupplyCondition = (
  value
) => {
  const map = {
    as_per_standard:
      "As Per Standard",

    as_rolled:
      "As Rolled",

    as_forged:
      "As Forged",

    as_rolled_annealed:
      "As Rolled + Annealed",

    as_rolled_normalised:
      "As Rolled + Normalized",

    as_rolled_normalized:
      "As Rolled + Normalized",

    as_forged_annealed:
      "As Forged + Annealed",

    as_forged_normalised:
      "As Forged + Normalized",

    as_forged_normalized:
      "As Forged + Normalized",

    as_rolled_qt:
      "As Rolled + Q&T",

    as_forged_qt:
      "As Forged + Q&T",
  };

  return (
    map[value] ||
    String(value || "—")
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        (
          letter
        ) =>
          letter.toUpperCase()
      )
  );
};

/* =========================================================
   MATERIAL
========================================================= */

export const formatMaterial = (
  material
) => {
  if (!material) {
    return "—";
  }

  if (
    material.description
  ) {
    return (
      material.description
    );
  }

  const parts = [
    material.grade,

    material.size,

    material.quantity
      ? `${material.quantity} ${
          material.quantityUnit ||
          ""
        }`
      : "",
  ].filter(Boolean);

  return (
    parts.join(" • ") ||
    "—"
  );
};

/* =========================================================
   STATUS META
========================================================= */

export const getStatusMeta = (
  code
) => {
  const map = {
    planning: {
      label: "Planning",
      className:
        "is-yellow",
    },

    under_casting: {
      label:
        "Under Casting",
      className:
        "is-orange",
    },

    rolling_planning: {
      label:
        "Rolling Planning",
      className:
        "is-purple",
    },

    rolling: {
      label:
        "Rolling",
      className:
        "is-purple",
    },

    forging_planning: {
      label:
        "Forging Planning",
      className:
        "is-violet",
    },

    forging: {
      label:
        "Forging",
      className:
        "is-violet",
    },

    pit_cooling: {
      label:
        "Pit Cooling",
      className:
        "is-cyan",
    },

    inspection: {
      label:
        "Inspection",
      className:
        "is-blue",
    },

    annealing: {
      label:
        "Annealing",
      className:
        "is-orange",
    },

    normalizing: {
      label:
        "Normalizing",
      className:
        "is-orange",
    },

    quenching: {
      label:
        "Quenching",
      className:
        "is-red",
    },

    tempering: {
      label:
        "Tempering",
      className:
        "is-red",
    },

    end_cutting_mill_inspection: {
      label:
        "Mill Inspection",
      className:
        "is-blue",
    },

    bharat_inspection: {
      label:
        "Bharat Inspection",
      className:
        "is-indigo",
    },

    cutting: {
      label:
        "Cutting",
      className:
        "is-purple",
    },

    machining: {
      label:
        "Machining",
      className:
        "is-cyan",
    },

    ready_for_dispatch: {
      label:
        "Ready for Dispatch",
      className:
        "is-green",
    },

    loading: {
      label:
        "Loading",
      className:
        "is-teal",
    },

    shipped: {
      label:
        "Shipped",
      className:
        "is-blue",
    },

    out_for_delivery: {
      label:
        "Out for Delivery",
      className:
        "is-indigo",
    },

    delivered: {
      label:
        "Delivered",
      className:
        "is-green",
    },

    on_hold: {
      label:
        "On Hold",
      className:
        "is-gray",
    },

    cancelled: {
      label:
        "Cancelled",
      className:
        "is-red",
    },
  };

  return (
    map[code] || {
      label:
        String(
          code ||
          "Status"
        )
          .replaceAll(
            "_",
            " "
          )
          .replace(
            /\b\w/g,
            (
              letter
            ) =>
              letter.toUpperCase()
          ),

      className:
        "is-gray",
    }
  );
};

/* =========================================================
   CURRENT MILESTONE
========================================================= */

export const getCurrentMilestone = (
  tracking
) =>
  tracking
    ?.milestones
    ?.find(
      (
        item
      ) =>
        item.isCurrent
    ) ||
  tracking
    ?.milestones
    ?.find(
      (
        item
      ) =>
        item.status ===
        "in_progress"
    ) ||
  null;

/* =========================================================
   BASELINE DATE

   Health must NEVER be made better simply because
   somebody revised the working plan.

   Priority:
   originalEstimatedDate
   fallback estimatedDate for old records
========================================================= */

export const getBaselineDate = (
  milestone
) =>
  milestone
    ?.originalEstimatedDate ||
  milestone
    ?.estimatedDate ||
  null;

const calendarDayDifference = (
  actualValue,
  plannedValue
) => {
  if (
    !actualValue ||
    !plannedValue
  ) {
    return 0;
  }

  const actual =
    new Date(
      actualValue
    );

  const planned =
    new Date(
      plannedValue
    );

  if (
    Number.isNaN(
      actual.getTime()
    ) ||
    Number.isNaN(
      planned.getTime()
    )
  ) {
    return 0;
  }

  actual.setHours(
    0,
    0,
    0,
    0
  );

  planned.setHours(
    0,
    0,
    0,
    0
  );

  return Math.round(
    (
      actual.getTime() -
      planned.getTime()
    ) /
      86400000
  );
};

/* =========================================================
   ORDER HEALTH

   IMPORTANT:

   Uses ORIGINAL approved-order baseline.

   Manual revised dates DO NOT erase existing delay.

   Example:

   Original plan: 05 Sept
   Revised plan: 07 Sept
   Actual:       07 Sept

   Health remains:
   2 days behind original plan

   It does NOT become "On Time".
========================================================= */

export const getOrderHealth = (
  tracking
) => {
  if (
    tracking?.currentStatus ===
      "delivered" ||
    Number(
      tracking
        ?.progressPercentage ||
      0
    ) >= 100
  ) {
    return {
      label:
        "Delivered",

      className:
        "is-healthy",

      description:
        "Order journey completed.",
    };
  }

  if (
    tracking?.isOnHold
  ) {
    return {
      label:
        "On Hold",

      className:
        "is-warning",

      description:
        tracking
          .holdReason ||
        "Order is currently on hold.",
    };
  }

  const milestones = [
    ...(
      tracking
        ?.milestones ||
      []
    ),
  ].sort(
    (
      a,
      b
    ) =>
      Number(
        a.sequence ||
        0
      ) -
      Number(
        b.sequence ||
        0
      )
  );

  /*
   * First check completed milestones against ORIGINAL plan.
   */
  let largestCompletedDelay =
    0;

  milestones.forEach(
    (
      milestone
    ) => {
      if (
        !milestone.actualDate
      ) {
        return;
      }

      const baseline =
        getBaselineDate(
          milestone
        );

      const difference =
        calendarDayDifference(
          milestone.actualDate,
          baseline
        );

      if (
        difference >
        largestCompletedDelay
      ) {
        largestCompletedDelay =
          difference;
      }
    }
  );

  const current =
    getCurrentMilestone(
      tracking
    );

  if (!current) {
    if (
      largestCompletedDelay >
      0
    ) {
      return {
        label:
          "Delayed",

        className:
          "is-danger",

        description:
          `${largestCompletedDelay} day${
            largestCompletedDelay ===
            1
              ? ""
              : "s"
          } behind the original approved plan.`,
      };
    }

    return {
      label:
        "On Track",

      className:
        "is-healthy",

      description:
        "Order is progressing within the approved baseline.",
    };
  }

  const baselineDate =
    getBaselineDate(
      current
    );

  if (!baselineDate) {
    return {
      label:
        "Awaiting Plan",

      className:
        "is-neutral",

      description:
        "Original stage plan is unavailable.",
    };
  }

  const today =
    new Date();

  const currentBaseline =
    new Date(
      baselineDate
    );

  today.setHours(
    0,
    0,
    0,
    0
  );

  currentBaseline.setHours(
    0,
    0,
    0,
    0
  );

  const currentDelay =
    calendarDayDifference(
      today,
      currentBaseline
    );

  const totalDelay =
    Math.max(
      largestCompletedDelay,
      currentDelay
    );

  if (
    totalDelay >
    0
  ) {
    return {
      label:
        "Delayed",

      className:
        "is-danger",

      description:
        `${totalDelay} day${
          totalDelay === 1
            ? ""
            : "s"
        } behind the original approved plan.`,
    };
  }

  const daysRemaining =
    Math.ceil(
      (
        currentBaseline.getTime() -
        today.getTime()
      ) /
        86400000
    );

  if (
    daysRemaining <=
    2
  ) {
    return {
      label:
        "Due Soon",

      className:
        "is-warning",

      description:
        `${current.label} is approaching its original plan date.`,
    };
  }

  return {
    label:
      "On Track",

    className:
      "is-healthy",

    description:
      "Order is progressing within the original approved plan.",
  };
};

/* =========================================================
   PERFORMANCE DIFFERENCE

   Caller should pass ORIGINAL planned date.
========================================================= */

export const getDifferenceLabel = (
  plannedDate,
  actualDate
) => {
  if (
    !plannedDate ||
    !actualDate
  ) {
    return null;
  }

  const difference =
    calendarDayDifference(
      actualDate,
      plannedDate
    );

  if (
    difference ===
    0
  ) {
    return {
      type:
        "ontime",

      text:
        "Completed on plan",
    };
  }

  if (
    difference <
    0
  ) {
    return {
      type:
        "early",

      text:
        `${Math.abs(
          difference
        )} day${
          Math.abs(
            difference
          ) ===
          1
            ? ""
            : "s"
        } ahead of original plan`,
    };
  }

  return {
    type:
      "late",

    text:
      `${difference} day${
        difference ===
        1
          ? ""
          : "s"
      } behind original plan`,
  };
};

/* =========================================================
   DATE COMPARISON
========================================================= */

export const isDifferentCalendarDate =
  (
    first,
    second
  ) => {
    if (
      !first ||
      !second
    ) {
      return false;
    }

    const a =
      new Date(
        first
      );

    const b =
      new Date(
        second
      );

    if (
      Number.isNaN(
        a.getTime()
      ) ||
      Number.isNaN(
        b.getTime()
      )
    ) {
      return false;
    }

    return (
      a.getFullYear() !==
        b.getFullYear() ||
      a.getMonth() !==
        b.getMonth() ||
      a.getDate() !==
        b.getDate()
    );
  };

/* =========================================================
   JOURNEY STATE
========================================================= */

const getMilestoneState = (
  milestone,
  tracking
) => {
  if (
    milestone?.status ===
      "completed" ||
    milestone?.actualDate
  ) {
    return "completed";
  }

  if (
    milestone?.isCurrent ||
    String(
      tracking
        ?.currentMilestoneId ||
      ""
    ) ===
      String(
        milestone?._id ||
        ""
      )
  ) {
    return "current";
  }

  return "upcoming";
};

/* =========================================================
   CUSTOMER / MANAGEMENT JOURNEY

   IMPORTANT CHANGE:

   OLD:
   forging_planning + forging => one "Forging" node

   NEW:
   Every backend milestone becomes its OWN node.

   Example:
   Planning
   Under Casting
   Forging Planning
   Forging
   Pit Cooling
   Inspection
   ...
========================================================= */

export const getCustomerJourneyStages = (
  tracking
) => {
  const milestones = [
    ...(
      tracking
        ?.milestones ||
      []
    ),
  ].sort(
    (
      a,
      b
    ) =>
      Number(
        a.sequence ||
        0
      ) -
      Number(
        b.sequence ||
        0
      )
  );

  return milestones.map(
    (
      milestone,
      index
    ) => {
      const state =
        getMilestoneState(
          milestone,
          tracking
        );

      const baselineDate =
        getBaselineDate(
          milestone
        );

      const hasRevision =
        Boolean(
          milestone
            .originalEstimatedDate
        ) &&
        isDifferentCalendarDate(
          milestone
            .originalEstimatedDate,
          milestone
            .estimatedDate
        );

      let dateLabel =
        "Plan pending";

      if (
        milestone.actualDate
      ) {
        dateLabel =
          `Completed ${formatDate(
            milestone.actualDate,
            true
          )}`;
      } else if (
        milestone.estimatedDate
      ) {
        dateLabel =
          `Plan ${formatDate(
            milestone.estimatedDate,
            true
          )}`;
      }

      return {
        key:
          milestone._id ||
          milestone.code ||
          index,

        milestone,

        sequence:
          milestone.sequence ||
          index + 1,

        code:
          milestone.code,

        label:
          milestone.label ||
          getStatusMeta(
            milestone.code
          ).label,

        state,

        dateLabel,

        baselineDate,

        currentPlanDate:
          milestone.estimatedDate,

        hasRevision,

        actualDate:
          milestone.actualDate,

        comment:
          milestone.comment ||
          "",

        estimatedDateComment:
          milestone
            .estimatedDateComment ||
          "",

        completedBy:
          milestone.completedBy ||
          null,
      };
    }
  );
};