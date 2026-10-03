const SalesOrder =
  require("../model/salesOrderModel");

const OrderTracking =
  require("../model/OrderTracking");

/*
 * IMPORTANT:
 *
 * Change this import ONLY if your existing
 * dispatch model filename is different.
 *
 * Keep the same Dispatch model import that
 * is already used inside your existing
 * steelAnalyticsService.js.
 */
const Dispatch =
  require("../model/dispatchModel");

/* =========================================================
   CONSTANTS
========================================================= */

const ANALYTICS_START_DATE =
  new Date(
    "2026-08-13T00:00:00.000Z"
  );

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const roundKG = (value) => {
  return (
    Math.round(
      (
        toNumber(value) +
        Number.EPSILON
      ) * 100
    ) / 100
  );
};

const cleanText = (value) => {
  return String(
    value || ""
  ).trim();
};

const safeDate = (value) => {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(
          value.getTime()
        )
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const normalizeTrackingType = (
  value
) => {
  const text =
    cleanText(value)
      .toUpperCase()
      .replace(/\s+/g, "");

  if (
    text === "H.O." ||
    text === "HO"
  ) {
    return "H.O.";
  }

  if (
    text === "N.H.O." ||
    text === "NHO"
  ) {
    return "N.H.O.";
  }

  return cleanText(value);
};

/* =========================================================
   PERIOD
========================================================= */

const buildPeriod = ({
  month,
  months = 1,
} = {}) => {
  const monthsNumber =
    Number(months);

  if (
    ![1, 3, 6].includes(
      monthsNumber
    )
  ) {
    throw new Error(
      "months must be 1, 3 or 6."
    );
  }

  let selectedMonth =
    cleanText(month);

  if (!selectedMonth) {
    const now =
      new Date();

    selectedMonth =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
  }

  if (
    !/^\d{4}-\d{2}$/.test(
      selectedMonth
    )
  ) {
    throw new Error(
      "month must be YYYY-MM."
    );
  }

  const [
    year,
    monthNumber,
  ] = selectedMonth
    .split("-")
    .map(Number);

  let fromDate =
    new Date(
      year,
      monthNumber -
        monthsNumber,
      1,
      0,
      0,
      0,
      0
    );

  const toDate =
    new Date(
      year,
      monthNumber,
      0,
      23,
      59,
      59,
      999
    );

  if (
    fromDate <
    ANALYTICS_START_DATE
  ) {
    fromDate =
      new Date(
        ANALYTICS_START_DATE
      );
  }

  return {
    selectedMonth,

    months:
      monthsNumber,

    fromDate,
    toDate,

    from:
      fromDate
        .toISOString()
        .slice(0, 10),

    to:
      toDate
        .toISOString()
        .slice(0, 10),
  };
};

/* =========================================================
   TRACKING TARGET DATE

   THIS IS THE IMPORTANT LOGIC.

   We DO NOT calculate:
   order month + 1 month.

   We use Order Tracking's exact calculated
   estimatedReadyDate.

   Therefore:
   August order can be:
   - September plan
   - October plan

   depending on approval date + process days.
========================================================= */

const getTrackingDispatchTargetDate = (
  tracking
) => {
  const estimatedReadyDate =
    safeDate(
      tracking
        ?.estimatedReadyDate
    );

  if (
    estimatedReadyDate
  ) {
    return estimatedReadyDate;
  }

  const milestones =
    Array.isArray(
      tracking?.milestones
    )
      ? tracking.milestones
      : [];

  const readyMilestone =
    milestones.find(
      (milestone) =>
        cleanText(
          milestone?.code
        ).toLowerCase() ===
        "ready_for_dispatch"
    );

  return safeDate(
    readyMilestone
      ?.estimatedDate ||
      readyMilestone
        ?.originalEstimatedDate
  );
};

/* =========================================================
   GET ORDER QUANTITY KG

   Logistics only needs ONE total quantity.

   No grade parsing here.
========================================================= */

const getOrderQuantityKG = (
  order
) => {
  const directFields = [
    order?.totalQuantityKG,
    order?.totalQuantityKg,
    order?.orderQuantityKG,
    order?.orderQuantityKg,
    order?.quantityKG,
    order?.quantityKg,
    order?.totalKG,
    order?.totalKg,
  ];

  for (
    const value of
    directFields
  ) {
    const quantity =
      toNumber(value);

    if (
      quantity > 0
    ) {
      return roundKG(
        quantity
      );
    }
  }

  const itemArrays = [
    order?.items,
    order?.orderItems,
    order?.products,
    order?.productDetails,
    order?.materialDetails,
    order?.salesOrderItems,
  ];

  for (
    const items of
    itemArrays
  ) {
    if (
      !Array.isArray(
        items
      ) ||
      !items.length
    ) {
      continue;
    }

    let total = 0;

    items.forEach(
      (item) => {
        const directItemKG =
          toNumber(
            item?.quantityKG ??
            item?.quantityKg ??
            item?.qtyKG ??
            item?.qtyKg ??
            item?.totalKG ??
            item?.totalKg ??
            item?.weightKG ??
            item?.weightKg
          );

        if (
          directItemKG > 0
        ) {
          total +=
            directItemKG;

          return;
        }

        const quantity =
          toNumber(
            item?.quantity ??
            item?.qty ??
            item
              ?.orderQuantity ??
            item?.weight
          );

        const unit =
          cleanText(
            item?.unit ??
            item
              ?.quantityUnit ??
            item?.weightUnit
          ).toLowerCase();

        if (
          unit === "mt" ||
          unit === "ton" ||
          unit === "tons" ||
          unit === "tonne" ||
          unit === "tonnes"
        ) {
          total +=
            quantity * 1000;
        } else {
          total +=
            quantity;
        }
      }
    );

    if (
      total > 0
    ) {
      return roundKG(
        total
      );
    }
  }

  const quantity =
    toNumber(
      order?.totalQuantity ??
      order?.orderQuantity ??
      order?.quantity
    );

  const unit =
    cleanText(
      order?.quantityUnit ??
      order?.unit
    ).toLowerCase();

  if (
    unit === "mt" ||
    unit === "ton" ||
    unit === "tons" ||
    unit === "tonne" ||
    unit === "tonnes"
  ) {
    return roundKG(
      quantity * 1000
    );
  }

  return roundKG(
    quantity
  );
};

/* =========================================================
   DISPATCH QUANTITY
========================================================= */

const getDispatchQuantityKG = (
  dispatch
) => {
  const directFields = [
    dispatch?.quantityKG,
    dispatch?.quantityKg,
    dispatch?.dispatchQuantityKG,
    dispatch?.dispatchQuantityKg,
    dispatch?.dispatchedQuantityKG,
    dispatch?.dispatchedQuantityKg,
    dispatch?.totalKG,
    dispatch?.totalKg,
  ];

  for (
    const value of
    directFields
  ) {
    const quantity =
      toNumber(value);

    if (
      quantity > 0
    ) {
      return roundKG(
        quantity
      );
    }
  }

  const quantity =
    toNumber(
      dispatch?.quantity ??
      dispatch?.dispatchQuantity ??
      dispatch?.dispatchedQuantity
    );

  const unit =
    cleanText(
      dispatch?.unit ??
      dispatch?.quantityUnit
    ).toLowerCase();

  if (
    unit === "mt" ||
    unit === "ton" ||
    unit === "tons" ||
    unit === "tonne" ||
    unit === "tonnes"
  ) {
    return roundKG(
      quantity * 1000
    );
  }

  return roundKG(
    quantity
  );
};

/* =========================================================
   DISPATCH DATE
========================================================= */

const getDispatchDate = (
  dispatch
) => {
  return (
    safeDate(
      dispatch
        ?.dispatchDate
    ) ||
    safeDate(
      dispatch
        ?.date
    ) ||
    safeDate(
      dispatch
        ?.createdAt
    )
  );
};

/* =========================================================
   SALES ORDER ID FROM DISPATCH
========================================================= */

const getDispatchSalesOrderId = (
  dispatch
) => {
  return String(
    dispatch?.salesOrderId?._id ||
    dispatch?.salesOrderId ||
    dispatch?.salesOrder?._id ||
    dispatch?.salesOrder ||
    ""
  );
};

/* =========================================================
   SUMMARY
========================================================= */

const createSummary = () => ({
  dispatchPlanKG: 0,
  actualDispatchKG: 0,
  targetPendingKG: 0,
});

/* =========================================================
   LOGISTICS ANALYTICS

   ONLY:

   1. Dispatch Plan
   2. Actual Dispatch
   3. Pending against Plan

   NO:
   - grade analysis
   - mill business analysis
   - order punching analysis
========================================================= */

const getLogisticsAnalytics =
  async ({
    month,
    months = 1,
    trackingOrderType,
    includeDetails = false,
  } = {}) => {
    const period =
      buildPeriod({
        month,
        months,
      });

    const normalizedType =
      trackingOrderType
        ? normalizeTrackingType(
            trackingOrderType
          )
        : "";

    /* =====================================================
       STEP 1
       FIND TRACKING RECORDS WHOSE READY DATE
       CAN CONTRIBUTE TO THE PERIOD

       We keep tracking query lightweight.
    ===================================================== */

    const trackingQuery = {
      isActive: {
        $ne: false,
      },

      $or: [
        {
          estimatedReadyDate: {
            $gte:
              period.fromDate,
            $lte:
              period.toDate,
          },
        },

        {
          milestones: {
            $elemMatch: {
              code:
                "ready_for_dispatch",

              estimatedDate: {
                $gte:
                  period.fromDate,
                $lte:
                  period.toDate,
              },
            },
          },
        },
      ],
    };

    const trackingRecords =
      await OrderTracking
        .find(
          trackingQuery
        )
        .select({
          _id: 1,

          salesOrderId: 1,

          estimatedReadyDate:
            1,

          milestones: {
            $elemMatch: {
              code:
                "ready_for_dispatch",
            },
          },

          updatedAt: 1,
          createdAt: 1,
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();

    /*
     * One latest active tracking
     * record per Sales Order.
     */
    const trackingMap =
      new Map();

    trackingRecords.forEach(
      (tracking) => {
        const id =
          String(
            tracking
              ?.salesOrderId ||
            ""
          );

        if (!id) {
          return;
        }

        if (
          !trackingMap.has(
            id
          )
        ) {
          trackingMap.set(
            id,
            tracking
          );
        }
      }
    );

    const plannedOrderIds =
      Array.from(
        trackingMap.keys()
      );

    /* =====================================================
       STEP 2
       LOAD ONLY SALES ORDERS REQUIRED FOR PLAN

       We do NOT load every Sales Order.
    ===================================================== */

    const salesOrderQuery = {
      _id: {
        $in:
          plannedOrderIds,
      },

      isActive: {
        $ne: false,
      },
    };

    if (normalizedType) {
      salesOrderQuery
        .trackingOrderType =
        normalizedType;
    }

    const plannedOrders =
      plannedOrderIds.length
        ? await SalesOrder
            .find(
              salesOrderQuery
            )
            .select({
              _id: 1,

              trackingOrderType:
                1,

              companyName: 1,
              customerName: 1,

              poNumber: 1,

              salesOrderNo: 1,
              salesOrderNumber:
                1,

              salesPersonName:
                1,

              totalQuantityKG:
                1,
              totalQuantityKg:
                1,

              orderQuantityKG:
                1,
              orderQuantityKg:
                1,

              quantityKG: 1,
              quantityKg: 1,

              totalKG: 1,
              totalKg: 1,

              totalQuantity: 1,
              orderQuantity: 1,
              quantity: 1,

              quantityUnit: 1,
              unit: 1,

              items: 1,
              orderItems: 1,
              products: 1,
              productDetails: 1,
              materialDetails: 1,
              salesOrderItems: 1,
            })
            .lean()
        : [];

    const plannedOrderMap =
      new Map();

    plannedOrders.forEach(
      (order) => {
        plannedOrderMap.set(
          String(
            order._id
          ),
          order
        );
      }
    );

    /* =====================================================
       STEP 3
       EXACT PLAN ORDERS

       Recheck target date using same source of truth.
    ===================================================== */

    const planOrders = [];

    trackingMap.forEach(
      (
        tracking,
        salesOrderId
      ) => {
        const order =
          plannedOrderMap.get(
            salesOrderId
          );

        if (!order) {
          return;
        }

        const targetDate =
          getTrackingDispatchTargetDate(
            tracking
          );

        if (!targetDate) {
          return;
        }

        if (
          targetDate <
            period.fromDate ||
          targetDate >
            period.toDate
        ) {
          return;
        }

        const orderKG =
          getOrderQuantityKG(
            order
          );

        if (
          orderKG <= 0
        ) {
          return;
        }

        planOrders.push({
          order,
          tracking,
          targetDate,
          orderKG,
        });
      }
    );

    const exactPlanOrderIds =
      planOrders.map(
        (item) =>
          item.order._id
      );

    /* =====================================================
       STEP 4
       DISPATCHES AGAINST PLAN ORDERS

       Needed to calculate pending.

       Historical dispatch up to period end
       is used against planned quantity.
    ===================================================== */

    const planDispatches =
      exactPlanOrderIds.length
        ? await Dispatch
            .find({
              salesOrderId: {
                $in:
                  exactPlanOrderIds,
              },
            })
            .select({
              salesOrderId: 1,

              dispatchDate: 1,
              date: 1,
              createdAt: 1,

              quantityKG: 1,
              quantityKg: 1,

              dispatchQuantityKG:
                1,
              dispatchQuantityKg:
                1,

              dispatchedQuantityKG:
                1,
              dispatchedQuantityKg:
                1,

              totalKG: 1,
              totalKg: 1,

              quantity: 1,
              dispatchQuantity: 1,
              dispatchedQuantity: 1,

              unit: 1,
              quantityUnit: 1,
            })
            .lean()
        : [];

    const dispatchThroughEndMap =
      new Map();

    planDispatches.forEach(
      (dispatch) => {
        const dispatchDate =
          getDispatchDate(
            dispatch
          );

        if (
          !dispatchDate ||
          dispatchDate >
            period.toDate
        ) {
          return;
        }

        const orderId =
          getDispatchSalesOrderId(
            dispatch
          );

        if (!orderId) {
          return;
        }

        const quantityKG =
          getDispatchQuantityKG(
            dispatch
          );

        dispatchThroughEndMap.set(
          orderId,

          roundKG(
            toNumber(
              dispatchThroughEndMap.get(
                orderId
              )
            ) +
              quantityKG
          )
        );
      }
    );

    /* =====================================================
       STEP 5
       ACTUAL PHYSICAL DISPATCH IN PERIOD

       This is independent from plan month.

       We query Dispatch collection directly by date.
    ===================================================== */

    const physicalDispatchQuery = {
      $or: [
        {
          dispatchDate: {
            $gte:
              period.fromDate,
            $lte:
              period.toDate,
          },
        },

        {
          dispatchDate: {
            $exists: false,
          },

          date: {
            $gte:
              period.fromDate,
            $lte:
              period.toDate,
          },
        },
      ],
    };

    const physicalDispatches =
      await Dispatch
        .find(
          physicalDispatchQuery
        )
        .select({
          salesOrderId: 1,

          dispatchDate: 1,
          date: 1,
          createdAt: 1,

          quantityKG: 1,
          quantityKg: 1,

          dispatchQuantityKG:
            1,
          dispatchQuantityKg:
            1,

          dispatchedQuantityKG:
            1,
          dispatchedQuantityKg:
            1,

          totalKG: 1,
          totalKg: 1,

          quantity: 1,
          dispatchQuantity: 1,
          dispatchedQuantity: 1,

          unit: 1,
          quantityUnit: 1,
        })
        .lean();

    /*
     * If H.O./N.H.O. filter is requested,
     * identify the Sales Orders belonging
     * to those physical dispatches.
     */
    let allowedPhysicalIds =
      null;

    if (
      normalizedType &&
      physicalDispatches.length
    ) {
      const physicalOrderIds =
        [
          ...new Set(
            physicalDispatches
              .map(
                (dispatch) =>
                  getDispatchSalesOrderId(
                    dispatch
                  )
              )
              .filter(Boolean)
          ),
        ];

      const typedOrders =
        await SalesOrder
          .find({
            _id: {
              $in:
                physicalOrderIds,
            },

            trackingOrderType:
              normalizedType,

            isActive: {
              $ne: false,
            },
          })
          .select({
            _id: 1,
          })
          .lean();

      allowedPhysicalIds =
        new Set(
          typedOrders.map(
            (order) =>
              String(
                order._id
              )
          )
        );
    }

    /* =====================================================
       STEP 6
       SUMMARIES
    ===================================================== */

    const total =
      createSummary();

    const house =
      createSummary();

    const steelMill =
      createSummary();

    const details = [];

    planOrders.forEach(
      ({
        order,
        targetDate,
        orderKG,
      }) => {
        const type =
          normalizeTrackingType(
            order
              .trackingOrderType
          );

        const orderId =
          String(
            order._id
          );

        const dispatchedThroughEnd =
          roundKG(
            toNumber(
              dispatchThroughEndMap.get(
                orderId
              )
            )
          );

        const pendingKG =
          roundKG(
            Math.max(
              orderKG -
                dispatchedThroughEnd,
              0
            )
          );

        total
          .dispatchPlanKG +=
          orderKG;

        total
          .targetPendingKG +=
          pendingKG;

        const bucket =
          type === "H.O."
            ? house
            : type ===
                "N.H.O."
              ? steelMill
              : null;

        if (bucket) {
          bucket
            .dispatchPlanKG +=
            orderKG;

          bucket
            .targetPendingKG +=
            pendingKG;
        }

        if (
          includeDetails
        ) {
          details.push({
            salesOrderId:
              order._id,

            salesOrderNo:
              cleanText(
                order
                  .salesOrderNo ||
                  order
                    .salesOrderNumber
              ),

            poNumber:
              cleanText(
                order.poNumber
              ),

            companyName:
              cleanText(
                order
                  .companyName ||
                  order
                    .customerName
              ),

            salesPersonName:
              cleanText(
                order
                  .salesPersonName
              ),

            trackingOrderType:
              type,

            dispatchTargetDate:
              targetDate,

            dispatchPlanKG:
              orderKG,

            dispatchedThroughPeriodEndKG:
              dispatchedThroughEnd,

            targetPendingKG:
              pendingKG,
          });
        }
      }
    );

    /* =====================================================
       PHYSICAL DISPATCH TOTAL
    ===================================================== */

    const physicalOrderIds =
      [
        ...new Set(
          physicalDispatches
            .map(
              (dispatch) =>
                getDispatchSalesOrderId(
                  dispatch
                )
            )
            .filter(Boolean)
        ),
      ];

    const physicalOrderTypes =
      new Map();

    if (
      physicalOrderIds.length
    ) {
      const ordersForType =
        await SalesOrder
          .find({
            _id: {
              $in:
                physicalOrderIds,
            },
          })
          .select({
            _id: 1,
            trackingOrderType:
              1,
          })
          .lean();

      ordersForType.forEach(
        (order) => {
          physicalOrderTypes.set(
            String(
              order._id
            ),

            normalizeTrackingType(
              order
                .trackingOrderType
            )
          );
        }
      );
    }

    physicalDispatches.forEach(
      (dispatch) => {
        const dispatchDate =
          getDispatchDate(
            dispatch
          );

        if (
          !dispatchDate ||
          dispatchDate <
            period.fromDate ||
          dispatchDate >
            period.toDate
        ) {
          return;
        }

        const orderId =
          getDispatchSalesOrderId(
            dispatch
          );

        if (
          normalizedType &&
          allowedPhysicalIds &&
          !allowedPhysicalIds.has(
            orderId
          )
        ) {
          return;
        }

        const quantityKG =
          getDispatchQuantityKG(
            dispatch
          );

        if (
          quantityKG <= 0
        ) {
          return;
        }

        total
          .actualDispatchKG +=
          quantityKG;

        const type =
          physicalOrderTypes.get(
            orderId
          );

        if (
          type === "H.O."
        ) {
          house
            .actualDispatchKG +=
            quantityKG;
        }

        if (
          type === "N.H.O."
        ) {
          steelMill
            .actualDispatchKG +=
            quantityKG;
        }
      }
    );

    [
      total,
      house,
      steelMill,
    ].forEach(
      (summary) => {
        summary
          .dispatchPlanKG =
          roundKG(
            summary
              .dispatchPlanKG
          );

        summary
          .actualDispatchKG =
          roundKG(
            summary
              .actualDispatchKG
          );

        summary
          .targetPendingKG =
          roundKG(
            summary
              .targetPendingKG
          );
      }
    );

    return {
      generatedAt:
        new Date(),

      period: {
        selectedMonth:
          period
            .selectedMonth,

        months:
          period.months,

        from:
          period.from,

        to:
          period.to,
      },

      summary: {
        combined:
          total,

        house,

        steelMill,
      },

      ...(includeDetails
        ? {
            plannedOrders:
              details,
          }
        : {}),
    };
  };

/* =========================================================
   PLAN DETAILS

   Called only when user clicks Plan/Pending.
========================================================= */

const getLogisticsPlanDetails =
  async ({
    month,
    months = 1,
    trackingOrderType,
  } = {}) => {
    return getLogisticsAnalytics({
      month,
      months,
      trackingOrderType,

      includeDetails:
        true,
    });
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getLogisticsAnalytics,
  getLogisticsPlanDetails,
  getTrackingDispatchTargetDate,
  buildPeriod,
};