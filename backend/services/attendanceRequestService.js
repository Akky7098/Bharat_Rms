const Request = require('../model/attendanceRequestModel');
const Attendance = require('../model/attendanceModel');
const Leave = require('../model/leaveRequestModel');
const User = require('../model/userModel');
const mongoose = require('mongoose');
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const idOf = user => user._id || user.id;
const key = date => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const day = value => {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) fail('Use a valid YYYY-MM-DD date.');
  const date = new Date(`${text}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || key(date) !== text) fail('Invalid date.');
  return date;
};
const notify = async (request, event, actor) => {
  try {
    await require('./notificationService').createNotification({
      module: 'attendance', event, title: event === 'attendance_requested' ? 'Attendance approval required' : 'Attendance request updated',
      message: `${request.employeeName}: ${request.kind.replaceAll('_', ' ')} ${key(request.fromDate)}${key(request.fromDate) === key(request.toDate) ? '' : ` to ${key(request.toDate)}`} — ${request.status}.`,
      targetRoles: event === 'attendance_requested' ? ['super_admin'] : [],
      targetUserIds: event === 'attendance_requested' ? [] : [request.employeeId],
      createdBy: idOf(actor), referenceId: request._id, referenceModel: 'AttendanceRequest', actionUrl: '/dashboard#attendance', priority: 'high',
    });
  } catch (error) { console.error('Attendance request notification:', error.message); }
};
const announceApproval = async (request, label) => {
  try {
    const configuredGroup = String(process.env.SALES_WHATSAPP_GROUP_ID || '').trim();
    const groupId = configuredGroup ? `${configuredGroup.replace(/@g\.us$/, '')}@g.us` : '';
    if (!groupId) throw new Error('SALES_WHATSAPP_GROUP_ID is not configured');
    const range = key(request.fromDate) === key(request.toDate) ? key(request.fromDate) : `${key(request.fromDate)} to ${key(request.toDate)}`;
    await require('./whatsappApprovalService').sendPlainWhatsappMessage(groupId, `MD Sir approved ${label} for ${request.employeeName}: ${range}.`);
    return { sent: true };
  } catch (error) {
    console.error('Attendance approval WhatsApp:', error.message);
    return { sent: false, message: 'Approval saved; WhatsApp announcement could not be delivered.' };
  }
};
const apply = async (kind, body, user) => {
  if (!['user', 'admin'].includes(user.role) || user.status === 'inactive') fail('Only active users and admins may apply.', 403);
  const fromDate = day(body.fromDate || body.attendanceDate);
  const toDate = day(body.toDate || body.fromDate || body.attendanceDate);
  if (toDate < fromDate || (toDate - fromDate) / 86400000 > 365) fail('Invalid date range.');
  const reason = String(body.reason || '').trim();
  if (!reason || reason.length > 2000) fail('A reason of up to 2000 characters is required.');
  const employeeId = idOf(user);
  if (kind === 'work_from_home' && key(fromDate) < key(new Date())) fail('WFH requests must start today or later.');
  if (kind === 'short_leave') {
    if (+fromDate !== +toDate) fail('Short leave is for one date only.');
    const attendance = await Attendance.findOne({ employeeId, attendanceDate: fromDate }).lean();
    if (!attendance?.checkIn?.time || !attendance?.checkOut?.time) fail('Check in and check out before requesting short leave.');
    const minutes = (new Date(attendance.checkOut.time) - new Date(attendance.checkIn.time)) / 60000;
    if (minutes >= 540 || minutes <= 0) fail('Short leave requires a completed day below nine hours.');
  }
  if (await Leave.exists({ employeeId, isActive: true, status: { $in: ['pending', 'approved'] }, fromDate: { $lte: toDate }, toDate: { $gte: fromDate } })) fail('Leave already exists for these dates.', 409);
  if (await Request.exists({ employeeId, kind, status: { $in: ['pending', 'approved'] }, fromDate: { $lte: toDate }, toDate: { $gte: fromDate } })) fail('A request already exists for these dates.', 409);
  let request;
  try { request = await Request.create({ employeeId, employeeName: user.name, kind, fromDate, toDate, reason, employeeEmail: user.email, employeeRole: user.role,
      history: [{ action: 'applied', performedBy: employeeId, performedByName: user.name, at: new Date(), comment: reason }] }); }
  catch (error) { if (error.code === 11000) fail('A request already exists for these dates.', 409); throw error; }
  await notify(request, 'attendance_requested', user);
  return request;
};
const list = async (kind, query, user) => {
  const filter = { kind };
  if (user.role !== 'super_admin') filter.employeeId = idOf(user);
  else if (query.employeeId) {
    if (!mongoose.isValidObjectId(query.employeeId)) fail('Invalid employee ID.');
    filter.employeeId = query.employeeId;
  }
  if (query.fromDate) filter.toDate = { $gte: day(query.fromDate) };
  if (query.toDate) filter.fromDate = { $lte: day(query.toDate) };
  if (query.status) {
    if (!['pending', 'approved', 'rejected'].includes(query.status)) fail('Invalid status.');
    filter.status = query.status;
  }
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
  const [data, totalRecords] = await Promise.all([Request.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Request.countDocuments(filter)]);
  return { data, pagination: { currentPage: page, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / limit)), limit } };
};
const decide = async (kind, requestId, approved, body, user) => {
  if (user.role !== 'super_admin') fail('Only super admin may approve or reject requests.', 403);
  if (!mongoose.isValidObjectId(requestId)) fail('Invalid request ID.');
  const request = await Request.findOne({ _id: requestId, kind, status: 'pending' });
  if (!request) fail('Pending request not found.', 404);
  if (!(await User.exists({ _id: request.employeeId, status: { $ne: 'inactive' } }))) fail('Employee is inactive.', 409);
  if (approved && await Leave.exists({ employeeId: request.employeeId, isActive: true, status: 'approved', fromDate: { $lte: request.toDate }, toDate: { $gte: request.fromDate } })) fail('Approved leave conflicts with these dates.', 409);
  let shortAttendance;
  if (approved && kind === 'short_leave') {
    shortAttendance = await Attendance.findOne({ employeeId: request.employeeId, attendanceDate: request.fromDate }).lean();
    const minutes = (new Date(shortAttendance?.checkOut?.time) - new Date(shortAttendance?.checkIn?.time)) / 60000;
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes >= 540) fail('Short-leave attendance is no longer eligible.', 409);
  }
  const updated = await Request.findOneAndUpdate({ _id: requestId, status: 'pending' }, { $set: { status: approved ? 'approved' : 'rejected', decidedBy: idOf(user), decidedByName: user.name, decidedAt: new Date(), decisionReason: String(body.reason || body.comment || '').slice(0, 2000) }, $push: { history: { action: approved ? 'approved' : 'rejected', performedBy: idOf(user), performedByName: user.name, at: new Date(), comment: String(body.reason || body.comment || '').slice(0, 2000) } } }, { new: true });
  if (!updated) fail('Request already processed.', 409);
  if (approved && kind === 'work_from_home') {
    await Attendance.updateMany({ employeeId: updated.employeeId, attendanceDate: { $gte: updated.fromDate, $lte: updated.toDate }, attendanceSource: { $ne: 'leave' } }, { $set: { workMode: 'work_from_home' } });
  }
  if (approved && kind === 'short_leave') {
    await Attendance.updateOne({ _id: shortAttendance._id }, { $set: { shortLeave: { status: 'approved', requestId: updated._id, approvedBy: idOf(user), approvedAt: updated.decidedAt } } });
  }
  await notify(updated, 'attendance_decided', user);
  const whatsapp = approved ? await announceApproval(updated, kind === 'work_from_home' ? 'work from home' : `short leave (check-in ${new Date(shortAttendance.checkIn.time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}, checkout ${new Date(shortAttendance.checkOut.time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })})`) : undefined;
  if (whatsapp) {
    try { await Request.updateOne({ _id: updated._id }, { $set: { whatsappDelivery: { ...whatsapp, attemptedAt: new Date() } } }); }
    catch (error) { console.error('Attendance WhatsApp delivery audit:', error.message); }
  }
  return { ...updated.toObject(), whatsapp };
};
const lock = require('../util/attendanceEmployeeLock');
module.exports = {
  apply: (kind, body, user) => lock(idOf(user), () => apply(kind, body, user)),
  list,
  decide: async (kind, requestId, approved, body, user) => {
    if (user.role !== 'super_admin') fail('Only super admin may approve or reject requests.', 403);
    if (!mongoose.isValidObjectId(requestId)) fail('Invalid request ID.');
    const request = await Request.findById(requestId).select('employeeId').lean();
    if (!request) fail('Request not found.', 404);
    return lock(request.employeeId, () => decide(kind, requestId, approved, body, user));
  },
  announceApproval,
};
