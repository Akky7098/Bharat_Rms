// Factual employee review: fixed metrics, explicit periods, no generated ratings or inferred absence.
async function employeeReview({user,employeeScope,period,models,now=new Date()}) {
 const {User,SalesOrder,Enquiry,Dispatch,Attendance,Timesheet,ColdCall}=models;
 const rosterQuery={status:{$ne:'inactive'}};
 if(user.role!=='super_admin') rosterQuery._id=user._id;
 else if(employeeScope)rosterQuery._id=employeeScope;
 else rosterQuery.role={$in:['user','admin']};
 const found=await User.find(rosterQuery).select('_id name role').sort({name:1,_id:1}).limit(51).lean();
 const roster=found.slice(0,50),ids=roster.map(e=>e._id);
 if(!ids.length)return {answer:'No active employees match this review scope.'};
 const range={$gte:new Date(`${period.dateFrom}T00:00:00+05:30`),$lte:new Date(`${period.dateTo}T23:59:59.999+05:30`)};
 const countIf=condition=>({$sum:{$cond:[condition,1,0]}});
 const grouped=(model,match,id,metrics,extra=[])=>model.aggregate([{$match:match},...extra,{$group:{_id:`$${id}`,...metrics}}]).option({maxTimeMS:15000});
 const today=new Date(now.getTime()+330*60000).toISOString().slice(0,10);
 const [sales,enquiries,dispatch,balances,attendance,timesheets,activities]=await Promise.all([
  grouped(SalesOrder,{salesPersonId:{$in:ids},isActive:{$ne:false},approvalStatus:'approved',orderDate:range},'salesPersonId',{orders:{$sum:1},value:{$sum:'$orderValue'}}),
  grouped(Enquiry,{salesPersonId:{$in:ids},enquiryDate:range},'salesPersonId',{count:{$sum:1},won:countIf({$eq:['$closure.status','won']}),lost:countIf({$eq:['$closure.status','lost']})}),
  grouped(Dispatch,{salesPersonId:{$in:ids},isActive:true,dispatchStatus:{$ne:'cancelled'},dispatchDate:range},'salesPersonId',{count:{$sum:1},value:{$sum:'$invoiceValue'},quantity:{$sum:'$dispatchQty'}}),
  grouped(Dispatch,{salesPersonId:{$in:ids},isActive:true,dispatchStatus:{$ne:'cancelled'},pendingAmount:{$gt:0}},'salesPersonId',{outstanding:{$sum:'$pendingAmount'},overdue:{$sum:{$cond:[{$and:[{$ne:['$effectiveDueDate',null]},{$lt:['$effectiveDueDate',new Date(`${today}T00:00:00+05:30`)]}]},'$pendingAmount',0]}}},[{$addFields:{effectiveDueDate:{$ifNull:['$revisedPaymentDueDate','$paymentDueDate']}}}]),
  grouped(Attendance,{employeeId:{$in:ids},attendanceDate:range},'employeeId',{records:{$sum:1},completed:countIf({$ne:[{$ifNull:['$checkOut.time',null]},null]}),minutes:{$sum:{$cond:[{$ne:[{$ifNull:['$checkOut.time',null]},null]},'$totalWorkingMinutes',0]}}}),
  grouped(Timesheet,{employeeId:{$in:ids},reportDate:range},'employeeId',{count:{$sum:1}}),
  grouped(ColdCall,{salesPersonId:{$in:ids},date:range},'salesPersonId',{count:{$sum:1},visits:countIf({$eq:['$activityType','visit']})}),
 ]);
 const index=rows=>new Map(rows.map(r=>[String(r._id),r]));
 const tables=[sales,enquiries,dispatch,balances,attendance,timesheets,activities].map(index);
 const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
 let answer=`${user.role==='super_admin'?'Permitted employee scope':'Your records only'}\n### Employee performance review\nPeriod: ${period.dateFrom} to ${period.dateTo} (IST)\nSales: approved order value by orderDate. Dispatch: dispatchDate. Enquiries, attendance, timesheets and activity use their own business dates.\nOutstanding and overdue are current Dispatch balances across all dates; revised due dates take precedence.\nThis is a factual activity summary, not a performance score.\nEmployees: ${roster.length}`;
 for(const employee of roster){
  const [s,e,d,b,a,t,c]=tables.map(m=>m.get(String(employee._id)) || {});
  answer+=`\n\n### ${employee.name}\nApproved orders: ${s.orders || 0}\nBooked sales: ${money(s.value)}\nEnquiries: ${e.count || 0} · Won: ${e.won || 0} · Lost: ${e.lost || 0}\nDispatches: ${d.count || 0} · Quantity: ${d.quantity || 0} KG\nDispatch invoice value: ${money(d.value)}\nCurrent outstanding (all dates): ${money(b.outstanding)}\nCurrent overdue (all dates): ${money(b.overdue)}\nSaved attendance days: ${a.records || 0}\nCompleted checkouts: ${a.completed || 0}\nCompleted working time: ${a.minutes || 0} minutes\nTimesheets submitted: ${t.count || 0}\nSales activities: ${c.count || 0} · Visits: ${c.visits || 0}`;
 }
 answer+='\n\nZero means no matching saved activity in the stated scope. Missing attendance or timesheets are not automatically treated as absence or poor performance.';
 if(found.length>50)answer+='\nShowing the first 50 active employees by name; request specific employees for the rest.';
 return {answer};
}
module.exports={employeeReview};
