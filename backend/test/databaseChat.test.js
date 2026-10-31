const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/databaseChatFixture');

const md = {_id:'md',role:'super_admin'};
test('sales queries bypass AI and use resolved period', async () => {
 const {ask,calls} = fixture(); const r = await ask({message:'sales today',requestingUser:md});
 assert.match(r.answer,/1,234/); assert.equal(r.provider,'local');
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].dateFrom,'2026-10-27'); assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].forceRefresh,true);
});
test('admin is conservatively self scoped', async () => {
 const {ask,calls}=fixture(); await ask({message:'sales today',requestingUser:{_id:'a',role:'admin'}});
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].requestingUser.role,'user'); assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].requestingUser._id,'a');
});
test('ambiguous employee names request clarification without timesheet lookup', async () => {
 const {ask,calls}=fixture(); const r=await ask({message:'Deepak timesheet today',requestingUser:md});
 assert.match(r.answer,/Which employee/); assert.equal(calls.length,1);
});
test('dispatch plans constrain estimated ship date and user ownership', async () => {
 const {ask,calls}=fixture(); await ask({message:'dispatch plan today',requestingUser:{_id:'u',role:'user'}});
 assert.equal(calls.find(c=>c[0]==='plan')[1].salesPersonId,'u'); assert.equal(calls.find(c=>c[0]==='plan')[1].$or[0].estimatedShipDate.from,'2026-10-27');
});
test('invalid explicit dates and unsupported requests never query data', async () => {
 const {ask,calls}=fixture(); assert.match((await ask({message:'sales 2026-02-30',requestingUser:md})).answer,/valid dates/);
 assert.match((await ask({message:'write a poem',requestingUser:md})).answer,/disabled/); assert.equal(calls.length,0);
});
test('unauthenticated callers rejected', async () => {
 await assert.rejects(fixture().ask({message:'sales today'}), /Authentication/);
});
test('full employee name resolves despite shared first name', async () => {
 const {ask,calls}=fixture(); await ask({message:'Deepak Arya timesheet today',requestingUser:md});
 assert.equal(calls[1][0],'getTimesheets'); assert.equal(calls[1][1].employeeId,'d1');
});
test('unsupported calculations do not produce misleading totals', async () => {
 const {ask,calls}=fixture(); const r=await ask({message:'sales profit today',requestingUser:md});
 assert.match(r.answer,/not supported/); assert.equal(calls.length,0);
});
test('screenshot revenue question uses rolling month and approved sales', async () => {
 const {ask,calls}=fixture(); const result=await ask({message:'what is revenue of last one month',requestingUser:md});
 const args=calls.find(c=>c[0]==='getSalesSummary')[1];
 assert.equal(args.dateFrom,'2026-09-27'); assert.equal(args.dateTo,'2026-10-27');
 assert.match(result.answer,/booked sales/);
});
test('pending and rejected filters use actual schema approval states', async () => {
 for(const [word,states] of [['pending',['pending_admin_review','pending_manager_approval']],['rejected',['rejected_by_admin','rejected_by_manager']]]) {
  const {ask,calls}=fixture(); await ask({message:`list ${word} sales orders this month`,requestingUser:{_id:'u',role:'user'}});
  const query=calls.find(c=>c[0]==='orders')[1];
  assert.equal(query.salesPersonId,'u'); assert.deepEqual(Array.from(query.approvalStatus.$in),states);
 }
});
test('employee sales uses resolved employee id', async () => {
 const {ask,calls}=fixture(); await ask({message:'Deepak Arya sales this month',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].salesPersonId,'d1');
});
test('payment collection questions never get misrepresented as account balances', async () => {
 const {ask,calls}=fixture(); const result=await ask({message:'payments received today',requestingUser:md});
 assert.match(result.answer,/Payments received/);assert.ok(calls.some(c=>c[0]==='ledgerReport'));
});
test('superadmin my sales remains self scoped', async () => {
 const {ask,calls}=fixture(); const result=await ask({message:'my sales this month',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='getSalesSummary')[1].salesPersonId,'md');
 assert.match(result.answer,/Your records only/);
});
test('Faridabad order detail queries address and returns a list rather than totals', async () => {
 const {ask,calls}=fixture();const result=await ask({message:'the order detail from the faridabad this month',requestingUser:md});
 const q=calls.find(c=>c[0]==='orders')[1];
 assert.equal(q.companyAddress.$regex,'faridabad');assert.equal(q.companyAddress.$options,'i');
 assert.match(result.answer,/Address filter/);assert.equal(calls.some(c=>c[0]==='getSalesSummary'),false);
});
test('location order queries retain nonmanagement scope', async () => {
 const {ask,calls}=fixture();await ask({message:'order details from Faridabad this month',requestingUser:{_id:'u',role:'user'}});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.salesPersonId,'u');assert.equal(q.companyAddress.$regex,'faridabad');
});
test('mill orders use steelMill and no implicit today filter', async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'the order in keshri alloy mill',requestingUser:md});
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.$or[0].steelMill,'Kesari Alloys - Bhiwadi');assert.equal('orderDate' in q,false);
 assert.equal('companyAddress' in q,false);assert.match(r.answer,/all recorded dates/);assert.match(r.answer,/Kesari Alloys/);
});
test('mill order query still enforces employee scope', async()=>{
 const {ask,calls}=fixture();await ask({message:'Kesari Alloys orders this month',requestingUser:{_id:'u',role:'user'}});
 assert.equal(calls.find(c=>c[0]==='orders')[1].salesPersonId,'u');
});
test('management and logistics analysis reject ordinary users before analytics',async()=>{
 for(const message of ['management analysis this month','logistics analysis this month']) {
 const {ask,calls}=fixture();const r=await ask({message,requestingUser:{_id:'u',role:'user'}});
 assert.match(r.answer,/superadmin only/);assert.equal(calls.some(c=>/Analytics/.test(c[0])),false);
 }
});
test('management report reuses existing monthly analytics with mill filter',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'management analysis Kesari Alloys this month',requestingUser:md});
 const args=calls.find(c=>c[0]==='managementAnalytics')[1];assert.equal(args.month,'2026-10');assert.equal(args.steelMill,'Kesari Alloys - Bhiwadi');assert.match(r.answer,/Unresolved quantity records: 1/);
});
test('logistics report reuses module plan and dispatch totals',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'logistics analysis this month',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='logisticsAnalytics')[1].month,'2026-10');assert.match(r.answer,/Target pending: 600 KG/);
});
test('delivered dispatch list retains status and user filters',async()=>{
 const {ask,calls}=fixture();await ask({message:'list delivered dispatches this month',requestingUser:{_id:'u',role:'user'}});
 const q=calls.find(c=>c[0]==='dispatchOrders')[1];assert.equal(q.dispatchStatus,'delivered');assert.equal(q.salesPersonId,'u');
});
test('quoted company filter is not mistaken for an employee',async()=>{
 const {ask,calls}=fixture();await ask({message:'orders for company "Example Engineering" this month',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='orders')[1].companyName.$regex,'example engineering');
});
test('mill revenue applies mill and approved status without a hidden date restriction',async()=>{
 const {ask,calls}=fixture();await ask({message:'Kesari Alloys total sales',requestingUser:md});
 const match=calls.find(c=>c[0]==='salesAggregate')[1][0].$match;
 assert.equal(match.approvalStatus,'approved');assert.equal(match.$or[0].steelMill,'Kesari Alloys - Bhiwadi');assert.equal('orderDate' in match,false);
});
test('city and mill filters combine rather than dropping the city',async()=>{
 const {ask,calls}=fixture();await ask({message:'Kesari Alloys order details from Faridabad this month',requestingUser:md});
 const query=calls.find(c=>c[0]==='orders')[1];assert.equal(query.companyAddress.$regex,'faridabad');assert.equal(query.$or[0].steelMill,'Kesari Alloys - Bhiwadi');
});
test('screenshot question returns saved attendance check-in times in IST',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'tell me all person tadays attendace check in time',requestingUser:md});
 const q=calls.find(c=>c[0]==='attendanceRecords')[1];assert.equal('employeeId' in q,false);
 assert.match(r.answer,/Shalu/);assert.match(r.answer,/09:30 am IST/i);assert.match(r.answer,/Check out: Not recorded/);assert.doesNotMatch(r.answer,/one city/);
});
test('all persons phrasing cannot broaden ordinary user access',async()=>{
 const {ask,calls}=fixture();await ask({message:'all persons attendance check in time today',requestingUser:{_id:'u',role:'user'}});
 assert.equal(calls.find(c=>c[0]==='attendanceRecords')[1].employeeId,'u');
});
test('screenshot customer overdue request executes ledger report, preserving period and contact detail',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'over due payment detail with customer detail for last 3 month',requestingUser:md});
 const pipeline=calls.find(c=>c[0]==='ledgerReport')[1];
 assert.equal(pipeline[2].$match['pendingAmount'].$gt,0);
 assert.equal(pipeline[2].$match['invoiceDate'].$gte.toISOString(),'2026-07-26T18:30:00.000Z');
 assert.match(r.answer,/Accounts/);assert.match(r.answer,/9000000000/);assert.doesNotMatch(r.answer,/not supported/);
});
test('amount-filtered ledger report reaches execution through numeric validation',async()=>{
 const {ask,calls}=fixture();await ask({message:'overdue invoice detail outstanding above 1 lakh last 3 months',requestingUser:{_id:'u',role:'user'}});
 const p=calls.find(c=>c[0]==='ledgerReport')[1];assert.equal(p[0].$match.salesPersonId,'u');
 assert.equal(p[2].$match.$and[1]['pendingAmount'].$gt,100000);
});
test('plain today attendance returns check-in detail',async()=>{
 const {ask}=fixture();const r=await ask({message:'todays attendace',requestingUser:md});assert.match(r.answer,/Shalu/);assert.match(r.answer,/09:30 am IST/i);assert.match(r.answer,/In progress/);
});
test('explicit attendance count returns summary rather than detail cards',async()=>{
 const {ask}=fixture();const r=await ask({message:'attendance count today',requestingUser:md});assert.match(r.answer,/Attendance summary/);assert.match(r.answer,/Matching records: 1/);assert.doesNotMatch(r.answer,/Check in:/);
});
test('individual without an employee or grouping asks rather than returning all',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'individual overdue payment details last 3 months',requestingUser:md});assert.match(r.answer,/salesperson-wise breakdown/);assert.equal(calls.some(c=>c[0]==='ledgerReport'),false);
});
test('salesperson-wise sales query uses grouped report',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'sales this month by sales person',requestingUser:md});assert.match(r.answer,/salesperson wise/);assert.ok(calls.some(c=>c[0]==='orders'));
});
test('customer-wise sales grouping does not treat the grouping word as an unknown customer filter',async()=>{
 const {ask}=fixture();const r=await ask({message:'sales this month customer wise',requestingUser:md});assert.match(r.answer,/customer wise/);assert.doesNotMatch(r.answer,/not supported/);
});
