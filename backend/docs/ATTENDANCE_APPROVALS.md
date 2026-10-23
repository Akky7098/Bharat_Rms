# Attendance approval backend

All endpoints require the current RMS Bearer token. Existing records and employee defaults are retained; this adds date-scoped approvals. Deploy and restart the backend before testing the production URL. A frontend deployment alone cannot resolve API_ROUTE_NOT_FOUND.

## Requests

| Feature | Apply (POST) / List (GET) | Decide (PATCH) |
| --- | --- | --- |
| Work from home | `/api/attendance/work-from-home` | `/api/attendance/work-from-home/:id/approve` or `/reject` |
| Short leave | `/api/attendance/short-leave` | `/api/attendance/short-leave/:id/approve` or `/reject` |
| Paid leave / LOP | `/api/attendance/leave` (POST), `/api/attendance/leave/requests` (GET) | Existing `/api/attendance/leave/:id/approve` or `/reject` |

WFH and short-leave body: `{ "fromDate": "2026-11-02", "toDate": "2026-11-03", "reason": "Reason" }`. Omit `toDate` for one day. Short leave requires one date, a saved check-in and checkout, and actual worked time below nine hours. WFH starts today or later. Dates use the existing attendance UTC-midnight date-label storage, displayed in IST.

Leave body retains existing fields: `leaveType` (`paid_leave` or `loss_of_pay`), `duration` (`full_day`, `first_half`, `second_half`), `fromDate`, `toDate`, `reason`.

Only active users and admins apply. Superadmin alone decides. Users/admins see their own request lists; superadmin sees the approval queue. No superadmin application card is needed. Existing self-service leave cancellation remains available.

GET new request lists supports `status`, `employeeId` (superadmin only), `page`, `limit`; returns `{ success, data: [], pagination }`. Mutations return `{ success, data }`. Existing leave response contracts remain usable. Error HTTP statuses: 400 invalid/insufficient entitlement, 403 permission, 404 missing request, 409 duplicate/conflict/concurrent request.

## Mode and attendance

Approved WFH is stored in AttendanceRequest. Check-in/checkout resolve work mode from approved dates first, then the employee default `attendanceWorkMode`. Existing attendance rows in the approved date range are updated to `work_from_home`. The User default is never changed, so the original default automatically applies outside the range. Approved full-day leave continues to create `on_leave` / `loss_of_pay` attendance records through the existing leave flow.

Short-leave approval adds `attendance.shortLeave` approval metadata. It never falsifies check-in, checkout, totalWorkingMinutes, or converts short hours into nine worked hours. The next frontend update can display approved short leave from this field.

## Paid leave policy

Calendar-year cap: 12 days. One day initially available; one further day earned per 20 distinct completed attendance days with at least nine actual worked hours. Unused earned days accumulate across months in the same year. Annual earned entitlement is `min(12, 1 + floor(completedDays / 20))`. Approved and pending paid leave reserve units. Sundays are excluded; half-day is 0.5 units. Different years require separate applications. No cross-year rollover is enabled.

`GET /leave/summary` keeps its existing structure and adds balance fields `year`, `annualPaidLeaveEntitlement`, `earnedPaidLeave`, `completedAttendanceDays`, `daysUntilNextPaidLeave`. `monthlyPaidLeaveEntitlement` remains as a legacy compatibility field; use earned/available fields in the next frontend update. Accrual starts on 23 October 2026 (the fixed policy rollout date), or the start of the selected calendar year if later. Older attendance does not retroactively earn days. Optional backend `PAID_LEAVE_POLICY_START_DATE=YYYY-MM-DD` can override the rollout date. No attendance history is deleted or rewritten.

## Notifications and deployment

Submission uses the same Notification service as sales orders: in-app socket notifications plus existing web/app push delivery to `super_admin`. Decision notifies the applicant. Approved WFH, paid leave, LOP, and short leave announce to the existing `SALES_WHATSAPP_GROUP_ID` through the existing WhatsApp sender. There are no announcements on submission/rejection. Single date or date range is included; short leave includes check-in and checkout times.

Approval remains saved if WhatsApp fails; approval response includes `whatsapp.sent: false` and a message. No automatic resend loop is introduced. No new WhatsApp credentials are required. Tests mock all notification and WhatsApp delivery and send no live messages.

New collections: AttendanceRequest (overlap/duplicate protection) and AttendanceEmployeeLock (expiring per-employee mutation locks). Locking covers paid-leave reservation/approval and WFH/short-leave application/approval to prevent concurrent balance and overlap decisions. Deploy both new model/service/utility files with the route changes. No existing collection migration or default work-mode reset is needed.

## Roster and audit visibility

`GET /api/attendance/employees` is available to admin/superadmin and returns active users AND admins (no superadmins). It does not use the sales-person roster. Employee selection does not remove other dropdown options.

WFH approvals are persisted in model `AttendanceRequest`, MongoDB collection `attendancerequests`. New requests include `history` application/decision events with actor, name, time and comments, plus approver snapshots and WhatsApp delivery outcome. Existing approvals retain their original `createdAt`, `decidedBy`, `decidedAt` values and can be shown without rewriting history. Click the existing WFH summary card on web/PWA to inspect approved dates and audit details for the selected period.

`User.attendanceWorkMode` remains the employee default; it is intentionally not overwritten by temporary or future WFH approval. The effective check-in/checkout mode consults approved request dates; the default resumes outside the range.

Approval, check-in, checkout and GPS endpoints use the same attendance API base. Development defaults to localhost:5000; production uses REACT_APP_BACKEND_URL. Optional REACT_APP_ATTENDANCE_BACKEND_URL overrides the whole attendance module. This avoids approving locally while checking in against an older production server. The backend resolves approved dates before checking office distance and writes the effective workMode to attendance, including checkout after an approval made during the workday.
