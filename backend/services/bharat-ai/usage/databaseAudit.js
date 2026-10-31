const crypto=require('crypto');
const {logAudit}=require('./usageService');
function auditDatabaseQuestion({user,message,conversationId,result,error}){
 if(!user?._id)return;
 const sensitive=/\b(password|secret|credential|token|bearer|api[ _-]?key)\b/i.test(String(message));
 const question=sensitive?'[Sensitive question omitted]':String(message || '').slice(0,2000);
 const outcome=error?'error':result?.conversationId?.startsWith('dbctx.') && !result?.toolsUsed?.length?'clarification':result?.toolsUsed?.length?'answered':'unsupported';
 // Do not persist the signed context token (which contains replayable request state).
 const ref=conversationId?'db-ref.'+crypto.createHash('sha256').update(conversationId).digest('hex').slice(0,24):undefined;
 void logAudit({userId:user._id,role:user.role,conversationId:ref,question,normalizedQuestion:question.toLowerCase().replace(/\s+/g,' ').trim(),
  requestType:'database_chat',provider:'local',model:'database-only',intent:result?.intent || '',outcome,
  toolsUsed:result?.toolsUsed || [],answer:sensitive?'':String(result?.answer || '').slice(0,50000),success:outcome==='answered',errorMessage:error?'Database chat request failed.':''})
  .catch(()=>{});
}
module.exports={auditDatabaseQuestion};
