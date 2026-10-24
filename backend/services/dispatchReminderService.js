const crypto = require("crypto");
const PaymentReminderDelivery = require("../model/paymentReminderDeliveryModel");
const { dayKey, daysLate, reminderType, accountPaymentState } = require("../util/paymentReminderPolicy");
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

const startOfDay = (date = new Date()) => new Date(`${dayKey(date)}T00:00:00+05:30`);

const getEffectivePaymentDueDate =
  (dispatch) => {
    return (
      dispatch
        ?.revisedPaymentDueDate ||
      dispatch?.paymentDueDate ||
      null
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

const sendReminderAndUpdate =
  async (
    dispatch,
    type,
    overdueDays = 0,
    invoices = [dispatch],
    existingMailInfo = null
  ) => {
    ensurePaymentReminderObject(
      dispatch
    );

    const effectiveDueDate =
      getEffectivePaymentDueDate(
        dispatch
      );

    const mailInfo =
      existingMailInfo || await sendPaymentReminderEmail(
        dispatch,
        type,
        overdueDays,
        invoices
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

      }).sort({
        revisedPaymentDueDate:
          1,

        paymentDueDate:
          1,

        createdAt:
          1,
      });

    const whatsappCounts = { sent: 0, failed: 0, skipped: 0 };
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Keep each recipient isolated while consolidating their company's invoices.
    const groups = new Map();
    for (const dispatch of dispatches) {
      const company = String(dispatch.companyName || "").trim().toLowerCase().replace(/\s+/g, " ");
      const email = String(dispatch.contactPersonEmail || "").trim().toLowerCase();
      const key = `${company}|${email}`;
      if (!groups.has(key)) groups.set(key, { company, invoices: [] });
      groups.get(key).invoices.push(dispatch);
    }
    const now = new Date();
    for (const [key, group] of groups) {
      let claimId;
      try {
        const companyInvoices = accountPaymentState(dispatches.filter(invoice => String(invoice.companyName || "").trim().toLowerCase().replace(/\s+/g, " ") === group.company), now).outstanding;
        const oldest = daysLate(companyInvoices[0], now);
        // The oldest company debt anchors the cadence; new invoices cannot reset it.
        const candidates = oldest > 0
          ? ((forceAllOverdue || oldest % 3 === 0) ? group.invoices : [])
          : group.invoices.filter(invoice => reminderType(invoice, now, forceAllOverdue));
        if (!candidates.length) { skippedCount += group.invoices.length; continue; }
        // Any reminder already delivered to this contact today suppresses another.
        if (group.invoices.some(invoice => invoice.paymentReminder?.lastReminderSentAt && dayKey(invoice.paymentReminder.lastReminderSentAt) === dayKey(now))) {
          skippedCount += group.invoices.length;
          continue;
        }
        const representative = candidates[0];
        const late = Math.max(0, oldest);
        const type = oldest > 0 ? "overdue" : oldest === 0 ? "due_date" : "before_due_date";
        // Unique database claim also covers multiple server workers/manual runners.
        claimId = crypto.createHash("sha256").update(`${dayKey(now)}|${key}`).digest("hex");
        try {
          await PaymentReminderDelivery.create({ _id: claimId, status: "sending" });
        } catch (error) {
          if (error.code === 11000) { skippedCount += group.invoices.length; continue; }
          throw error;
        }
        // WhatsApp has a separate recipient/day claim and cannot fail email delivery.
        // Send once per customer mobile even if it appears under multiple email contacts.
        const recipients = new Map(group.invoices.map(invoice => [String(invoice.contactPersonNumber || "").replace(/\D/g, ""), invoice]));
        for (const contactInvoice of recipients.values()) {
          const result = await require("./dispatchWhatsappService").sendPaymentReminderWhatsapp(contactInvoice, type, late, companyInvoices, now);
          whatsappCounts[result.status]++;
        }
        const mailInfo = await sendPaymentReminderEmail(representative, type, late, companyInvoices);
        await PaymentReminderDelivery.updateOne({ _id: claimId }, { $set: { status: "sent", messageId: mailInfo.messageId } });
        for (const invoice of candidates) {
          const invoiceType = daysLate(invoice, now) > 0 ? "overdue" : reminderType(invoice, now, forceAllOverdue);
          if (invoiceType) {
            await sendReminderAndUpdate(invoice, invoiceType, Math.max(0, daysLate(invoice, now)), companyInvoices, mailInfo);
          } else {
            ensurePaymentReminderObject(invoice);
            invoice.paymentReminder.lastReminderSentAt = now;
            await invoice.save();
          }
        }
        sentCount++;
      } catch (error) {
        failedCount++;
        if (claimId) {
          await PaymentReminderDelivery.updateOne({ _id: claimId, status: "sending" }, { $set: { status: "failed", error: error.message } }).catch(() => {});
        }
        console.error("Company payment reminder failed:", error.message);
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
      whatsapp: whatsappCounts,
    };
  };

module.exports = {
  processPaymentReminders,
  syncOverduePaymentStatuses,
  getEffectivePaymentDueDate,
};