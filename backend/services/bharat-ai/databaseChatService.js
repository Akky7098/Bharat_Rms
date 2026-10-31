const followup = require('./conversation/databaseFollowup');
const { queryReport } = require('./reports/queryReport');
const { reportCapabilityError } = require('./router/reportCapabilities');
const { companyNamePattern } = require('./context/companyNameFilter');
const { gradeTextPattern } = require('./context/gradeIdentifier');
const { reportSuggestions } = require('./router/reportSuggestions');
const {mills}=require('./router/databaseEntities');
// Local, read-only business answers. No model SDK, API key or generated queries.
const { planLedgerReport, executeLedgerReport } = require('./reports/ledgerReport');
const { parseQuestion } = require('./router/databaseQuestionParser');
const tracking = require('./tools/orderTrackingTools');
const activity = require('./tools/coldCallTools');
const { User, OrderTracking, SalesOrder, Attendance, Dispatch, Enquiry, Timesheet, ColdCall } = require('./modelRegistry');
const { buildDateRange } = require('./tools/toolHelpers');
const sales = require('./tools/salesOrderTools');
const dispatch = require('./tools/dispatchTools');
const timesheets = require('./tools/timesheetTools');
const attendance = require('./tools/attendanceTools');
const enquiries = require('./tools/enquiryTools');
const money = n => `₹${Number(n || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const label = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
const totals = data => Object.entries(data).filter(([k,v]) => !k.startsWith('_') && typeof v === 'number')
  .map(([k,v]) => `${label(k)}: ${/value|amount|sales|payment/i.test(k) ? money(v) : v.toLocaleString('en-IN')}`).join('\n');

const askDatabase = async ({ message, requestingUser, conversationId, resolvedPeriod, selectedNames }) => {
  if (!requestingUser?._id) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  const text = String(message || '').trim();
  if (!text || text.length > 2000) throw Object.assign(new Error('Enter a question of 1–2000 characters.'), { statusCode: 400 });
  // Only MD receives company-wide data in this mode. Existing AI role policy is untouched.
  const management = requestingUser.role === 'super_admin';
  const user = management ? requestingUser : { ...requestingUser, role: 'user' };
  const parsed = parseQuestion(text);
  if(resolvedPeriod) parsed.period=resolvedPeriod;
  if(parsed.intent==='employee_review' && parsed.period.defaulted) parsed.period=parseQuestion('this month').period;
  const period = parsed.period;
  const ledgerPlan=planLedgerReport(parsed);
  const queryText=parsed.text;
  const args = { requestingUser: user, dateFrom: period.dateFrom, dateTo: period.dateTo, forceRefresh: true };
  if (parsed.self) args.salesPersonId=user._id;
  const dateLabel=period.allTime ? 'all recorded dates' : `${period.dateFrom} to ${period.dateTo}`;
  const entityLabel=[parsed.entities.allMills && 'All steel mills · N.H.O. sales orders',parsed.entities.mill && `Mill: ${parsed.entities.mill}`,parsed.entities.grade && `Grade text: ${parsed.entities.grade}`,parsed.entities.company && `Company: ${parsed.entities.company}`].filter(Boolean).join(' · ');
  const salesFilters=()=>({
    ...(parsed.entities.allMills?{trackingOrderType:'N.H.O.'}:{}),
    ...(parsed.entities.mill ? {$or:[{steelMill:parsed.entities.mill},{steelMill:'Others',otherSteelMill:{$regex:escapeRegex(parsed.entities.mill.split(' - ')[0]),$options:'i'}}]}:{}),
    ...(parsed.entities.grade ? {sizeGradeQuantityRate:{$regex:gradeTextPattern(parsed.entities.grade),$options:'i'}}:{}),
    ...(parsed.entities.company ? {companyName:{$regex:companyNamePattern(parsed.entities.company),$options:'i'}}:{}),
  });
  let answer, tool;
  let suggestionNames=[];
  function response(answer, toolName) {
    return { answer, conversationId: conversationId?.startsWith('dbctx.') ? followup.newId() : conversationId || null, route: 'BUSINESS_DATA', provider: 'local', model: 'database-only',
      suggestions:reportSuggestions(parsed,suggestionNames), toolsUsed: toolName ? [{ name: toolName }] : [], resolvedPeriod: period,
      intent:parsed.intent,usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, generatedAt: new Date() };
  }
  if(parsed.validationError && !ledgerPlan?.numericOnly) return response(parsed.validationError);
  if (period.error) return response(period.error);
  if (parsed.entities.error){
    if(parsed.entities.unknownMill)return {...response(parsed.entities.error),conversationId:followup.issue({user:requestingUser,question:text,period,kind:'mill',choices:mills.map(([name])=>({name}))}),suggestions:['all mills',...mills.map(([name])=>name)]};
    return response(parsed.entities.error);
  }
  const capabilityError=reportCapabilityError(parsed);
  if(capabilityError) return response(capabilityError);
  if(parsed.entities.allMills && parsed.intent==='management_analysis')return response('For all mill orders, ask “details of all mill orders this month”. The management overview includes house and mill figures separately.');
  if ((parsed.entities.mill || parsed.entities.allMills || parsed.entities.grade) && !['sales_orders','sales_summary','management_analysis','grade_analysis'].includes(parsed.intent) && !ledgerPlan) return response('Mill and grade filters are currently supported on sales orders. Please ask for sales order details with those filters.');
  if(parsed.entities.company && !['sales_orders','sales_summary','tracking_orders','dispatch_orders','enquiries','grade_analysis'].includes(parsed.intent) && !ledgerPlan) return response('Please ask for sales order, tracking, dispatch, enquiry or payment details for this company. This report cannot apply that company filter.');
  if (parsed.locationError) return response(parsed.locationError);
  if (parsed.unsupportedFilter && !ledgerPlan) return response('That calculation or comparison is not supported yet. Ask for sales, orders, dispatch, attendance, timesheets, enquiries or balances.');
  if(parsed.intent==='employee_location' && !management)return response('Only superadmin can view employee location history, matching attendance-module permissions.');
  let selectedEmployee;
  let selectedEmployees=[];
  let employeeChoices=[];
  if (!parsed.self && parsed.intent !== 'unsupported') {
    const candidates = await User.find(management ? {} : {_id:user._id}).select('_id name').lean();
    employeeChoices=candidates;
    const employeeQuestion=parsed.entities.company ? text.replace(new RegExp(escapeRegex(parsed.entities.company),'ig'),' ') : text;
    const exact = candidates.filter(e => new RegExp(`\\b${escapeRegex(e.name)}\\b`, 'i').test(employeeQuestion));
    const residual=exact.reduce((t,e)=>t.replace(new RegExp(`\\b${escapeRegex(e.name)}\\b`,'ig'),' '),employeeQuestion);
    const partial=candidates.filter(e=>!exact.includes(e) && e.name.split(/\s+/).some(part=>part.length>2 && new RegExp(`\\b${escapeRegex(part)}\\b`,'i').test(residual)));
    const matches=selectedNames?candidates.filter(e=>selectedNames.some(n=>n.toLowerCase()===e.name.toLowerCase())):[...exact,...partial];
    if(selectedNames?.length && matches.length!==selectedNames.length)return response('The previously selected employees could not be resolved with your current access. Please select them again.');
    const explicitMultiple=selectedNames?.length>1 || (exact.length>1 && partial.length===0 && /\band\b|&|,|\bboth\b/i.test(text));
    if(matches.length>1 && !explicitMultiple) return {...response(`Which employee? Please use their full name, or say “both”: ${matches.map(e=>e.name).join(', ')}.`),conversationId:followup.issue({user:requestingUser,question:text,period,choices:matches}),suggestions:[...matches.map(e=>e.name),matches.length===2?'both':'all']};
    selectedEmployees=explicitMultiple?matches:[];
    selectedEmployee=matches.length===1?matches[0]:undefined;
    if(selectedEmployees.length>1 && !parsed.groupBy) parsed.groupBy='salesperson';
    if(selectedEmployee) args.salesPersonId=selectedEmployee._id;
    else if (!parsed.groupBy && !parsed.entities.company && /\b(?:for|by)\s+(?!the\b|last\b|this\b|today\b|yesterday\b|tomorrow\b|past\b|previous\b|current\b)[a-z]+/i.test(parsed.intent==='grade_analysis' ? (parsed.employeeText || text).replace(/\bby\s+(?:quantity|weight|volume|kg|kgs|frequency|order count)\b/gi,'') : parsed.employeeText || text) && parsed.intent !== 'unsupported') {
      return response('I could not resolve that employee or filter. Please use the employee’s full name.');
    }
  }
  if(parsed.individual && !selectedEmployees.length && !parsed.groupBy && !selectedEmployee && !parsed.self && !/\b(?:invoice|order|dispatch|customer)\s+(?:details?|records?)\b/.test(queryText)) return {...response('Do you want a salesperson-wise breakdown or one employee’s records? Say “salesperson wise”, or provide the employee’s full name.'),conversationId:followup.issue({user:requestingUser,question:text,period,choices:[{name:'salesperson wise'},{name:'customer wise'},...employeeChoices.slice(0,20)]}),suggestions:['salesperson wise','customer wise']};
  const selectedScope=selectedEmployees.length?{$in:selectedEmployees.map(e=>e._id)}:selectedEmployee?._id;
  suggestionNames=selectedEmployees.length?selectedEmployees.map(e=>e.name):selectedEmployee?[selectedEmployee.name]:[];
  if(parsed.intent==='employee_location') {
    const employee=parsed.self?{_id:user._id,name:user.name || 'You'}:selectedEmployee;
    const {getEmployeeHistory}=require('../employeeLocationService');
    const {employeeLocationReport}=require('./reports/employeeLocationReport');
    if(selectedEmployees.length>1){
      if(selectedEmployees.length>5)return response('Please select at most five employees for saved location in one request.');
      const reports=[];
      for(const selected of selectedEmployees)reports.push(await employeeLocationReport({employee:selected,period,user,getHistory:getEmployeeHistory,history:/\bhistory\b/.test(queryText)}));
      return response(reports.join('\n\n'),'employee_location');
    }
    return response(await employeeLocationReport({employee,period,user,getHistory:getEmployeeHistory,history:/\bhistory\b|\ball\s+(?:locations|checkpoints)\b/.test(queryText)}),'employee_location');
  }
  if(parsed.intent==='grade_analysis') {
    const query={isActive:{$ne:false},approvalStatus:'approved',...salesFilters()};
    if(!period.allTime)query.orderDate=buildDateRange(period.dateFrom,period.dateTo);
    if(!management || selectedScope || parsed.self)query.salesPersonId=selectedScope || user._id;
    if(parsed.location)query.companyAddress={$regex:escapeRegex(parsed.location),$options:'i'};
    const {extractSalesOrderItems}=require('../managementOrderAnalyticsService');
    const report=await require('./reports/gradeAnalysis').gradeAnalysis({model:SalesOrder,query,extractItems:extractSalesOrderItems,selectedGrade:parsed.entities.grade,byQuantity:/\b(quantity|qty|kg|kgs|kilograms?|tonnes?|tons?|mt|weight|volume)\b/.test(queryText)});
    return response(`${management && !parsed.self?'Company scope':'Your records only'}\n${entityLabel}\n${dateLabel} · Order date\n\n${report}`,'grade_analysis');
  }
  if(parsed.intent==='employee_review') {
    const report=await require('./reports/employeeReview').employeeReview({user,employeeScope:selectedScope || (parsed.self?user._id:null),period,models:{User,SalesOrder,Enquiry,Dispatch,Attendance,Timesheet,ColdCall}});
    return response(report.answer,'employee_review');
  }
  if(ledgerPlan) {
    if(parsed.groupBy) ledgerPlan.groupBy=parsed.groupBy;
    const report=await executeLedgerReport(ledgerPlan,{user,employeeId:selectedScope || (parsed.self?user._id:null),model:Dispatch});
    return {...response(`${selectedEmployee?.name || (management && !parsed.self?'Company scope':'Your records only')}\n\n${report.answer}`),toolsUsed:report.toolsUsed || []};
  }
  if(parsed.groupBy && ['sales_orders','sales_summary','dispatch_orders','dispatch_summary'].includes(parsed.intent)) {
    const isSales=parsed.intent.startsWith('sales');
    const query={isActive:isSales?{$ne:false}:true};
    if(!period.allTime) query[isSales?'orderDate':'dispatchDate']=buildDateRange(period.dateFrom,period.dateTo);
    if(!management || selectedScope || parsed.self) query.salesPersonId=selectedScope || user._id;
    if(isSales) {
      Object.assign(query,salesFilters());
      if(parsed.location) query.companyAddress={$regex:escapeRegex(parsed.location),$options:'i'};
      const states={pending:['pending_admin_review','pending_manager_approval'],rejected:['rejected_by_admin','rejected_by_manager'],approved:['approved']};
      if(parsed.status==='hold') return response('Sales-order approvals have no hold status. Ask for held order tracking.');
      if(states[parsed.status]) query.approvalStatus={$in:states[parsed.status]};
      else if(parsed.intent==='sales_summary') query.approvalStatus='approved';
    } else {
      if(parsed.entities.company) query.companyName={$regex:escapeRegex(parsed.entities.company),$options:'i'};
      query.dispatchStatus=/cancelled/.test(queryText)?'cancelled':/delivered/.test(queryText)?'delivered':{$ne:'cancelled'};
      if(/partial/.test(queryText)) query.dispatchCompletionStatus='partial_dispatched';
      if(/\bpaid\b/.test(queryText)) query.paymentStatus='paid';
    }
    const field=parsed.groupBy==='salesperson'?'salesPersonId':'companyName';
    const result=await queryReport(isSales?SalesOrder:Dispatch,query,{fields:'companyName salesPersonName salesPersonId',sort:{_id:1},metrics:isSales?{value:'orderValue'}:{value:'invoiceValue',quantity:'dispatchQty',outstanding:'pendingAmount'},groupBy:{field,nameField:parsed.groupBy==='salesperson'?'salesPersonName':'companyName'}});
    let answer=`${management && !parsed.self?'Company scope':'Your records only'}\n### ${isSales?'Sales orders':'Dispatches'} — ${parsed.groupBy} wise\n${dateLabel} · ${isSales?'Order date':'Dispatch date'}\nMatching records: ${result.summary.count}\nTotal value: ${money(result.summary.value)}`;
    for(const row of result.groups.slice(0,50)) answer+=`\n\n### ${row.name || row._id || 'Unassigned'}\nRecords: ${row.count}\nValue: ${money(row.value)}${isSales?'':`\nQuantity: ${row.quantity} KG\nOutstanding: ${money(row.outstanding)}`}`;
    if(result.groups.length>50) answer+='\n\nShowing first 50 groups. Totals cover all matching records.';
    if(!result.summary.count) answer+='\n\nNo matching records.';
    return response(answer,'grouped_business_report');
  }
  if(parsed.intent==='enquiries' && (parsed.groupBy || /details?|list/.test(queryText) || selectedScope || parsed.entities.company)) {
    const query={enquiryDate:buildDateRange(period.dateFrom,period.dateTo)};
    if(parsed.entities.company) query.companyName={$regex:escapeRegex(parsed.entities.company),$options:'i'};
    if(!management || selectedScope || parsed.self) query.salesPersonId=selectedScope || user._id;
    if(/\bwon\b/.test(queryText)) query['closure.status']='won';
    else if(/\blost\b/.test(queryText)) query['closure.status']='lost';
    else if(/\bpending\b/.test(queryText)) query['closure.status']='pending';
    const result=await queryReport(Enquiry,query,{fields:'enquiryNumber enquiryDate salesPersonId companyName customerName customerContactNo customerEmailId customerAddress grade shape size quantityInKg closure.status feasibility.status',sort:{enquiryDate:-1,enquiryNumber:1},metrics:{quantity:'quantityInKg'},groupBy:{field:'salesPersonId',nameField:'salesPersonId'}});
    const names=new Map(employeeChoices.map(e=>[String(e._id),e.name]));
    let answer=`${management?'Permitted selected employees':'Your records only'}\n### Enquiry details (${dateLabel})\nDate basis: enquiryDate\nMatching enquiries: ${result.summary.count}\nQuantity: ${result.summary.quantity} KG`;
    for(const g of result.groups.slice(0,50)) {
      answer+=`\n\n### ${names.get(String(g._id)) || 'Unassigned salesperson'}\nEnquiries: ${g.count}\nQuantity: ${g.quantity} KG`;
      for(const row of result.records.filter(r=>String(r.salesPersonId)===String(g._id))) answer+=`\n\n${row.enquiryNumber} — ${row.companyName}\nEnquiry date: ${new Date(row.enquiryDate).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}\nContact: ${row.customerName || 'Not recorded'} · ${row.customerContactNo || 'Not recorded'}\nGrade: ${row.grade || 'Not recorded'} · Quantity: ${row.quantityInKg || 0} KG\nStatus: ${row.closure?.status || 'Not recorded'}`;
    }
    if(!result.summary.count)answer+='\n\nNo matching enquiries.';
    if(result.summary.count>50 || result.groups.length>50)answer+='\n\nDetail/group lists are limited to 50. Totals cover every matching enquiry.';
    return response(answer,'enquiry_details');
  }
  if(parsed.intent==='customer_details') {
    const query={isActive:{$ne:false},approvalStatus:'approved',customerType:parsed.customerType,orderDate:buildDateRange(period.dateFrom,period.dateTo)};
    if(!management || selectedScope || parsed.self)query.salesPersonId=selectedScope || user._id;
    const result=await queryReport(SalesOrder,query,{fields:'companyName companyAddress salesPersonName contactPersonName contactPersonNumber contactPersonEmail orderValue salesOrderNo orderDate',sort:{orderDate:-1},metrics:{value:'orderValue'},groupBy:{field:'companyName',nameField:'companyName'}});
    let answer=`${management?'Company scope':'Your records only'}\n### ${parsed.customerType==='new'?'New':'Existing'} customer details (${dateLabel})\nDefinition: approved sales orders marked customerType=${parsed.customerType}, filtered by orderDate; this does not establish a customer’s first-ever enquiry date.\nMatching orders: ${result.summary.count}\nOrder value: ${money(result.summary.value)}`;
    for(const g of result.groups.slice(0,50)) {
      const row=result.records.find(r=>r.companyName===g._id);
      answer+=`\n\n### ${g.name || g._id}\nOrders: ${g.count}\nValue: ${money(g.value)}`;
      if(row)answer+=`\nContact: ${row.contactPersonName || 'Not recorded'}\nPhone: ${row.contactPersonNumber || 'Not recorded'}\nEmail: ${row.contactPersonEmail || 'Not recorded'}\nAddress: ${row.companyAddress || 'Not recorded'}\nSalesperson: ${row.salesPersonName || 'Not recorded'}`;
    }
    if(!result.summary.count)answer+='\n\nNo matching customers.';
    if(result.summary.count>50 || result.groups.length>50)answer+='\n\nShowing up to 50 customer groups and order records; totals cover all matches.';
    return response(answer,'customer_details');
  }
  if(parsed.groupBy && !['attendance'].includes(parsed.intent)) return response('That report does not support grouping yet. Sales, dispatch and payment reports support salesperson-wise and customer-wise breakdowns.');
  if (parsed.intent==='management_analysis' || parsed.intent==='logistics_analysis') {
    if(!management || selectedScope || parsed.self) return response('These company analysis reports are available to superadmin only. Employee filters are not supported for this report.');
    if(period.allTime || !period.dateFrom?.endsWith('-01') || period.dateFrom.slice(0,7)!==period.dateTo.slice(0,7)) return response('This analysis uses calendar months. Please ask “management analysis this month” or “logistics analysis September 2026”.');
    if(parsed.location || parsed.entities.company) return response('This analysis supports mill and grade filters, not company or address filters.');
    const month=period.dateFrom.slice(0,7);
    if(parsed.intent==='management_analysis') {
      const data=await require('../managementOrderAnalyticsService').getManagementOrderAnalytics({month,months:1,steelMill:parsed.entities.mill,grade:parsed.entities.grade,includeDetails:false});
      const summary=data.summary;
      return response(`### Management order analysis — ${month}\nFull calendar month; based on order entry date with the report’s legacy PO-date fallback.\n${entityLabel}\n\nOrders: ${summary.totalOrders.orderCount}\nOrder quantity: ${summary.totalOrders.orderKG} KG\nHouse quantity: ${summary.house.orderKG} KG\nSteel mill quantity: ${summary.steelMill.orderKG} KG\nUnresolved quantity records: ${data.dataQuality?.unresolvedOrders || 0}`, 'management_analysis');
    }
    const data=await require('../logisticsAnalyticsService').getLogisticsAnalytics({month,months:1,includeDetails:false});
    const row=data.summary.combined;
    return response(`### Logistics analysis — ${month}\nFull calendar month, using the logistics module’s target-date and physical-dispatch rules.\n\nDispatch plan: ${row.dispatchPlanKG} KG\nActual dispatch: ${row.actualDispatchKG} KG\nTarget pending: ${row.targetPendingKG} KG`, 'logistics_analysis');
  }
  if (parsed.intent === 'attendance') {
    const query={attendanceDate:buildDateRange(period.dateFrom,period.dateTo)};
    if(!management || selectedScope || parsed.self) query.employeeId=selectedScope || user._id;
    if(parsed.attendanceStatus==='absent') query.attendanceStatus='absent';
    else if(parsed.attendanceStatus==='on_leave') query.attendanceStatus={$in:['on_leave','loss_of_pay']};
    else if(parsed.attendanceStatus==='checked_out') query.attendanceStatus='checked_out';
    else if(parsed.attendanceStatus==='present') query.attendanceStatus={$in:['checked_in','checked_out','regularized']};
    const result=await queryReport(Attendance,query,{fields:'employeeName attendanceDate attendanceStatus workMode checkIn.time checkOut.time totalWorkingMinutes leaveType leaveDuration shortLeave.startTime shortLeave.endTime',sort:{attendanceDate:-1,employeeName:1},groupBy:{field:'attendanceStatus',nameField:'attendanceStatus'}});
    const rows=result.records;
    if(parsed.summary && !/\b(details?|list)\b/.test(queryText)) return response(`${selectedEmployee?.name || (management && !parsed.self?'Company scope':'Your records only')}\nAttendance summary (${dateLabel})\nMatching records: ${result.summary.count}\n\n${result.groups.map(r=>`${label((r.name || 'Unknown').replaceAll('_',' '))}: ${r.count} records`).join('\n')}`,'attendance_summary');
    const clock = value => value ? new Date(value).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}) : 'Not recorded';
    const records=rows.map(r=>`### ${r.employeeName}\n${new Date(r.attendanceDate).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})} · ${label(r.attendanceStatus.replaceAll('_',' '))}\nCheck in: ${clock(r.checkIn?.time)}${r.checkIn?.time ? ' IST':''}\nCheck out: ${clock(r.checkOut?.time)}${r.checkOut?.time ? ' IST':''}\nMode: ${label((r.workMode || 'Not recorded').replaceAll('_',' '))}\nWorking time: ${r.checkOut?.time ? `${r.totalWorkingMinutes || 0} minutes`:['on_leave','loss_of_pay'].includes(r.attendanceStatus)?'Not applicable — leave':r.checkIn?.time?'In progress / no checkout recorded':'Not started / no check-in recorded'}${r.leaveType ? `\nLeave: ${label(r.leaveType.replaceAll('_',' '))} · ${r.leaveDuration || ''}`:''}${r.shortLeave?.startTime ? `\nShort leave: ${r.shortLeave.startTime}–${r.shortLeave.endTime} IST`:''}`).join('\n\n');
    return response(`${selectedEmployee?.name || (management && !parsed.self ? 'Company scope':'Your records only')}\nAttendance records (${period.dateFrom} to ${period.dateTo})\nMatching records: ${result.summary.count}\n\n${records || 'No matching saved attendance records.'}\n\nSaved attendance records only. Absence here reflects saved absence records only.${result.summary.count>50 ? ` Showing 50 of ${result.summary.count} records; narrow the dates for more.`:''}`, 'attendance_records');
  }
  if (parsed.intent === 'timesheets' || parsed.intent === 'attendance') {
    const named = !parsed.self;
    let employeeId = user._id;
    if (named) {
      if (selectedEmployee) employeeId = selectedEmployee._id;
      else if (parsed.intent === 'timesheets') return response(management ? 'Please include the employee’s full name, or ask “my timesheet today”.' : 'You can view your own timesheet. Ask “my timesheet today”.');
      else {
        const data = await attendance.getAttendanceSummary(args);
        const summary = data.byStatus?.map(row => `${label(row.status.replaceAll('_', ' '))}: ${row.count} records`).join('\n');
        return response(`${management && !parsed.self ? 'Company scope' : 'Your records only'}\nAttendance: ${period.dateFrom} to ${period.dateTo}\n\n${summary || 'No attendance records found.'}`, 'attendance_summary');
      }
    }
    const employeeArgs = { ...args, employeeId, date: period.dateFrom };
    if (parsed.intent === 'timesheets') {
      const data = await timesheets.getTimesheets(employeeArgs);
      answer = `${data.employee?.name || 'Employee'} — timesheets (${period.dateFrom} to ${period.dateTo})\n\n` +
        (data.timesheets?.map(t => `${new Date(t.reportDate).toLocaleDateString('en-IN', {timeZone:'Asia/Kolkata'})}\nWork: ${t.workSummary}\nChallenges: ${t.challenges || 'None recorded'}\nNext day: ${t.nextDayPlan || 'Not recorded'}`).join('\n\n') || 'No timesheet submitted for this period.');
      if (data.timesheets?.length === 31) answer += '\n\nShowing up to 31 records; narrow the date range for more.';
      tool = 'timesheets';
    } else {
      if (period.dateFrom !== period.dateTo) {
        const data = await attendance.getAttendanceSummary(employeeArgs);
        return response(`Attendance for selected employee (${period.dateFrom} to ${period.dateTo})\n\n${data.byStatus?.map(r => `${label(r.status.replaceAll('_',' '))}: ${r.count} days, ${r.workingMinutes || 0} completed working minutes`).join('\n') || 'No records found.'}`, 'attendance_summary');
      }
      const data = await attendance.getAttendanceByEmployeeAndDate(employeeArgs);
      const a = data.attendance;
      const clock = value => value ? new Date(value).toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit' }) : 'Not recorded';
      answer = `${data.employee?.name || 'Employee'} — ${period.dateFrom}\n\n` + (a ? `Status: ${a.attendanceStatus}\nMode: ${a.workMode}\nCheck in: ${clock(a.checkIn?.time)}\nCheck out: ${clock(a.checkOut?.time)}\nWorking minutes: ${a.checkOut?.time ? a.totalWorkingMinutes || 0 : 'Available after checkout'}` : 'No attendance record found.');
      tool = 'attendance';
    }
  } else if (parsed.intent === 'dispatch_plan') {
    const readiness=/\breadiness\b|\bready(?: for dispatch)?\b/.test(queryText);
    const delivery=!readiness && /\bdelivery\b/.test(queryText);
    const field=readiness?'estimatedReadyDate':delivery?'estimatedDeliveryDate':'estimatedShipDate';
    const code=readiness?'ready_for_dispatch':delivery?'delivered':'shipped';
    const dateLabel=readiness?'ready-for-dispatch':delivery?'delivery':'ship';
    const range=buildDateRange(period.dateFrom,period.dateTo);
    const query = { isActive: {$ne:false}, currentStatus: { $nin: delivery?['delivered','cancelled']:['shipped','out_for_delivery','delivered','cancelled'] },
      $or:[
        {[field]:range},
        {[field]:null,milestones:{$elemMatch:{code,estimatedDate:range}}},
        {[field]:null,milestones:{$elemMatch:{code,estimatedDate:null,originalEstimatedDate:range}}}
      ] };
    if (!management || selectedScope || parsed.self) query.salesPersonId = selectedScope || user._id;
    const result=await queryReport(OrderTracking,query,{fields:'trackingNumber companyName currentStatusLabel estimatedShipDate estimatedReadyDate estimatedDeliveryDate milestones',sort:{[field]:1,_id:1}});
    const rows=result.records;
    answer = `${readiness?'Dispatch readiness plan':delivery?'Delivery plan':'Dispatch / shipping plan'} (${period.dateFrom} to ${period.dateTo})\nDate basis: estimated ${dateLabel} date; matching milestone fallback when absent. These are planned dates, not confirmed dispatches.\nMatching orders: ${result.summary.count}\nRecords displayed: ${rows.length}\n\n` + (rows.map((r,i) => {
      const milestone=r.milestones?.find(m=>m.code===code);
      const date=r[field] || milestone?.estimatedDate || milestone?.originalEstimatedDate;
      return `### ${i+1}. ${r.trackingNumber} — ${r.companyName}\n${r.currentStatusLabel || 'Status not recorded'}\nPlanned ${dateLabel} date: ${date?new Date(date).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded'}`;
    }).join('\n\n') || `No pending orders have a recorded ${dateLabel} date in this period. Orders without that date are not included.`);
    if(result.summary.count>rows.length)answer+=`\n\n${result.summary.count-rows.length} additional matching orders are not displayed. Narrow the period or salesperson.`;
    tool = 'dispatch_plan';
  } else if (parsed.intent === 'top_customers') {
    const data = await sales.getTopCustomers({...args, limit:parsed.limit});
    answer = `Top customers by approved order value (${period.dateFrom} to ${period.dateTo})\n\n` + (data.customers?.map((r,i)=>`${i+1}. ${r.companyName}: ${money(r.sales)} (${r.orders} orders)`).join('\n') || 'No customers found.'); tool='top_customers';
  } else if (parsed.intent === 'sales_orders') {
    const statuses = {pending:['pending_admin_review','pending_manager_approval'],rejected:['rejected_by_admin','rejected_by_manager'],approved:['approved']};
    if (parsed.status === 'hold') return response('Sales orders do not have a hold approval status. Please use order tracking for hold details.');
    const query = {isActive:{$ne:false},orderDate:buildDateRange(period.dateFrom,period.dateTo)};
    if(period.allTime) delete query.orderDate;
    Object.assign(query,salesFilters());
    if(parsed.location) query.companyAddress={$regex:escapeRegex(parsed.location),$options:'i'};
    if(!management || selectedScope || parsed.self) query.salesPersonId=selectedScope || user._id;
    if(statuses[parsed.status]) query.approvalStatus={$in:statuses[parsed.status]};
    const result=await queryReport(SalesOrder,query,{fields:'salesOrderNo poNumber companyName companyAddress orderDate orderValue approvalStatus salesPersonName steelMill otherSteelMill sizeGradeQuantityRate',sort:{orderDate:-1},metrics:{orderValue:'orderValue'}});
    const data = {orders:result.records};
    answer = `Sales orders${parsed.status ? ' — '+parsed.status : ''} (${dateLabel})\n\n` + (data.orders?.map(r=>`${r.salesOrderNo || r.poNumber || 'Order'} — ${r.companyName}\n${money(r.orderValue)} · ${label(r.approvalStatus.replaceAll('_',' '))} · ${r.salesPersonName}\nMill: ${r.steelMill==='Others' ? r.otherSteelMill || 'Not specified' : r.steelMill || 'Not specified'}`).join('\n\n') || 'No orders found.');
    answer=`Matching orders: ${result.summary.count}\nTotal order value (matching statuses): ${money(result.summary.orderValue)}\n\n${answer}`;
    if (result.summary.count>50) answer += `\n\nShowing 50 of ${result.summary.count} orders. Totals include all matches.`;
    if(parsed.location) answer += `\n\nAddress filter: company address contains “${parsed.location}”.`;
    tool='sales_orders';
  } else if (parsed.intent === 'sales_summary') {
    let data;
    if(parsed.location || entityLabel) {
      const match={isActive:{$ne:false},approvalStatus:'approved',orderDate:buildDateRange(period.dateFrom,period.dateTo),...salesFilters(),...(parsed.location ? {companyAddress:{$regex:escapeRegex(parsed.location),$options:'i'}}:{})};
      if(period.allTime) delete match.orderDate;
      if(!management || selectedScope || parsed.self) match.salesPersonId=selectedEmployee?._id || user._id;
      const rows=await SalesOrder.aggregate([{$match:match},{$group:{_id:null,totalSales:{$sum:'$orderValue'},totalOrders:{$sum:1}}}]);
      data=rows[0] || {totalSales:0,totalOrders:0};
    } else data = await sales.getSalesSummary(args);
    answer = `Approved sales order value (${dateLabel})\nBased on order date; this is booked sales, not cash collected.\n\n${totals(data)}`; tool = 'sales_summary';
    if(parsed.location) answer += `\n\nAddress filter: company address contains “${parsed.location}”.`;
  } else if (parsed.intent === 'dispatch_orders') {
    const query={isActive:true,dispatchDate:buildDateRange(period.dateFrom,period.dateTo)};
    if(parsed.entities.company) query.companyName={$regex:escapeRegex(parsed.entities.company),$options:'i'};
    if(!management || selectedScope || parsed.self) query.salesPersonId=selectedScope || user._id;
    if(/delivered/.test(queryText)) query.dispatchStatus='delivered';
    else if(/cancelled/.test(parsed.text)) query.dispatchStatus='cancelled';
    if(/partial/.test(parsed.text)) query.dispatchCompletionStatus='partial_dispatched';
    if(/\bpaid\b/.test(parsed.text)) query.paymentStatus='paid';
    const result=await queryReport(Dispatch,query,{fields:'invoiceNumber companyName invoiceValue dispatchQty dispatchStatus paymentStatus pendingAmount',sort:{dispatchDate:-1},metrics:{invoiceValue:'invoiceValue',quantity:'dispatchQty',outstanding:'pendingAmount'}});
    const rows=result.records;
    answer=`Dispatch records (${dateLabel})\nFiltered by dispatch date.\n\n`+(rows.map(r=>`${r.invoiceNumber} — ${r.companyName}\n${money(r.invoiceValue)} · ${r.dispatchQty} KG · ${r.dispatchStatus}\nOutstanding: ${money(r.pendingAmount)} · ${r.paymentStatus}`).join('\n\n') || 'No matching dispatches.');
    answer=`Matching dispatches: ${result.summary.count}\nInvoice value: ${money(result.summary.invoiceValue)}\nQuantity: ${result.summary.quantity} KG\nOutstanding: ${money(result.summary.outstanding)}\n\n${answer}`;
    if(result.summary.count>50) answer+=`\n\nShowing 50 of ${result.summary.count} records; totals include all matches.`;tool='dispatch_orders';
  } else if (parsed.intent === 'tracking_orders') {
    const query={isActive:true};
    if(parsed.entities.company) query.companyName={$regex:escapeRegex(parsed.entities.company),$options:'i'};
    if(!management || selectedScope || parsed.self) query.salesPersonId=selectedScope || user._id;
    let trackingDateLabel='current status, all order dates';
    if(!period.defaulted && !period.allTime){
      const dateField={delivered:'actualDeliveryDate',shipped:'actualShipDate',ready_for_dispatch:'actualReadyDate'}[parsed.trackingStatus];
      if(dateField){query[dateField]=buildDateRange(period.dateFrom,period.dateTo);trackingDateLabel=`${dateField}: ${dateLabel}`;}
      else {
        if(/\b(?:moved|entered|changed|transitioned)\b|\bwere\s+(?:under|in)\b/.test(parsed.text)) return response('Historical stage transitions are not supported in this report yet. Ask for orders currently in that stage; with a period, I filter by tracking creation date.');
        query.createdAt=buildDateRange(period.dateFrom,period.dateTo);
        trackingDateLabel=`tracking creation date: ${dateLabel}; status is current, not the date it entered this stage`;
      }
    }
    if(parsed.trackingStatus==='on_hold')query.$or=[{currentStatus:'on_hold'},{isOnHold:true}];
    else if(parsed.trackingStatus) query.currentStatus=parsed.trackingStatus;
    else if(/hold|held/.test(parsed.text)) query.isOnHold=true;
    const result=await queryReport(OrderTracking,query,{fields:'trackingNumber salesOrderNo poNumber companyName currentStatus currentStatusLabel progressPercentage isOnHold holdReason transporter estimatedDeliveryDate actualDeliveryDate',sort:{updatedAt:-1}});
    const rows=result.records;
    answer=`Current order tracking${parsed.trackingStatus?' — '+label(parsed.trackingStatus.replaceAll('_',' ')):''} (${trackingDateLabel})\n\n`+(rows.map((r,index)=>`### ${index+1}. ${r.trackingNumber} — ${r.companyName}\n${r.currentStatusLabel || label((r.currentStatus || 'Not recorded').replaceAll('_',' '))} · ${r.progressPercentage || 0}%\nPO: ${r.poNumber || 'Not recorded'}\nEstimated delivery: ${r.estimatedDeliveryDate ? new Date(r.estimatedDeliveryDate).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded'}${r.isOnHold ? `\nOn hold: ${r.holdReason || 'No reason recorded'}`:''}`).join('\n\n') || 'No matching tracking records.');
    const total=result.summary.count;
    const shown=rows.length;
    const coverage=total>shown
      ? `Displaying records 1–${shown} of ${total} matches. ${total-shown} additional matching records are not displayed.\nThis is a limited list, not the complete result. Narrow by date, salesperson or company to see fewer matches.`
      : `All ${total} matching records are displayed.`;
    answer=`Matching tracking records: ${total}\nRecords displayed: ${shown}\n\n${coverage}\n\n${answer}`;
    tool='tracking_orders';
  } else if (parsed.intent === 'executive_summary') {
    if(!management || selectedScope || parsed.self) return response('Company management reports are available to superadmin only. You can ask for your own sales, dispatches or attendance.');
    const [a,b,c]=await Promise.all([sales.getSalesSummary(args),dispatch.getDispatchSummary(args),executeLedgerReport(planLedgerReport(parseQuestion('outstanding payment total')),{user,employeeId:selectedScope || (parsed.self?user._id:null),model:Dispatch})]);
    answer=`Management overview (${dateLabel})\n\n### Approved sales — by order date\n${totals(a)}\n\n### Dispatch — by dispatch date\n${totals(b)}\n\n### Dispatch payments — all dates\n${c.answer}`;tool='executive_summary';
  } else if (parsed.intent === 'dispatch_summary') {
    answer = `Dispatches (${period.dateFrom} to ${period.dateTo})\n\n${totals(await dispatch.getDispatchSummary(args))}`; tool = 'dispatch_summary';
  } else if (parsed.intent === 'delayed_orders') {
    const data = await tracking.getDelayedOrders({...args,limit:50});
    answer = 'Currently delayed orders (all dates)\n\n' + (data.orders?.map(r=>`${r.trackingNumber} — ${r.companyName}\n${r.currentStatusLabel || r.currentStatus}`).join('\n\n') || 'No delayed orders found.');
    if(data.orders?.length===50) answer+='\n\nShowing first 50 orders.';
    tool='delayed_orders';
  } else if (parsed.intent === 'receivables') {
    return response('Please ask for Dispatch payment details, outstanding invoices, overdue invoices or payments received with a period.');
  } else if (parsed.intent === 'enquiries') {
    answer = `Enquiries (${period.dateFrom} to ${period.dateTo})\n\n${totals(await enquiries.getEnquirySummary(args))}`; tool = 'enquiry_summary';
  } else if (parsed.intent === 'activity') {
    const data = await activity.getColdCallSummary(args);
    answer = `Sales activity (${period.dateFrom} to ${period.dateTo})\n\n${data.activities?.map(r=>`${label(r.activityType || 'Other')}: ${r.count} activities, ${r.uniqueCompanyCount} companies`).join('\n') || 'No activity recorded.'}`; tool='activity_summary';
  } else return response('I can query sales, dispatch summaries and plans, timesheets, attendance, enquiries and outstanding balances. Include a date and an employee’s full name where needed. General AI answers are disabled.');
  if(entityLabel) answer=`${entityLabel}\n\n${answer}`;
  return response(`${selectedEmployee ? selectedEmployee.name : management && !parsed.self ? 'Company scope' : 'Your records only'}\n\n${answer}`, tool);
};
module.exports = { askDatabase: async args => {
 const resumed=args.requestingUser && followup.resume(args.conversationId,args.requestingUser,args.message);
 const message=resumed?.message || args.message;
 const {auditDatabaseQuestion}=require('./usage/databaseAudit');
 try{
  const result=await askDatabase({message,requestingUser:args.requestingUser,conversationId:args.conversationId,resolvedPeriod:resumed?.period,selectedNames:resumed?.selectedNames});
  // Retain a bounded signed report context after a successful response. Pending
  // clarification tokens keep their own allowed choices instead.
  if(result.toolsUsed?.length && args.requestingUser)result.conversationId=followup.issue({user:args.requestingUser,question:message,period:result.resolvedPeriod,choices:[],kind:'report',selectedNames:resumed?.selectedNames});
  auditDatabaseQuestion({user:args.requestingUser,message:args.message,conversationId:args.conversationId,result});
  return result;
 }catch(error){auditDatabaseQuestion({user:args.requestingUser,message:args.message,conversationId:args.conversationId,error});throw error;}
} };
