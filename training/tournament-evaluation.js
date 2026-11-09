import {recordedGate} from './recorded-matches.js';
import {estimate} from './evaluation.js';
import {BOT_STYLE_IDS} from '../public/bot-styles.js';
export const TOURNAMENT_GROUPS=['incumbent','station','tight','aggressive'].flatMap(style=>[3,6].map(seats=>({style,seats,key:`${style}-${seats}`})));
export const TOURNAMENT_VALIDATION_BLOCKS=512;
export function tournamentPromotionGate(report){
 const reasons=recordedGate(report,estimate),validation=report.validation||{},result=estimate(validation.deltas||[]);
 if(report.mode!=='tournament'||report.metric!=='tournament-win-rate')reasons.push('Tournament win-rate evaluation required');
 if(!report.complete)reasons.push('Evaluation did not complete');
 if(validation.samples!==700)reasons.push('Full equity sampling required');
 if(result.blocks<TOURNAMENT_VALIDATION_BLOCKS)reasons.push('At least 512 independent tournament pairs required');
 if(result.lower99===null||result.lower99<=0)reasons.push('99% lower confidence bound on win-rate gain must be positive');
 for(const group of TOURNAMENT_GROUPS){const values=validation.groups?.[group.key]||[];
  if(values.length<64)reasons.push(`Insufficient ${group.key} tournament evaluation`);
  else if(estimate(values).bb100<0)reasons.push(`Win-rate regression against ${group.key}`);
 }
 for(const style of BOT_STYLE_IDS){
  const values=validation.personalities?.[style]||[];
  if(values.length<128)reasons.push(`Insufficient ${style} personality evaluation`);
  else if(estimate(values).bb100<0)reasons.push(`Win-rate regression for ${style} personality`);
 }
 if((validation.placementDeltas||[]).length!==result.blocks)reasons.push('Completed placement comparisons required');
 else if(estimate(validation.placementDeltas||[]).bb100<0)reasons.push('Mean finishing position regressed');
 return {qualified:reasons.length===0,reasons,result:{pairs:result.blocks,winRateGainPP:result.bb100,lower99PP:result.lower99,standardErrorPP:result.standardError}};
}
