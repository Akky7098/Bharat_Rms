// Change this import according to your existing whatsapp-web.js export
const { sendWhatsAppMessage } = require("../util/whatsappClient");

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sendAttendanceCheckInMessage = async (attendance) => {
  if (!process.env.ATTENDANCE_WHATSAPP_GROUP_ID) return;

  const message = `✅ Attendance Check-In

Employee: ${attendance.employeeName}
Mode: ${attendance.workMode === "work_from_home" ? "Work From Home" : "Office"}
Check-in: ${formatTime(attendance.checkIn?.time)}
Status: ${
    attendance.checkIn?.isWithinOffice || attendance.workMode === "work_from_home"
      ? "Verified"
      : "Outside office location"
  }`;

  return sendWhatsAppMessage(process.env.ATTENDANCE_WHATSAPP_GROUP_ID, message);
};

const sendAttendanceCheckOutMessage = async (attendance) => {
  if (!process.env.ATTENDANCE_WHATSAPP_GROUP_ID) return;

  const message = `🏁 Attendance Check-Out

Employee: ${attendance.employeeName}
Mode: ${attendance.workMode === "work_from_home" ? "Work From Home" : "Office"}
Check-in: ${formatTime(attendance.checkIn?.time)}
Check-out: ${formatTime(attendance.checkOut?.time)}
Working Time: ${attendance.totalWorkingMinutes || 0} minutes`;

  return sendWhatsAppMessage(process.env.ATTENDANCE_WHATSAPP_GROUP_ID, message);
};

module.exports = {
  sendAttendanceCheckInMessage,
  sendAttendanceCheckOutMessage,
};