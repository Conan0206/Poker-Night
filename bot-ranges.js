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
 const count=clamp(opponents,1,7),samples=Number.isInteger(view.equitySamples)?clamp(view.equitySamples,16,700):(board.length?700:500);let equity=0;
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

