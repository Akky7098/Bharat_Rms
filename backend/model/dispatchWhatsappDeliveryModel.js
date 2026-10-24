const mongoose = require('mongoose');
// One claim per recipient/event. Failed or uncertain attempts are not auto-retried.
const schema = new mongoose.Schema({
  _id: String,
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },
  event: String,
  recipient: String,
  status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
  messageIds: [String],
  error: String,
  sentAt: Date,
}, { timestamps: true });
module.exports = mongoose.model('DispatchWhatsappDelivery', schema);
