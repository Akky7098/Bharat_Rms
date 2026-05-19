const Dispatch = require("../model/dispatchModel");
const {
  sendPaymentReminderEmail,
} = require("./dispatchReminderMailService");

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDays = (fromDate, toDate) => {
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
};

const updatePaymentStatusIfNeeded = async (dispatch) => {
  if (dispatch.paymentStatus === "paid") return;

  const today = startOfDay();
  const due = startOfDay(dispatch.paymentDueDate);

  if (today > due && dispatch.paymentStatus !== "overdue") {
    dispatch.paymentStatus = "overdue";
    await dispatch.save();
  }
};

const sendReminderAndUpdate = async (dispatch, type, overdueDays = 0) => {
  const mailInfo = await sendPaymentReminderEmail(
    dispatch,
    type,
    overdueDays
  );

  if (type === "before_due_date") {
    dispatch.paymentReminder.beforeDueDateSent = true;
  }

  if (type === "due_date") {
    dispatch.paymentReminder.dueDateSent = true;
  }

  if (type === "overdue") {
    dispatch.paymentReminder.overdueReminderCount =
      Number(dispatch.paymentReminder.overdueReminderCount || 0) + 1;
  }

  dispatch.paymentReminder.lastReminderSentAt = new Date();
  dispatch.paymentReminder.lastReminderType = type;

  await dispatch.save();

  return mailInfo;
};

const processPaymentReminders = async () => {
  const today = startOfDay();

  const dispatches = await Dispatch.find({
    isActive: true,
    paymentStatus: { $in: ["pending", "partial", "overdue"] },
    pendingAmount: { $gt: 0 },
    paymentDueDate: { $exists: true },
  });

  let sentCount = 0;

  for (const dispatch of dispatches) {
    await updatePaymentStatusIfNeeded(dispatch);

    if (dispatch.paymentStatus === "paid") continue;

    const daysToDue = diffDays(today, dispatch.paymentDueDate);
    const daysOverdue = diffDays(dispatch.paymentDueDate, today);

    try {
      // 2 days before due date
      if (
        daysToDue === 2 &&
        !dispatch.paymentReminder.beforeDueDateSent
      ) {
        await sendReminderAndUpdate(dispatch, "before_due_date");
        sentCount++;
        continue;
      }

      // due date
      if (
        daysToDue === 0 &&
        !dispatch.paymentReminder.dueDateSent
      ) {
        await sendReminderAndUpdate(dispatch, "due_date");
        sentCount++;
        continue;
      }

      // after due date every 5 days: 5, 10, 15, 20...
      if (
        daysOverdue > 0 &&
        daysOverdue % 5 === 0
      ) {
        const lastSent = dispatch.paymentReminder.lastReminderSentAt
          ? startOfDay(dispatch.paymentReminder.lastReminderSentAt)
          : null;

        if (!lastSent || lastSent.getTime() !== today.getTime()) {
          await sendReminderAndUpdate(dispatch, "overdue", daysOverdue);
          sentCount++;
        }
      }
    } catch (error) {
      console.error(
        `Payment reminder failed for dispatch ${dispatch._id}:`,
        error.message
      );
    }
  }

  return {
    checked: dispatches.length,
    sent: sentCount,
  };
};

module.exports = {
  processPaymentReminders,
};