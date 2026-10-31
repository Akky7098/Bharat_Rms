// One bounded list plus uncapped totals over precisely the same scoped match.
async function queryReport(model,query,{fields,sort,metrics={},limit=50,groupBy}) {
 const projection=Object.fromEntries(fields.split(/\s+/).filter(Boolean).map(k=>[k,1]));
 const group={_id:null,count:{$sum:1}};
 for(const [name,field] of Object.entries(metrics)) group[name]={$sum:`$${field}`};
 const pipeline=[{$match:query},{$facet:{records:[{$sort:sort},{$limit:limit},{$project:projection}],summary:[{$group:group}]}}];
 if(groupBy) {
  const grouped={_id:`$${groupBy.field}`,name:{$first:`$${groupBy.nameField}`},count:{$sum:1}};
  for(const [name,field] of Object.entries(metrics)) grouped[name]={$sum:`$${field}`};
  pipeline[1].$facet.groups=[{$group:grouped},{$sort:{count:-1,_id:1}},{$limit:51}];
 }
 const [result]=await model.aggregate(pipeline).option({maxTimeMS:15000});
 return {groups:result?.groups || [],records:result?.records || [],summary:result?.summary?.[0] || {count:0,...Object.fromEntries(Object.keys(metrics).map(k=>[k,0]))}};
}
module.exports={queryReport};
