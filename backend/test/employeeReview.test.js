const test=require('node:test');const assert=require('node:assert/strict');
const {employeeReview}=require('../services/bharat-ai/reports/employeeReview');
const {reportModel}=require('./helpers/reportModel');
const {fixture}=require('./helpers/databaseChatFixture');
function models(){
 const calls=[];
 const aggregate=(name,rows)=>({aggregate:p=>{calls.push([name,p]);return reportModel(rows).aggregate(p);}});
 const roster=[{_id:'a',name:'Alice',status:'active',role:'user'},{_id:'b',name:'Bob',status:'active',role:'admin'},{_id:'c',name:'Inactive',status:'inactive',role:'user'}];
 const User={find:q=>{calls.push(['User',q]);let rows=roster.filter(r=>r.status!=='inactive' && (q._id?(q._id.$in?q._id.$in.includes(r._id):q._id===r._id):true));return {select(){return this;},sort(){return this;},limit(){return this;},lean:async()=>rows};}};
 const at=new Date('2026-10-10');
 return {calls,models:{User,
 SalesOrder:aggregate('sales',[{salesPersonId:'a',orderDate:at,isActive:true,approvalStatus:'approved',orderValue:100},{salesPersonId:'a',orderDate:at,isActive:true,approvalStatus:'pending_admin_review',orderValue:999},{salesPersonId:'b',orderDate:at,isActive:true,approvalStatus:'approved',orderValue:200}]),
 Enquiry:aggregate('enquiries',[{salesPersonId:'a',enquiryDate:at,closure:{status:'won'}}]),
 Dispatch:aggregate('dispatch',[{salesPersonId:'a',isActive:true,dispatchStatus:'delivered',dispatchDate:at,invoiceValue:100,dispatchQty:20,pendingAmount:60,paymentDueDate:new Date('2026-10-01')},{salesPersonId:'b',isActive:true,dispatchStatus:'delivered',dispatchDate:at,pendingAmount:500,paymentDueDate:new Date('2026-10-01'),revisedPaymentDueDate:new Date('2026-11-01')}]),
 Attendance:aggregate('attendance',[{employeeId:'a',attendanceDate:at,totalWorkingMinutes:540,checkOut:{time:at}},{employeeId:'a',attendanceDate:at,totalWorkingMinutes:999}]),
 Timesheet:aggregate('timesheets',[{employeeId:'a',reportDate:at}]),ColdCall:aggregate('activities',[{salesPersonId:'a',date:at,activityType:'visit'}])}};
}
const period={dateFrom:'2026-10-01',dateTo:'2026-10-27'},now=new Date('2026-10-27T06:00:00Z');
test('factual review separates people, dates, financial facts and completed working time',async()=>{
 const f=models();const r=await employeeReview({user:{_id:'md',role:'super_admin'},period,models:f.models,now});
 assert.match(r.answer,/### Alice/);assert.match(r.answer,/### Bob/);assert.doesNotMatch(r.answer,/### Inactive/);
 assert.match(r.answer,/Booked sales: ₹100/);assert.match(r.answer,/Booked sales: ₹200/);assert.doesNotMatch(r.answer,/₹999/);
 assert.match(r.answer,/Completed working time: 540 minutes/);assert.match(r.answer,/Current overdue \(all dates\): ₹60/);
 assert.match(r.answer,/Timesheets submitted: 1/);assert.match(r.answer,/not a performance score/);
});
test('nonmanagement all-employee request stays self-scoped',async()=>{
 const f=models();const r=await employeeReview({user:{_id:'a',role:'user'},period,models:f.models,now});
 assert.match(r.answer,/### Alice/);assert.doesNotMatch(r.answer,/### Bob/);
 for(const [name,p]of f.calls.filter(c=>c[0]!=='User')) {const match=p[0].$match;assert.deepEqual(match[name==='attendance'||name==='timesheets'?'employeeId':'salesPersonId'].$in,['a']);}
});
test('screenshot routes to review rather than sales and defaults explicitly to month to date',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'can you tell me the review of all employee/sales person ??',requestingUser:{_id:'md',role:'super_admin'}});
 assert.match(r.answer,/Employee performance review/);const args=calls.find(c=>c[0]==='employeeReview')[1];assert.equal(args.period.dateFrom,'2026-10-01');assert.equal(args.period.dateTo,'2026-10-27');assert.equal(calls.some(c=>c[0]==='getSalesSummary'),false);
});
