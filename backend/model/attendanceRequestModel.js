const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },
  kind: { type: String, enum: ['work_from_home', 'short_leave'], required: true },
  fromDate: { type: Date, required: true }, toDate: { type: Date, required: true },
  reason: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeEmail: String, employeeRole: String,
  decidedByName: String,
  decidedAt: Date, decisionReason: String,
  history: [{ action: { type: String, enum: ['applied', 'approved', 'rejected'] }, performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, performedByName: String, at: { type: Date, default: Date.now }, comment: String }],
  whatsappDelivery: { sent: Boolean, attemptedAt: Date, message: String },
}, { timestamps: true });
schema.index({ employeeId: 1, kind: 1, fromDate: 1, toDate: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'approved'] } } });
module.exports = mongoose.model('AttendanceRequest', schema);
