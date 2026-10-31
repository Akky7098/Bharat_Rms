// Match the sales-order form's stored mill values. Aliases are explicit, not fuzzy DB queries.
const mills = [
 ['Punjab General',['punjab general']], ['Polystud Lifting',['polystud']],
 ['Jassar Forging',['jassar']], ['S.S. Steel - Sirhind',['s.s. steel','ss steel']],
 ['Skyway - Ludhiana',['skyway']], ['Kuber Concast - Mandi Gobindgarh',['kuber concast']],
 ['Pushpanjali Strip',['pushpanjali']], ['Shakti Rolling - Mandi Gobindgarh',['shakti rolling']],
 ['AV Alloys - Mandi Gobindgarh',['av alloys','av alloy']],
 ['Kesari Alloys - Bhiwadi',['kesari alloys','kesari alloy','keshri alloy','keshri alloys','keshari alloy','keshari alloys']],
 ['East India - Durgapur',['east india']], ['Behari Lal - Mandi Gobindgarh',['behari lal','bihari lal']],
];
const {pattern:gradePattern,canonicalGrade}=require('../context/gradeIdentifier');
function parseEntities(text) {
 const entityText=text;
 text=text.replace(/"[^"]*"|“[^”]*”/g,'');
 const matches=mills.filter(([,aliases])=>aliases.some(alias=>new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(text)));
 const mill=matches.length===1?matches[0][0]:null;
 const allMills=/\ball\s+(?:steel\s+)?mills?\b/.test(text);
 const unknownMill=!mill && !allMills && /\bmill\b/.test(text) && !/steel mill (?:analysis|summary|orders|order)/.test(text);
 const matchedGrade=text.match(gradePattern)?.[0];
 const grade=matchedGrade?canonicalGrade(matchedGrade):undefined;
 let company=entityText.match(/\b(?:company|customer)\s+["“]([^"”]+)["”]/)?.[1];
 // Natural names must become explicit filters, never silently disappear.
 // Stop before report modifiers so dates, grouping and employee filters remain separate.
 const stop='(?=\\s+(?:this|last|past|previous|current|today|yesterday|tomorrow|between|during|since|from|in|on|for|by|with|as|salesperson|sales\\s+person)\\b|[?!,]|$)';
 if(!company && !mill) {
  const clause=entityText.match(new RegExp('\\b(?:orders?|sales|enquiries|inquiries|grades?|dispatch(?:es)?|payments?|receivables|outstanding|overdue)(?:\\s+(?:order|invoice))?(?:\\s+(?:details?|records?|history|summary|balance))?\\s+(?:of|for)\\s+(?:the\\s+)?([a-z0-9][a-z0-9 &.\\\'-]*?)'+stop,'i'));
  const explicit=entityText.match(new RegExp('\\b(?:company|customer)\\s+(?!details?\\b|wise\\b|orders?\\b)([a-z0-9][a-z0-9 &.\\\'-]*?)'+stop,'i'));
  const businessClause=entityText.match(new RegExp('\\bfor\\s+([a-z0-9][a-z0-9 &.\\\'-]*?\\b(?:industries|engineering|limited|ltd|components|steels|alloys|enterprises|solutions|works))'+stop,'i'));
  const subject=entityText.match(/\b(?:mostly|usually|frequently|commonly)\s+(.+?)\s+(?:give|gives|place|places|order|orders|buy|buys|purchase|purchases)\b/i) || entityText.match(/\bgrades?\s+(?:does|do)\s+(.+?)\s+(?:order|orders|buy|buys|purchase|purchases)\b/i);
  const candidate=(explicit?.[1] || clause?.[1] || businessClause?.[1] || subject?.[1])?.trim();
  // Unlabelled "for Renu" remains an employee. "of <name>" and business suffixes
  // identify customers without a database-wide fuzzy search.
  if(candidate && (explicit || subject || /\bof\s/i.test(clause?.[0] || '') || /\b(?:industries|engineering|engineers|limited|ltd|pvt|private|components|steels|steel|alloys|alloy|forge|forging|enterprises|motors|works|solutions|corporation)\b/i.test(candidate)) &&
     !/^(?:all|both|each|every|individual|sales|employee|team|staff|my|me|today|last|this)\b/.test(candidate)) company=candidate;
 }
 return {mill,allMills,unknownMill,grade,company,error:matches.length>1?'Please ask for one steel mill at a time.':unknownMill?'Which mill? Choose a mill name or say “all mills”.':null};
}
module.exports={parseEntities,mills};
