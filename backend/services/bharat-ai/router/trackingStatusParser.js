// Allowlisted OrderTracking.currentStatus values, longest phrases first.
const statuses=['planning','under_casting','rolling_planning','rolling','forging_planning','forging','pit_cooling','inspection','annealing','normalizing','quenching','tempering','end_cutting_mill_inspection','bharat_inspection','cutting','machining','ready_for_dispatch','loading','shipped','out_for_delivery','delivered','on_hold','cancelled'];
function trackingStatus(text) {
 const hits=statuses.map(status=>{
  const phrase=status.replaceAll('_','[ _-]+');
  const match=text.match(new RegExp(`\\b${phrase}\\b`,'i'));
  return match?{status,phrase:match[0],index:match.index}:null;
 }).filter(Boolean).sort((a,b)=>b.phrase.length-a.phrase.length);
 const hit=hits[0];
 if(!hit)return null;
 // Generic delivery words remain Dispatch reports when Dispatch is explicitly requested.
 if(/\bdispatch(?:es)?\b/.test(text) && !/\btracking\b/.test(text) && !['ready_for_dispatch','out_for_delivery'].includes(hit.status))return null;
 if(!/\borders?\b|tracking/.test(text) && !['out_for_delivery','ready_for_dispatch','under_casting'].includes(hit.status))return null;
 return hit;
}
module.exports={trackingStatus,statuses};
