import {simulateHand} from './simulator.js';
import {cleanScenario,recordedSplit} from '../recorded-scenario.js';
import {publicModel} from '../opponent-model.js';
export const RECORDED_REQUIRED=32;
export function freezeCorpus(data,mode){
 const models=(data?.models||[]).map(publicModel).filter(m=>m.hands>=8),seen=new Set();
 const select=split=>(data?.[split]||[]).flatMap(row=>{
  const scenario=cleanScenario(row.scenario);if(!scenario||scenario.mode!==mode||recordedSplit(row.handId)!==split||seen.has(row.handId))return [];seen.add(row.handId);
  // Recorded snapshots never import population estimates learned from held-out hands.
  scenario.players.forEach((p,i)=>p.model=models.length?models[i%models.length]:publicModel());
  return [{handId:row.handId,ordinal:row.ordinal,scenario}];
 });
 return {version:1,mode,processedHands:data?.processedHands||0,models,train:select('train'),holdout:select('holdout')};
}
export function recordedPair(row,{seed,params,parent,mode,samples=32,repeats=2,deadline=Infinity}){
 const deltas=[];let changed=false;
 for(let i=0;i<repeats;i++){
  if(Date.now()>=deadline)return null;
  const options={scenario:row.scenario,seed:(seed+Math.imul(i+1,65537))>>>0,samples,recordTrace:true,beforeDecision(){if(Date.now()>=deadline)throw new RecordedDeadline();}};
  const run=policy=>simulateHand({...options,...(mode==='tournament'?{tournamentPolicy:policy,tournamentIncumbent:parent}:{policy,incumbent:parent})});
  try{const base=run(parent),candidate=run(params);deltas.push(candidate.reward-base.reward);changed||=candidate.decisionTrace!==base.decisionTrace;}catch(error){if(error instanceof RecordedDeadline)return null;throw error;}
 }
 return {delta:deltas.reduce((a,b)=>a+b,0)/deltas.length,changed};
}
class RecordedDeadline extends Error{}
export async function recordedScreen(report,params,parent,deadline,save,smoke=false){
 const rows=report.recorded?.train||[];report.recordedScreening??=[];
 const result=report.recordedScreening.find(s=>JSON.stringify(s.params)===JSON.stringify(params))||{params,deltas:[],changedPairs:0};
 if(!report.recordedScreening.includes(result))report.recordedScreening.push(result);
 for(let i=result.deltas.length;i<Math.min(smoke?1:32,rows.length);i++){
  const pair=recordedPair(rows[i],{seed:(report.seed+i*104729)>>>0,params,parent,mode:report.mode||'cash',deadline,samples:32});if(!pair)return null;
  result.deltas.push(pair.delta);result.changedPairs+=Number(pair.changed);await save();
 }
 return result;
}
export async function validateRecorded(report,parent,deadline,save,smoke=false){
 const rows=report.recorded?.holdout||[];report.recordedValidation??={deltas:[],handIds:[],samples:700};
 if(!report.recorded?.train.length)return true;
 const result=report.recordedValidation;
 for(let i=result.deltas.length;i<Math.min(smoke?1:RECORDED_REQUIRED,rows.length);i++){
  const pair=recordedPair(rows[i],{seed:(report.seed^0x80000000^Math.imul(i+1,104729))>>>0,params:report.candidate.params,parent,mode:report.mode||'cash',samples:smoke?32:700,repeats:4,deadline});if(!pair)return false;
  result.deltas.push(pair.delta);result.handIds.push(rows[i].handId);await save();
 }
 return true;
}
export function recordedGate(report,estimate){
 if(!report.recorded?.train.length)return [];
 const v=report.recordedValidation||{},result=estimate(v.deltas||[]),reasons=[];
 if(new Set(v.handIds||[]).size<RECORDED_REQUIRED||result.blocks<RECORDED_REQUIRED||v.samples!==700)reasons.push('32 distinct held-out recorded hands with full sampling required');
 if(result.lower99===null||result.lower99<=0)reasons.push('Recorded-scenario 99% lower bound must be positive');
 const train=new Set(report.recorded.train.map(r=>r.handId)),held=new Set(report.recorded.holdout.map(r=>r.handId));if((v.handIds||[]).length!==(v.deltas||[]).length||(v.handIds||[]).some(id=>train.has(id)||!held.has(id)||recordedSplit(id)!=='holdout'))reasons.push('Recorded training/holdout overlap or unrecognised evidence');
 return reasons;
}
