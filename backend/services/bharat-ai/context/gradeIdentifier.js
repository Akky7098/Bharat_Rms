const pattern=/\b(?:din[\s.-]*1\.\d{4}|1\.\d{4}|en[\s-]?\d{1,3}[a-z]?|h[\s-]?13|db[\s-]?6|aisi\s?\d{4}|42crmo4|20mncr5|16mncr5|sae\s?\d{4})\b/i;
function canonicalGrade(value){
 const compact=String(value || '').toUpperCase().replace(/\s+/g,'');
 if(/^(?:DIN[.-]*)?1\.\d{4}$/.test(compact))return 'DIN'+compact.replace(/^DIN[.-]*/,'');
 return compact.replace(/^(EN|H|DB)-/,'$1');
}
function gradeTextPattern(value){
 const grade=canonicalGrade(value);
 if(/^DIN1\.\d{4}$/.test(grade))return `\\b(?:DIN[\\s.-]*)?${grade.slice(3).replace('.','\\.')}\\b`;
 return `\\b${grade.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`;
}
module.exports={pattern,canonicalGrade,gradeTextPattern};
