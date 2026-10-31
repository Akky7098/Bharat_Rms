// Reuse the attendance API's service: it enforces superadmin-only history access
// and merges check-in, periodic checkpoints and checkout using the same rules.
async function employeeLocationReport({employee,period,user,getHistory,history=false}){
 if(user.role!=='super_admin')return 'Only superadmin can view employee location history, matching attendance-module permissions.';
 if(!employee)return 'Whose saved location do you need? Please give one employee’s full name.';
 if(period.allTime || period.dateFrom!==period.dateTo)return 'Please request one date for saved location history, for example “Deepak Arya location today”.';
 const data=await getHistory(employee._id,{date:period.dateFrom},user);
 const points=(data.history || []).filter(p=>p.capturedAt && Number.isFinite(new Date(p.capturedAt).getTime()))
  .sort((a,b)=>new Date(b.capturedAt)-new Date(a.capturedAt));
 let answer=`### Saved employee location\nEmployee: ${employee.name}\nDate: ${period.dateFrom} · Asia/Kolkata\nSaved checkpoints: ${points.length}\n\n`;
 if(!points.length)return answer+'No saved location checkpoint exists for this employee on this date. Their location is unknown; this does not mean they were absent.';
 const shown=history?points.slice(0,50):points.slice(0,1);
 for(const [i,p] of shown.entries()){
  answer+=`### ${history?i+1+'. checkpoint':'Latest saved checkpoint'}\nCaptured: ${new Date(p.capturedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST\nStatus: ${String(p.locationStatus || 'unknown').replaceAll('_',' ')}\nSource: ${p.source || 'Not recorded'}\nAddress: ${p.locationAddress || 'Not recorded'}\n`;
  if(Number.isFinite(p.accuracy))answer+=`GPS accuracy: ${p.accuracy} metres\n`;
  if(typeof p.latitude==='number' && typeof p.longitude==='number' && p.latitude>=-90 && p.latitude<=90 && p.longitude>=-180 && p.longitude<=180)answer+=`Map: https://www.google.com/maps?q=${p.latitude},${p.longitude}\n`;
  answer+='\n';
 }
 if(history && points.length>shown.length)answer+=`Displaying ${shown.length} of ${points.length} saved checkpoints, newest first.\n`;
 return answer+'This is a saved checkpoint, not live location. No new GPS capture was requested.';
}
module.exports={employeeLocationReport};
