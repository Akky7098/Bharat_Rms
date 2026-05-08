const axios = require("axios");
const dotenv = require("dotenv")
const sendManagerApprovalButtons = async (salesOrder) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const managerNumber = process.env.MANAGER_WHATSAPP_NUMBER;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  const pdfUrl = `${backendUrl}${salesOrder.pdf?.fileUrl}`;

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: managerNumber,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "Sales Order Approval"
        },
        body: {
          text:
            `New Sales Order Approval Required\n\n` +
            `Customer: ${salesOrder.companyName}\n` +
            `Order Value: ₹${salesOrder.orderValue}\n` +
            `Sales Person: ${salesOrder.salesPersonName}\n\n` +
            `PDF: ${pdfUrl}`
        },
        footer: {
          text: "Bharat Special Steel"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `approve_${salesOrder._id}`,
                title: "Approve"
              }
            },
            {
              type: "reply",
              reply: {
                id: `reject_${salesOrder._id}`,
                title: "Reject"
              }
            }
          ]
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

module.exports = {
  sendManagerApprovalButtons
};