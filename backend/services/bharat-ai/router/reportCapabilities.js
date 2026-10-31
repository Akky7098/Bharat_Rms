// Request semantics that must never fall through to an unrelated summary.
// Adding a schema field alone does not enable its report or grant access to it.
function reportCapabilityError(parsed){
 const t=parsed.text;
 if(/\b(?:inventory|stock|payroll|salary|salaries|expenses?|vendors?|purchase orders?|supplier invoices?|tally sync|credit notes?|debit notes?)\b/.test(t))return 'This database-chat version has no report for that business area. Please use its module or ask for a supported sales, dispatch, payment, tracking or employee report.';
 if(parsed.intent==='grade_analysis'){
  if(!parsed.entities.company && !parsed.entities.mill && !parsed.self && /\b(?:for|of|does|do)\b/.test(t))return 'Which company or employee should the grade ranking use? Specify company "Name" or the employee’s full name with “by”; I will not return company-wide results for an unresolved customer.';
  if(parsed.groupBy)return 'Ask for one grade ranking at a time, optionally filtered by one company, mill, employee and period. Grade rankings split by salesperson or customer are not implemented yet.';
  if(parsed.status && parsed.status!=='approved')return 'Grade ordering patterns currently use approved sales orders only. Pending/rejected grade rankings are not implemented yet.';
  if(/\b(value|revenue|amount|price|rate|margin)\b/.test(t))return 'Grade rankings support order frequency or parsed KG. Grade-wise value is unavailable because historical orders do not reliably allocate order value to material lines.';
 }
 if(/\bgrades?\b/.test(t) && !parsed.entities.grade && !['grade_analysis','management_analysis'].includes(parsed.intent))return 'Do you want the most-ordered grades, a grade-wise breakdown, or orders for a specific grade? For example: “most ordered grades for company "Example Engineering" this month”.';
 if(/\b(top|highest|lowest|biggest|largest|smallest|best|worst|most|mostly|least|usually|frequently|commonly|average|median|trend|growth|percentage|ratio|compare|comparison)\b/.test(t) && !['grade_analysis','top_customers','employee_review','management_analysis','logistics_analysis'].includes(parsed.intent))return 'That ranking or calculation is not implemented for this report. Please specify a supported total or detailed list; I will not substitute a general sales summary.';
 if(/\b(?:po|purchase order|tracking|sales order)\s*(?:number|no\.?|#)\s*[:=]?\s*[a-z0-9]/.test(t))return 'Exact PO/order/tracking-number lookup is not implemented in database chat yet. Please use Order Tracking or Sales Orders to search that reference.';
 if(/\b(?:lr number|vehicle|driver|transporter|transport details|shipping address|billing address|payment terms|supply condition|revision|revisions|lost reasons?|quotation pending|feasibility pending|shape|diameter|hardness|chemistry|test results?|credit limit|risk status|remaining quantity|remaining qty|conversion|late arrivals?|late employees?|shortfall|missing timesheets?)\b/.test(t))return 'That field-specific report is not implemented in database chat yet. Please use the relevant module; a general total would not answer this question.';
 return null;
}
module.exports={reportCapabilityError};
