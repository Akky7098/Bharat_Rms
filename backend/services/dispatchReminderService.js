const Dispatch =
  require("../model/dispatchModel");

const {
  sendPaymentReminderEmail,
} = require("./dispatchReminderMailService");

let notificationService = null;

try {
  notificationService =
    require("./notificationService");
} catch (error) {
  console.log(
    "Notification service not loaded =>",
    error.message
  );
}

const safeCreateNotification =
  async (payload) => {
    try {
      if (
        !notificationService
          ?.createNotification
      ) {
        return;
      }

      await notificationService
        .createNotification(
          payload
        );
    } catch (error) {
      console.log(
        "PAYMENT REMINDER NOTIFICATION ERROR =>",
        error.message
      );
    }
  };

const startOfDay = (
  date = new Date()
) => {
  const d = new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
};

const diffDays = (
  fromDate,
  toDate
) => {
  const from =
    startOfDay(fromDate);

  const to =
    startOfDay(toDate);

  return Math.floor(
    (
      to.getTime() -
      from.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getEffectivePaymentDueDate =
  (dispatch) => {
    return (
      dispatch
        ?.revisedPaymentDueDate ||
      dispatch?.paymentDueDate ||
      null
    );
  };

const wasReminderSentToday = (
  dispatch,
  today
) => {
  const lastReminderSentAt =
    dispatch?.paymentReminder
      ?.lastReminderSentAt;

  if (!lastReminderSentAt) {
    return false;
  }

  return (
    startOfDay(
      lastReminderSentAt
    ).getTime() ===
    today.getTime()
  );
};

const ensurePaymentReminderObject =
  (dispatch) => {
    if (
      !dispatch.paymentReminder
    ) {
      dispatch.paymentReminder = {
        beforeDueDateSent:
          false,

        dueDateSent:
          false,

        overdueReminderCount:
          0,
      };
    }

    if (
      dispatch.paymentReminder
        .beforeDueDateSent ===
      undefined
    ) {
      dispatch.paymentReminder
        .beforeDueDateSent =
        false;
    }

    if (
      dispatch.paymentReminder
        .dueDateSent ===
      undefined
    ) {
      dispatch.paymentReminder
        .dueDateSent =
        false;
    }

    if (
      dispatch.paymentReminder
        .overdueReminderCount ===
      undefined
    ) {
      dispatch.paymentReminder
        .overdueReminderCount =
        0;
    }
  };

const syncOverduePaymentStatuses =
  async () => {
    const today =
      startOfDay();

    const overdueResult =
      await Dispatch.updateMany(
        {
          isActive: true,

          dispatchStatus: {
            $ne: "cancelled",
          },

          paymentStatus: {
            $ne: "paid",
          },

          pendingAmount: {
            $gt: 0,
          },

          $expr: {
            $lt: [
              {
                $ifNull: [
                  "$revisedPaymentDueDate",
                  "$paymentDueDate",
                ],
              },
              today,
            ],
          },
        },
        {
          $set: {
            paymentStatus:
              "overdue",
          },
        }
      );

    const pendingResult =
      await Dispatch.updateMany(
        {
          isActive: true,

          dispatchStatus: {
            $ne: "cancelled",
          },

          paymentStatus:
            "overdue",

          pendingAmount: {
            $gt: 0,
          },

          paidAmount: {
            $lte: 0,
          },

          revisedPaymentDueDate: {
            $exists: true,
            $ne: null,
            $gte: today,
          },
        },
        {
          $set: {
            paymentStatus:
              "pending",
          },
        }
      );

    const partialResult =
      await Dispatch.updateMany(
        {
          isActive: true,

          dispatchStatus: {
            $ne: "cancelled",
          },

          paymentStatus:
            "overdue",

          pendingAmount: {
            $gt: 0,
          },

          paidAmount: {
            $gt: 0,
          },

          revisedPaymentDueDate: {
            $exists: true,
            $ne: null,
            $gte: today,
          },
        },
        {
          $set: {
            paymentStatus:
              "partial",
          },
        }
      );

    const matched =
      Number(
        overdueResult
          ?.matchedCount || 0
      ) +
      Number(
        pendingResult
          ?.matchedCount || 0
      ) +
      Number(
        partialResult
          ?.matchedCount || 0
      );

    const modified =
      Number(
        overdueResult
          ?.modifiedCount || 0
      ) +
      Number(
        pendingResult
          ?.modifiedCount || 0
      ) +
      Number(
        partialResult
          ?.modifiedCount || 0
      );

    return {
      matched,
      modified,
    };
  };

const updatePaymentStatusIfNeeded =
  async (dispatch) => {
    if (
      dispatch.paymentStatus ===
      "paid"
    ) {
      return false;
    }

    const pendingAmount =
      Number(
        dispatch.pendingAmount ||
          0
      );

    const paidAmount =
      Number(
        dispatch.paidAmount ||
          0
      );

    if (pendingAmount <= 0) {
      dispatch.paymentStatus =
        "paid";

      await dispatch.save();

      return true;
    }

    const effectiveDueDate =
      getEffectivePaymentDueDate(
        dispatch
      );

    if (!effectiveDueDate) {
      return false;
    }

    const today =
      startOfDay();

    const due =
      startOfDay(
        effectiveDueDate
      );

    let nextStatus;

    if (today > due) {
      nextStatus =
        "overdue";
    } else if (paidAmount > 0) {
      nextStatus =
        "partial";
    } else {
      nextStatus =
        "pending";
    }

    if (
      dispatch.paymentStatus !==
      nextStatus
    ) {
      dispatch.paymentStatus =
        nextStatus;

      await dispatch.save();

      return true;
    }

    return false;
  };

const sendReminderAndUpdate =
  async (
    dispatch,
    type,
    overdueDays = 0
  ) => {
    ensurePaymentReminderObject(
      dispatch
    );

    const effectiveDueDate =
      getEffectivePaymentDueDate(
        dispatch
      );

    const mailInfo =
      await sendPaymentReminderEmail(
        dispatch,
        type,
        overdueDays
      );

    if (
      type ===
      "before_due_date"
    ) {
      dispatch.paymentReminder
        .beforeDueDateSent =
        true;
    }

    if (
      type === "due_date"
    ) {
      dispatch.paymentReminder
        .dueDateSent =
        true;
    }

    if (
      type === "overdue"
    ) {
      dispatch.paymentReminder
        .overdueReminderCount =
        Number(
          dispatch
            .paymentReminder
            .overdueReminderCount ||
            0
        ) + 1;
    }

    dispatch.paymentReminder
      .lastReminderSentAt =
      new Date();

    dispatch.paymentReminder
      .lastReminderType =
      type;

    await dispatch.save();

    await safeCreateNotification({
      module: "dispatch",
      event: type,

      title:
        type ===
        "before_due_date"
          ? "Payment Due Soon"
          : type ===
              "due_date"
          ? "Payment Due Today"
          : "Payment Overdue",

      message:
        type === "overdue"
          ? `${
              dispatch.companyName
            } payment is overdue by ${overdueDays} day(s). Pending ₹${Number(
              dispatch.pendingAmount ||
                0
            ).toLocaleString(
              "en-IN"
            )}`
          : `${
              dispatch.companyName
            } payment pending ₹${Number(
              dispatch.pendingAmount ||
                0
            ).toLocaleString(
              "en-IN"
            )} | Invoice ${
              dispatch.invoiceNumber
            }`,

      priority:
        type === "overdue"
          ? "urgent"
          : "high",

      targetUserIds:
        dispatch.salesPersonId
          ? [
              dispatch.salesPersonId,
            ]
          : [],

      targetRoles: [
        "admin",
        "super_admin",
      ],

      createdBy: null,

      referenceId:
        dispatch._id,

      referenceModel:
        "Dispatch",

      actionUrl:
        "/dashboard#dispatch",

      meta: {
        companyName:
          dispatch.companyName,

        invoiceNumber:
          dispatch.invoiceNumber,

        pendingAmount:
          dispatch.pendingAmount,

        originalPaymentDueDate:
          dispatch.paymentDueDate,

        revisedPaymentDueDate:
          dispatch
            .revisedPaymentDueDate,

        effectivePaymentDueDate:
          effectiveDueDate,

        overdueDays,

        reminderType:
          type,
      },
    });

    return mailInfo;
  };

const processPaymentReminders =
  async ({
    forceAllOverdue = false,
  } = {}) => {
    const today =
      startOfDay();

    const statusSync =
      await syncOverduePaymentStatuses();

    const dispatches =
      await Dispatch.find({
        isActive: true,

        dispatchStatus: {
          $ne: "cancelled",
        },

        paymentStatus: {
          $in: [
            "pending",
            "partial",
            "overdue",
          ],
        },

        pendingAmount: {
          $gt: 0,
        },

        $or: [
          {
            revisedPaymentDueDate: {
              $exists: true,
              $ne: null,
            },
          },
          {
            paymentDueDate: {
              $exists: true,
              $ne: null,
            },
          },
        ],
      }).sort({
        revisedPaymentDueDate:
          1,

        paymentDueDate:
          1,

        createdAt:
          1,
      });

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (
      const dispatch of
      dispatches
    ) {
      try {
        ensurePaymentReminderObject(
          dispatch
        );

        await updatePaymentStatusIfNeeded(
          dispatch
        );

        if (
          dispatch.paymentStatus ===
          "paid"
        ) {
          skippedCount++;
          continue;
        }

        const effectiveDueDate =
          getEffectivePaymentDueDate(
            dispatch
          );

        if (!effectiveDueDate) {
          skippedCount++;
          continue;
        }

        const daysToDue =
          diffDays(
            today,
            effectiveDueDate
          );

        const daysOverdue =
          diffDays(
            effectiveDueDate,
            today
          );

        if (
          daysToDue === 2 &&
          !dispatch
            .paymentReminder
            .beforeDueDateSent
        ) {
          await sendReminderAndUpdate(
            dispatch,
            "before_due_date"
          );

          sentCount++;
          continue;
        }

        if (
          daysToDue === 0 &&
          !dispatch
            .paymentReminder
            .dueDateSent
        ) {
          await sendReminderAndUpdate(
            dispatch,
            "due_date"
          );

          sentCount++;
          continue;
        }

        if (daysOverdue > 0) {
          const alreadySentToday =
            wasReminderSentToday(
              dispatch,
              today
            );

          if (
            alreadySentToday
          ) {
            skippedCount++;
            continue;
          }

          if (forceAllOverdue) {
            await sendReminderAndUpdate(
              dispatch,
              "overdue",
              daysOverdue
            );

            sentCount++;
            continue;
          }

          if (
            daysOverdue % 5 ===
            0
          ) {
            await sendReminderAndUpdate(
              dispatch,
              "overdue",
              daysOverdue
            );

            sentCount++;
            continue;
          }
        }

        skippedCount++;
      } catch (error) {
        failedCount++;

        console.error(
          `Payment reminder failed for dispatch ${dispatch._id}:`,
          error.message
        );
      }
    }

    return {
      checked:
        dispatches.length,

      sent:
        sentCount,

      failed:
        failedCount,

      skipped:
        skippedCount,

      statusMatched:
        statusSync.matched,

      statusUpdated:
        statusSync.modified,

      forcedOverdueRun:
        forceAllOverdue,
    };
  };

module.exports = {
  processPaymentReminders,
  syncOverduePaymentStatuses,
  getEffectivePaymentDueDate,
};