const test=require('node:test');const assert=require('node:assert/strict');
const {parseQuestion}=require('../services/bharat-ai/router/databaseQuestionParser');
const {planLedgerReport,compileLedgerReport,executeLedgerReport}=require('../services/bharat-ai/reports/ledgerReport');
const {queryReport}=require('../services/bharat-ai/reports/queryReport');
const {reportModel}=require('./helpers/reportModel');
const now=new Date('2026-10-27T06:00:00Z'),user={_id:'u',role:'user'};
const inv=(number,date,due,amount,pending,status='pending')=>({invoiceNumber:number,invoiceDate:new Date(date),dueDate:new Date(due),invoiceAmount:amount,pendingAmount:pending,receivedAmount:amount-pending,status});
const records=[{_id:'a',isActive:true,companyName:'Example Engineering',salesPersons:[{userId:'u'}],contactPersonName:'Accounts A',contactPersonNumber:'9000000000',contactPersonEmail:'accounts@example.test',invoices:[
 inv('A-1','2026-08-01','2026-09-01',100,100),inv('A-2','2026-10-01','2026-10-20',200,50,'partial'),
 inv('A-3','2026-10-01','2026-11-01',90,90),inv('A-4','2026-10-01','2026-10-20',10,10,'written_off'),
 inv('A-5','2026-10-01','2026-10-20',100,0,'paid'),inv('OLD','2026-07-01','2026-07-20',70,70),
 inv('TODAY','2026-10-01','2026-10-27',40,40)],paymentReceipts:[{receiptNumber:'R-1',receiptDate:new Date('2026-10-02'),amount:500,paymentMode:'upi'},{receiptNumber:'OLD',receiptDate:new Date('2026-06-01'),amount:300}]},
 {_id:'b',isActive:true,companyName:'Other Owner',salesPersons:[{userId:'other'}],invoices:[inv('B','2026-08-01','2026-09-01',999,999)]},
 {_id:'c',isActive:false,companyName:'Inactive',salesPersons:[{userId:'u'}],invoices:[inv('C','2026-08-01','2026-09-01',777,777)]}];
const dispatchRecords=records.flatMap(ledger=>ledger.invoices.map((i,index)=>({
 _id:`${ledger._id}-${index}`,isActive:ledger.isActive,companyName:ledger.companyName,salesPersonId:ledger.salesPersons[0].userId,
 contactPersonName:ledger.contactPersonName,contactPersonNumber:ledger.contactPersonNumber,contactPersonEmail:ledger.contactPersonEmail,
 invoiceNumber:i.invoiceNumber,invoiceDate:i.invoiceDate,paymentDueDate:i.dueDate,invoiceValue:i.invoiceAmount,paidAmount:i.receivedAmount,pendingAmount:i.pendingAmount,paymentStatus:i.status==='overdue'?'pending':i.status,
 dispatchStatus:i.status==='written_off'?'cancelled':'delivered',paymentHistory:index===0?(ledger.paymentReceipts || []).map(r=>({amount:r.amount,receivedAt:r.receiptDate})):[]
})));
const plan=text=>planLedgerReport(parseQuestion(text,now));
test('screenshot request returns customer details and correct scoped, current overdue total',async()=>{
 const p=plan('over due payment detail with customer detail for last 3 month');
 assert.equal(p.kind,'invoices');assert.equal(p.status,'overdue');
 const r=await executeLedgerReport(p,{user,model:reportModel(dispatchRecords),now});
 assert.match(r.answer,/Matching invoices: 2/);assert.match(r.answer,/Current outstanding: ₹150/);assert.match(r.answer,/Invoice value: ₹300/);
 assert.match(r.answer,/Accounts A/);assert.match(r.answer,/9000000000/);assert.doesNotMatch(r.answer,/Other Owner|Inactive|OLD|TODAY/);
 assert.match(r.answer,/invoiceDate \(2026-07-27 to 2026-10-27\)/);
});
test('superadmin includes company scope while named employee filter narrows it',async()=>{
 const p=plan('overdue invoice details last 3 months');
 const all=await executeLedgerReport(p,{user:{_id:'md',role:'super_admin'},model:reportModel(dispatchRecords),now});assert.match(all.answer,/Matching invoices: 3/);assert.match(all.answer,/Current outstanding: ₹1,149/);
 const scoped=await executeLedgerReport(p,{user:{_id:'md',role:'super_admin'},employeeId:'u',model:reportModel(dispatchRecords),now});assert.match(scoped.answer,/Matching invoices: 2/);
});
test('receipt period totals use receiptDate and receipt amount rather than invoice balance',async()=>{
 const r=await executeLedgerReport(plan('total payments received last 3 months'),{user,model:reportModel(dispatchRecords),now});
 assert.match(r.answer,/paymentHistory.receivedAt/);assert.match(r.answer,/Received amount: ₹500/);assert.doesNotMatch(r.answer,/Current outstanding/);
});
test('due-date basis is explicit and distinct from invoice-date basis',async()=>{
 const p=plan('overdue invoice details due date last month');assert.equal(p.dateField,'dueDate');
 const r=await executeLedgerReport(p,{user,model:reportModel(dispatchRecords),now});assert.match(r.answer,/Matching invoices: 1/);assert.match(r.answer,/Current outstanding: ₹100/);
});
test('escaped company filter remains literal and cannot broaden access',()=>{
 const p=plan('overdue invoice details for company "A+B.*" last month');
 const pipeline=compileLedgerReport(p,{user,now});assert.equal(pipeline[0].$match.companyName.$regex,'a\\+b\\.\\*');assert.equal(pipeline[0].$match.salesPersonId,'u');
});
test('list cap never caps the displayed count or aggregate amount',async()=>{
 const model=reportModel(Array.from({length:125},(_,i)=>({_id:i,owner:'u',value:10})));
 const r=await queryReport(model,{owner:'u'},{fields:'value',sort:{_id:1},metrics:{value:'value'}});
 assert.equal(r.records.length,50);assert.equal(r.summary.count,125);assert.equal(r.summary.value,1250);
});
test('count report has totals but no invoice list',async()=>{
 const r=await executeLedgerReport(plan('count overdue invoices last 3 months'),{user,model:reportModel(dispatchRecords),now});
 assert.match(r.answer,/Matching invoices: 2/);assert.doesNotMatch(r.answer,/### Example Engineering/);
});
test('numeric comparisons compose with overdue status and ownership',async()=>{
 const p=plan('overdue invoice details outstanding above 60 last 3 months');
 assert.ok(p.numericOnly);assert.equal(p.numericFilters[0].field,'outstanding');
 const r=await executeLedgerReport(p,{user,model:reportModel(dispatchRecords),now});assert.match(r.answer,/Matching invoices: 1/);assert.match(r.answer,/Current outstanding: ₹100/);
});
test('unsupported Dispatch payment mode is clarified rather than invented',()=>{assert.match(plan('payment received details upi last 3 months').error,/does not store/);});
test('Indian amount units are numerical filters, not string matches',()=>{
 const p=plan('overdue invoice details outstanding above 1.5 lakh last 3 months');
 assert.equal(p.numericFilters[0].value,150000);
});
test('contradictory numeric conditions do not overwrite one another',async()=>{
 const p=plan('overdue invoice details outstanding above 100 outstanding below 50 last 3 months');
 const r=await executeLedgerReport(p,{user,model:reportModel(dispatchRecords),now});assert.match(r.answer,/Matching invoices: 0/);
});
test('revised future due date prevents an invoice being counted as overdue',async()=>{
 const rows=[{...dispatchRecords[0],revisedPaymentDueDate:new Date('2026-11-01')}];
 const r=await executeLedgerReport(plan('overdue payment details last 3 months'),{user,model:reportModel(rows),now});assert.match(r.answer,/Matching invoices: 0/);
});
test('revised past due date overrides an original future date',async()=>{
 const rows=[{...dispatchRecords[2],revisedPaymentDueDate:new Date('2026-10-20')}];
 const r=await executeLedgerReport(plan('overdue payment details last 3 months'),{user,model:reportModel(rows),now});assert.match(r.answer,/Matching invoices: 1/);assert.match(r.answer,/Current outstanding: ₹90/);
});
test('multiple payment-history entries count their amounts once per installment',async()=>{
 const row={...dispatchRecords[0],paymentHistory:[{amount:20,receivedAt:new Date('2026-10-01')},{amount:30,receivedAt:new Date('2026-10-02')}],paidAmount:70};
 const r=await executeLedgerReport(plan('total payments received this month'),{user,model:reportModel([row]),now});assert.match(r.answer,/Received amount: ₹50/);assert.match(r.answer,/Matching receipts: 2/);assert.match(r.answer,/Customers: 1/);
});
test('salesperson-wise invoice groups reconcile to overall totals and retain customer detail',async()=>{
 const rows=dispatchRecords.map(r=>({...r,salesPersonName:r.salesPersonId==='u'?'Shalu':'Renu'}));
 const p=plan('over due payment detail with customer detail for last 3 month as per sales person wise');
 assert.equal(p.groupBy,'salesperson');
 const pipeline=compileLedgerReport(p,{user:{_id:'md',role:'super_admin'},now});
 const [data]=await reportModel(rows).aggregate(pipeline).option({});
 assert.equal(data.groups.length,2);assert.equal(data.groups.reduce((n,g)=>n+g.outstanding,0),data.summary[0].outstanding);
 const r=await executeLedgerReport(p,{user:{_id:'md',role:'super_admin'},model:reportModel(rows),now});
 assert.match(r.answer,/### Shalu/);assert.match(r.answer,/### Renu/);assert.match(r.answer,/Accounts A/);assert.match(r.answer,/Outstanding: ₹150/);assert.match(r.answer,/Outstanding: ₹999/);
});
test('salesperson grouping cannot expand regular-user scope',async()=>{
 const rows=dispatchRecords.map(r=>({...r,salesPersonName:r.salesPersonId==='u'?'Shalu':'Renu'}));
 const r=await executeLedgerReport(plan('overdue payment details salesperson wise last 3 months'),{user,model:reportModel(rows),now});
 assert.match(r.answer,/### Shalu/);assert.doesNotMatch(r.answer,/### Renu/);
});
test('customer-wise grouping is a separate presentation',async()=>{
 const p=plan('overdue payment details customer wise last 3 months');assert.equal(p.groupBy,'customer');
 const r=await executeLedgerReport(p,{user,model:reportModel(dispatchRecords),now});assert.match(r.answer,/Grouped by customer/);assert.match(r.answer,/### Example Engineering/);
});
test('shared grouped-list helper reconciles salesperson groups',async()=>{
 const rows=[{salesPersonId:'a',salesPersonName:'Alice',value:10},{salesPersonId:'a',salesPersonName:'Alice',value:20},{salesPersonId:'b',salesPersonName:'Bob',value:40}];
 const r=await queryReport(reportModel(rows),{},{fields:'value',sort:{value:-1},metrics:{value:'value'},groupBy:{field:'salesPersonId',nameField:'salesPersonName'}});
 assert.equal(r.summary.value,70);assert.equal(r.groups.length,2);assert.equal(r.groups.find(g=>g.name==='Alice').value,30);assert.equal(r.groups.find(g=>g.name==='Bob').value,40);
});
