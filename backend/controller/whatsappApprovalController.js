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

const errorPage = (title, message, color = "#dc2626") => `
  <div style="font-family:Arial;padding:30px;text-align:center;">
    <h2 style="color:${color};">${title}</h2>
    <p>${message}</p>
  </div>
`;

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

    if (salesOrder.approvalStatus !== "pending_manager_approval") {
      return res.send(`
        <div style="font-family:Arial;padding:30px;">
          <h2>Action Not Available</h2>
          <p>This Sales Order is no longer pending MD Sir approval.</p>
          <p><b>Current Status:</b> ${salesOrder.approvalStatus}</p>
        </div>
      `);
    }

    // ✅ Fast approval update only. No PDF generation here.
    salesOrder.approvalStatus = "approved";
    salesOrder.isEditableBySalesPerson = false;

    salesOrder.managerApproval = {
      ...(salesOrder.managerApproval || {}),
      managerName: "MD Sir",
      managerEmail: process.env.MANAGER_EMAIL,
      managerId: null,
      approvedAt: new Date(),
    };

    salesOrder.approvalHistory = salesOrder.approvalHistory || [];
    salesOrder.approvalHistory.push({
      action: "manager_approved",
      remarks: "Approved by MD Sir from WhatsApp approval link",
      createdAt: new Date(),
    });

    await salesOrder.save();

    // ✅ Browser opens fast.
    res.send(
      successPage(
        "Sales Order Approved Successfully",
        "The Sales Order has been approved. The existing PDF will be shared with the sales group automatically."
      )
    );

    // ✅ Background task. Reuses already generated PDF.
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