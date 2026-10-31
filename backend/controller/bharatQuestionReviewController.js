const User=require('../model/userModel');
const AiAuditLog=require('../model/AiAuditLog');
async function reviewDatabaseQuestions(req,res){
 try{
  const user=await User.findById(req.user?._id).select('role status').lean();
  if(!user || user.status==='inactive' || user.role!=='super_admin')return res.status(403).json({success:false,message:'Superadmin access required.'});
  const days=Number(req.query.days || 30);
  if(!Number.isInteger(days) || days<1 || days>90)return res.status(400).json({success:false,message:'days must be an integer from 1 to 90.'});
  const outcomes=req.query.outcome?[req.query.outcome]:['unsupported','clarification','error'];
  if(outcomes.some(v=>!['unsupported','clarification','error','answered'].includes(v)))return res.status(400).json({success:false,message:'Invalid outcome.'});
  const rows=await AiAuditLog.aggregate([
   {$match:{requestType:'database_chat',createdAt:{$gte:new Date(Date.now()-days*86400000)},outcome:{$in:outcomes},normalizedQuestion:{$nin:['','[sensitive question omitted]']}}},
   {$group:{_id:{question:'$normalizedQuestion',intent:'$intent',outcome:'$outcome'},count:{$sum:1},lastAsked:{$max:'$createdAt'}}},
   {$sort:{count:-1,lastAsked:-1,_id:1}},{$limit:50},
   {$project:{_id:0,question:'$_id.question',intent:'$_id.intent',outcome:'$_id.outcome',count:1,lastAsked:1}}
  ]).option({maxTimeMS:10000});
  return res.json({success:true,data:{days,groupsDisplayed:rows.length,limit:50,questions:rows}});
 }catch(error){return res.status(500).json({success:false,message:'Unable to review database-chat questions.'});}
}
module.exports={reviewDatabaseQuestions};
