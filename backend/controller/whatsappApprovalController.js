const SalesOrder = require("../model/salesOrderModel");
const finalApprovalService = require("../services/finalApprovalService");
const {
  sendFinalPdfToSalesGroup,
} = require("../services/whatsappApprovalService");

const validateToken = (salesOrder, token) => {
  return (
    salesOrder.managerEmailApproval &&
    salesOrder.managerEmailApproval.token &&
    salesOrder.managerEmailApproval.token === token
  );
};

const successPage = (title, message) => `
  <div style="font-family:Arial;padding:30px;text-align:center;">
    <h2 style="color:#16a34a;">${title}</h2>
    <p>${message}</p>
  </div>
`;

const fixApprovalHistoryRoles = (salesOrder) => {
  salesOrder.approvalHistory = (salesOrder.approvalHistory || []).map((item) => {
    const plain = item?.toObject ? item.toObject() : item;

    return {
      ...plain,
      role: plain.role || "system",
      comment: plain.comment || plain.remarks || "",
    };
  });
};

const approveFromWhatsapp = async (req, res) => {
  try {
    const { id, token } = req.params;

    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).send("Sales order not found");
    }

    if (!validateToken(salesOrder, token)) {
      return res.status(403).send("Invalid or expired approval link");
    }

    if (salesOrder.approvalStatus === "approved") {
      return res.send(
        successPage(
          "Sales Order Already Approved",
          "This Sales Order has already been approved by MD Sir."
        )
      );
    }

    if (salesOrder.approvalStatus !== "pending_manager_approval") {
      return res.send(`
        <div style="font-family:Arial;padding:30px;">
          <h2>Action Not Available</h2>
          <p>This Sales Order is no longer pending MD Sir approval.</p>
          <p><b>Current Status:</b> ${salesOrder.approvalStatus}</p>
        </div>
      `);
    }

    if (req.method === "GET") {
      return res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Approve Sales Order</title>
  </head>

  <body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
    <div style="background:#fff;width:100%;max-width:440px;border-radius:20px;padding:24px 18px;text-align:center;box-shadow:0 18px 40px rgba(15,23,42,.18);box-sizing:border-box;">
      
      <div style="width:66px;height:66px;border-radius:50%;background:#dcfce7;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#16a34a;font-weight:bold;">
        ✓
      </div>

      <h2 style="margin:0 0 10px;color:#111827;font-size:22px;line-height:1.25;">
        Approve Sales Order
      </h2>

      <p style="color:#475569;font-size:15px;line-height:1.5;margin:0 0 16px;">
        Are you sure you want to approve this sales order?
      </p>

      <div style="text-align:left;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:13px;margin:16px 0;font-size:13px;color:#111827;line-height:1.45;">
        <p style="margin:0 0 8px;"><b>Company:</b> ${salesOrder.companyName || "-"}</p>
        <p style="margin:0 0 8px;"><b>PO Number:</b> ${salesOrder.poNumber || "-"}</p>
        <p style="margin:0;"><b>Sales Person:</b> ${salesOrder.salesPersonName || "-"}</p>
      </div>

      <form method="POST" action="/api/whatsapp-approval/approve/${id}/${token}" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
        <button
          type="button"
          onclick="history.back()"
          style="flex:1;min-width:130px;padding:14px 10px;border:0;border-radius:12px;background:#e5e7eb;color:#111827;font-weight:bold;font-size:15px;cursor:pointer;"
        >
          Cancel
        </button>

        <button
          type="submit"
          style="flex:1;min-width:130px;padding:14px 10px;border:0;border-radius:12px;background:#16a34a;color:white;font-weight:bold;font-size:15px;cursor:pointer;"
        >
          Yes, Approve
        </button>
      </form>

      <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.4;">
        Approval will be completed only after pressing “Yes, Approve”.
      </p>
    </div>
  </body>
  </html>
`);
    }

    salesOrder.approvalStatus = "approved";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.managerApproval = {
      ...(salesOrder.managerApproval || {}),
      managerName: "MD Sir",
      managerEmail: process.env.MANAGER_EMAIL,
      managerId: null,
      approvedAt: new Date(),
    };

    salesOrder.managerEmailApproval = {
      ...(salesOrder.managerEmailApproval || {}),
      approvedByWhatsappLinkAt: new Date(),
    };

    salesOrder.approvalHistory = salesOrder.approvalHistory || [];

    salesOrder.approvalHistory.push({
      role: "manager",
      action: "manager_approved",
      comment: "Approved by MD Sir from WhatsApp approval link",
      createdAt: new Date(),
    });

    fixApprovalHistoryRoles(salesOrder);

    await salesOrder.save();

    res.send(
      successPage(
        "Sales Order Approved Successfully",
        "The Sales Order has been approved. The existing PDF will be shared with the sales group automatically."
      )
    );

    setImmediate(async () => {
      try {
        await sendFinalPdfToSalesGroup(salesOrder);
      } catch (error) {
        console.log("Final WhatsApp PDF send failed:", error.message);
      }
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const holdForm = async (req, res) => {
  try {
    const { id, token } = req.params;

    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).send("Sales order not found");
    }

    if (!validateToken(salesOrder, token)) {
      return res.status(403).send("Invalid or expired approval link");
    }

    if (salesOrder.approvalStatus === "rejected_by_manager") {
      return res.send(`
        <div style="font-family:Arial;padding:30px;">
          <h2 style="color:#dc2626;">Sales Order Already Put On Hold</h2>
          <p>This Sales Order has already been put on hold by MD Sir.</p>
          <p><b>Reason:</b> ${
            salesOrder.managerApproval?.rejectionComment || "-"
          }</p>
        </div>
      `);
    }

    if (salesOrder.approvalStatus === "approved") {
      return res.send(
        successPage(
          "Sales Order Already Approved",
          "This Sales Order has already been approved by MD Sir."
        )
      );
    }

    if (salesOrder.approvalStatus !== "pending_manager_approval") {
      return res.send(`
        <div style="font-family:Arial;padding:30px;">
          <h2>Action Not Available</h2>
          <p>This Sales Order is no longer pending MD Sir approval.</p>
          <p><b>Current Status:</b> ${salesOrder.approvalStatus}</p>
        </div>
      `);
    }

    return res.render("holdCommentForm", {
      salesOrder,
      token,
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const submitHoldFromWhatsapp = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { rejectionComment } = req.body;

    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).send("Sales order not found");
    }

    if (!validateToken(salesOrder, token)) {
      return res.status(403).send("Invalid or expired approval link");
    }

    fixApprovalHistoryRoles(salesOrder);

    await finalApprovalService.holdSalesOrderByMd(
      salesOrder,
      rejectionComment,
      {
        managerName: "MD Sir",
        managerEmail: process.env.MANAGER_EMAIL,
        managerId: null,
      },
      "whatsapp"
    );

    return res.send(`
      <div style="font-family:Arial;padding:30px;">
        <h2 style="color:#dc2626;">Sales Order Put On Hold</h2>
        <p>Your comment has been saved.</p>
        <p>The salesperson can now revise and resubmit the Sales Order.</p>
      </div>
    `);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const openPdfFromWhatsapp = async (req, res) => {
  try {
    const { id, token } = req.params;

    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).send("Sales order not found");
    }

    if (!validateToken(salesOrder, token)) {
      return res.status(403).send("Invalid or expired PDF link");
    }

    const fileUrl =
      salesOrder.finalSalesOrderPackage?.fileUrl ||
      salesOrder.pdf?.fileUrl ||
      salesOrder.preShipmentInspectionPdf?.fileUrl;

    if (!fileUrl) {
      return res.status(404).send("PDF not found");
    }

    return res.redirect(fileUrl);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  approveFromWhatsapp,
  holdForm,
  submitHoldFromWhatsapp,
  openPdfFromWhatsapp,
};