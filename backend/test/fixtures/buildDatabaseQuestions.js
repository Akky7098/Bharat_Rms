// Reproducible test corpus: 100 independent expected reports/clarifications, five input styles.
const fs=require('node:fs');
const path=require('node:path');
const base=require('./databaseQuestions.base.json');
const misspell={sales:'salse',revenue:'reveneu',orders:'ordres',order:'ordar',details:'detials',detail:'deatil',pending:'pendng',approved:'aproved',rejected:'rejcted',attendance:'attandance',employees:'emplyees',today:'tadays',yesterday:'yestarday',tomorrow:'tommorow',month:'mnth',timesheet:'timeshet',dispatch:'disptach',delivered:'deliverd',enquiries:'enqury',payments:'paymnt',overdue:'overdu',outstanding:'outstandng',management:'managment',logistics:'logisitcs',analysis:'analisis',tracking:'trackng',kesari:'keshari'};
const cases=base.flatMap((spec,i)=>{
 const typo=spec.q.split(/("[^"]*")/g).map((s,j)=>j%2?s:s.replace(/\b[a-z]+\b/gi,w=>misspell[w.toLowerCase()]||w)).join('');
 const questions=[spec.q,`please ${spec.q}`,spec.q.toUpperCase(),`could you   ${spec.q.replaceAll(' ','  ')}`,`tell me ${typo}`];
 return questions.map((question,j)=>({...spec,q:undefined,id:`Q${String(i*5+j+1).padStart(3,'0')}`,family:i+1,style:['plain','polite','uppercase','spacing','misspelling'][j],question}));
});
if(cases.length!==500 || new Set(cases.map(c=>c.question)).size!==500) throw new Error('Corpus must have 500 unique inputs.');
fs.writeFileSync(path.join(__dirname,'databaseQuestions500.json'),JSON.stringify(cases,null,2)+'\n');
