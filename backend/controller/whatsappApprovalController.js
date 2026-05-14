const SalesOrder = require("../model/salesOrderModel");
const finalApprovalService = require("../services/finalApprovalService");

const validateToken = (salesOrder, token) => {
  return (
    salesOrder.managerEmailApproval &&
    salesOrder.managerEmailApproval.token &&
    salesOrder.managerEmailApproval.token === token
  );
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
      return res.send(`
        <div style="font-family:Arial;padding:30px;">
          <h2 style="color:#16a34a;">Already Approved</h2>
          <p>This Sales Order is already approved.</p>
        </div>
      `);
    }

    await finalApprovalService.finalApproveSalesOrder(
      salesOrder,
      {
        managerName: "MD Sir",
        managerEmail: process.env.MANAGER_EMAIL,
        managerId: null,
      },
      "whatsapp"
    );

    return res.send(`
      <div style="font-family:Arial;padding:30px;">
        <h2 style="color:#16a34a;">Sales Order Approved Successfully</h2>
        <p>The Sales Order has been approved by MD Sir.</p>
        <p>The final approved PDF has been sent to the WhatsApp sales group.</p>
      </div>
    `);
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