> Current payment source: **Dispatch only**. The older Receivable-ledger implementation described in historical sections below has been replaced. Outstanding and paid totals use pendingAmount/paidAmount, overdue uses revisedPaymentDueDate falling back to paymentDueDate, and dated receipts use paymentHistory.amount/receivedAt. No Receivable collection query is used by database chat, including management overview payments.

# Ask Bharat database mode

Default: `BHARAT_CHAT_MODE=database`. No LLM calls. `ai` explicitly restores the previous provider path.
Development frontend uses localhost:5000; production URL is unchanged.

## Supported reports and their meaning

| Model / tool | Example questions | Basis |
| --- | --- | --- |
| SalesOrder / getSalesSummary | Revenue last one month; turnover this month; Shalu sales yesterday | Approved order value by orderDate, not collected cash |
| SalesOrder | List pending orders this month; rejected sales orders last week | Actual pending/rejected review-stage enums; up to 50 |
| SalesOrder / getTopCustomers | Top 5 customers this year | Approved order value grouped by company |
| Dispatch / getDispatchSummary | Dispatch summary this week | dispatchDate; cancelled excluded |
| OrderTracking | Dispatch plan tomorrow | estimatedShipDate; delivered/cancelled excluded; up to 50 |
| OrderTracking / getDelayedOrders | Which orders are delayed? | Current delays against estimated delivery; all dates |
| Attendance | Attendance today; who is on leave today; Deepak Arya attendance yesterday | Saved attendance records. Absence list does not infer missing records |
| Timesheet | Deepak Arya timesheet last week; my work report today | reportDate; up to 31 |
| Receivable | Outstanding payments; overdue payments | Current account balances, all dates, not historic receipts |
| Enquiry | Enquiries this month | enquiryDate; totals and won/lost/pending counts |
| ColdCall | Cold calls yesterday; visits this week | date; activity-type counts |

Superadmin has company scope. Other roles remain self-scoped in this mode.
Employee names resolve against permitted users. Ambiguous first names require a full name.
“My” scopes even a superadmin query to their own records.

## Dates

- Today/aaj, yesterday, tomorrow; ambiguous “kal” asks for clarification.
- This/last week, month or year are calendar periods (current period ends today).
- Last/past N days or weeks are inclusive rolling periods ending today.
- Last one month means the same calendar day in the prior month through today, clamped to month end.
- Named months/dates: September 2026, 26 Oct 2026.
- Explicit YYYY-MM-DD or DD/MM/YYYY single dates/ranges.
- All boundaries use IST. Every report includes its range or says current/all dates.

## Limits

This is an explicit report parser, not arbitrary database access. No writes, generated Mongo queries,
profit/tax calculations, general knowledge, or implicit conversational follow-ups. Company/invoice-specific
filters and historic payment receipts are not implemented; the parser asks for a supported question.
The tests use model/tool doubles; live data reconciliation still needs local authenticated testing.

## Expanded reports and filters

- `Kesari Alloy orders`, `Keshri Alloy mill orders` resolve to the form value
  `Kesari Alloys - Bhiwadi`, not a city. Other form mill names are listed in databaseEntities.js.
- Named mill/grade/company sales questions without a date use all recorded dates, explicitly labelled.
- `Kesari Alloys EN353 orders this month` filters the mill and the literal grade token in material text.
- `orders for company "Example Engineering" this month` uses a literal company-name fragment.
- `list delivered dispatches this month`, `partial dispatch details this month`, `paid dispatch details this month`.
  These lists use dispatchDate, not deliveredAt/payment receipt date. Up to 50 results.
- `order tracking`, `orders on hold` show current tracking records, up to 50.
- `management analysis this month` and `management analysis Kesari Alloys this month` reuse
  getManagementOrderAnalytics. `logistics analysis this month` reuses getLogisticsAnalytics.
  These reports are superadmin-only, use complete calendar months and preserve their existing date/quantity rules.
  They do not accept employee filters, arbitrary date ranges or conversational follow-ups.

The question catalogue describes candidates separately. Unsupported question families remain unsupported;
adding a model to the inventory does not authorize querying all its fields.

## Reproducible regression coverage

See [the 500-question catalogue](ask-bharat-500-questions.md). It includes 405 supported input
variations and 95 expected clarification/decline variations. Expected results are authored in
`test/fixtures/databaseQuestions.base.json`; `buildDatabaseQuestions.js` generates five styles per
scenario, including spelling errors. The tests do not derive expected answers from the parser.

Run:

```sh
node --test backend/test/databaseParserEdges.test.js backend/test/databaseQuestionCorpus.test.js backend/test/databaseQuestionExecution.test.js backend/test/databaseQuestionParser.test.js backend/test/databaseChat.test.js
```

The service tests repeat all 500 questions under superadmin/admin/user scopes, checking tool/query
selection and filters using model doubles. They make no external AI calls and send no messages.
Live DB reconciliation remains a separate local acceptance step. Exclusions, unsupported numeric
thresholds, mixed report domains, sensitive-field requests and ambiguous date operators fail closed.

## Composable invoice and receipt reports

`reports/ledgerReport.js` plans reports against the actual Receivable invoice/receipt sub-schemas.
Filters compose: employee scope, literal quoted company, invoice number, period, status, amount comparisons,
and receipt payment mode. All Mongo field names/operators are allowlisted in the report builder.

Examples:

- `over due payment detail with customer detail for last 3 month`
- `count overdue invoices last 3 months`
- `overdue invoice details due date last month`
- `overdue invoices outstanding above 1 lakh last 3 months`
- `partial invoice details for company "Example Engineering" this month`
- `total payments received last month`
- `payment received details amount at least 500 upi last 3 months`

Invoice periods default to invoiceDate; explicit “due date” switches to dueDate. Receipt reports use
receiptDate. No period means all stored invoices/receipts. Overdue is computed from current positive
pendingAmount and dueDate before today's IST day, excluding paid/written-off statuses. This is not an
as-of historical ledger snapshot. Amount filters preserve independent constraints with `$and`.

Each report returns full matching count, distinct ledger-customer count and aggregate amounts from the
same scoped match. Detail views show at most 50 rows and disclose truncation; totals include all matches.
No client-supplied Mongo expression or arbitrary model field is executed. Queries have a 15-second deadline.

`reports/queryReport.js` now provides the same full-match count/totals with bounded rows for sales-order,
dispatch-detail and current tracking lists. It does not change business date definitions.

Validation includes hand-authored data for paid/written-off/future-due invoices, receipts, inactive ledgers,
foreign ownership, numeric comparisons and list truncation. The test evaluator is not a MongoDB server;
production data/index/performance verification remains necessary before deployment.

The refreshed 500-input corpus now includes payment receipts: 410 report variations and 90 expected
clarifications. This supersedes the earlier 405/95 split above.

## Dispatch payment source and employee clarification

- Invoice reports read Dispatch.invoiceNumber, invoiceDate, invoiceValue, paidAmount, pendingAmount and customer contact snapshots.
- Effective due date is revisedPaymentDueDate when present, otherwise paymentDueDate. Cancelled/inactive dispatches are excluded.
- Dated received-payment reports unwind paymentHistory and filter receivedAt. Historical paidAmount without dated entries is not backdated or fabricated.
- Statuses and payment modes present only in Receivable are not inferred for Dispatch. Queries asking those fields receive a clarification.
- All report scopes use Dispatch.salesPersonId; superadmin can see company scope, other roles remain self-scoped.
- All payment questions, including plain outstanding/overdue questions and management-overview balances, use this source.

When an employee name is ambiguous, the existing conversationId carries a signed, ten-minute clarification
context containing the question, period and offered full names. A full-name reply completes that original
question and rechecks access against the fresh authenticated user. The context is user/role-bound and
cannot broaden permissions. A new report does not inherit the pending employee filter.

The existing JWT_SECRET signs clarification context consistently across production workers. Do not rotate
it for this feature. If absent in a local setup, an ephemeral per-process signing key is used; such local
clarifications do not survive restart or travel between workers. No Redis or new dependency is required.

## Grouping and attendance presentation

Report presentation is parsed independently in `router/reportPresentation.js`:

- `salesperson wise`, `sales person wise`, `salesperson-wise`, `by salesperson`, `per sales person`, `employee wise` select salesperson grouping.
- `customer wise`, `company wise`, `by customer` select customer grouping.
- Payment reports group their same scoped Dispatch match into independent counts and amounts, with matching detail rows under each group.
- Sales and dispatch reports use the shared queryReport grouping facet. Group totals reconcile against the overall matching summary.
- Up to 50 groups/detail rows are rendered; any truncation is disclosed and aggregate totals still include all matches.
- `individual` without a name or grouping asks which presentation/employee is intended. Its clarification context accepts a grouping choice or one of the permitted offered employee names.
- Grouping never changes query access scope.

Plain attendance questions now default to detail records: employee, date, status, IST check-in/check-out,
work mode, finished working minutes or open/not-started state, and saved leave/short-leave information.
Explicit count/summary requests return matching counts by status using the same scoped match.
Attendance lists describe saved records; they do not infer that every employee missing a record is absent.

## Multi-employee enquiries and customer types

- `enquiry details for Renu and Shalu last one week individually` selects both explicit names and shows enquiry details separately, scoped by salesPersonId and enquiryDate.
- Distinct full-name selections joined by “and”, comma or “both” are not treated as single-name ambiguity. Shared first names such as Deepak still require clarification.
- Signed clarification accepts `both` for exactly two offered employee choices, and `all` for all offered employee choices; other users or changed roles cannot reuse the context.
- Enquiry details include company, contact, grade, quantity and saved closure status, with full matching counts/quantities and disclosed list limits.
- `new customer details this month` and `existing customer details this month` read approved SalesOrder records with the matching customerType and orderDate. They group by company and show available contact/address snapshots and matching order value. This definition does not infer first-ever customer activity from enquiry history.

## Factual employee review

`review of all employees/salespersons`, `team performance this month`, and `my review last week`
use the explicit employee_review report rather than sales-summary routing. Missing period defaults
explicitly to month-to-date. It reports approved booked sales, enquiries won/lost, dispatch count/value/KG,
current Dispatch outstanding/overdue balances (all dates, effective revised due dates), saved attendance,
completed-checkout minutes, timesheet submissions and activity/visit counts for each active employee.
No invented score, inferred absence or subjective rating is generated. Zero saved activity is labelled as
such. Regular users and admins remain self-scoped. Superadmin's default roster is active user/admin roles;
explicit permitted employee selection is supported. First 50 employees are listed with truncation disclosed.
Seven aggregate queries run in parallel against the same scoped roster, each with a 15-second deadline.

## Tracking status filters

See [the production readiness audit](ask-bharat-production-audit.md) for current model coverage,
grade-analysis semantics, capability gates and remaining release checks.

Order Tracking status phrases now map to the model's currentStatus allowlist, including out for delivery,
ready for dispatch, shipped, delivered, under casting, rolling/forging and their planning stages,
inspection/heat treatment/cutting/machining/loading, held and cancelled orders. The allowlist is tested
against OrderTracking.js. Status phrases are removed from employee/address parsing so “for delivery”
is not mistaken for a person's name. Known mill names keep their sales-order meaning.

Current state queries default to all order dates and retain salesperson access scope. Explicit shipped,
delivered and ready-date ranges use actualShipDate, actualDeliveryDate and actualReadyDate respectively.
For other states, an explicit period filters tracking createdAt, with the current stage still required.
The answer states that this is the tracking creation period, not the stage-entry date. For example,
“which orders are under cutting this month” lists currently cutting tracking records created this month.
Explicit historical transition requests (“moved to cutting last month”) still ask for clarification;
activityHistory exists, but historical transition reporting is not implemented here.
On-hold matches either currentStatus=on_hold or isOnHold=true. Dispatch-specific delivered reports
remain Dispatch reports when explicitly requested.

## Dispatch-plan date rules

Dispatch/shipment plan means estimatedShipDate. Explicit dispatch readiness plan means estimatedReadyDate. Delivery plan means estimatedDeliveryDate. Each uses only its matching milestone as fallback when its root date is absent; readiness never substitutes for shipping or delivery. Already shipped/out-for-delivery orders are excluded from pending shipping/readiness plans but may appear in delivery plans until delivered. These daily lists are distinct from the Logistics monthly readiness-based KG aggregate. Missing dates are disclosed; counts include all matches with at most 50 displayed.
