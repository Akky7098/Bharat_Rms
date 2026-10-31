function reportSuggestions(parsed,names=[]){
 const person=names.length?names.join(' and '):'my';
 if(parsed.intent==='employee_location')return names.length
  ? [`${person} location history today`,`${person} attendance today`,`${person} timesheet today`]
  : ['Attendance today','My timesheet today','Saved employee location today'];
 if(parsed.intent==='attendance')return [`${person} attendance today`,`${person} attendance yesterday`,`${person} timesheet today`];
 if(parsed.intent==='timesheets')return [`${person} timesheet today`,`${person} timesheet last week`,`${person} attendance today`];
 if(parsed.intent==='employee_review')return ['Team performance this month','Attendance today','Enquiry details this month salesperson wise'];
 if(parsed.intent==='receivables')return ['Overdue payments customer wise','Payments received this month','Outstanding payments salesperson wise'];
 if(parsed.intent==='tracking_orders' || parsed.intent==='dispatch_plan')return ['Orders out for delivery','Orders under cutting','Dispatch plan tomorrow'];
 if(parsed.intent?.startsWith('dispatch'))return ['Dispatch details today','Delivered dispatch details this month','Partial dispatch details this month'];
 if(parsed.intent==='enquiries')return ['Enquiry details this week salesperson wise','Won enquiries this month','Lost enquiries this month'];
 if(parsed.intent==='grade_analysis')return ['Most ordered grades this month','Top grades by quantity this month','Pending sales orders this month'];
 return ['Revenue last one month','Pending sales orders this month','Top 5 customers this month'];
}
module.exports={reportSuggestions};
