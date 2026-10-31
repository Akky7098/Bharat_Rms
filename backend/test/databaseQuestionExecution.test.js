const test=require('node:test');
const assert=require('node:assert/strict');
const corpus=require('./fixtures/databaseQuestions500.json');
const {fixture}=require('./helpers/databaseChatFixture');
const tools={sales_summary:'getSalesSummary',sales_orders:'orders',top_customers:'getTopCustomers',dispatch_summary:'getDispatchSummary',dispatch_plan:'plan',dispatch_orders:'dispatchOrders',tracking_orders:'plan',delayed_orders:'getDelayedOrders',receivables:'getReceivableSummary',enquiries:'getEnquirySummary',activity:'getColdCallSummary',management_analysis:'managementAnalytics',logistics_analysis:'logisticsAnalytics',executive_summary:'getSalesSummary'};
for(const role of ['super_admin','admin','user']) test(`500 question service paths: ${role}`,async t=>{
 for(const spec of corpus) {
  await t.test(spec.id,async()=>{
   const {ask,calls}=fixture();
   const r=await ask({message:spec.question,requestingUser:{_id:'caller',role}});
   assert.ok(r.answer?.trim());
   const business=calls.filter(c=>c[0]!=='employees');
   if(spec.clarify){assert.equal(business.length,0,'Clarification must not execute a guessed business query');return;}
   if(['management_analysis','logistics_analysis','executive_summary'].includes(spec.intent) && role!=='super_admin') {
    assert.equal(business.length,0);return;
   }
   // Employee report lookup may request a full name for nonmanagement callers, but must never query someone else.
   if(business.length===0){assert.match(r.answer,/employee|own timesheet|full name/i);return;}
   if(role!=='super_admin') for(const [name,args] of business) {
    if(['orders','plan','dispatchOrders'].includes(name)) assert.equal(args.salesPersonId,'caller');
    else if(name==='ledgerReport') assert.equal(args[0].$match.salesPersonId,'caller');
    else if(name==='salesAggregate') assert.equal(args[0].$match.salesPersonId,'caller');
    else if(name==='attendanceRecords') assert.equal(args.employeeId,'caller');
    else assert.equal(args.requestingUser?._id,'caller');
   }
   if(spec.intent==='receivables'){assert.ok(calls.some(c=>c[0]==='ledgerReport'));return;}
   if(spec.ledger){assert.ok(calls.some(c=>c[0]==='ledgerReport'));return;}
   if(spec.mill && spec.intent==='sales_orders') assert.equal(calls.find(c=>c[0]==='orders')[1].$or[0].steelMill,spec.mill);
   if(spec.location) assert.equal(calls.find(c=>c[0]==='orders')[1].companyAddress.$regex,spec.location);
   if(spec.intent==='receivables' && /overdue|overdu\b/i.test(spec.question)) assert.ok(calls.some(c=>c[0]==='getOverdueCustomers'),'Overdue spelling must preserve overdue intent');
   else if(tools[spec.intent] && !spec.mill && !spec.grade && !spec.company) assert.ok(calls.some(c=>c[0]===tools[spec.intent]),`Expected ${tools[spec.intent]}`);
  });
 }
});
