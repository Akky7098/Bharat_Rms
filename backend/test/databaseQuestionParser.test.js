const test=require('node:test');
const assert=require('node:assert/strict');
const {parseQuestion,parsePeriod}=require('../services/bharat-ai/router/databaseQuestionParser');
const now=new Date('2026-10-27T05:00:00Z');
for(const [question,intent] of [
 ['what is revenue of last one month','sales_summary'],
 ['How much turnover this month?','sales_summary'],
 ['aaj sales kitna hai','sales_summary'],
 ['Show pending sales orders this month','sales_orders'],
 ['List rejected orders last week','sales_orders'],
 ['Top 5 customers this month','top_customers'],
 ['Deepak Arya work report yesterday','timesheets'],
 ['Show my time sheet today','timesheets'],
 ['Who is present today','attendance'],
 ['Show employees on leave today','attendance'],
 ['Dispatch plan tomorrow','dispatch_plan'],
 ['Upcoming shipments this week','dispatch_plan'],
 ['Dispatch summary last month','dispatch_summary'],
 ['Which orders are delayed','delayed_orders'],
 ['Overdue payments','receivables'],
 ['What are outstanding dues','receivables'],
 ['Enquiries this month','enquiries'],
 ['Cold calls last week','activity'],
 ['Visits today','activity'],
 ['delete sales orders','unsupported'],
]) test(question,()=>assert.equal(parseQuestion(question,now).intent,intent));
for(const [text,start,end] of [
 ['last one month','2026-09-27','2026-10-27'],
 ['last month','2026-09-01','2026-09-30'],
 ['this month','2026-10-01','2026-10-27'],
 ['past 7 days','2026-10-21','2026-10-27'],
 ['last two weeks','2026-10-14','2026-10-27'],
 ['this week','2026-10-26','2026-10-27'],
 ['last week','2026-10-19','2026-10-25'],
 ['yesterday','2026-10-26','2026-10-26'],
 ['tomorrow','2026-10-28','2026-10-28'],
 ['September 2026','2026-09-01','2026-09-30'],
 ['26 Oct 2026','2026-10-26','2026-10-26'],
 ['01/10/2026 to 26/10/2026','2026-10-01','2026-10-26'],
 ['2026-10-01 to 2026-10-27','2026-10-01','2026-10-27'],
 ['this year','2026-01-01','2026-10-27'],
]) test(`period ${text}`,()=>{const p=parsePeriod(text,now);assert.equal(p.dateFrom,start);assert.equal(p.dateTo,end);});
test('IST midnight is independent of server timezone',()=>assert.equal(parsePeriod('today',new Date('2026-10-26T19:00:00Z')).dateFrom,'2026-10-27'));
test('rolling month clamps leap-day correctly',()=>assert.equal(parsePeriod('last one month',new Date('2024-03-31T05:00:00Z')).dateFrom,'2024-02-29'));
for(const text of ['2026-02-30','31 Feb 2026','2026-10-28 to 2026-10-01','kal','last 999 days','next 7 years']) test(`clarify ${text}`,()=>assert.ok(parsePeriod(text,now).error));
test('screenshot singular detail and location are both preserved',()=>{
 const q=parseQuestion('the order detail from the faridabad this month',now);
 assert.equal(q.intent,'sales_orders');assert.equal(q.location,'faridabad');assert.equal(q.period.dateFrom,'2026-10-01');
});
test('multiword city and unsupported city domains',()=>{
 assert.equal(parseQuestion('order details from New Delhi this month',now).location,'new delhi');
 assert.ok(parseQuestion('attendance from Faridabad today',now).locationError);
 assert.ok(parseQuestion('orders from Faridabad and Delhi this month',now).locationError);
});
test('temporal in/from clauses are not treated as cities',()=>{
 assert.equal(parseQuestion('revenue in October 2026',now).location,null);
 assert.equal(parseQuestion('sales from last month',now).location,null);
});
for(const name of ['kesari alloy','Kesari Alloys','keshri alloy','keshari alloys']) test(`mill alias ${name}`,()=>{
 const q=parseQuestion(`the order in ${name} mill`,now);
 assert.equal(q.entities.mill,'Kesari Alloys - Bhiwadi');assert.equal(q.location,null);assert.equal(q.intent,'sales_orders');assert.equal(q.period.allTime,true);
});
test('mill date, grade and company filters are separate',()=>{
 const q=parseQuestion('Kesari Alloys EN353 orders this month',now);
 assert.equal(q.entities.grade,'EN353');assert.equal(q.period.dateFrom,'2026-10-01');
 assert.equal(parseQuestion('orders for company "Example Engineering" this month',now).entities.company,'example engineering');
});
test('unknown mills ask instead of turning into an address',()=>{
 const q=parseQuestion('orders in imaginary mill',now);assert.ok(q.entities.error);assert.equal(q.location,null);
});
for(const question of ['tell me all person tadays attendace check in time', 'all employees today check-in time', 'everyone check in time today', 'show my check out time today']) test(`attendance clock is not a city: ${question}`,()=>{
 const q=parseQuestion(question,now);assert.equal(q.intent,'attendance');assert.ok(q.attendanceList);assert.ok(!q.location);assert.ok(!q.locationError);assert.equal(q.period.dateFrom,'2026-10-27');
});
for(const phrase of ['sales person wise','salesperson-wise','by salesperson','per sales person','employee wise']) test(`grouping: ${phrase}`,()=>{
 const q=parseQuestion(`overdue payment details last 3 months ${phrase}`,now);assert.equal(q.groupBy,'salesperson');assert.equal(q.validationError,null);
});
test('plain today attendance defaults to employee details; explicit summary remains summary',()=>{
 assert.equal(parseQuestion('todays attendace',now).attendanceList,true);assert.equal(parseQuestion('attendance summary today',now).summary,true);
});
