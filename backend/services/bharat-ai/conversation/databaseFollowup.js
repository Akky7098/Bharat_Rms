// Short-lived signed clarification context travels with the existing conversationId.
// No Redis dependency or worker-local conversation store. Every query still rechecks current access.
const crypto=require('crypto');
const runtimeSecret=crypto.randomBytes(32);
const secret=()=>process.env.JWT_SECRET || runtimeSecret;
const prefix='dbctx.';
const sign=value=>crypto.createHmac('sha256',secret()).update(value).digest('base64url');
function issue({user,question,period,choices,kind='employee',selectedNames},now=Date.now()) {
 const payload=Buffer.from(JSON.stringify({uid:String(user._id),role:user.role,question,period,kind,selectedNames,choices:choices.map(c=>c.name),exp:now+10*60000})).toString('base64url');
 return `${prefix}${payload}.${sign(payload)}`;
}
function read(token,user,now=Date.now()) {
 if(typeof token!=='string' || !token.startsWith(prefix) || token.length>12000)return null;
 const [payload,signature,...extra]=token.slice(prefix.length).split('.');
 if(!signature || extra.length)return null;
 const actual=Buffer.from(signature),expected=Buffer.from(sign(payload));
 if(actual.length!==expected.length || !crypto.timingSafeEqual(actual,expected))return null;
 try {const state=JSON.parse(Buffer.from(payload,'base64url').toString());
  return state.uid===String(user._id) && state.role===user.role && state.exp>now?state:null;
 }catch{return null;}
}
const key=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ').replace(/\bsales\s+person\b/g,'salesperson');
function resume(token,user,message) {
 const state=read(token,user);if(!state)return null;
 if(state.kind==='report'){
  const reply=key(message).replace(/^(?:and|what about|how about|same for|for)\s+/,'').replace(/[?.!]+$/,'').trim();
  if(/^(?:today|yesterday|tomorrow|this (?:week|month|year)|last (?:week|month|year)|(?:last|past) (?:\d+|one|two|three) (?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}(?:\s+to\s+\d{4}-\d{2}-\d{2})?)$/.test(reply)){
   const period=require('../router/databaseQuestionParser').parsePeriod(reply);
   if(!period.error)return {message:state.question,period,selectedNames:state.selectedNames};
  }
  if(/^(?:salesperson wise|customer wise)$/.test(reply))return {message:state.question.replace(/\b(?:sales\s*persons?|customers?|company)\s*[- ]?wise\b/gi,'')+' '+reply,period:state.period,selectedNames:state.selectedNames};
  return null;
 }
 if(state.kind==='mill'){
  const all=/^(?:all|all (?:steel )?mills?)$/.test(key(message));
  const resolved=require('../router/databaseEntities').parseEntities(key(message));
  const choice=state.choices.find(n=>key(n)===key(message) || (!resolved.error && resolved.mill===n));
  if(!all && !choice)return null;
  const filter=all?'all steel mills':choice;
  return {message:state.question.replace(/\b(?:steel\s+)?mills?\b/i,filter),period:state.period};
 }
 const people=state.choices.filter(n=>!['salespersonwise','customerwise'].includes(key(n).replaceAll(' ','')));
 if((/^(all|all of them)$/.test(key(message)) && people.length>1) || (/^(both|both of them)$/.test(key(message)) && people.length===2)) return {message:state.question,period:state.period,selectedNames:people};
 const name=state.choices.find(n=>key(n)===key(message));
 return name?{message:`${state.question} for ${name}`,period:state.period,...(people.includes(name)?{selectedNames:[name]}:{})}:null;
}
module.exports={issue,read,resume,newId:()=>`db.${crypto.randomUUID()}`};
