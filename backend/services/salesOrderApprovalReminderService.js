const SalesOrder = require("../model/salesOrderModel");
const whatsappApprovalService = require("./whatsappApprovalService");

let reminderRunning = false;

const isWorkingHoursIST = () => {
  const now = new Date();

  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const hour = istNow.getHours();
  const minute = istNow.getMinutes();

  const currentMinutes = hour * 60 + minute;
  const startMinutes = 9 * 60 + 30; // 9:30 AM
  const endMinutes = 20 * 60; // 8:00 PM

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const formatCurrency = (value = 0) => {
  return Number(value || 0).toLocaleString("en-IN");
};

const buildAdminReminderMessage = (orders) => {
  const list = orders
    .slice(0, 10)
    .map((order, index) => {
      return `${index + 1}. ${order.companyName || "-"} | PO: ${
        order.poNumber || "-"
      } | ${order.salesPersonName || "-"} | Rs. ${formatCurrency(
        order.orderValue
      )}`;
    })
    .join("\n");

  return `🚨 *Bharat RMS - Approval Pending*

You have *${orders.length}* sales order(s) pending for sonia approval.

${list}

Please approve or hold from Bharat RMS dashboard.`;
};

const buildMdReminderMessage = (orders) => {
  const list = orders
    .slice(0, 10)
    .map((order, index) => {
      return `${index + 1}. ${order.companyName || "-"} | PO: ${
        order.poNumber || "-"
      } | ${order.salesPersonName || "-"} | Rs. ${formatCurrency(
        order.orderValue
      )}`;
    })
    .join("\n");

  return `🚨 *Bharat RMS - MD sir Approval Pending*

You have *${orders.length}* sales order(s) pending for final MD sir approval.

${list}

Please approve or hold as soon as possible.`;
};

const sendPendingApprovalReminders = async () => {
  if (reminderRunning) {
    console.log("SALES ORDER REMINDER SKIPPED: Previous job still running");

    return {
      adminPending: 0,
      mdPending: 0,
      skipped: "previous_job_running",
    };
  }

  if (!isWorkingHoursIST()) {
    console.log("SALES ORDER REMINDER SKIPPED: Outside working hours");

    return {
      adminPending: 0,
      mdPending: 0,
      skipped: "outside_working_hours",
    };
  }

  reminderRunning = true;

  try {
    console.log("===== SALES ORDER APPROVAL REMINDER START =====");

    const adminPendingOrders = await SalesOrder.find({
      approvalStatus: "pending_admin_review",
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .select("companyName poNumber salesPersonName orderValue createdAt");

    const mdPendingOrders = await SalesOrder.find({
      approvalStatus: "pending_manager_approval",
    })
      .sort({ checkedAt: 1, createdAt: 1 })
      .limit(20)
      .select(
        "companyName poNumber salesPersonName orderValue checkedAt createdAt"
      );

    if (adminPendingOrders.length > 0) {
      if (!process.env.ADMIN_WHATSAPP_NUMBER) {
        console.log("ADMIN_WHATSAPP_NUMBER missing in env");
      } else {
        const adminChatId = `${process.env.ADMIN_WHATSAPP_NUMBER}@c.us`;

        await whatsappApprovalService.sendPlainWhatsappMessage(
          adminChatId,
          buildAdminReminderMessage(adminPendingOrders)
        );

        console.log("ADMIN PENDING APPROVAL REMINDER SENT");
      }
    }

    /*
      PRODUCTION NOTE:
      MD Sir WhatsApp reminder has been disabled intentionally.

      Reason:
      We only want Sonia/Admin pending approval reminders to continue.
      No reminder WhatsApp should go to MD Sir from this cron/service.

      Do not delete this block permanently because we may need to enable it later.
    */

    // if (mdPendingOrders.length > 0) {
    //   if (!process.env.MD_WHATSAPP_NUMBER) {
    //     console.log("MD_WHATSAPP_NUMBER missing in env");
    //   } else {
    //     const mdChatId = `${process.env.MD_WHATSAPP_NUMBER}@c.us`;
    //
    //     await whatsappApprovalService.sendPlainWhatsappMessage(
    //       mdChatId,
    //       buildMdReminderMessage(mdPendingOrders)
    //     );
    //
    //     console.log("MD PENDING APPROVAL REMINDER SENT");
    //   }
    // }

    console.log("MD PENDING APPROVAL REMINDER DISABLED");

    console.log("===== SALES ORDER APPROVAL REMINDER END =====");

    return {
      adminPending: adminPendingOrders.length,
      mdPending: mdPendingOrders.length,
      mdReminder: "disabled",
    };
  } catch (error) {
    console.log("SALES ORDER APPROVAL REMINDER ERROR =>", error.message);

    return {
      adminPending: 0,
      mdPending: 0,
      mdReminder: "disabled",
      error: error.message,
    };
  } finally {
    reminderRunning = false;
  }
};

module.exports = {
  sendPendingApprovalReminders,
};