const { trackingStatus } = require('./trackingStatusParser');
const { presentation } = require('./reportPresentation');
const { normalizeDatabaseText } = require('../context/databaseTextNormalizer');
const { parseEntities } = require('./databaseEntities');
// Deterministic intent/date parsing; never converts user text into Mongo operators.
const ymd = d => d.toISOString().slice(0, 10);
const day = (y,m,d) => new Date(Date.UTC(y,m,d));
const words = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,ten:10,fifteen:15,thirty:30};
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function parsePeriod(message, now = new Date()) {
  const text = normalizeDatabaseText(message);
  if (/\b(?:since|after|before|until)\s+(?:\d|today|yesterday|tomorrow|last|this)/.test(text)) return {error:'Please give an explicit start and end date for that date filter.'};
  const today = new Date(new Date(now.getTime()+330*60000).toISOString().slice(0,10)+'T00:00:00Z');
  const y=today.getUTCFullYear(), m=today.getUTCMonth();
  const shift = n => day(y,m,today.getUTCDate()+n);
  const range = (a,b,label) => ({matched:true,dateFrom:ymd(a),dateTo:ymd(b),label});
  const valid = s => Number.isFinite(Date.parse(s)) && ymd(new Date(s)) === s;
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  const indian = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
  if (iso && indian) return {error:'Please use one consistent date format in the question.'};
  if (iso || indian) {
    const dates = iso || indian.map(s => {const [d,m,y]=s.split(/[/-]/);return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;});
    if (dates.length>2 || dates.some(s=>!valid(s)) || (dates[1] && dates[1]<dates[0])) return {error:'Please give valid dates with the start before the end.'};
    return range(new Date(dates[0]),new Date(dates[1]||dates[0]),'Selected dates');
  }
  const rolling = text.match(/\b(?:last|past|previous)\s+(\d+|one|two|three|four|five|six|seven|ten|fifteen|thirty)\s+(days?|weeks?|months?)\b/);
  if (rolling) {
    const n=words[rolling[1]]||Number(rolling[1]);
    if(n<1 || n>366) return {error:'Please use a period between 1 and 366 units.'};
    let start;
    if(rolling[2].startsWith('month')) {
      const target=day(y,m-n,1), last=day(target.getUTCFullYear(),target.getUTCMonth()+1,0).getUTCDate();
      start=day(target.getUTCFullYear(),target.getUTCMonth(),Math.min(today.getUTCDate(),last));
    } else start=shift(-(n*(rolling[2].startsWith('week')?7:1)-1));
    return range(start,today,`Past ${n} ${rolling[2]}`);
  }
  if (/\b(last|previous) month\b|pichle mahine/.test(text)) return range(day(y,m-1,1),day(y,m,0),'Previous calendar month');
  if (/\b(this|current) month\b|is mahine/.test(text)) return range(day(y,m,1),today,'Month to date');
  const monday=shift(-((today.getUTCDay()+6)%7));
  if (/\b(last|previous) week\b/.test(text)) return range(new Date(monday.getTime()-7*86400000),new Date(monday.getTime()-86400000),'Previous calendar week');
  if (/\b(this|current) week\b/.test(text)) return range(monday,today,'Week to date');
  if (/\b(last|previous) year\b/.test(text)) return range(day(y-1,0,1),day(y-1,11,31),'Previous calendar year');
  if (/\b(this|current) year\b/.test(text)) return range(day(y,0,1),today,'Year to date');
  const namedDateCount=[...text.matchAll(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/g)].length;
  if(namedDateCount>1) return {error:'For a date range, please use YYYY-MM-DD to YYYY-MM-DD.'};
  const named = text.match(/\b(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/);
  if(named) {
    const month=months.indexOf(named[2].slice(0,3)), year=Number(named[3]||y);
    if(named[1]) {const d=day(year,month,Number(named[1])); if(d.getUTCMonth()!==month)return {error:'That day does not exist in this month.'};return range(d,d,'Selected date');}
    return range(day(year,month,1),day(year,month+1,0),'Selected calendar month');
  }
  if (/\b(yesterday|beete kal)\b/.test(text)) return range(shift(-1),shift(-1),'Yesterday');
  if (/\b(tomorrow|agle din)\b/.test(text)) return range(shift(1),shift(1),'Tomorrow');
  if (/\bkal\b/.test(text)) return {error:'Does “kal” mean yesterday or tomorrow? Please specify.'};
  if (/\b(today|aaj)\b/.test(text)) return range(today,today,'Today');
  if (/\b(last|past|next|previous|week|month|year|between|since|before|after)\b/.test(text)) return {error:'Please specify the period, for example “last one month” or “2026-10-01 to 2026-10-27”.'};
  return {...range(today,today,'Today (default)'),defaulted:true};
}
function parseQuestion(message, now) {
  const normalized=normalizeDatabaseText(message);
  const text=normalized.replace(/"[^"]*"|“[^”]*”/g,'entity');
  const output=presentation(text);
  let period=parsePeriod(text,now);
  const entities=parseEntities(normalized);
  const tracking=entities.mill?null:trackingStatus(text);
  const employeeText=tracking?text.slice(0,tracking.index)+'trackingstatus'+text.slice(tracking.index+tracking.phrase.length):text;
  let intent;
  if (/\b(delete|update|remove|approve|reject|cancel)\b/.test(text)) intent='unsupported';
  else if ((/\b(performance|appraisal|productivity)\b/.test(text) || (/\breview\b/.test(text) && /employee|sales\s*person|team|staff|my|mera|meri|\bfor\b/.test(text)))) intent='employee_review';
  else if (/\btimesheets?\b|work report/.test(text)) intent='timesheets';
  else if (/\blocations?\b|\bwhere\s+(?:is|was|are|were)\b|\bwhereabouts\b/.test(text)) intent='employee_location';
  else if (/attendance|check(?:ed)?[ -]?(?:in|out)|haziri|present|absent|on leave/.test(text)) intent='attendance';
  else if (/management.*(?:analysis|analytics)|mill.*analysis|house.*analysis/.test(text)) intent='management_analysis';
  else if (/logistics/.test(text)) intent='logistics_analysis';
  else if (/management|executive|business overview|company overview/.test(text)) intent='executive_summary';
  else if (entities.grade && /\b(quantity|qty|kg|kgs|kilograms?|tonnes?|tons?|mt|weight|volume)\b/.test(text)) intent='grade_analysis';
  else if (/\bgrades?\b/.test(text) && /\b(most|mostly|higher|highest|maximum|max|top|popular|frequent|frequently|usually|commonly|wise|breakdown)\b/.test(text)) intent='grade_analysis';
  else if (tracking) intent='tracking_orders';
  else if (/tracking|on hold|held orders/.test(text)) intent='tracking_orders';
  else if (/delayed.*order|order.*delay/.test(text)) intent='delayed_orders';
  else if (/dispatch|shipment|shipping|delivery\s+(?:plan|schedule)|material.*deliver/.test(text)) intent=/plan|schedule|upcoming|ready|tomorrow/.test(text)?'dispatch_plan':/list|details?|delivered|cancelled|partial|paid/.test(text)?'dispatch_orders':'dispatch_summary';
  else if (/receivable|payment|outstanding|overdue|collection|dues?\b/.test(text)) intent='receivables';
  else if (/\b(?:new|existing)\s+customers?\b/.test(text)) intent='customer_details';
  else if (/enquir|inquir/.test(text)) intent='enquiries';
  else if (/cold.?call|visits?\b/.test(text)) intent='activity';
  else if (/\b(?:sales?|orders?|revenue|turnover)\b|business.*(?:today|month)/.test(text)) intent=/top.*customer|best.*customer/.test(text)?'top_customers': /list|details?|pending|rejected|hold/.test(text)?'sales_orders':'sales_summary';
  else if (/top.*customer|best.*customer/.test(text)) intent='top_customers';
  else intent='unsupported';
  if(intent==='grade_analysis' && period.defaulted) period={matched:true,allTime:true,label:'All recorded dates'};
  if ((entities.mill || entities.grade || entities.company) && ['sales_summary','sales_orders'].includes(intent)) {
    if (!/revenue|turnover|total|how much|value|summary|count/.test(text)) intent='sales_orders';
    if(period.defaulted) period={matched:true,allTime:true,label:'All recorded dates'};
  }
  const validationError = validateRequest(output.semanticText,intent);
  const status=text.match(/\b(pending|approved|rejected|hold)\b/)?.[1];
  const limit=Math.min(Number(text.match(/\btop\s+(\d+)\b/)?.[1]||10),50);
  const attendanceStatus=/\babsent\b/.test(text)?'absent':/\bon leave\b/.test(text)?'on_leave':/\bchecked out\b/.test(text)?'checked_out':/\bpresent\b|\bchecked in\b/.test(text)?'present':null;
  // Location is a literal address fragment, never a user-supplied regex/operator.
  const locationText = employeeText.replace(/\bin\s+(?:kg|kgs|kilograms?|mt|tons?|tonnes?)\b/g,'').replace(/\b(?:in|at|under)\s+trackingstatus\b/g,'').replace(/"[^"]*"|“[^”]*”/g,'').replace(/\bcheck(?:ed)?[ -]?(?:in|out)\b/g, 'attendance');
  const locationClause = locationText.match(/\b(?:from|in|city\s*[:=]?)\s+(?:the\s+)?([a-z][a-z .'-]*?)(?=\s+(?:this|last|past|previous|current|today|yesterday|tomorrow|between|during|on|for|with|and|or)\b|\s+\d|[?!,]|$)/);
  let location = entities.error ? null : locationClause?.[1]?.trim();
  if (location && entities.mill && parseEntities(location).mill) location=null;
  if (location && /^(?:last|this|past|previous|current|today|yesterday|tomorrow|date|invoice|order|month|week|year|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(location)) location = null;
  const locationError = intent!=='employee_location' && location && (!['sales_orders','sales_summary','grade_analysis'].includes(intent) || /\b(?:and|or)\b/.test(locationText.slice((locationClause.index || 0) + locationClause[0].length)))
    ? 'Please request one city at a time for sales orders, for example “order details from Faridabad this month”.' : null;
  const attendanceList = intent==='attendance' && (!output.summary || /\b(who|list|everyone|everybody|all|persons?|people|employees?|team|staff)\b/.test(text) || /check(?:ed)?[ -]?(?:in|out).*time/.test(text));
  return {text,intent,period,status,limit,customerType:/\bnew\s+customers?\b/.test(text)?'new':/\bexisting\s+customers?\b/.test(text)?'existing':null,...output,self:/\b(my|mine|mera|meri|mere)\b/.test(text),attendanceList,
    trackingStatus:tracking?.status,employeeText,attendanceStatus,location,locationError,entities,validationError,
    unsupportedFilter:(/\b(customer|company|invoice)\b/.test(output.semanticText) && intent!=='customer_details' && !entities.company && !/top.*customer|best.*customer/.test(text)) || /\b(compare|comparison|why|profit|margin|gst|tax|collection|collected|received)\b|approved by/.test(text) || (intent==='dispatch_summary' && /\b(delivered|cancelled|pending|partial|paid)\b/.test(text))};
}
function validateRequest(text,intent) {
 if (/\b(password|passwords|token|tokens|secret|secrets|googleid|hash|hashes|credential|credentials)\b|\$where|\$regex|\$ne|\b(drop|delete|update|remove|approve|reject|cancel)\b/.test(text)) return 'Chat is read-only and does not disclose credentials or execute database commands.';
 if (/\b(not|except|excluding|without)\b/.test(text)) return 'Exclusion filters need clarification. Please ask for an explicit status or employee.';
 if (/\b(above|below|greater|less|between)\b/.test(text.replace(/\bbetween\s+\d{1,4}[/-]\d{1,2}[/-]\d{1,4}[\s\S]*/,'')) || /\b(?:top|first)\s+0\b/.test(text)) return 'That numeric filter is not supported yet. Please use the report filters shown in the question catalogue.';
 if (/\battendance\b/.test(text) && /\btimesheets?\b/.test(text)) return 'Please ask for attendance and timesheets as separate reports.';
 if (/\b(sales?|revenue|turnover)\b/.test(text) && /\b(dispatch|attendance|timesheet|receivables?)\b/.test(text) && intent!=='executive_summary' && !/\bmanagement\b/.test(text)) return 'Please ask for one report at a time, or request a management overview.';
 if (/\b(leave requests?|wfh requests?|short leave|leave balance|regularization|documents?|certificates?|tickets?|notifications?|support)\b/.test(text)) return 'That question family is in the model catalogue but does not have a database-chat handler yet. Please use its module.';
 return null;
}
module.exports={parseQuestion,parsePeriod};
