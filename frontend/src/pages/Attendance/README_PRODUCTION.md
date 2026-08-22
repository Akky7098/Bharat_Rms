# Bharat RMS Attendance - Componentized Production Folder

## Drop-in location
Place this folder at:
`src/pages/Attendance/`

If your existing project uses lowercase `attendance`, keep the existing casing and update imports accordingly.

## Existing service imports
This folder deliberately keeps the existing service layer outside the page folder:
- `../services/attendanceService`
- `../services/salesOrderService`
- `../services/timesheetService`

Adjust only those relative import paths if your actual project structure differs.

## Required attendanceService exports
The existing service must export:
- getTodayAttendance
- getAttendanceList
- checkInAttendance
- checkOutAttendance
- requestAttendanceRegularization
- approveAttendanceRegularization
- rejectAttendanceRegularization
- applyAttendanceLeave
- getAttendanceLeaveSummary
- getAttendanceLeaveRequests
- applyWorkFromHome
- getPendingWorkFromHomeRequests
- createAttendanceLocationCheckpoint
- getAttendanceLocationTrackingStatus
- getEmployeeAttendanceLocationHistory

## Locked production rules
- Unified regularization: Check In + Check Out + Reason.
- Backend compatibility keeps `type: "wrong_time"`.
- Regularization remains possible even when both punches exist.
- Pending regularization cannot be submitted again.
- Sunday/future/approved-leave restrictions remain.
- User/Admin can mark attendance, Leave and WFH.
- Super Admin has no Apply Leave action.
- Super Admin gets Map + History.
- History is loaded for the selected calendar date.
- History is chronological.
- Check-in location is captured after check-in.
- Check-out location is captured BEFORE check-out.
- Active attendance captures every 30 minutes and on foreground.
- Backend remains responsible for authorization and secure history storage.

## Production deployment
Do not delete your current page first. Add this folder on a branch/staging build, verify service import paths and API response shapes, then switch the route/import to this AttendancePage.
