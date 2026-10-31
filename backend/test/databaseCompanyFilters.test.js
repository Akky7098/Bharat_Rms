const test=require('node:test');
const assert=require('node:assert/strict');
const {parseQuestion}=require('../services/bharat-ai/router/databaseQuestionParser');
const {fixture}=require('./helpers/databaseChatFixture');
const md={_id:'md',role:'super_admin'};
for(const phrase of ['tell me all order details of randhir industries','orders for randhir industries','order details of randhir industries this month','sales order details for customer randhir industries last month','orders of acme']) {
 test(`natural company phrase: ${phrase}`,()=>{
  const p=parseQuestion(phrase);assert.equal(p.entities.company,phrase.endsWith('acme')?'acme':'randhir industries');
  assert.equal(p.intent,'sales_orders');assert.equal(p.unsupportedFilter,false);
 });
}
test('screenshot returns only requested company across dates and reports no match honestly',async()=>{
 const orders=[{isActive:true,companyName:'RANDHIR INDUSTRIES',salesOrderNo:'RIGHT',approvalStatus:'approved',orderValue:100,orderDate:new Date('2026-08-01')},
 {isActive:true,companyName:'UNRELATED INDUSTRIES',salesOrderNo:'WRONG',approvalStatus:'approved',orderValue:500,orderDate:new Date('2026-10-27')}];
 const {ask,calls}=fixture({orders,realDates:true});
 const r=await ask({message:'tell me all order details of randhir industries',requestingUser:md});
 assert.match(r.answer,/RIGHT/);assert.doesNotMatch(r.answer,/WRONG|UNRELATED/);assert.match(r.answer,/all recorded dates/);
 assert.equal(calls.find(c=>c[0]==='orders')[1].orderDate,undefined);
 const empty=await ask({message:'order details of missing industries',requestingUser:md});
 assert.match(empty.answer,/Matching orders: 0/);assert.doesNotMatch(empty.answer,/RIGHT|WRONG/);
});
test('company names cannot accidentally select a same-named employee; explicit employee still scopes',async()=>{
 const {ask,calls}=fixture({users:[{_id:'r',name:'Renu'}]});
 await ask({message:'orders for Renu Industries this month',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='orders')[1].salesPersonId,undefined);
 const second=fixture({users:[{_id:'r',name:'Renu'}]});
 await second.ask({message:'orders of randhir industries by Renu this month',requestingUser:md});
 assert.equal(second.calls.find(c=>c[0]==='orders')[1].salesPersonId,'r');
});
for(const role of ['user','admin'])test(`company filters preserve ${role} access`,async()=>{
 const {ask,calls}=fixture();await ask({message:'orders of randhir industries',requestingUser:{_id:'own',role}});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.salesPersonId,'own');assert.equal(q.companyName.$regex,'randhir industries');
});
for(const [question,call] of [['order tracking cutting for randhir industries','plan'],['dispatch details for randhir industries today','dispatchOrders'],['enquiry details for randhir industries today','enquiryRecords']])test(`company filter reaches ${call}`,async()=>{
 const {ask,calls}=fixture();await ask({message:question,requestingUser:md});
 assert.equal(calls.find(c=>c[0]===call)[1].companyName.$regex,'randhir industries');
});
