const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/databaseChatFixture');
const user={_id:'md',role:'super_admin'};
const users=[{_id:'r',name:'Renu'},{_id:'s',name:'Shalu'},{_id:'x',name:'Other Person'}];
const enquiries=[
 {_id:'1',salesPersonId:'r',enquiryDate:new Date('2026-10-22'),enquiryNumber:'R-1',companyName:'Renu Customer',quantityInKg:100},
 {_id:'2',salesPersonId:'s',enquiryDate:new Date('2026-10-23'),enquiryNumber:'S-1',companyName:'Shalu Customer',quantityInKg:200},
 {_id:'3',salesPersonId:'x',enquiryDate:new Date('2026-10-23'),enquiryNumber:'X-1',companyName:'Unrelated Customer',quantityInKg:999},
 {_id:'4',salesPersonId:'r',enquiryDate:new Date('2026-10-01'),enquiryNumber:'OLD',companyName:'Old Customer',quantityInKg:1000},
];
test('screenshot query selects both explicitly named employees and preserves rolling week',async()=>{
 const {ask,calls}=fixture({users,enquiries,realDates:true});const r=await ask({message:'for last one week ?? enquiry details for renu and shalu as per individuaal wise',requestingUser:user});
 const q=calls.find(c=>c[0]==='enquiryRecords')[1];assert.deepEqual(Array.from(q.salesPersonId.$in),['r','s']);assert.equal(q.enquiryDate.$gte.toISOString(),'2026-10-20T18:30:00.000Z');
 assert.match(r.answer,/### Renu/);assert.match(r.answer,/### Shalu/);assert.doesNotMatch(r.answer,/Which employee|Unrelated Customer|Old Customer/);assert.match(r.answer,/Matching enquiries: 2/);assert.match(r.answer,/Quantity: 300 KG/);
});
test('both reply resumes employee clarification without losing question or period',async()=>{
 const options={users:[{_id:'d1',name:'Deepak Arya'},{_id:'d2',name:'Deepak Yadav'}],enquiries:[]};
 const {ask,calls}=fixture(options);const first=await ask({message:'Deepak enquiry details last one week',requestingUser:user});
 const r=await ask({message:'both',conversationId:first.conversationId,requestingUser:user});
 const q=calls.find(c=>c[0]==='enquiryRecords')[1];assert.deepEqual(Array.from(q.salesPersonId.$in),['d1','d2']);assert.equal(q.enquiryDate.from,'2026-10-21');assert.doesNotMatch(r.answer,/I can query/);
});
test('all reply remains bound to user and role',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'Deepak enquiry details today',requestingUser:user});
 await ask({message:'all',conversationId:first.conversationId,requestingUser:{_id:'other',role:'user'}});
 assert.equal(calls.some(c=>c[0]==='enquiryRecords'),false);
});
test('new-customer details use approved orders and customerType=new',async()=>{
 const orders=[{_id:'a',salesPersonId:'r',approvalStatus:'approved',isActive:true,customerType:'new',orderDate:new Date('2026-10-10'),companyName:'New Customer',orderValue:100,contactPersonName:'Customer Contact',contactPersonNumber:'9000000000'},
 {_id:'b',salesPersonId:'r',approvalStatus:'approved',isActive:true,customerType:'existing',orderDate:new Date('2026-10-10'),companyName:'Existing Customer',orderValue:999}];
 const {ask,calls}=fixture({users,orders,realDates:true});const r=await ask({message:'tell me the new customer detail for this month',requestingUser:user});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.customerType,'new');assert.equal(q.approvalStatus,'approved');assert.match(r.answer,/customerType=new/);assert.match(r.answer,/### New Customer/);assert.match(r.answer,/Customer Contact/);assert.doesNotMatch(r.answer,/### Existing Customer/);
});
test('new-customer query cannot escape ordinary-user scope',async()=>{
 const {ask,calls}=fixture();await ask({message:'new customer details this month',requestingUser:{_id:'u',role:'user'}});
 assert.equal(calls.find(c=>c[0]==='orders')[1].salesPersonId,'u');
});
test('both never silently means three employees',()=>{
 const context=require('../services/bharat-ai/conversation/databaseFollowup');
 const token=context.issue({user,question:'enquiry details today',period:{dateFrom:'2026-10-27',dateTo:'2026-10-27'},choices:users});
 assert.equal(context.resume(token,user,'both'),null);assert.equal(context.resume(token,user,'all').selectedNames.length,3);
});
