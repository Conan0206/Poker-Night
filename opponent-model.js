// Completed, public actions only. IDs are table-session IDs, never names or tokens.
export const MODEL_KEYS=['hands','vpip','pfr','actions','aggressive','facedBets','foldsToBet','callsToBet','raisesToBet'];
export function addCounts(a={},b={}){return Object.fromEntries(MODEL_KEYS.map(k=>[k,(a[k]||0)+(b[k]||0)]));}
export function handModels(hand){
 const models=new Map();
 for(const p of hand.results||[])if(typeof p.id==='string')models.set(p.id,{...addCounts(),hands:1});
 for(const row of hand.actions||[]){
  const m=models.get(row.actorId),type=row.action?.type;if(!m||!['fold','check','call','raise'].includes(type))continue;
  const faced=Number(row.context?.call)>0;
  if(row.street==='preflop'&&(type==='raise'||type==='call'&&faced))m.vpip=1;
  if(row.street==='preflop'&&type==='raise')m.pfr=1;
  if(type==='call'||type==='raise')m.actions++;
  if(type==='raise')m.aggressive++;
  if(faced){m.facedBets++;if(type==='fold')m.foldsToBet++;if(type==='call')m.callsToBet++;if(type==='raise')m.raisesToBet++;}
 }
 return models;
}
export function mergeCompletedModel(stored,observed={}){
 // These cover overlapping hands, so never add session counters to saved counters.
 return stored&&stored.hands>=(observed.hands||0)?{...observed,...stored}:observed;
}
export function publicModel(value={}){return Object.fromEntries(MODEL_KEYS.map(k=>[k,Number.isSafeInteger(value[k])&&value[k]>=0?value[k]:0]));}
