import {rank} from './public/equity.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const value=c=>'23456789TJQKA'.indexOf(c[0])+2;
const category=cards=>Math.floor(rank(cards)/15**5);
export function preflopQuality(hole){
 const [high,low]=hole.map(value).sort((a,b)=>b-a);
 if(high===low)return .46+high*.035;
 const gap=high-low,suited=hole[0][1]===hole[1][1];
 return clamp((high+low)/38+(suited?.075:0)+(gap===1?.055:gap===2?.015:0)-(gap>4?.1:0)+(high===14?.035:0),0,1);
}
export function boardFeatures(hole,board){
 const all=[...hole,...board],ranks=new Set(all.map(value));if(ranks.has(14))ranks.add(1);
 const flushDraw=board.length<5&&[...'shdc'].some(s=>all.filter(c=>c[1]===s).length===4&&hole.some(c=>c[1]===s));
 let straightDraw=false;
 if(board.length<5)for(let high=5;high<=14;high++){const run=Array.from({length:5},(_,i)=>high-i);if(run.filter(r=>ranks.has(r)).length===4&&hole.some(c=>run.includes(value(c))||value(c)===14&&run.includes(1)))straightDraw=true;}
 const counts=[...'shdc'].map(s=>board.filter(c=>c[1]===s).length);
 const sorted=[...new Set(board.map(value))].sort((a,b)=>a-b);
 const connected=sorted.some((r,i)=>i>1&&r-sorted[i-2]<=4);
 const nutBlocker=hole.some(c=>c[0]==='A'&&board.filter(b=>b[1]===c[1]).length>=3);
 return {flushDraw,straightDraw,nutBlocker,wet:Math.max(0,...counts)>=2||connected,monotone:Math.max(0,...counts)>=3,paired:new Set(board.map(c=>c[0])).size<board.length,category:board.length?category(all):0};
}

// Sample plausible ranges from public betting and observed frequencies, never hidden cards.
export function rangeEquity(view,random=Math.random){
 const {hole,board,opponents}=view,known=[...hole,...board];
 if(hole.length!==2||board.length>5||new Set(known).size!==known.length||known.some(c=>! /^[2-9TJQKA][shdc]$/.test(c)))throw Error('Invalid bot cards');
 const deck=[...'23456789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s)).filter(c=>!known.includes(c));
 const count=clamp(opponents,1,7),samples=board.length?700:500;let equity=0;
 for(let sample=0;sample<samples;sample++){
  const pool=deck.slice(),villains=[];
  for(let n=0;n<count;n++){
   const model=view.opponentModels?.[n]||{},observed=model.hands>=8;
   const vpip=observed?clamp(model.vpip/model.hands,.12,.65):.3;
   const raised=model.raisedPreflop??(!board.length&&view.bet>view.big);
   const cutoff=raised?(observed?clamp(.82-vpip*.55,.48,.76):.62):.43;
   let a,b,cards;
   for(let attempt=0;attempt<16;attempt++){
    a=Math.floor(random()*pool.length);b=Math.floor(random()*(pool.length-1));if(b>=a)b++;
    cards=[pool[a],pool[b]];let weight=clamp(.38+(preflopQuality(cards)-cutoff)*4,.025,1);
    if(board.length&&model.aggressor){const made=category([...cards,...board]);if(made===0){const f=boardFeatures(cards,board);weight*=(f.flushDraw||f.straightDraw)?.7:.22;}else if(made>=3)weight=Math.max(weight,.9);}
    if(random()<weight)break;
   }
   pool.splice(Math.max(a,b),1);pool.splice(Math.min(a,b),1);villains.push(cards);
  }
  const community=board.slice();while(community.length<5)community.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
  const own=rank([...hole,...community]);let ties=1,lost=false;
  for(const cards of villains){const other=rank([...cards,...community]);if(other>own){lost=true;break;}if(other===own)ties++;}
  if(!lost)equity+=1/ties;
 }
 return equity/samples;
}

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

