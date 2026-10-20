import {rank} from './public/equity.js';
import {preflopQuality,boardFeatures} from './bot-ranges.js';
import {trainCfr} from './cfr.js';
const deck=[...'23456789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const handKey=cards=>[...cards].sort().join('');
const overlaps=(a,b)=>a.some(c=>b.includes(c));

// Public range assumptions remain an approximation. The solver does not see other hole cards.
export function publicRange(board,model={},samples=48,random=Math.random,include){
 const available=deck.filter(c=>!board.includes(c)),combos=[];let total=0;
 const observed=model.hands>=8,vpip=observed?clamp(model.vpip/model.hands,.12,.65):.3;
 const cutoff=model.raisedPreflop?(observed?clamp(.82-vpip*.55,.48,.76):.62):.43;
 for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
  const cards=[available[i],available[j]];let weight=clamp(.38+(preflopQuality(cards)-cutoff)*4,.025,1);
  if(model.aggressor){const f=boardFeatures(cards,board);if(f.category===0)weight*=(f.flushDraw||f.straightDraw)?.7:.22;else if(f.category>=3)weight=Math.max(.9,weight);}
  total+=weight;combos.push({cards,upto:total});
 }
 const selected=new Map();
 for(let n=0;n<samples;n++){
  const target=random()*total;let lo=0,hi=combos.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(combos[mid].upto<target)lo=mid+1;else hi=mid;}
  const cards=combos[lo].cards,key=handKey(cards);if(selected.has(key))selected.get(key).weight++;else selected.set(key,{cards,weight:1});
 }
 if(include&&!selected.has(handKey(include)))selected.set(handKey(include),{cards:[...include],weight:1});
 return [...selected.values()];
}

// One betting street, followed by showdown. Flop/turn leaves roll out the remaining
// board with no future betting; river leaves use exact ranks. At most one re-raise.
export function bettingTree(view){
 const call=Math.min(Math.max(0,view.bet-view.round),view.stack);
 const cap=Math.min(view.stack,call+(view.opponentStack??view.stack));
 function build(actor,committed,paid,lastRaise,aggression,checked,history){
  const target=Math.max(...committed),owed=Math.max(0,target-committed[actor]);
  const node={actor,key:history,actions:[]};
  const terminal=winner=>({terminal:true,winner,paid:[...paid]});
  if(owed){
   node.actions.push({type:'fold',next:terminal(1-actor)});
   const nextPaid=[...paid];nextPaid[actor]+=owed;
   node.actions.push({type:'call',next:{terminal:true,winner:null,paid:nextPaid}});
  }else node.actions.push({type:'check',next:checked?terminal(null):build(1-actor,committed,paid,lastRaise,aggression,true,history+'x')});
  if(cap>target&&aggression<2&&!(actor===0&&history===''&&!view.raiseAllowed)){
   const pot=view.pot+paid[0]+paid[1],minimum=Math.min(cap,target+lastRaise);
   const targets=new Set([.33,.75,1.25].map(f=>clamp(Math.round((target+(pot+owed)*f)/view.big)*view.big,minimum,cap)));
   if(cap-target<=pot*2)targets.add(cap);
   for(const amount of [...targets].sort((a,b)=>a-b)){
    if(amount<=target||amount-target<lastRaise&&amount!==[view.stack,call+(view.opponentStack??view.stack)][actor])continue;
    const nextCommitted=[...committed],nextPaid=[...paid];nextPaid[actor]+=amount-committed[actor];nextCommitted[actor]=amount;
    node.actions.push({type:'raise',amount:amount+view.round,next:build(1-actor,nextCommitted,nextPaid,Math.max(lastRaise,amount-target),aggression+1,false,history+'b'+amount)});
   }
  }
  return node;
 }
 return build(0,[0,call],[0,0],view.minRaise,call?1:0,!call&&!!view.latePosition,'');
}

export function solveHeadsUp(view,random=Math.random,{maxMs=850,samples=40,iterations=24000}={}){
 if(view.opponents!==1||view.board.length<3||view.board.length>5||view.stack<=0)return null;
 const known=[...view.hole,...view.board];
 if(view.hole.length!==2||known.some(c=>! /^[2-9TJQKA][shdc]$/.test(c))||new Set(known).size!==known.length)return null;
 const started=performance.now(),hero=publicRange(view.board,view.heroModel,samples,random,view.hole),villain=publicRange(view.board,view.opponentModels?.[0],samples,random);
 const pairs=[],ownIndex=hero.findIndex(h=>handKey(h.cards)===handKey(view.hole));let mass=0;
 const runouts=view.board.length===5?1:view.board.length===4?16:12;
 for(let i=0;i<hero.length;i++){
  if(performance.now()-started>maxMs*.7)return null;
  for(let j=0;j<villain.length;j++){
   const a=hero[i].cards,b=villain[j].cards;if(overlaps(a,b))continue;
   const pool=deck.filter(c=>!view.board.includes(c)&&!a.includes(c)&&!b.includes(c));let equity=0;
   for(let n=0;n<runouts;n++){
    const community=[...view.board];let first=-1;
    while(community.length<5){let pick;do{pick=Math.floor(random()*pool.length);}while(pick===first);first=pick;community.push(pool[pick]);}
    const left=rank([...a,...community]),right=rank([...b,...community]);equity+=left>right?1:left===right?.5:0;
   }
   mass+=hero[i].weight*villain[j].weight;pairs.push({hands:[i,j],equity:equity/runouts,upto:mass});
  }
 }
 if(!pairs.length)return null;
 const root=bettingTree(view);
 const result=trainCfr({root,iterations,burnIn:1000,maxMs:Math.max(30,maxMs-(performance.now()-started)),
  sample(){const target=random()*mass;let lo=0,hi=pairs.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(pairs[mid].upto<target)lo=mid+1;else hi=mid;}return pairs[lo];},
  infoKey:(node,deal)=>node.key+':'+node.actor+':'+deal.hands[node.actor],
  payoff(node,deal){const share=node.winner===null?deal.equity:node.winner===0?1:0;return share*(view.pot+node.paid[0]+node.paid[1])-node.paid[0];}
 });
 const infoKey=':0:'+ownIndex,info=result.infos.get(infoKey),frequencies=result.strategy(infoKey);
 if(!frequencies||info.visits<50)return null;
 let pick=random(),index=frequencies.length-1;for(let n=0;n<frequencies.length;n++){pick-=frequencies[n];if(pick<=0){index=n;break;}}
 const {type,amount}=root.actions[index];
 return {action:amount===undefined?{type}:{type,amount},frequencies:root.actions.map((a,i)=>({type:a.type,amount:a.amount,probability:frequencies[i]})),iterations:result.iterations,visits:info.visits,elapsedMs:performance.now()-started,engine:'sampled-heads-up-street-cfr'};
}
