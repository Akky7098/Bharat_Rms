# API-to-question implementation plan

This supplements the model audit with the actual router/controller surface. The reproducible
[API inventory](ask-bharat-api-inventory.md) lists every discovered endpoint and handler, including
expanded WFH/short-leave routes and direct app/server endpoints. Regenerate it with
`python3 backend/scripts/buildChatApiInventory.py`. It does not import the app or touch a database.

**Available** means an implemented chat family, not every filter/function from the API.
**Next** means a question backed by an existing API that still needs a chat adapter and tests.
**Exclude** means app/operational actions, not database-chat reporting. All families must retain the
underlying service permissions. Do not infer authorization from route names or HTTP verbs.

## Business and employee report families

| Router → controller/service | Available chat questions | Next questions derived from API functionality |
| --- | --- | --- |
| salesOrderRoutes → salesOrderController/salesOrderService | Sales today; approved/pending/rejected orders this month; customer/mill/address/grade filters; grade frequency/KG; salesperson/customer grouping | Show PO/order reference; remaining approved orders awaiting dispatch; order comments and revision history, separately authorized |
| dispatchRoutes → dispatchController/dispatchService | Dispatch details/totals; partial/full lists; payment outstanding/overdue/received from Dispatch | Show invoice by exact reference; LR/vehicle/transport details; remaining dispatch quantity; compare dispatched with ordered KG |
| orderTrackingRoutes → orderTrackingController | Current cutting/rolling/shipped/out-for-delivery/held orders; estimated dispatch plan | Find tracking number/PO; milestone due today; readiness date vs delivery date; actual stage transitions from activityHistory |
| customerOrderTrackingRoutes → customerOrderTrackingController | None | Public token-based customer tracking stays a separate customer access flow; never return tokens through staff chat |
| customerOrderTrackingPageRoutes → customerOrderTrackingPageController | None | Exclude public HTML/token flow from staff chat |
| enquiryRoutes → enquiryController/enquiryService | Won/lost/pending enquiry totals/details, employee grouping | Lost enquiries by reason; product/grade/shape/size breakdown; pending quotation/feasibility work; source distribution |
| enquiryLookupRoutes → enquiryLookupController | None | Find enquiry by number and permitted sales-order linkage; distinguish enquiry from order references |
| coldCallRoutes → coldCallController | Activity/visit/email counts | List visits for one company; most recently contacted companies; employee visit history with dates |
| dashboardRoutes → dashboardController/dashboardService | Explicit booked-sales/dispatch/payment overview and factual employee reviews | Action-required insights; API cashflow summary; MIS scoring using actual scoring policy, not invented grades or AI opinions |
| managementOrderAnalyticsRoutes → managementOrderAnalyticsController/service | Month-based management analytics; mill/grade filters | House vs mill detail; dedicated grade detail; supply-condition splits; keep its createdAt/legacy date rules visible |
| logisticsAnalyticsRoutes → logisticsAnalyticsController/service | Month-based plan/actual/pending summary | Pending readiness drilldown; H.O./N.H.O. details; customer lists behind each metric |
| steelAnalyticsRoutes → steelAnalyticsController/service | No direct generic chat adapter | Grade/mill/order/dispatch drilldown from this service's own report contracts; do not label this stock inventory |
| receivableRoutes → receivableController/receivableService | Chat payments intentionally use Dispatch instead | Risk checks, company ledger reconciliation and credit exposure must be distinct opt-in reports with source labels, never silently merged into Dispatch receipts |
| timesheetRoutes → timesheetController/service | Employee/self timesheet today or a period | Work-summary keyword search; missing reports only after active-roster/workday policy is specified |
| attendanceRoutes → attendanceController/attendanceService | Saved attendance/check-in/out details and counts | Policy-defined late arrivals/shortfall; pending regularizations; active roster vs missing attendance |
| attendanceRoutes location → employeeLocationService | **Added:** latest saved location or saved history for one employee/day; “where is Deepak Arya today”; ambiguous Deepak clarification | Multi-day history needs a separate bounded report; no live tracking or GPS capture from chat |
| attendanceRoutes leave → attendanceController/leave services | Approved leave can appear in saved attendance only | My leave balance; pending leave approvals; approved leave overlapping dates; half/full-day requests; cancellation history |
| attendanceRoutes WFH/short-leave → attendanceRequestService | None directly | WFH approvals tomorrow; short leave 12–3 on a date; pending requests by employee; preserve kind/status and from/to overlap semantics |
| userRoutes → userController | Permitted employee-name resolution; active review roster | Active employee directory; work-mode roster; role administration remains outside chat |
| documentRoutes → documentController/documentService | None | Accessible folders; find permitted document by title/type; private/admin_only/all_users policy and uploader scope must be applied before returning names or links |
| pdfDocumentRoutes → pdfDocumentController | None | Permitted generated document by number/company/type; revision count; cancelled/deleted state; no create/regenerate/delete action through chat |
| priceContractRoutes → priceContractController | None; mount unresolved in app.js during inventory | Verify route registration first, then authorized contract lookup/list; generation/update remains an app action |
| mtcRoutes → mtcController | None | Providers/specification lookup; certificate by invoice/PO/heat/grade; distinguish published specs from measured chemistry and provider-specific results |
| itSupportRoutes → itSupportController/itSupportService | None | Open/critical tickets; assigned cases; permitted published FAQ/content; preserve ticket/content record types and visibility |
| supportTicketRoutes → supportTicketController/supportTicketService | None | My assigned/open/overdue tickets; permitted stats; never leak internal notes or another employee's restricted cases |
| notificationRoutes → notificationController/service | None | My unread notifications by module/date; respect target users/roles and read/cleared state |

## Operational/action APIs

| Router / surface | Decision |
| --- | --- |
| authRoutes | Login/Google linking remain authentication actions. No passwords, credentials or account-linking data through chat. |
| bharatAiRoutes | Chat and current-user endpoints are transport, not additional database report families. |
| appPushRoutes | Push registration/unregistration remains an app action; never disclose tokens. |
| pushSubscriptionRoutes | Subscription/public-key endpoints are not employee/business reports. |
| whatsappApprovalRoutes | Even GET approval endpoints can mutate orders. Never dispatch requests automatically based on chat text. |
| whatsappStatusRoutes | Status/QR/restart pages are operational. Do not expose pairing material or initiate a restart through chat. |
| baileysStatusRoutes | Connected status/groups/QR are operational, not customer payment or delivery evidence. |
| app.js/server.js | Health/static infrastructure routes do not add business question capabilities. |

## Implementation sequence and acceptance gate

1. **Completed in this pass:** full route inventory and saved employee-location adapter, reusing
   `employeeLocationService.getEmployeeHistory` rather than bypassing its checks with raw log queries.
2. Attendance leave/WFH/short-leave/regularization report adapters, using existing list/summary services.
3. Exact sales-order/enquiry/PO/invoice/tracking lookup and related details, with ambiguous reference handling.
4. Enquiry lost reasons, quotation/feasibility queues and product breakdowns.
5. Dashboard action-required/MIS/cashflow and management/logistics drilldowns with matching source/date rules.
6. Documents/certificates, then support/notifications, after verifying their separate visibility policies.

For every family: confirm source and date field; define allowed filters, output/count limits and units;
reuse service authorization; preserve clarification context; add spelling/phrasing tests; verify no-match,
ambiguity and nonmanagement access; compare sample calculations with the API; then run authorized staging
API integration tests. Never mark a family available merely because examples were written in a catalogue.

## Saved-location contract delivered now

- Superadmin-only, exactly matching the history API. Admin/user requests are rejected before roster or
  history access, including self requests. This is intentionally stricter than inventing a new policy.
- One IST attendance date and one employee or up to five explicitly selected employees. Full-name resolution supports the existing signed follow-up;
  “Deepak” can prompt Deepak Arya/Deepak Yadav. Selecting both now returns separate reports for both offered employees (at most five per request).
- History is the API's merged check-in, periodic/app-open checkpoints and checkout; chat latest selects
  the newest valid capturedAt. History output is newest first, at most 50 displayed, with actual total.
- Return capture time, classification, recorded address, accuracy when available and a map constructed
  from valid saved coordinates. Do not read home-location configuration, IP address or user-agent fields.
- Never state that a checkpoint proves current/live location or attendance/absence. No GPS request,
  checkpoint creation, geocoding or background tracking is triggered.
- Local tests cover the screenshot phrase (including “toda”), name clarification/resumption, latest vs
  history, missing records, one-day restriction and denial before service invocation. Live/staging API
  equivalence and latency remain release checks; no production claim is made from fixture tests.

Follow-up suggestions are chosen by report domain. Saved-location results suggest location history, attendance and timesheets for the selected employee(s), rather than generic revenue questions. Employee-choice suggestions override these during clarification.
