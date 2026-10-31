const test=require('node:test');
const assert=require('node:assert/strict');
const corpus=require('./fixtures/databaseQuestions500.json');
const {parseQuestion}=require('../services/bharat-ai/router/databaseQuestionParser');
const now=new Date('2026-10-27T05:00:00Z');
test('corpus contains 500 unique cases covering 100 independently specified reports',()=>{
 assert.equal(corpus.length,500);assert.equal(new Set(corpus.map(c=>c.question)).size,500);assert.equal(new Set(corpus.map(c=>c.family)).size,100);
});
for(const spec of corpus) test(`${spec.id}: ${spec.question}`,()=>{
 const result=parseQuestion(spec.question,now);
 const clarification=result.validationError || result.period.error || result.entities.error || result.locationError || result.unsupportedFilter || result.intent==='unsupported';
 if(spec.ledger) {assert.equal(result.intent,spec.intent);return;}
 if(spec.clarify) {assert.ok(clarification,'Must clarify/reject instead of executing a guessed report');return;}
 assert.ok(!clarification,`Unexpected clarification: ${clarification}`);
 assert.equal(result.intent,spec.intent);
 for(const key of ['mill','grade','company']) if(spec[key]!==undefined) assert.equal(result.entities[key],spec[key],key);
 for(const key of ['location','status','limit','self','attendanceList','attendanceStatus']) if(spec[key]!==undefined) assert.equal(result[key],spec[key],key);
 if(spec.from) assert.equal(result.period.dateFrom,spec.from,'start date');
 if(spec.to) assert.equal(result.period.dateTo,spec.to,'end date');
 if(spec.allTime) assert.equal(result.period.allTime,true);
});
