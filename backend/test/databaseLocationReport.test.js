const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/databaseChatFixture');
const {employeeLocationReport}=require('../services/bharat-ai/reports/employeeLocationReport');
const md={_id:'md',role:'super_admin'};
const location={history:[
 {capturedAt:'2026-10-27T04:00:00Z',source:'check_in',locationStatus:'office',locationAddress:'Office'},
 {capturedAt:'2026-10-27T06:00:00Z',source:'periodic',locationStatus:'outside_office',locationAddress:'Visit checkpoint',latitude:28.4,longitude:77.3,accuracy:25},
 {capturedAt:'2026-10-27T05:00:00Z',source:'app_open',locationStatus:'office',locationAddress:'Older checkpoint'}
]};
test('screenshot misspelling today and ambiguous Deepak asks which employee',async()=>{
 const {ask,calls}=fixture();const r=await ask({message:'what is the location of deepak toda',requestingUser:md});
 assert.match(r.answer,/Which employee/);assert.doesNotMatch(r.answer,/model catalogue/);assert.equal(calls.some(c=>c[0]==='locationHistory'),false);
 const next=await ask({message:'Deepak Arya',requestingUser:md,conversationId:r.conversationId});
 assert.match(next.answer,/No saved location checkpoint/);assert.equal(calls.find(c=>c[0]==='locationHistory')[1].id,'d1');
});
for(const phrase of ['Deepak Arya location today','where is Deepak Arya today','saved location of Deepak Arya today'])test(`saved location: ${phrase}`,async()=>{
 const {ask,calls}=fixture({location});const r=await ask({message:phrase,requestingUser:md});
 assert.equal(r.toolsUsed[0].name,'employee_location');assert.match(r.answer,/Visit checkpoint/);assert.doesNotMatch(r.answer,/Older checkpoint/);
 assert.match(r.answer,/not live location/);assert.match(r.answer,/GPS accuracy: 25/);
 assert.equal(calls.find(c=>c[0]==='locationHistory')[1].query.date,'2026-10-27');
});
for(const role of ['user','admin'])test(`location history does not broaden ${role} permissions`,async()=>{
 const {ask,calls}=fixture({location});const r=await ask({message:'my location today',requestingUser:{_id:'own',role}});
 assert.match(r.answer,/Only superadmin/);assert.equal(calls.length,0);
});
test('history shows saved points newest first, latest query shows just one',async()=>{
 const {ask}=fixture({location});const r=await ask({message:'Deepak Arya location history today',requestingUser:md});
 assert.match(r.answer,/Older checkpoint/);assert.match(r.answer,/Office/);assert.ok(r.answer.indexOf('Visit checkpoint')<r.answer.indexOf('Older checkpoint'));
});
test('ranges and unspecified employee make no history call',async()=>{
 for(const message of ['location today','Deepak Arya location last week']){
 const {ask,calls}=fixture();const r=await ask({message,requestingUser:md});assert.match(r.answer,/full name|one date/);assert.equal(calls.some(c=>c[0]==='locationHistory'),false);
 }
});
test('report itself rejects unauthorized access before invoking service',async()=>{
 const r=await employeeLocationReport({user:{role:'user'},getHistory:()=>{throw Error('must not query');}});assert.match(r,/Only superadmin/);
});
test('both resumes location for the two offered employees and keeps people-related suggestions',async()=>{
 const {ask,calls}=fixture({location});
 const first=await ask({message:'what is the location of deepak today',requestingUser:md});
 assert.ok(first.suggestions.includes('both'));
 const r=await ask({message:'both',conversationId:first.conversationId,requestingUser:md});
 const historyCalls=calls.filter(c=>c[0]==='locationHistory');
 assert.deepEqual(historyCalls.map(c=>c[1].id).sort(),['d1','d2']);
 assert.match(r.answer,/Employee: Deepak Arya/);assert.match(r.answer,/Employee: Deepak Yadav/);
 assert.doesNotMatch(r.answer,/one employee at a time/);
 assert.ok(r.suggestions.some(q=>/location history/.test(q)));
 assert.ok(r.suggestions.some(q=>/attendance/.test(q)));
 assert.ok(r.suggestions.every(q=>!/revenue|sales orders|dispatch/i.test(q)));
});
test('single-employee suggestions preserve their name and follow the people domain',async()=>{
 const {ask}=fixture({location});const r=await ask({message:'Deepak Arya location today',requestingUser:md});
 assert.ok(r.suggestions.every(q=>q.includes('Deepak Arya')));
 assert.ok(r.suggestions.some(q=>q==='Deepak Arya attendance today'));
});
