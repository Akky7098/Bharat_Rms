# Question review and shared follow-ups

Database mode now writes to the existing AiAuditLog model, as paid-AI mode already did. It records
the submitted question, normalized question, intent, outcome, bounded answer, used tools and timestamp.
Outcomes are answered, clarification, unsupported and error. "Answered" means a handler ran; it is not
a guarantee that a person judged the answer correct. Zero matches can be a legitimate answered report.

No new training service or paid AI dependency is introduced. These are review records, not automatic
learning. Repeated questions should lead to a reviewed parser/report change and a regression test,
not generated code, automatic aliases, database writes or relaxed access control.

## Review API

`GET /api/bharat-ai/question-review?days=30`

Uses existing authentication, reloads the current user's role/status, and requires active superadmin.
Returns the top 50 recurring normalized questions grouped by intent/outcome, occurrence count and most
recent date. Defaults to unsupported, clarification and error outcomes. Optional outcome may be answered,
clarification, unsupported or error. days must be 1–90. Query deadline is 10 seconds. It returns no user
emails, answers or signed context tokens. There is no review dashboard UI in this change.

Raw submitted questions/answers in audit records can contain business information. Credential-keyword
questions are omitted by this logger; this is a conservative redaction rule, not a universal secret
detector. Signed context tokens are hashed before writing audit references. Writes use the existing
safe logger and do not delay the response. Historical database-mode questions were not retroactively
logged, so the review list starts accumulating after this backend version runs. No retention/deletion
policy or background migration was introduced in this change.

## Shared report follow-up contract

After a successful supported report, the conversationId carries a signed 10-minute report context bound
to user and role. Existing employee/mill clarification choices remain separate typed contexts.

Supported continuations include "yesterday", "what about last month?", "last 3 months", an ISO date/range,
"salesperson wise" and "customer wise". The same handler, company/mill filter and selected employees are
retained; date/grouping changes are re-parsed and current access is checked. "Both" selections survive a
subsequent date change. Unknown/renamed selected employees must be reselected rather than broadening
the query. A complete new question starts a new report interpretation, without carrying old filters.

This is bounded deterministic context, not unrestricted conversational understanding. Other short replies,
new filters, pronouns and employee changes need explicit support or a full question. Audit history is not
replayed as authorization or used as executable query instructions. Multiple workers need the same
existing JWT_SECRET; otherwise the process-local fallback cannot validate another worker's tokens.

## Improvement workflow

1. Review repeated unsupported/clarification questions and distinguish missing capabilities from typos,
   ambiguous names, legitimate zero matches and user-reported incorrect results.
2. Map the request to an existing API/service, its source fields, dates, units and authorization policy.
3. Add a bounded handler or clarification rule and realistic sample-data/access tests.
4. Compare the report with its API on authorized staging data before release.
5. Add the question to the regression catalogue. Never declare all natural language solved from a count.
