// Only correct a controlled business vocabulary. Never fuzzy-correct customer/employee names,
// quoted values, dates, invoice numbers or grade identifiers.
const corrections = Object.freeze({
 revnue:'revenue', reveneu:'revenue', revennue:'revenue', turnovr:'turnover', reveiw:'review', performence:'performance', perfomance:'performance',
 ordres:'orders', oredrs:'orders', ordar:'order', orderes:'orders', detials:'details', deatil:'detail', qunatity:'quantity', quanity:'quantity',
 saless:'sales', salse:'sales', selles:'sales', pendng:'pending', panding:'pending', aproved:'approved',
 rejcted:'rejected', dispach:'dispatch', disptach:'dispatch', dipatch:'dispatch', dispacth:'dispatch',
 delivary:'delivery', shiped:'shipped', castng:'casting', deliverd:'delivered', delivred:'delivered', cancelld:'cancelled', canceld:'cancelled',
 attendence:'attendance', attendace:'attendance', attendanse:'attendance', attandance:'attendance',
 emplyee:'employee', employe:'employee', emplyees:'employees', person:'person', inddual:'individual', indvidual:'individual', indivdual:'individual', individuaal:'individual', indivisual:'individual', sale:'sales',
 timeshet:'timesheet', timesheeet:'timesheet', timsheet:'timesheet',
 receivble:'receivable', recievable:'receivable', recievables:'receivables', paymnt:'payment', paymet:'payment', recieved:'received', recived:'received', receive:'received',
 outstandng:'outstanding', overdu:'overdue', enqury:'enquiry', enqurey:'enquiry', enquires:'enquiries',
 enquary:'enquiry', inquery:'inquiry', managment:'management', mangement:'management',
 analisis:'analysis', analyis:'analysis', logisitcs:'logistics', logisitics:'logistics', trackng:'tracking',
 tadays:'today', todays:'today', toda:'today', yestarday:'yesterday', tommorow:'tomorrow', tomorow:'tomorrow',
 mont:'month', mnth:'month', mounth:'month', moths:'months', weks:'weeks', yaer:'year',
 kesari:'kesari', keshari:'kesari', keshri:'kesari', kesri:'kesari',
});
function normalizeDatabaseText(input) {
 const parts=String(input || '').normalize('NFKC').toLowerCase().replace(/[’]/g,"'").split(/("[^"]*"|“[^”]*”)/g);
 return parts.map((part,i)=>i%2?part:part.replace(/\b[a-z]+\b/g,w=>corrections[w]||w))
  .join('').replace(/\bover\s+due\b/g,'overdue').replace(/\btoday's\b/g,'today').replace(/\btime\s+sheets?\b/g,'timesheet')
  .replace(/\bcheck\s*-\s*(in|out)\b/g,'check $1').replace(/\s+/g,' ').trim();
}
module.exports={normalizeDatabaseText,corrections};
