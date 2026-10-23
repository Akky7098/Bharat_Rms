const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const schema = new mongoose.Schema({ _id: String, token: String, expiresAt: Date }, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Lock = mongoose.models.AttendanceEmployeeLock || mongoose.model('AttendanceEmployeeLock', schema);
module.exports = async (employeeId, work) => {
  const token = randomUUID(), _id = String(employeeId);
  try {
    await Lock.findOneAndUpdate({ _id, expiresAt: { $lte: new Date() } }, { $set: { token, expiresAt: new Date(Date.now() + 300000) } }, { upsert: true });
  } catch (error) {
    if (error.code === 11000) throw Object.assign(new Error('Another attendance request is being processed. Please try again.'), { statusCode: 409 });
    throw error;
  }
  try { return await work(); } finally { await Lock.deleteOne({ _id, token }); }
};
