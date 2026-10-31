// Small test-only evaluator for the Mongo operators emitted by report builders.
// Expected business totals are asserted separately against hand-authored ledger records.
const values=(row,path)=>path.split('.').reduce((rows,key)=>rows.flatMap(v=>Array.isArray(v)?v.map(x=>x?.[key]):[v?.[key]]),[row]);
const value=(row,path)=>values(row,path)[0];
const expr=(row,x)=>{
 if(typeof x==='string' && x.startsWith('$'))return value(row,x.slice(1));
 if(!x || typeof x!=='object' || x instanceof Date)return x;
 if(x.$ifNull)return expr(row,x.$ifNull[0]) ?? expr(row,x.$ifNull[1]);
 if(x.$eq)return expr(row,x.$eq[0])===expr(row,x.$eq[1]);
 if(x.$ne)return expr(row,x.$ne[0])!==expr(row,x.$ne[1]);
 if(x.$lt)return expr(row,x.$lt[0])<expr(row,x.$lt[1]);
 if(x.$and)return x.$and.every(v=>expr(row,v));
 if(x.$cond)return expr(row,x.$cond[0])?expr(row,x.$cond[1]):expr(row,x.$cond[2]);
 return x;
};
const matches=(row,query)=>Object.entries(query).every(([field,condition])=>{
 if(field==='$and') return condition.every(q=>matches(row,q));
 if(field==='$or') return condition.some(q=>matches(row,q));
 if(field==='$expr') return Boolean(condition);
 const items=values(row,field);
 return items.some(v=>{
  if(condition===null)return v==null;
  if(condition.$elemMatch)return Array.isArray(v) && v.some(item=>matches(item,condition.$elemMatch));
  if(typeof condition!=='object' || condition instanceof Date) return v===condition;
  return Object.entries(condition).every(([op,n])=>op==='$gt'?v>n:op==='$gte'?v>=n:op==='$lt'?v<n:op==='$lte'?v<=n:op==='$in'?n.includes(v):op==='$nin'?!n.includes(v):op==='$ne'?v!==n:op==='$regex'?new RegExp(n,condition.$options||'').test(v||''):op==='$options');
 });
});
function run(rows,stages) {
 for(const stage of stages) {
  if(stage.$addFields) rows=rows.map(r=>({...r,...Object.fromEntries(Object.entries(stage.$addFields).map(([k,v])=>[k,expr(r,v)]))}));
  else if(stage.$match) rows=rows.filter(r=>matches(r,stage.$match));
  else if(stage.$unwind) {const path=stage.$unwind.slice(1);rows=rows.flatMap(r=>(r[path]||[]).map(v=>({...r,[path]:v})));}
  else if(stage.$sort) {const sort=stage.$sort;rows=[...rows].sort((a,b)=>{for(const [k,d] of Object.entries(sort)){const x=value(a,k),y=value(b,k);if(x<y)return -d;if(x>y)return d;}return 0;});}
  else if(stage.$limit) rows=rows.slice(0,stage.$limit);
  else if(stage.$facet) rows=[Object.fromEntries(Object.entries(stage.$facet).map(([k,v])=>[k,run(rows,v)]))];
  else if(stage.$group) {
   if(!rows.length) continue;
   const groups=new Map();
   for(const row of rows) {const id=expr(row,stage.$group._id);const key=JSON.stringify(id);if(!groups.has(key))groups.set(key,{id,rows:[]});groups.get(key).rows.push(row);}
   rows=[...groups.values()].map(({id,rows:groupRows})=>{
    const out={_id:id};for(const [k,acc] of Object.entries(stage.$group)) {
     if(k==='_id')continue;
     if(acc.$sum!==undefined)out[k]=groupRows.reduce((s,r)=>s+Number(expr(r,acc.$sum)||0),0);
     if(acc.$addToSet!==undefined)out[k]=[...new Set(groupRows.map(r=>expr(r,acc.$addToSet)))];
     if(acc.$first!==undefined)out[k]=expr(groupRows[0],acc.$first);
    }return out;
   });
  } else if(stage.$project) rows=rows.map(r=>Object.fromEntries(Object.entries(stage.$project).filter(([,v])=>v!==0).map(([k,v])=>[k,v===1?r[k]:v.$size?value(r,v.$size.slice(1)).length:expr(r,v)])));
  else throw new Error('Unsupported test stage');
 }return rows;
}
const reportModel=rows=>({aggregate:p=>({option:async()=>run(rows,p)})});
module.exports={reportModel};
