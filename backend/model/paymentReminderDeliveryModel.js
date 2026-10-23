const mongoose = require('mongoose');
// A unique daily company/contact claim prevents duplicate sends across workers.
// Failed/uncertain SMTP attempts remain claimed for the day rather than looping.
const schema = new mongoose.Schema({
  _id: String,
  status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
  messageId: String,
  error: String,
}, { timestamps: true });
module.exports = mongoose.model('PaymentReminderDelivery', schema);
