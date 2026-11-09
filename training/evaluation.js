import {recordedGate} from './recorded-matches.js';
// The unit of uncertainty is a complete duplicate-deal block, not a seat/hand.
export function estimate(values){
 if(!values.length)return {blocks:0,bb100:0,lower99:null,standardError:null};
 const mean=values.reduce((n,v)=>n+v,0)/values.length;
 const variance=values.length>1?values.reduce((n,v)=>n+(v-mean)**2,0)/(values.length-1):Infinity;
 const se=Math.sqrt(variance/values.length);
 return {blocks:values.length,bb100:mean*100,standardError:Number.isFinite(se)?se*100:null,lower99:Number.isFinite(se)?(mean-2.576*se)*100:null};
}
export function promotionGate(report){
 // Validation uses new seeds and live-sized equity sampling. No partial-run promotion.
 const reasons=recordedGate(report,estimate);const result=estimate(report.validation?.deltas||[]);
 if(!report.complete)reasons.push('Evaluation did not complete');
 if(report.validation?.samples!==700)reasons.push('Full equity sampling required');
 if(result.blocks<2000)reasons.push('At least 2,000 independent validation blocks required');
 if(result.lower99===null||result.lower99<=0)reasons.push('99% lower confidence bound must be positive');
 for(const style of ['incumbent','station','tight','aggressive'])for(const seats of [3,6]){
  const values=(report.validation?.groups||{})[`${style}-${seats}`]||[];
  if(values.length<250)reasons.push(`Insufficient ${style}/${seats}-seat evaluation`);
  else if(estimate(values).bb100<0)reasons.push(`Regression against ${style}/${seats}-seat opponents`);
 }
 return {qualified:reasons.length===0,reasons,result};
}
