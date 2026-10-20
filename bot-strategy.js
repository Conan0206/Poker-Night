import {estimate} from './public/equity.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function preflopQuality(hole){
 const ranks=hole.map(c=>'23456789TJQKA'.indexOf(c[0])+2).sort((a,b)=>b-a),[high,low]=ranks;
 if(high===low)return .46+high*.035;
 const gap=high-low,suited=hole[0][1]===hole[1][1];
 return clamp((high+low)/38+(suited?.075:0)+(gap===1?.055:gap===2?.015:0)-(gap>4?.1:0)+(high===14?.035:0),0,1);
}

// Only this deliberately limited view reaches the bot: no deck or opponent hole cards.
export function decideBot(view,random=Math.random){
 const {hole,board,opponents,pot,bet,round,stack,big,minRaise,raiseAllowed,latePosition}=view;
 const call=Math.max(0,bet-round),cost=Math.min(call,stack),maximum=round+stack;
 const canRaise=raiseAllowed&&maximum>bet;
 const minimum=Math.min(bet+minRaise,maximum);
 const equity=estimate({hole,board,opponents:Math.max(1,opponents),samples:board.length?500:350},random);
 const quality=preflopQuality(hole),preflop=board.length===0;
 const odds=cost/(Math.max(0,pot)+cost||1),commitment=cost/Math.max(1,stack);
 const margin=.025+Math.min(.1,commitment*.12)+(preflop&&call>big*4?.035:0);
 const raiseTo=amount=>({type:'raise',amount:clamp(Math.round(amount/big)*big,minimum,maximum)});
 const passive=()=>({type:call?'call':'check'});
 if(call&&equity<odds+margin){
  // Small, cheap draws sometimes continue, but expensive weak hands are released.
  if(equity<odds-.035||commitment>.18||random()>.16)return {type:'fold'};
 }
 if(preflop){
  const premium=quality>=.84;
  if(canRaise&&premium&&equity>odds+.1&&random()<.86)return raiseTo(Math.max(bet*3,big*3)+(call?0:big));
  if(canRaise&&bet<=big&&quality>=(latePosition?.55:.64)&&random()<.78)return raiseTo(big*(opponents>3?3.5:2.5));
  if(canRaise&&call>0&&quality>.73&&equity>.61&&random()<.35)return raiseTo(bet*3);
  if(call>big*6&&quality<.6&&equity<odds+.12)return {type:'fold'};
  return passive();
 }
 const valueThreshold=opponents===1?.68:Math.min(.86,.62+opponents*.045);
 const suits=board.map(c=>c[1]);const wet=suits.some(s=>suits.filter(v=>v===s).length>=3);
 if(canRaise&&equity>valueThreshold&&(random()<.8||equity>.97&&latePosition)){
  const sizing=equity>.9?.85:wet?.72:.55;
  return raiseTo(bet+Math.max(minRaise,(pot+call)*sizing));
 }
 // Occasional positional bluffs when checked to; fewer into multiple opponents.
 if(!call&&canRaise&&latePosition&&opponents<=2&&equity>.18&&equity<.52&&random()<(opponents===1?.12:.045))return raiseTo(Math.max(big,pot*.45));
 return passive();
}

export function botThinkDelay({call,pot,stack,street},random=Math.random){
 const difficult=call>0&&(call>pot*.45||call>stack*.2);
 return Math.round(1500+random()*2200+(difficult?1000+random()*1700:0)+(street==='river'?random()*800:0));
}
