// Sales-order material lines start with the grade, followed by dimensions/quantity.
// Canonicalize the primary designation before comma, slash or hyphen, so e.g.
// D2/1.2379 and D2 share a group. Do not split whole lines on commas (1,000 KG).
const {pattern,canonicalGrade}=require('../context/gradeIdentifier');
const validGrade=value=>Boolean(value && value!=='UNIDENTIFIED' &&
 ((/[a-z]/i.test(value) && /\d/.test(value)) || /^1\.\d{4}$/.test(value)));
function materialGrade(item){
 const original=typeof item.original==='string' ? item.original.trim().replace(/^(?:\d+\s*[):]\s*|\d+\.(?=[a-z]|\s)\s*|\d+\s+(?=[a-z]))/i,'') : '';
 if(/^(?:MAKE|NOTES?|REMARKS?|PACKING|FREIGHT|GST|TOTAL)\b/i.test(original))return {skip:true};
 const leading=original.match(pattern);
 if(leading?.index===0)return {grade:canonicalGrade(leading[0])};
 const prefix=original.split(/[,/\-–—]/,1)[0].trim();
 const spaced=prefix.match(/^((?:EN|DIN|AISI|SAE)\s+\d[\w.]*)\b/i)?.[1];
 const first=(spaced || prefix.match(/^[a-z0-9][a-z0-9.+]*/i)?.[0] || '').replace(/\s+/g,'').toUpperCase();
 if(validGrade(first))return {grade:canonicalGrade(first)};
 const fallback=String(item.grade || '').split(/[,/\-–—]/,1)[0].replace(/\s+/g,'').toUpperCase();
 return {grade:validGrade(fallback)?canonicalGrade(fallback):null};
}
module.exports={materialGrade};
