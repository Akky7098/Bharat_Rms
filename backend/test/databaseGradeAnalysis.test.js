const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/databaseChatFixture');
const {parseQuestion}=require('../services/bharat-ai/router/databaseQuestionParser');
const {gradeAnalysis}=require('../services/bharat-ai/reports/gradeAnalysis');
const {extractSalesOrderItems}=require('../services/managementOrderAnalyticsService');
const {reportCapabilityError}=require('../services/bharat-ai/router/reportCapabilities');
const {materialGrade}=require('../services/bharat-ai/reports/materialGrade');
const md={_id:'md',role:'super_admin'};
const base={isActive:true,approvalStatus:'approved',salesPersonId:'own',companyName:'RECTECH SOLUTIONS',orderDate:new Date('2026-10-10')};
const orders=[
 {...base,_id:'1',sizeGradeQuantityRate:'EN19 - Qty 100 KG; EN19 - Qty 50 KG; EN353 - Qty 2 MT'},
 {...base,_id:'2',sizeGradeQuantityRate:'EN19 - Qty 200 KG'},
 {...base,_id:'3',sizeGradeQuantityRate:'EN353 - quantity not recorded'},
 {...base,_id:'4',sizeGradeQuantityRate:'material not recorded'},
 {...base,_id:'5',approvalStatus:'pending_manager_approval',sizeGradeQuantityRate:'H13 - Qty 9000 KG'},
 {...base,_id:'6',companyName:'OTHER COMPANY',sizeGradeQuantityRate:'DB6 - Qty 9000 KG'},
 {...base,_id:'7',isActive:false,sizeGradeQuantityRate:'H13 - Qty 9000 KG'},
 {...base,_id:'8',salesPersonId:'other',sizeGradeQuantityRate:'D2 - Qty 3000 KG',orderDate:new Date('2026-09-01')}
];
for(const [line,expected] of [
 ['EN31 - 275 X 205 X 20TH - 2 nos. @ 100/kg + GST','EN31'],
 ['EN31, 275 X 205 X 20TH, Qty 1,000 KG','EN31'],
 ['EN31/275 X 205 X 20TH','EN31'],
 ['EN31-275 X 205 X 20TH','EN31'],
 ['D2/1.2379 - 340 X 255 X 40 TH - 1 nos.@ 385/kg + GST','D2'],
 ['en 31 — Qty 100 KG','EN31'],['DIN 1.2379 - Qty 50 KG','DIN1.2379'],
 ['1.2379 - Qty 50 KG','DIN1.2379'],['42CrMo4 - Qty 50 KG','42CRMO4']
 ,['1.C45, 2000*6300*32mm ,Qty= 01 NOS --80/- Per Kg','C45']
 ,['2.C45, 2000*6300*25mm ,Qty= 01 NOS --80/- Per Kg','C45']
 ,['1 EN24 Rough Size Dia-310*2415mm Qty-02 NOS @135/-Kg + Gst','EN24']
])test(`leading material grade: ${line}`,()=>{
 const item=extractSalesOrderItems({sizeGradeQuantityRate:line})[0];assert.equal(materialGrade(item).grade,expected);
});
test('screenshot material lines count each grade once per order and ignore make notes',async()=>{
 const material='EN31 - 275 X 205 X 20TH - 2 nos. @ 100/kg + GST\nEN31 - 155 X 205 X 20TH - 2 nos. @ 100/kg + GST\nMAKE - SBE, GERMANY\nD2/1.2379 - 340 X 255 X 40 TH - 1 nos.@ 385/kg + GST\nD2/1.2379 - 155 X 255 X 40 TH - 1 nos.@ 385/kg + GST';
 const {ask}=fixture({orders:[{...base,_id:'screenshot',sizeGradeQuantityRate:material}]});
 const r=await ask({message:'top grades for Rectech Solutions',requestingUser:md});
 assert.match(r.answer,/EN31\nOrders containing grade: 1/);assert.match(r.answer,/D2\nOrders containing grade: 1/);
 assert.match(r.answer,/Orders with missing\/unidentified grades: 0/);assert.doesNotMatch(r.answer,/### \d+\. MAKE/);
});
test('comma quantity thousands separator is not treated as a new material line',()=>{
 const items=extractSalesOrderItems({sizeGradeQuantityRate:'EN31, Qty 1,000 KG'});
 assert.equal(items.length,1);assert.equal(items[0].quantityKG,1000);assert.equal(materialGrade(items[0]).grade,'EN31');
});
for(const question of [
 'can you tell me like what grade mostly rectech solutions give order ??',
 'top grades for Rectech Solutions',
 'which grade does Rectech Solutions order most?',
 'most ordered grades for company "Rectech Solutions"',
 'grade wise breakdown for Rectech Solutions'
])test(`grade family: ${question}`,async()=>{
 const p=parseQuestion(question);assert.equal(p.intent,'grade_analysis');assert.equal(p.entities.company,'rectech solutions');
 const {ask}=fixture({orders,realDates:true});const r=await ask({message:question,requestingUser:md});
 assert.equal(r.toolsUsed[0].name,'grade_analysis');assert.match(r.answer,/Grade ordering patterns/);
 assert.match(r.answer,/Leading grades \(tied\): EN19, EN353/);assert.doesNotMatch(r.answer,/Total Sales|H13|DB6/);
 assert.match(r.answer,/Orders with missing\/unidentified grades: 1/);
 assert.match(r.answer,/unresolved quantity: 1/);
});
test('quantity ranking differs from frequency and converts MT without duplicate order counts',async()=>{
 const {ask}=fixture({orders,realDates:true});const r=await ask({message:'top grades by quantity for company "Rectech Solutions" this month',requestingUser:md});
 assert.match(r.answer,/Leading grade: EN353/);assert.match(r.answer,/Parsed quantity: 2,000 KG/);
 assert.match(r.answer,/EN19\nOrders containing grade: 2\nParsed quantity: 350 KG/);
 assert.doesNotMatch(r.answer,/### \d+\. D2\n/);
});
test('company-wide KG ranking does not mistake its metric for an employee',async()=>{
 const {ask}=fixture({orders,realDates:true});const r=await ask({message:'top grades by quantity this month',requestingUser:md});
 assert.equal(r.toolsUsed[0].name,'grade_analysis');assert.match(r.answer,/Ranked by safely parsed quantity/);
});
test('DB6 quantity screenshot does not query company address and excludes other material grades',async()=>{
 const {ask,calls}=fixture({orders:[{...base,_id:'db6',sizeGradeQuantityRate:'MAKE - INDIAN\n1. DB6 - Qty 7742 KG\n2. EN19 - Qty 500 KG'}],realDates:true});
 const r=await ask({message:'total db6 order this month tell qunatity in kg',requestingUser:md});
 assert.equal(r.intent,'grade_analysis');assert.match(r.answer,/Total parsed quantity: 7,742 KG/);
 assert.match(r.answer,/Orders containing parsed grade: 1/);assert.doesNotMatch(r.answer,/Address filter|Total Sales|### \d+\. EN19/);
 const q=calls.find(c=>c[0]==='orders')[1];assert.equal(q.companyAddress,undefined);assert.equal(q.orderDate.$gte.toISOString(),'2026-09-30T18:30:00.000Z');
});
for(const unit of ['kg','kgs','kilograms','MT','tonnes'])test(`quantity unit ${unit} is never parsed as an address`,()=>{
 const p=parseQuestion(`total DB6 order this month quantity in ${unit}`);assert.equal(p.intent,'grade_analysis');assert.equal(p.location,undefined);
});
for(const spelling of ['DIN 1.2714','DIN1.2714','DIN.1.2714','1.2714'])test(`DIN quantity request and stored aliases: ${spelling}`,async()=>{
 const material=['DIN 1.2714 - Qty 100 KG','DIN1.2714 - Qty 200 KG','DIN.1.2714 - Qty 300 KG','1.2714 - Qty 400 KG'];
 const {ask,calls}=fixture({orders:material.map((line,i)=>({...base,_id:String(i),sizeGradeQuantityRate:line+'\nEN19 - Qty 500 KG'})),realDates:true});
 const r=await ask({message:`total ${spelling} order this month tell qunatity in kg`,requestingUser:md});
 assert.equal(r.intent,'grade_analysis');assert.match(r.answer,/Grade text: DIN1\.2714/);
 assert.match(r.answer,/Total parsed quantity: 1,000 KG/);assert.match(r.answer,/Orders containing parsed grade: 4/);
 assert.doesNotMatch(r.answer,/Approved sales order value|Address filter|### \d+\. EN19/);
 assert.equal(calls.some(c=>c[0]==='getSalesSummary'),false);
});
test('plural customer wording matches stored SOLUTION LLP and shows actual company and winning count',async()=>{
 const {ask}=fixture({orders:[{...base,_id:'a',companyName:'RECTECH SOLUTION LLP',sizeGradeQuantityRate:'EN31 - Qty 100 KG'},
 {...base,_id:'b',companyName:'RECTECH SOLUTION LLP',sizeGradeQuantityRate:'EN31 - Qty 50 KG; D2/1.2379 - Qty 200 KG'},
 {...base,_id:'c',companyName:'OTHER SOLUTION LLP',sizeGradeQuantityRate:'H13 - Qty 100 KG'}]});
 const r=await ask({message:'which grade has highest orders for company "rectech solutions"',requestingUser:md});
 assert.match(r.answer,/Matched company names: RECTECH SOLUTION LLP/);assert.match(r.answer,/Leading grade: EN31/);
 assert.match(r.answer,/Highest order count: 2 orders/);assert.doesNotMatch(r.answer,/H13/);
});
test('exact screenshot spelling rechtech solutions resolves verified Rectech customer',async()=>{
 const {ask}=fixture({orders:[{...base,_id:'a',companyName:'RECTECH SOLUTION LLP',sizeGradeQuantityRate:'1.C45, Qty 100 KG'},
 {...base,_id:'b',companyName:'OTHER SOLUTION LLP',sizeGradeQuantityRate:'H13 - Qty 100 KG'}]});
 const r=await ask({message:'can you tell me like what grade mostly rechtech solutions give order ??',requestingUser:md});
 assert.match(r.answer,/Matched company names: RECTECH SOLUTION LLP/);assert.match(r.answer,/Leading grade: C45/);
 assert.match(r.answer,/Matching orders: 1/);assert.doesNotMatch(r.answer,/H13/);
});
test('numbered customer material descriptions produce five C45 orders and one EN24 order',async()=>{
 const lines=['1.C45, 2000*6300*32mm ,Qty= 01 NOS --80/- Per Kg',
 '1.C45, 2000*6300*25mm ,Qty= 01 NOS --80/- Per Kg',
 '1 EN24 Rough Size Dia-310*2415mm Qty-02 NOS @135/-Kg + Gst',
 '1.C45, 2000*6300*25mm ,Qty= 01 NOS --82/- Per Kg\n2.C45, 2000*6300*32mm ,Qty= 02 NOS --82/- Per Kg',
 '1.C45, 32*2000*6300 MM Qty= 02 NOS 83/-Kg Gst + Extra\n2.C45, 16*2000*6300 MM Qty= 01 NOS 83/-Kg Gst + Extra',
 '1.C45, 32*2000*6300 MM Qty= 02 NOS 85/-Kg Gst + Extra'];
 const {ask}=fixture({orders:lines.map((line,i)=>({...base,_id:String(i),companyName:'RECTECH SOLUTION LLP',sizeGradeQuantityRate:line}))});
 const r=await ask({message:'what grade mostly rectech solutions give order',requestingUser:md});
 assert.match(r.answer,/Matching orders: 6/);assert.match(r.answer,/Leading grade: C45/);assert.match(r.answer,/Highest order count: 5 orders/);
 assert.match(r.answer,/C45\nOrders containing grade: 5/);assert.match(r.answer,/EN24\nOrders containing grade: 1/);
 assert.match(r.answer,/Orders with missing\/unidentified grades: 0/);
});
for(const word of ['higher','highest','maximum','max'])test(`grade ranking phrase ${word}`,()=>{
 assert.equal(parseQuestion(`which grade has ${word} orders`).intent,'grade_analysis');
});
for(const role of ['user','admin'])test(`grade report enforces ${role} scope`,async()=>{
 const {ask,calls}=fixture({orders,realDates:true});const r=await ask({message:'top grades for Rectech Solutions',requestingUser:{_id:'own',role}});
 assert.equal(calls.find(c=>c[0]==='orders')[1].salesPersonId,'own');assert.doesNotMatch(r.answer,/### \d+\. D2\n/);
});
test('empty customer never falls back to global grades',async()=>{
 const {ask}=fixture({orders});const r=await ask({message:'top grades for company "Missing"',requestingUser:md});
 assert.match(r.answer,/Matching orders: 0/);assert.match(r.answer,/Grade extraction has not run/);assert.doesNotMatch(r.answer,/EN19/);
});
test('ranking cap refuses partial statistics',async()=>{
 const model={find:()=>({select(){return this;},sort(){return this;},limit(n){assert.equal(n,1001);return this;},maxTimeMS(){return this;},lean:async()=>Array(1001).fill({})})};
 const r=await gradeAnalysis({model,query:{},extractItems:()=>{throw new Error('must not compute truncated ranks');}});
 assert.match(r,/no partial ranking/);
});
for(const question of ['most profitable orders this month','average dispatch quantity today','order tracking driver details','sales order number BST-2026-42','what grade does someone unknown buy?','pending grade wise order breakdown','top grades by value'])test(`unsupported semantics do not produce unrelated totals: ${question}`,()=>{
 const p=parseQuestion(question);assert.ok(p.validationError || reportCapabilityError(p));
});
test('legacy free text fallback words are disclosed as unresolved rather than invented grades',async()=>{
 const model={find:()=>({select(){return this;},sort(){return this;},limit(){return this;},maxTimeMS(){return this;},lean:async()=>[{sizeGradeQuantityRate:'material not recorded'}]})};
 const r=await gradeAnalysis({model,query:{},extractItems:extractSalesOrderItems});assert.match(r,/No safely recognized grades/);assert.doesNotMatch(r,/### 1\./);
});
for(const question of [
 'top 5 orders this month','highest overdue payment today','average payment received this month',
 'stock sales orders today','salary paid today','sales orders with remaining quantity',
 'sales orders shipping address','lost reasons for enquiries','orders with hardness results',
 'which employees have missing timesheets','orders with credit limit','inventory orders this month'
])test(`unsupported request stops before any business query: ${question}`,async()=>{
 const {ask,calls}=fixture();const r=await ask({message:question,requestingUser:md});
 assert.equal(r.toolsUsed.length,0);assert.equal(calls.length,0);assert.doesNotMatch(r.answer,/Total Sales:|Matching orders:|₹/);
});
