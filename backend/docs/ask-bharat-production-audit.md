# Ask Bharat database-mode readiness audit — 27 October 2026

This is a bounded reporting assistant, not unrestricted natural-language database access.
Local checks are not proof of production accuracy. No deployment or live database verification
was performed during this review. The field inventory below covers all 32 model files.

## Model-to-report decisions

| Model | Reporting decision and important boundary |
| --- | --- |
| salesOrderModel | Approved booked value by orderDate; approval-status lists, customer/mill/grade/address filters, customer types, grouping, top customers. New grade-pattern report uses sizeGradeQuantityRate and existing material parser. Whole order value cannot be allocated to each grade. |
| dispatchModel | Dispatch quantities and invoices; sole chat payment source. Current pending/paid amounts differ from dated paymentHistory receipts. Revised due dates override original dates. |
| receivableModel | Not queried for chat payment totals; do not mix this ledger with Dispatch. Credit risk, limits and Tally synchronization are not enabled. |
| OrderTracking | Current status, hold flags, estimates and actual ready/shipped/delivered dates. Other explicit periods use tracking creation date, labelled as such. Stage-transition history is not enabled. |
| enquiryModel | Enquiry totals/details, employee grouping and closure status. Grade/shape/lost-reason analytics require a dedicated handler; no inferred sales-order answers. |
| coldCallModel | Saved employee activity counts by date/type. Not a live visit/location tracker. |
| steelAnalyticsModel | No direct chat report; existing management/logistics services provide their explicit analytics. No stock ledger is inferred. |
| attendanceModel | Saved attendance and check-in/out details; open sessions have no final hours. Missing records do not prove absence. Policy-based lateness/shortfall is not enabled. |
| timesheetModel | Scoped submitted reports by reportDate. Missing-report detection against a working roster/calendar is not enabled. |
| leaveRequestModel | Direct leave-request reports not enabled. Attendance may show linked approved leave, which is a different source. |
| attendanceRequestModel | Planned short leave/WFH approval reports not enabled. Do not infer approval from a timesheet or check-in. |
| EmployeeLocationLog | Saved location chat now reuses employeeLocationService.getEmployeeHistory for superadmin, one employee/day. A saved checkpoint is not a current live location. See API question plan for its contract. |
| userModel | Employee-name resolution and active roster for factual reviews. Never expose passwords, Google IDs or home coordinates. Company scope is superadmin only in database mode. |
| documentModel | Not enabled; needs accessLevel and uploader visibility rules. |
| documentFolderModel | Not enabled; folder existence alone grants no document access. |
| pdfDocumentModel | Not enabled; needs ownership, isDeleted, revision and document-type rules. |
| MtcCertificate | Not enabled; needs certificate identity, ownership, isActive and provider-specific interpretation. |
| BharatMtcCertificate | Not enabled; chemistry/mechanical results must be tied to the correct heat/item/test and units. |
| GloriaMtcCertificate | Not enabled; hardness/hardenability must retain specimen and distance context. |
| SbeGermanyMtcCertificate | Not enabled; material, casting, dimensions and chemical values require certificate context. |
| ITSupport | Not enabled; ticket/FAQ recordType, assignment, internal messages and visibility need separate authorization. |
| SupportTicket | Not enabled; internal notes and assigned/created-by visibility must be enforced. |
| notificationModel | Not enabled; target users/roles, read and cleared state are user-specific. |
| AiAuditLog | Operational, not a business reporting source. Prompts/answers may contain confidential data. |
| AiUsageLog | Operational usage, not sales or revenue. |
| dispatchWhatsappDeliveryModel | Operational send outcomes, not customer payment/delivery evidence. |
| paymentReminderDeliveryModel | Operational reminder claims/outcomes, not receipts or read confirmation. |
| cronLockModel | Coordination only. |
| MtcSequence | Numbering only. |
| CustomerOrderTrackingAccess | Access auditing only; never disclose tokenHash. |
| pushSubscriptionModel | Delivery configuration only; never disclose endpoint/auth/p256dh. |
| appPushTokenModel | Registration only; never disclose push tokens. |

## Shared safeguards added in this audit

- A capability check runs before business queries, including payment queries. Unsupported rankings,
  field-specific reports and business areas must not fall through to company-wide sales totals.
- Natural company phrases use escaped literal case-insensitive filters. Employee resolution masks
  recognized company names to avoid selecting an employee who shares a word with a company name.
- Company-specific sales/grade requests without a period use all recorded dates. Explicit periods retain
  IST boundaries; all grade-report date filtering uses orderDate.
- Grade reports rank distinct approved orders containing each grade by default. KG ranking is explicit.
  Repeated grade lines count once per order while parsed KG sums across lines. Multi-grade orders can
  belong to multiple groups, so grade counts are not additive order totals.
- Reuse managementOrderAnalyticsService.extractSalesOrderItems. Its arbitrary leading-word fallback
  is not accepted as a grade here: grades without both letters and digits are disclosed as unresolved.
  This intentionally leaves some alphabetic grade designations unsupported rather than inventing data.
- Missing grades/quantities and ties are disclosed. Rankings with unresolved data are provisional.
- Grade analysis caps input at 1,001 records and refuses ranking above 1,000 matches; it never computes
  a ranking from a silently truncated input. Query timeout: 15 seconds. No dependencies or schemas changed.

## Test strategy and remaining release work

Existing 500-question parser/execution corpus is retained across superadmin/admin/user roles. New tests
exercise actual material parsing and hand-authored business outcomes, not just intent recognition:
frequency vs KG, duplicate lines, MT conversion, ties, unknown grades, cancelled/inactive/pending exclusions,
company mismatches, explicit dates, access scope, zero matches and a bounded-input refusal.
Unsupported requests are tested to make zero business queries and return no toolsUsed.

Before a production release, compare supported reports against module results on an authorized staging
database, including historical free-text grades, company spelling variants, revised due dates and
multi-worker authentication. Test actual MongoDB pipelines and query plans; the local fixtures use a
small evaluator and cannot establish MongoDB integration correctness or production latency.

Still not implemented: arbitrary company typo resolution, general conversational memory, arbitrary
comparisons/exclusions/numeric filters outside the payment allowlist, full historical status transitions,
grade value allocation, all model-specific reports above and unrestricted natural language.
Business names are not auto-corrected to another customer's name. Use an explicit company name when
the parser asks for clarification. A successful test count must not be presented as universal coverage.
