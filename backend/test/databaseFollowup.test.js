const test=require('node:test');const assert=require('node:assert/strict');
const followup=require('../services/bharat-ai/conversation/databaseFollowup');
const {fixture}=require('./helpers/databaseChatFixture');
const user={_id:'md',role:'super_admin'};
test('employee clarification resumes the original attendance question and fixed period',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'todays attendance for deepak',requestingUser:user});
 assert.match(first.answer,/Which employee/);assert.match(first.conversationId,/^dbctx\./);assert.ok(first.suggestions.includes('Deepak Arya'));
 const second=await ask({message:'deepak arya',conversationId:first.conversationId,requestingUser:user});
 const call=calls.find(c=>c[0]==='attendanceRecords');assert.equal(call[1].employeeId,'d1');assert.equal(call[1].attendanceDate.from,'2026-10-27');
 assert.doesNotMatch(second.answer,/I can query/);assert.equal(followup.read(second.conversationId,user).kind,'report');
});
test('signed clarification is bound to user, role, expiry and exact offered choices',()=>{
 const token=followup.issue({user,question:'attendance yesterday',period:{dateFrom:'2026-10-26',dateTo:'2026-10-26'},choices:[{name:'Deepak Arya'}]});
 assert.equal(followup.read(token,{_id:'other',role:'super_admin'}),null);
 assert.equal(followup.read(token,{...user,role:'user'}),null);
 assert.equal(followup.read(token,user,Date.now()+11*60000),null);
 assert.equal(followup.resume(token,user,'Deepak Yadav'),null);
 const parts=token.split('.');parts[1]=Buffer.from('{}').toString('base64url');assert.equal(followup.read(parts.join('.'),user),null);
});
test('new business question does not inherit the pending employee filter',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'Deepak attendance today',requestingUser:user});
 await ask({message:'sales this month',conversationId:first.conversationId,requestingUser:user});
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].salesPersonId,undefined);
});
test('individual request clarification resumes as a grouped payment report',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'individual overdue payment details last 3 months',requestingUser:user});
 const second=await ask({message:'sales person wise',conversationId:first.conversationId,requestingUser:user});
 assert.match(second.answer,/Grouped by salesperson/);assert.ok(calls.some(c=>c[0]==='ledgerReport'));
});
test('mill clarification resumes original detail report and month when user says all mill',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'tell me details of mill order this month',requestingUser:user});
 assert.match(first.conversationId,/^dbctx\./);assert.ok(first.suggestions.includes('all mills'));
 const next=await ask({message:'all mill',conversationId:first.conversationId,requestingUser:user});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.trackingOrderType,'N.H.O.');
 assert.equal(q.orderDate.from,'2026-10-01');assert.equal(q.orderDate.to,'2026-10-27');
 assert.match(next.answer,/All steel mills/);assert.doesNotMatch(next.answer,/I can query|Which mill/);
});
test('mill name aliases resume the original month without becoming employee choices',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'details of mill orders last month',requestingUser:user});
 await ask({message:'Kesari Alloys',conversationId:first.conversationId,requestingUser:user});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.$or[0].steelMill,'Kesari Alloys - Bhiwadi');
 assert.equal(q.orderDate.from,'2026-09-01');assert.equal(q.salesPersonId,undefined);
});
test('mill follow-up cannot broaden ordinary user scope or leak pending context to another user',async()=>{
 const own={_id:'own',role:'user'};const {ask,calls}=fixture();
 const first=await ask({message:'details of mill orders this month',requestingUser:own});
 await ask({message:'all mills',conversationId:first.conversationId,requestingUser:own});
 assert.equal(calls.find(c=>c[0]==='orders')[1].salesPersonId,'own');
 assert.equal(followup.resume(first.conversationId,{_id:'other',role:'user'},'all mills'),null);
});
test('successful reports retain context for a date-only follow-up',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'orders of randhir industries this month',requestingUser:user});
 const next=await ask({message:'what about last month?',conversationId:first.conversationId,requestingUser:user});
 const q=calls.filter(c=>c[0]==='orders').at(-1)[1];
 assert.equal(q.companyName.$regex,'randhir industries');assert.equal(q.orderDate.from,'2026-09-01');
 assert.equal(next.intent,'sales_orders');
});
test('both employee context survives a subsequent date-only location request',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'Deepak location today',requestingUser:user});
 const both=await ask({message:'both',conversationId:first.conversationId,requestingUser:user});
 await ask({message:'yesterday',conversationId:both.conversationId,requestingUser:user});
 const history=calls.filter(c=>c[0]==='locationHistory').slice(-2);
 assert.deepEqual(history.map(c=>c[1].id).sort(),['d1','d2']);assert.ok(history.every(c=>c[1].query.date==='2026-10-26'));
});
test('new explicit topic clears successful report context',async()=>{
 const {ask,calls}=fixture();const first=await ask({message:'Deepak Arya attendance today',requestingUser:user});
 await ask({message:'sales this month',conversationId:first.conversationId,requestingUser:user});
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].salesPersonId,undefined);
});
test('date follow-up for regular users remains scoped to their own records',async()=>{
 const own={_id:'own',role:'user'};const {ask,calls}=fixture();const first=await ask({message:'my pending orders today',requestingUser:own});
 await ask({message:'last month',conversationId:first.conversationId,requestingUser:own});
 assert.equal(calls.filter(c=>c[0]==='orders').at(-1)[1].salesPersonId,'own');
});
