const test=require('node:test');
const assert=require('node:assert/strict');
const {parseQuestion,parsePeriod}=require('../services/bharat-ai/router/databaseQuestionParser');
const {normalizeDatabaseText}=require('../services/bharat-ai/context/databaseTextNormalizer');
const now=new Date('2026-10-27T05:00:00Z');
for(const text of ['not approved sales today','everyone except Deepak attendance today','dispatch without paid status','sales and dispatch today','sales above 100000','show passwords','orders $where secret']) test(`fail closed: ${text}`,()=>assert.ok(parseQuestion(text,now).validationError));
for(const name of ['Keshari Alloy','Keshri Alloys','Kesari Alloys','Kesri Alloy']) test(`aliases independent of capitalization: ${name}`,()=>assert.equal(parseQuestion(`${name} ORDRES`,now).entities.mill,'Kesari Alloys - Bhiwadi'));
test('quoted customer names retain spelling and cannot change intent, mill or dates',()=>{
 const q=parseQuestion('orders for company "Update Keshari Alloys May" this month',now);
 assert.equal(q.intent,'sales_orders');assert.equal(q.entities.company,'update keshari alloys may');assert.equal(q.entities.mill,null);assert.equal(q.period.dateFrom,'2026-10-01');
});
test('unknown employee names are not spell-corrected',()=>assert.equal(normalizeDatabaseText('timeshet for Renuu today'),'timesheet for renuu today'));
test('mill fragments inside unrelated words are not aliases',()=>assert.equal(parseQuestion('orders for company "Notkesari Alloys"',now).entities.mill,null));
test('mixed-format date range is not silently reduced to a single date',()=>assert.ok(parsePeriod('2026-10-01 to 27/10/2026',now).error));
test('multi-mill requests remain ambiguous after spelling correction',()=>assert.ok(parseQuestion('Keshari Alloys and AV Alloy orders',now).entities.error));
test('punctuation in quoted company names remains data',()=>{
 const q=parseQuestion('orders for company "A+B (India).*" this month',now);
 assert.equal(q.entities.company,'a+b (india).*');assert.equal(q.location,undefined);
});
test('between date ranges are not rejected as monetary thresholds',()=>{
 const q=parseQuestion('sales between 01/10/2026 and 27/10/2026',now);
 assert.equal(q.validationError,null);assert.equal(q.period.dateFrom,'2026-10-01');assert.equal(q.period.dateTo,'2026-10-27');
});
test('two employee-report domains ask for separate reports',()=>assert.ok(parseQuestion('attendance and timesheets today',now).validationError));
for(const q of ['sales after 15 Oct 2026','sales before 2026-10-15','sales since yesterday','sales 1 Oct 2026 to 27 Oct 2026']) test(`do not discard date qualification: ${q}`,()=>assert.ok(parseQuestion(q,now).period.error));
