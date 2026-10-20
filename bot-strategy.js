import {preflopQuality,boardFeatures,rangeEquity} from './bot-ranges.js';
export {preflopQuality,boardFeatures,rangeEquity} from './bot-ranges.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const value=c=>'23456789TJQKA'.indexOf(c[0])+2;
export function decideBot(view,random=Math.random){
 const {hole,board,opponents,pot,bet,round,stack,big,minRaise,raiseAllowed,latePosition}=view;
 const call=Math.max(0,bet-round),cost=Math.min(call,stack),maximum=round+stack;
 const canRaise=raiseAllowed&&maximum>bet,minimum=Math.min(bet+minRaise,maximum);
 const raiseTo=amount=>({type:'raise',amount:clamp(Math.round(amount/big)*big,minimum,maximum)});
 const passive=()=>({type:call?'call':'check'});
 const quality=preflopQuality(hole),equity=rangeEquity(view,random),odds=cost/(Math.max(0,pot)+cost||1);
 const commitment=cost/Math.max(1,stack),preflop=board.length===0;
 const effective=Math.min(maximum,view.effectiveStack||maximum),depth=effective/big,spr=effective/Math.max(big,pot);
 const position=view.position??(latePosition?1:0),raises=view.raises??(bet>big?1:0);
 const [high,low]=hole.map(value).sort((a,b)=>b-a),suited=hole[0][1]===hole[1][1];
 const premium=high===low&&high>=12||high===14&&low===13;
 if(preflop){
  if(bet<=big){
   const threshold=opponents===1?.36:position>.65?.46:position>.3?.55:.61;
   if(canRaise&&depth<=12&&quality>threshold+.06)return raiseTo(maximum);
   if(canRaise&&quality>=threshold&&random()<.94)return raiseTo(big*((opponents>3?3:2.5)+(view.limpers||0)));
   if(!call)return passive();
   // Cheap blind defences can continue; most other entries raise or fold.
   if(round>0&&call<=big&&quality>.37&&equity>odds+.02)return passive();
   return {type:'fold'};
  }
  if(call&&equity<odds+.015+(commitment>.4?.035:0))return {type:'fold'};
  if(canRaise){
   if(premium&&random()<.95){if(depth<=28||raises>=2&&effective<=bet*2.6)return raiseTo(maximum);return raiseTo(bet*(raises>=2?2.25:latePosition?3:3.8));}
   if(raises<=1&&quality>.77&&equity>odds+.12&&random()<.65)return raiseTo(bet*(latePosition?3:3.8));
   const blocker=suited&&high===14&&low<=5||suited&&high===13&&low>=10;
   if(raises<=1&&bet<=big*4&&depth>=35&&blocker&&random()<(latePosition?.28:.17))return raiseTo(bet*(latePosition?3.2:4));
  }
  if(call>big*8&&quality<.68&&equity<odds+.1)return {type:'fold'};
  return passive();
 }
 const f=boardFeatures(hole,board),draw=f.flushDraw||f.straightDraw;
 const opponentsAggressive=(view.opponentModels||[]).some(m=>m.hands>=8&&m.actions>0&&m.aggressive/m.actions>.45);
 const margin=.012+(commitment>.35?.025:0)+(opponents>2?.025:0)-(opponentsAggressive?.012:0);
 if(call&&equity<odds+margin){
  // Draws may realize implied value against small bets with chips behind.
  if(!(draw&&board.length<5&&commitment<.15&&equity>odds-.025))return {type:'fold'};
 }
 if(!canRaise)return passive();
 if(call){
  const valueThreshold=opponents===1?.76:.85;
  if(equity>valueThreshold&&random()<.91){if(spr<1.6&&equity>.82)return raiseTo(maximum);return raiseTo(bet+Math.max(minRaise,(pot+call)*(f.wet?.8:.65)));}
  if(draw&&board.length<5&&opponents<=2&&equity>.36&&commitment<.25&&raises<2&&random()<.29)return raiseTo(bet+Math.max(minRaise,(pot+call)*.7));
  return passive();
 }
 const valueThreshold=opponents===1?.59:Math.min(.82,.62+opponents*.035);
 if(equity>valueThreshold){
  const frequency=equity>.95?.99:latePosition?.9:.79;
  if(random()<frequency){if(spr<1.25&&equity>.8)return raiseTo(maximum);const sizing=board.length===5&&equity>.88&&spr>2?1.15:f.wet?.75:equity>.85?.8:.5;return raiseTo(Math.max(big,pot*sizing));}
 }
 const initiative=view.initiative||view.preflopAggressor;
 if(board.length===3&&initiative&&opponents<=2&&!f.monotone&&equity>.23&&random()<(f.wet?.48:.76))return raiseTo(Math.max(big,pot*(f.wet?.65:.33)));
 if(draw&&board.length<5&&equity>.26&&opponents<=2&&random()<(latePosition?.65:.43))return raiseTo(Math.max(big,pot*.65));
 const bluffCandidate=board.length===5?f.category===0||f.nutBlocker:f.category===0&&quality>.42;
 if(latePosition&&opponents<=2&&bluffCandidate&&equity<.48&&random()<(opponents===1?(f.nutBlocker?.32:.2):.065))return raiseTo(Math.max(big,pot*(board.length===5?.8:.55)));
 return passive();
}

export function botThinkDelay({call,pot,stack,street},random=Math.random){
 const difficult=call>0&&(call>pot*.45||call>stack*.2);
 return Math.round(1500+random()*2200+(difficult?1000+random()*1700:0)+(street==='river'?random()*800:0));
}

