const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function auditFixture(){const logs=[];const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services/bharat-ai/usage/databaseAudit.js'),'utf8'),{module,require:n=>n==='crypto'?require(n):{logAudit:p=>{logs.push(p);return Promise.resolve();}}});
 return {log:module.exports.auditDatabaseQuestion,logs};
}
const user={_id:'u',role:'super_admin'};
test('database outcomes distinguish answered, clarification, unsupported and errors',()=>{
 const {log,logs}=auditFixture();
 for(const [result,error] of [[{answer:'Result',toolsUsed:[{name:'sales_orders'}],intent:'sales_orders'},null],[{answer:'Which employee?',conversationId:'dbctx.example',toolsUsed:[]},null],[{answer:'Unsupported',toolsUsed:[]},null],[null,new Error('internal database details')]])log({user,message:'Question',result,error});
 assert.deepEqual(logs.map(l=>l.outcome),['answered','clarification','unsupported','error']);assert.equal(logs[0].success,true);assert.equal(logs[2].success,false);
 assert.doesNotMatch(JSON.stringify(logs),/internal database details/);
});
test('audit redacts sensitive questions and does not store replayable signed tokens',()=>{
 const {log,logs}=auditFixture();log({user,message:'password my-secret-value',conversationId:'dbctx.replayable.signature',result:{answer:'private answer',toolsUsed:[]}});
 assert.equal(logs[0].question,'[Sensitive question omitted]');assert.equal(logs[0].answer,'');assert.match(logs[0].conversationId,/^db-ref\./);assert.doesNotMatch(JSON.stringify(logs),/my-secret-value|replayable|private answer/);
});
function reviewFixture(currentUser){let queried=false;const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controller/bharatQuestionReviewController.js'),'utf8'),{module,Date,require:n=>n.includes('userModel')?{findById:()=>({select:()=>({lean:async()=>currentUser})})}:{aggregate:p=>{queried=p;return {option:async()=>[]};}}});
 const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 return {run:query=>module.exports.reviewDatabaseQuestions({user:{_id:'u'},query},res),res,getQuery:()=>queried};
}
for(const role of ['user','admin'])test(`question review denies ${role} before audit access`,async()=>{
 const f=reviewFixture({role});await f.run({});assert.equal(f.res.statusCode,403);assert.equal(f.getQuery(),false);
});
test('question review uses freshly loaded role and bounded failed-question aggregates',async()=>{
 const f=reviewFixture({role:'super_admin',status:'active'});await f.run({days:'30'});
 assert.equal(f.res.statusCode,200);const p=f.getQuery();assert.equal(p[0].$match.requestType,'database_chat');assert.equal(p[3].$limit,50);
 assert.ok(p[0].$match.outcome.$in.includes('unsupported'));assert.equal(f.res.body.data.limit,50);
});
test('review rejects invalid query filters without accessing logs',async()=>{
 for(const query of [{days:'999'},{days:'x'},{outcome:'$where'}]){const f=reviewFixture({role:'super_admin'});await f.run(query);assert.equal(f.res.statusCode,400);assert.equal(f.getQuery(),false);}
});
