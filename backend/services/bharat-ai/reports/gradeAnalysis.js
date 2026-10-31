// Reuse the existing business parser rather than treating free-text material lines
// as a structured grade field or assigning an entire order's value to every grade.
const {materialGrade}=require('./materialGrade');
async function gradeAnalysis({model,query,extractItems,byQuantity=false,selectedGrade}) {
 const rows=await model.find(query).select('_id companyName sizeGradeQuantityRate').sort({_id:1}).limit(1001).maxTimeMS(15000).lean();
 if(rows.length>1000) return 'More than 1,000 orders match. Please narrow the company or date range before calculating grade rankings; no partial ranking has been returned.';
 if(!rows.length)return '### Grade ordering patterns\nMatching orders: 0\nNo approved sales orders match the requested company, date and access filters. Grade extraction has not run. Check the company’s stored name or select another period.';
 const groups=new Map();let unresolvedOrders=0;let unknownQuantityLines=0;
 for(const row of rows){
  const items=extractItems(row);const seen=new Set();let unresolved=!items.length;let materialLines=0;
  for(const item of items){
   const parsed=materialGrade(item);
   if(parsed.skip)continue;
   materialLines++;
   const grade=parsed.grade;
   if(!grade){unresolved=true;continue;}
   if(selectedGrade && grade!==selectedGrade)continue;
   if(!groups.has(grade))groups.set(grade,{grade,orders:0,kg:0});
   const group=groups.get(grade);
   if(!seen.has(grade)){group.orders++;seen.add(grade);}
   if(Number.isFinite(item.quantityKG) && item.quantityKG>0)group.kg+=item.quantityKG;
   else unknownQuantityLines++;
  }
  if(unresolved || !materialLines)unresolvedOrders++;
 }
 const ranked=[...groups.values()].sort((a,b)=>(byQuantity?b.kg-a.kg:b.orders-a.orders)||a.grade.localeCompare(b.grade));
 const metric=byQuantity?'safely parsed quantity (KG)':'number of distinct orders containing each grade';
 let answer=`### Grade ordering patterns\nSource: approved sales orders · Ranked by ${metric}\nMatching orders: ${rows.length}\nOrders with missing/unidentified grades: ${unresolvedOrders}\nRecognized material lines with unresolved quantity: ${unknownQuantityLines}\n\n`;
 if(query.companyName)answer+=`Matched company names: ${[...new Set(rows.map(r=>r.companyName).filter(Boolean))].join(', ')}\n\n`;
 if(selectedGrade){
  const selected=groups.get(selectedGrade);
  answer+=`### ${selectedGrade} order quantity\nOrders containing parsed grade: ${selected?.orders || 0}\nTotal parsed quantity: ${(selected?.kg || 0).toLocaleString('en-IN')} KG\nOnly ${selectedGrade} material lines contribute to this quantity; other grades in the same orders are excluded.\n\n`;
 }
 if(!ranked.length)return answer+'No safely recognized grades were found. This does not mean the customer has no orders.';
 const leading=ranked.filter(g=>(byQuantity?g.kg:g.orders)===(byQuantity?ranked[0].kg:ranked[0].orders));
 answer+=`Leading grade${leading.length>1?'s (tied)':''}: ${leading.map(g=>g.grade).join(', ')}${unresolvedOrders || (byQuantity && unknownQuantityLines)?' — provisional because some material data could not be parsed':''}\nHighest ${byQuantity?'parsed quantity':'order count'}: ${byQuantity?ranked[0].kg.toLocaleString('en-IN')+' KG':ranked[0].orders+' orders'}\n\n`;
 answer+=ranked.slice(0,50).map((g,i)=>`### ${i+1}. ${g.grade}\nOrders containing grade: ${g.orders}\nParsed quantity: ${g.kg.toLocaleString('en-IN')} KG`).join('\n\n');
 answer+='\n\nGrades use the leading designation before comma, slash or hyphen (for example D2/1.2379 is grouped as D2). Make/remark lines are excluded. An order containing multiple grades appears in each applicable grade count. Grade counts must not be added to obtain the total order count. Quantities include only safely parsed lines.';
 if(ranked.length>50)answer+=`\nShowing 50 of ${ranked.length} grades.`;
 return answer;
}
module.exports={gradeAnalysis};
