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

/* =========================================================
   NEW HELPER

   Used to check whether original ETA and
   current/revised ETA are different.

   Example:

   originalEstimatedDate = 24 Jun 2026
   estimatedDate         = 19 Aug 2026

   returns true
========================================================= */

export const isDifferentCalendarDate = (
  firstDate,
  secondDate
) => {
  if (
    !firstDate ||
    !secondDate
  ) {
    return false;
  }

  const first =
    new Date(
      firstDate
    );

  const second =
    new Date(
      secondDate
    );

  if (
    Number.isNaN(
      first.getTime()
    ) ||
    Number.isNaN(
      second.getTime()
    )
  ) {
    return false;
  }

  return (
    first.getFullYear() !==
      second.getFullYear() ||
    first.getMonth() !==
      second.getMonth() ||
    first.getDate() !==
      second.getDate()
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
      .replaceAll("_", " ")
  );
};

export const prettySupplyCondition = (
  value
) => {
  const map = {
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
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      )
  );
};

export const formatMaterial = (
  material
) => {
  if (!material) {
    return "—";
  }

  if (
    material.description
  ) {
    return material.description;
  }

  const parts = [
    material.grade,
    material.size,
    material.quantity
      ? `${material.quantity} ${
          material.quantityUnit || ""
        }`
      : "",
  ].filter(Boolean);

  return parts.join(" • ") || "—";
};

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
      label: "Rolling",
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
      label: "Forging",
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
        String(code || "Status")
          .replaceAll(
            "_",
            " "
          )
          .replace(
            /\b\w/g,
            (letter) =>
              letter.toUpperCase()
          ),
      className:
        "is-gray",
    }
  );
};

export const getCurrentMilestone = (
  tracking
) =>
  tracking?.milestones?.find(
    (item) =>
      item.isCurrent
  ) ||
  tracking?.milestones?.find(
    (item) =>
      item.status ===
      "in_progress"
  ) ||
  null;

export const getOrderHealth = (
  tracking
) => {
  if (
    tracking?.currentStatus ===
    "delivered"
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
        tracking.holdReason ||
        "Order is currently on hold.",
    };
  }

  const current =
    getCurrentMilestone(
      tracking
    );

  if (
    !current?.estimatedDate
  ) {
    return {
      label:
        "Awaiting Plan",
      className:
        "is-neutral",
      description:
        "Current milestone estimate is unavailable.",
    };
  }

  const now =
    new Date();

  const estimated =
    new Date(
      current.estimatedDate
    );

  const diff =
    Math.ceil(
      (
        estimated.getTime() -
        now.getTime()
      ) /
        86400000
    );

  if (diff < 0) {
    return {
      label:
        "Delayed",
      className:
        "is-danger",
      description:
        `${Math.abs(
          diff
        )} day${
          Math.abs(diff) ===
          1
            ? ""
            : "s"
        } beyond the current milestone ETA.`,
    };
  }

  if (diff <= 2) {
    return {
      label:
        "Due Soon",
      className:
        "is-warning",
      description:
        "Current milestone is approaching its ETA.",
    };
  }

  return {
    label:
      "On Track",
    className:
      "is-healthy",
    description:
      "Order is progressing within the current plan.",
  };
};

export const getDifferenceLabel = (
  estimatedDate,
  actualDate
) => {
  if (
    !estimatedDate ||
    !actualDate
  ) {
    return null;
  }

  const estimated =
    new Date(
      estimatedDate
    );

  const actual =
    new Date(
      actualDate
    );

  estimated.setHours(
    0,
    0,
    0,
    0
  );

  actual.setHours(
    0,
    0,
    0,
    0
  );

  const difference =
    Math.round(
      (
        actual.getTime() -
        estimated.getTime()
      ) /
        86400000
    );

  if (difference === 0) {
    return {
      type:
        "ontime",
      text:
        "On time",
    };
  }

  if (difference < 0) {
    return {
      type:
        "early",
      text:
        `${Math.abs(
          difference
        )} day${
          Math.abs(
            difference
          ) === 1
            ? ""
            : "s"
        } early`,
    };
  }

  return {
    type:
      "late",
    text:
      `${difference} day${
        difference === 1
          ? ""
          : "s"
      } late`,
  };
};

const findMilestone = (
  tracking,
  codes
) =>
  tracking?.milestones?.find(
    (item) =>
      codes.includes(
        item.code
      )
  );

const stageState = (
  milestone,
  tracking
) => {
  if (!milestone) {
    return "upcoming";
  }

  if (
    milestone.status ===
      "completed" ||
    milestone.actualDate
  ) {
    return "completed";
  }

  if (
    milestone.isCurrent ||
    String(
      tracking.currentMilestoneId ||
        ""
    ) ===
      String(
        milestone._id
      )
  ) {
    return "current";
  }

  return "upcoming";
};

export const getCustomerJourneyStages = (
  tracking
) => {
  const process =
    tracking?.processType;

  const isHO =
    process === "H_O";

  const isForged =
    String(
      process || ""
    ).includes(
      "FORGED"
    );

  const isQT =
    String(
      process || ""
    ).includes(
      "_QT"
    );

  const isHeatTreatment =
    String(
      process || ""
    ).includes(
      "ANNEALED_NORMALIZED"
    );

  const definitions = isHO
    ? [
        {
          key:
            "planning",
          label:
            "Planning",
          codes:
            ["planning"],
        },
        {
          key:
            "cutting",
          label:
            "Cutting",
          codes:
            ["cutting"],
        },
        {
          key:
            "machining",
          label:
            "Machining",
          codes:
            ["machining"],
        },
        {
          key:
            "dispatch",
          label:
            "Dispatch",
          codes: [
            "ready_for_dispatch",
            "loading",
            "shipped",
          ],
        },
        {
          key:
            "delivery",
          label:
            "Delivered",
          codes: [
            "out_for_delivery",
            "delivered",
          ],
        },
      ]
    : [
        {
          key:
            "planning",
          label:
            "Planning",
          codes:
            ["planning"],
        },
        {
          key:
            "casting",
          label:
            "Casting",
          codes:
            ["under_casting"],
        },
        {
          key:
            "forming",
          label:
            isForged
              ? "Forging"
              : "Rolling",
          codes:
            isForged
              ? [
                  "forging_planning",
                  "forging",
                ]
              : [
                  "rolling_planning",
                  "rolling",
                ],
        },
        ...(isQT ||
        isHeatTreatment
          ? [
              {
                key:
                  "heat",
                label:
                  isQT
                    ? "Heat Treatment"
                    : "A/N",
                codes: [
                  "annealing",
                  "normalizing",
                  "quenching",
                  "tempering",
                ],
              },
            ]
          : []),
        {
          key:
            "inspection",
          label:
            "Inspection",
          codes: [
            "inspection",
            "end_cutting_mill_inspection",
            "bharat_inspection",
          ],
        },
        {
          key:
            "dispatch",
          label:
            "Dispatch",
          codes: [
            "ready_for_dispatch",
            "loading",
            "shipped",
          ],
        },
        {
          key:
            "delivery",
          label:
            "Delivered",
          codes: [
            "out_for_delivery",
            "delivered",
          ],
        },
      ];

  return definitions.map(
    (definition) => {
      const matching =
        tracking?.milestones?.filter(
          (item) =>
            definition.codes.includes(
              item.code
            )
        ) || [];

      const current =
        matching.find(
          (item) =>
            stageState(
              item,
              tracking
            ) ===
            "current"
        );

      const incomplete =
        matching.find(
          (item) =>
            stageState(
              item,
              tracking
            ) !==
            "completed"
        );

      const representative =
        current ||
        incomplete ||
        matching[
          matching.length - 1
        ] ||
        findMilestone(
          tracking,
          definition.codes
        );

      let state =
        "upcoming";

      if (
        matching.length &&
        matching.every(
          (item) =>
            stageState(
              item,
              tracking
            ) ===
            "completed"
        )
      ) {
        state =
          "completed";
      } else if (
        matching.some(
          (item) =>
            stageState(
              item,
              tracking
            ) ===
            "current"
        )
      ) {
        state =
          "current";
      }

      return {
        ...definition,
        state,
        dateLabel:
          representative
            ?.actualDate
            ? formatDate(
                representative.actualDate,
                true
              )
            : representative
                ?.estimatedDate
            ? `ETA ${formatDate(
                representative.estimatedDate,
                true
              )}`
            : "Pending",
      };
    }
  );
};