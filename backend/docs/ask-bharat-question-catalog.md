> Payment-source correction: database-chat outstanding, overdue, paid and payment-received reports now use Dispatch exclusively. Receivable-model entries below describe the schema inventory, not the current payment query source. Dated receipts come from Dispatch.paymentHistory.

# Ask Bharat: model coverage and question catalogue

The newer [API-backed question plan](ask-bharat-api-question-plan.md) and
[complete route inventory](ask-bharat-api-inventory.md) distinguish current chat handlers from
API-backed backlog work. Saved employee-location history is now implemented for superadmin.

Reviewed the 32 JavaScript files in backend/model. A schema establishes which facts exist;
it does not establish authorization or automatically provide a chat query handler.

Status key: **Available** means an explicit database-chat handler exists. **Candidate** means
fields support the question but the handler, access policy, formatting and tests still need work.
Questions are examples of report families, not a claim that every natural-language variation works.

## Business questions

| Model | Available question examples | Candidate questions / relevant fields |
| --- | --- | --- |
| salesOrderModel.js | Revenue today / last one month; turnover this month; Shalu sales last week; pending/rejected order lists; order details from Faridabad this month; top 5 customers this year | Sales for a named company/PO/order number; material/grade search in sizeGradeQuantityRate; new vs existing customer lists; payment terms; approvals by reviewer/date; order revisions; compare periods; email/WhatsApp outcome. Fields: companyName, companyAddress, orderDate, poNumber, orderValue, approvalStatus, adminApproval, managerApproval, approvalHistory |
| dispatchModel.js | Dispatch count, quantity and invoice value for a period | Invoice lookup; dispatched/delivered/cancelled lists; partial vs fully dispatched; remaining quantity; LR/transport documents; payment receipts by receivedAt; revised due dates; customer contacts. Fields: dispatchDate, invoiceNumber, dispatchQty, invoiceValue, dispatchStatus, dispatchCompletionStatus, paymentHistory, pendingAmount |
| receivableModel.js | Current outstanding summary; current overdue customer list | Company statement; invoice ageing; amounts received in a period using paymentReceipts; receipt allocation; disputed invoices; credit limit/risk status; Tally sync failures. Fields: salesPersons, invoices, paymentReceipts, creditLimit, riskStatus, syncStatus |
| enquiryModel.js | Enquiry total, won/lost/pending counts, quantity and conversion rate for a period | Grade/shape/size searches; lost reason breakdown; overdue quotation/feasibility plans; enquiry source; company enquiry history. Fields: enquiryDate, customerAddress, grade, shape, size, quantityInKg, feasibility, quotation, closure |
| OrderTracking.js | Dispatch plan by estimatedShipDate; currently delayed order list | Ready/loading/shipping/delivery plans; milestones due; held orders and hold reasons; transport/LR/driver details; actual vs estimated dates; tracking number or PO lookup. Fields: milestones, estimatedReadyDate, estimatedLoadingDate, estimatedShipDate, estimatedDeliveryDate, isOnHold, activityHistory |
| coldCallModel.js | Cold-call/visit/email activity counts and unique-company counts for a period | Named company visits; contact-specific activity; employee activity listing. Fields: salesPersonId, activityType, date, companyName, contactPersonName |
| steelAnalyticsModel.js | None directly | Read-only analytics report catalogue after checking its analytics schemas/views; do not assume inventory stock exists from the filename |

**Faridabad interpretation:** sales orders have no structured city field. Chat searches the literal
fragment in companyAddress, case-insensitively. It does not infer a verified city or search shipping/billing
addresses. The answer labels this filter. A separate shipping-address question needs its own mapping.

**Revenue interpretation:** approved SalesOrder.orderValue by orderDate. This differs from invoice
revenue, payment receipts and manager approval date. These are separate report definitions.

## People and attendance

| Model | Available question examples | Candidate questions / relevant fields |
| --- | --- | --- |
| attendanceModel.js | Attendance today; employee attendance on a date / period; who is present/on leave; saved absent records; check-in/check-out details | Late arrivals; hours/shortfall summaries under office policy; pending regularizations; office vs WFH lists; leave-linked records. Fields: employeeId, attendanceDate, checkIn, checkOut, totalWorkingMinutes, attendanceStatus, workMode, shortLeave, regularization |
| timesheetModel.js | My timesheet today; Deepak Arya work report last week | Missing timesheets against active roster and workday policy; keyword work-summary search; submitted-time audit. Fields: reportDate, workSummary, challenges, nextDayPlan, status |
| leaveRequestModel.js | None directly; approved leave visible through attendance records only | Pending leave approvals; leave requests overlapping a period; cancelled/rejected history; full/half-day details. Use fromDate/toDate overlap, not appliedAt as leave date |
| attendanceRequestModel.js | None directly | WFH requests for tomorrow; planned short leave 12–3; pending approvals and decision history. Fields: kind, fromDate, toDate, startTime, endTime, shortLeaveMinutes, status |
| EmployeeLocationLog.js | None directly | Latest saved checkpoint; saved location history for a workday; office/home/outside counts. Restrict to authorized attendance access. A saved checkpoint is not proof of a person's current live location |
| userModel.js | Permitted employee-name resolution only | Active employee directory; role/work-mode roster. Never return password hashes, Google IDs, home coordinates or account-linking data through generic chat |

A saved absent-record list is not a complete inferred absentee roster. Missing records require comparing
active employees with holidays, leave and working-day rules. Open attendance does not have final hours yet.

## Documents, certificates and support

All rows below are **Candidate**, not currently enabled database-chat reports.

| Model | Safe report examples after permissions and handlers are added |
| --- | --- |
| documentModel.js | Find a permitted document by title, description, folder or type; respect private/admin_only/all_users access |
| documentFolderModel.js | List accessible folders and their document counts; folder existence alone does not grant file access |
| pdfDocumentModel.js | Generated/revised/cancelled PDF list; document number, customer, reference, revision count; respect ownership and isDeleted |
| MtcCertificate.js | Permitted certificate lookup by invoice, PO, company, heat/lot, grade, date and provider |
| BharatMtcCertificate.js | Certificate chemistry, mechanical results, hardness, ultrasonic tests and raw-material details; identify certificate/heat before reporting values |
| GloriaMtcCertificate.js | Gloria specifications, hardness and hardenability results for a selected certificate |
| SbeGermanyMtcCertificate.js | SBE material, melting/casting, dimensions, hardness, ultrasonic and chemistry fields for a selected certificate |
| ITSupport.js | Open/critical/assigned tickets, resolution history, permitted published FAQs; keep internal notes and visibility restrictions |
| SupportTicket.js | My assigned tickets; overdue tickets; completed work by employee; preserve internal-note and assignment rules |
| notificationModel.js | My unread notifications by module/date; use targetUserIds/targetRoles plus readBy/clearedBy rules |

## Internal models: no generic business-chat access

These models may support narrowly authorized operational diagnostics later. They must not become
free-form schema/record dumps, even merely because a report parser recognizes the model name.

| Model | Purpose and boundaries |
| --- | --- |
| AiAuditLog.js | Authorized chat success/error audit summaries; prompts and answers can contain confidential business data |
| AiUsageLog.js | Authorized usage/token/latency aggregates; not business revenue |
| dispatchWhatsappDeliveryModel.js | Dispatch notification outcomes, event and sentAt; recipient/message identifiers are operational metadata |
| paymentReminderDeliveryModel.js | Reminder send/failure claim records; not proof that an invoice was paid or a message read |
| cronLockModel.js | Scheduler coordination only; not a customer/business report |
| MtcSequence.js | Certificate numbering counter only |
| CustomerOrderTrackingAccess.js | Tracking access audit counts/dates only through a dedicated authorized handler; never disclose tokenHash |
| pushSubscriptionModel.js | Web push delivery configuration; never disclose endpoint or encryption/auth keys |
| appPushTokenModel.js | Mobile push registration; never disclose push tokens |

## Report contract required for every new question family

1. Define the intent, synonyms and output: count, total, listing or exact record detail.
2. Allowlist entity filters: employee, company, city/address, PO/invoice, grade, status and dates as applicable.
3. Resolve entity ambiguity; reject unsupported requested filters rather than dropping them.
4. Apply server-side permissions before querying. Current database mode grants company scope to superadmin only; all other roles are self-scoped.
5. Define the business date field, IST boundaries, units, aggregation and active/deleted semantics.
6. Bound lists, show applied filters and report caps; distinguish zero results from unsupported questions.
7. Test paraphrases, date boundaries, enum mappings, malicious input and cross-user requests.

## Current limitations

No arbitrary MongoDB queries, writes, unrestricted “ask anything”, automatic model-wide querying,
implicit conversation follow-ups, verified-city inference, company/invoice filters, historic receipt reports,
or sensitive internal records. The catalogue is the roadmap for expanding the explicit reports safely.

## Implemented since the inventory

The following former candidates now have database-chat handlers and regression tests:

| Question | Applied fields / source |
| --- | --- |
| Kesari Alloy orders; Keshri Alloy mill orders | salesOrder.steelMill, with explicit aliases for the stored Kesari Alloys - Bhiwadi value; otherSteelMill fallback |
| Kesari Alloys EN353 orders this month | steelMill plus escaped grade token in sizeGradeQuantityRate |
| Orders for company "Example Engineering" this month | escaped companyName fragment |
| List delivered dispatches this month | dispatchStatus=delivered, dispatchDate period |
| Partial dispatch details this month | dispatchCompletionStatus=partial_dispatched, dispatchDate period |
| Paid dispatch details this month | paymentStatus=paid, dispatchDate period; not a receipt-period report |
| Order tracking; orders on hold | current tracking records / isOnHold, all dates |
| Management analysis this month | existing getManagementOrderAnalytics monthly report, superadmin-only |
| Management analysis Kesari Alloys this month | existing monthly report's steelMill filter, superadmin-only |
| Logistics analysis this month | existing getLogisticsAnalytics monthly report, superadmin-only |

Schema coverage is not unrestricted language coverage. These examples are tested report contracts.

## Invoice and receipt report addon

Current handlers also support composed invoice filters, customer contact detail, scoped invoice/receipt
counts and totals, payment receipts by receipt date, amount thresholds (including lakh/crore), and receipt
payment mode. See database-chat.md for semantics and limits. Historic balance snapshots, arbitrary joins,
and unrestricted group-by analytics remain outside the current handlers.
