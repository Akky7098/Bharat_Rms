const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/databaseChatFixture');
const user={_id:'md',role:'super_admin'};
const date=new Date('2026-10-28T04:00:00Z');
const base={isActive:true,currentStatus:'cutting',salesPersonId:'u'};
const tracking=[
 {...base,trackingNumber:'READY',estimatedReadyDate:date},
 {...base,trackingNumber:'MILESTONE',milestones:[{code:'ready_for_dispatch',estimatedDate:date}]},
 {...base,trackingNumber:'ORIGINAL',milestones:[{code:'ready_for_dispatch',originalEstimatedDate:date}]},
 {...base,trackingNumber:'SHIP-ONLY',estimatedShipDate:date},
 {...base,trackingNumber:'OVERRIDDEN',estimatedReadyDate:new Date('2026-11-01'),milestones:[{code:'ready_for_dispatch',estimatedDate:date}]},
 {...base,trackingNumber:'SHIPPED',currentStatus:'shipped',estimatedReadyDate:date},
 {...base,trackingNumber:'CANCELLED',currentStatus:'cancelled',estimatedReadyDate:date},
 {...base,trackingNumber:'INACTIVE',isActive:false,estimatedReadyDate:date}
];
test('explicit readiness plan tomorrow uses ready dates with fallback and excludes completed shipments',async()=>{
 const {ask}=fixture({tracking,realDates:true});const r=await ask({message:'dispatch readiness plan tomorrow',requestingUser:user});
 assert.match(r.answer,/Matching orders: 3/);assert.match(r.answer,/READY/);assert.match(r.answer,/MILESTONE/);assert.match(r.answer,/ORIGINAL/);
 assert.doesNotMatch(r.answer,/SHIP-ONLY|OVERRIDDEN|SHIPPED|CANCELLED|INACTIVE/);assert.match(r.answer,/ready-for-dispatch date/);
});
test('explicit shipment plan uses ship date without silently substituting ready date',async()=>{
 const {ask}=fixture({tracking,realDates:true});const r=await ask({message:'shipment plan tomorrow',requestingUser:user});
 assert.match(r.answer,/Matching orders: 1/);assert.match(r.answer,/SHIP-ONLY/);assert.match(r.answer,/estimated ship date/);
});
test('dispatch readiness respects employee scope and honest zero matches',async()=>{
 const {ask}=fixture({tracking,realDates:true});const r=await ask({message:'dispatch plan tomorrow',requestingUser:{_id:'other',role:'user'}});
 assert.match(r.answer,/Matching orders: 0/);assert.match(r.answer,/Orders without that date are not included/);
});
test('screenshot dates distinguish readiness Oct 28, shipping Oct 31 and delivery Nov 3',async()=>{
 const row={...base,trackingNumber:'SCREENSHOT',estimatedReadyDate:date,estimatedShipDate:new Date('2026-10-31T04:00:00Z'),estimatedDeliveryDate:new Date('2026-11-03T04:00:00Z')};
 const {ask}=fixture({tracking:[row],realDates:true});
 const tomorrow=await ask({message:'dispatch plan tomorrow',requestingUser:user});assert.match(tomorrow.answer,/Matching orders: 0/);assert.doesNotMatch(tomorrow.answer,/SCREENSHOT/);
 const ready=await ask({message:'dispatch readiness plan tomorrow',requestingUser:user});assert.match(ready.answer,/Matching orders: 1/);
 const shipped=await ask({message:'dispatch plan on 2026-10-31',requestingUser:user});assert.match(shipped.answer,/SCREENSHOT/);assert.match(shipped.answer,/Planned ship date: 31\/10\/2026/);
 const delivered=await ask({message:'delivery plan on 2026-11-03',requestingUser:user});assert.match(delivered.answer,/SCREENSHOT/);assert.match(delivered.answer,/Planned delivery date: 3\/11\/2026/);
});
