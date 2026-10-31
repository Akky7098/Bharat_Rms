const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {statuses}=require('../services/bharat-ai/router/trackingStatusParser');
const {parseQuestion}=require('../services/bharat-ai/router/databaseQuestionParser');
const {fixture}=require('./helpers/databaseChatFixture');
const md={_id:'md',role:'super_admin'};
test('status allowlist matches the OrderTracking model',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../model/OrderTracking.js'),'utf8');
 const block=source.match(/const TRACKING_STATUSES = \[([\s\S]*?)\];/)[1];
 assert.deepEqual(statuses,[...block.matchAll(/"([a-z_]+)"/g)].map(m=>m[1]));
});
for(const status of statuses) test(`tracking state: ${status}`,()=>{
 const q=parseQuestion(`order tracking details ${status.replaceAll('_',' ')}`);assert.equal(q.intent,'tracking_orders');assert.equal(q.trackingStatus,status);
});
test('screenshot uses currentStatus and keeps only out-for-delivery orders',async()=>{
 const rows=[{_id:'a',isActive:true,trackingNumber:'TR-A',companyName:'Out Customer',salesPersonId:'u',currentStatus:'out_for_delivery'},
 {_id:'b',isActive:true,trackingNumber:'TR-B',companyName:'Delivered Customer',salesPersonId:'u',currentStatus:'delivered'}];
 const {ask,calls}=fixture({tracking:rows});const r=await ask({message:'the order detail which is out for delivery',requestingUser:md});
 assert.equal(calls.find(c=>c[0]==='plan')[1].currentStatus,'out_for_delivery');assert.match(r.answer,/Out Customer/);assert.doesNotMatch(r.answer,/Delivered Customer|full name/);
});
test('status words preserve real employee filters and user scope',async()=>{
 const {ask,calls}=fixture();await ask({message:'my orders out for delivery',requestingUser:{_id:'u',role:'user'}});
 const q=calls.find(c=>c[0]==='plan')[1];assert.equal(q.salesPersonId,'u');assert.equal(q.currentStatus,'out_for_delivery');
});
test('mill rolling and Dispatch delivered requests keep their domains',()=>{
 assert.equal(parseQuestion('Shakti Rolling orders').intent,'sales_orders');assert.equal(parseQuestion('delivered dispatch details').intent,'dispatch_orders');
});
test('cutting this month filters current stage and tracking creation date',async()=>{
 const row={isActive:true,salesPersonId:'u',currentStatus:'cutting',createdAt:new Date('2026-10-10T05:00:00Z')};
 const tracking=[{...row,trackingNumber:'MATCH',companyName:'October cutting'},
 {...row,trackingNumber:'OLD',companyName:'September cutting',createdAt:new Date('2026-09-30T18:29:59Z')},
 {...row,trackingNumber:'OTHER',companyName:'October rolling',currentStatus:'rolling'},
 {...row,trackingNumber:'INACTIVE',companyName:'Inactive cutting',isActive:false}];
 const {ask,calls}=fixture({tracking,realDates:true});
 const r=await ask({message:'which order are under cutting ?? this month',requestingUser:md});
 const q=calls.find(c=>c[0]==='plan')[1];
 assert.equal(q.currentStatus,'cutting');
 assert.equal(q.createdAt.$gte.toISOString(),'2026-09-30T18:30:00.000Z');
 assert.match(r.answer,/Matching tracking records: 1/);
 assert.match(r.answer,/### 1\. MATCH/);
 assert.match(r.answer,/tracking creation date: 2026-10-01 to 2026-10-27/);
 assert.doesNotMatch(r.answer,/September cutting|October rolling|Inactive cutting/);
});
test('dated tracking requests preserve worker scope and actual delivery dates',async()=>{
 const {ask,calls}=fixture();
 await ask({message:'my cutting orders this month',requestingUser:{_id:'u',role:'user'}});
 assert.equal(calls.find(c=>c[0]==='plan')[1].salesPersonId,'u');
 const delivery=fixture();await delivery.ask({message:'order tracking delivered this month',requestingUser:md});
 const q=delivery.calls.find(c=>c[0]==='plan')[1];assert.ok(q.actualDeliveryDate);assert.equal(q.createdAt,undefined);
});
test('historical stage-entry requests do not silently use creation dates',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'orders moved to cutting last month',requestingUser:md});
 assert.match(r.answer,/Historical stage transitions/);assert.equal(calls.some(c=>c[0]==='plan'),false);
});
test('truncated tracking list explains total and displayed counts before the records',async()=>{
 const tracking=Array.from({length:144},(_,i)=>({isActive:true,currentStatus:'cutting',trackingNumber:`TR-${i}`,companyName:`Customer ${i}`}));
 const {ask}=fixture({tracking});
 const r=await ask({message:'which orders are under cutting',requestingUser:md});
 assert.match(r.answer,/Matching tracking records: 144\nRecords displayed: 50/);
 assert.match(r.answer,/Displaying records 1–50 of 144 matches\. 94 additional matching records are not displayed/);
 assert.ok(r.answer.indexOf('94 additional')<r.answer.indexOf('### 1.'));
 assert.equal((r.answer.match(/### \d+\./g)||[]).length,50);
 assert.doesNotMatch(r.answer,/Showing 50 of/);
});
test('complete and empty tracking lists accurately describe their coverage',async()=>{
 for(const count of [0,1,50]){
  const tracking=Array.from({length:count},(_,i)=>({isActive:true,currentStatus:'cutting',trackingNumber:`TR-${i}`,companyName:'Customer'}));
  const {ask}=fixture({tracking});const r=await ask({message:'orders under cutting',requestingUser:md});
  assert.ok(r.answer.includes(`All ${count} matching records are displayed.`));
  assert.doesNotMatch(r.answer,/additional matching records|limited list/);
 }
});
