import {handModels,addCounts,publicModel} from './opponent-model.js';
import {cleanScenario,recordedSplit} from './recorded-scenario.js';
export function learningStore({pool,init,failed}){return {
 async ingestRecordedHands(limit=50){
  if(!await init())return null;let client;
  try{
   const take=Math.max(1,Math.min(200,limit)),query='SELECT h.id,h.mode,h.results FROM poker_hands h LEFT JOIN poker_modelled_hands m ON m.hand_id=h.id WHERE m.hand_id IS NULL ORDER BY ';
   const old=await pool.query(query+'h.finished_at,h.id LIMIT $1',[Math.ceil(take/2)]),recent=await pool.query(query+'h.finished_at DESC,h.id DESC LIMIT $1',[Math.floor(take/2)]);
   const hands=[...new Map([...old.rows,...recent.rows].map(h=>[h.id,h])).values()];
   if(!hands.length)return {processed:0,scenarios:0};
   const ids=hands.map(h=>h.id),marks=ids.map((_,i)=>'$'+(i+1)).join(',');
   const {rows:actions}=await pool.query('SELECT hand_id,ordinal,actor_id,is_bot,street,context,action FROM poker_hand_actions WHERE hand_id IN ('+marks+') ORDER BY hand_id,ordinal',ids);
   client=await pool.connect();await client.query('BEGIN');await client.query('SELECT singleton FROM poker_learning_lock WHERE singleton=1 FOR UPDATE');
   const claimed=await client.query('INSERT INTO poker_modelled_hands(hand_id) VALUES '+ids.map((_,i)=>'($'+(i+1)+')').join(',')+' ON CONFLICT DO NOTHING RETURNING hand_id',ids);
   const owned=new Set(claimed.rows.map(r=>r.hand_id)),updates=new Map();let scenarios=0;
   for(const hand of hands){if(!owned.has(hand.id))continue;
    const split=recordedSplit(hand.id);hand.actions=actions.filter(a=>a.hand_id===hand.id).map(a=>({...a,actorId:a.actor_id,bot:a.is_bot}));
    for(const [actor,counts] of handModels(hand)){const key=[hand.mode,split,actor].join(':');const old=updates.get(key);updates.set(key,{mode:hand.mode,split,actor,counts:addCounts(old?.counts,counts)});}
    const eligible=hand.actions.filter(a=>a.bot).map(a=>({ordinal:a.ordinal,scenario:cleanScenario(a.context?.scenario)})).filter(a=>a.scenario?.mode===hand.mode);
    if(eligible.length){const selected=eligible[parseInt(hand.id.replaceAll('-','').slice(-6),16)%eligible.length];await client.query('INSERT INTO poker_training_scenarios(hand_id,mode,split,ordinal,scenario) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[hand.id,hand.mode,split,selected.ordinal,JSON.stringify(selected.scenario)]);scenarios++;}
   }
   for(const u of updates.values()){
    const {rows}=await client.query('SELECT counts FROM poker_opponent_models WHERE mode=$1 AND split=$2 AND actor_id=$3 FOR UPDATE',[u.mode,u.split,u.actor]);
    const counts=addCounts(rows[0]?.counts,u.counts);
    await client.query('INSERT INTO poker_opponent_models(mode,split,actor_id,counts) VALUES($1,$2,$3,$4) ON CONFLICT(mode,split,actor_id) DO UPDATE SET counts=$4,updated_at=now()',[u.mode,u.split,u.actor,JSON.stringify(counts)]);
   }
   await client.query('COMMIT');return {processed:owned.size,scenarios};
  }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});failed(error);return null;}finally{client?.release();}
 },
 async opponentModels(mode='cash'){
  if(!await init())return null;try{const {rows}=await pool.query('SELECT actor_id,counts FROM poker_opponent_models WHERE mode=$1',[mode]);const models={};for(const r of rows)models[r.actor_id]=addCounts(models[r.actor_id],publicModel(r.counts));return models;}catch(error){failed(error);return null;}
 },
 async recordedCorpus(mode='cash'){
  if(!await init())return null;try{
   const data={version:1,mode,train:[],holdout:[],models:[],capturedAt:new Date().toISOString()};
   for(const split of ['train','holdout']){const {rows}=await pool.query('SELECT hand_id,ordinal,scenario FROM poker_training_scenarios WHERE mode=$1 AND split=$2 ORDER BY hand_id LIMIT 64',[mode,split]);data[split]=rows.map(r=>({handId:r.hand_id,ordinal:r.ordinal,scenario:cleanScenario(r.scenario)})).filter(r=>r.scenario&&r.scenario.mode===mode);}
   const {rows}=await pool.query("SELECT counts FROM poker_opponent_models WHERE mode=$1 AND split='train' ORDER BY actor_id LIMIT 128",[mode]);data.models=rows.map(r=>publicModel(r.counts)).filter(m=>m.hands>=8);
   const stats=await pool.query('SELECT count(*) AS hands FROM poker_modelled_hands');data.processedHands=Number(stats.rows[0].hands);return data;
  }catch(error){failed(error);return null;}
 }
};}
