import test from 'node:test';
import assert from 'node:assert/strict';
import {trainCfr,regretStrategy} from './cfr.js';
const rng=()=>{let seed=71;return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};};
test('regret matching normalizes only positive regrets',()=>{
 assert.deepEqual(regretStrategy([-5,2,6]),[0,.25,.75]);assert.deepEqual(regretStrategy([-1,0]),[.5,.5]);
});
test('CFR approaches Kuhn poker equilibrium and low best-response exploitability',()=>{
 const random=rng(),deals=[];for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(a!==b)deals.push([a,b]);
 const terminal=(winner,paid)=>({terminal:true,winner,paid});
 const response=(actor,key,paid)=>({actor,key,actions:[{next:terminal(1-actor,paid)},{next:terminal(null,[1,1])}]});
 const root={actor:0,key:'',actions:[{next:{actor:1,key:'x',actions:[{next:terminal(null,[0,0])},{next:response(0,'xb',[0,1])}]}},{next:response(1,'b',[1,0])}]};
 const infoKey=(node,d)=>node.actor+':'+d[node.actor]+':'+node.key;
 const payoff=(node,d)=>{const won=node.winner??(d[0]>d[1]?0:1);return (won===0?2+node.paid[0]+node.paid[1]:0)-1-node.paid[0];};
 const solved=trainCfr({root,sample:()=>deals[Math.floor(random()*6)],infoKey,payoff,iterations:100000,burnIn:1000});
 function ev(node,d,override,player){
  if(node.terminal)return payoff(node,d);
  const key=infoKey(node,d),strategy=node.actor===player?override.get(key):solved.strategy(key);
  return node.actions.reduce((sum,a,i)=>sum+strategy[i]*ev(a.next,d,override,player),0);
 }
 const value=deals.reduce((sum,d)=>sum+ev(root,d,null,-1),0)/6;assert.ok(Math.abs(value+1/18)<.025,`Kuhn value ${value}`);
 const best=[];for(let player=0;player<2;player++){
  const keys=[...solved.infos.keys()].filter(k=>k.startsWith(player+':'));let result=player===0?-Infinity:Infinity;
  for(let mask=0;mask<2**keys.length;mask++){
   const strategy=new Map(keys.map((key,i)=>[key,(mask>>i)&1?[0,1]:[1,0]]));
   const score=deals.reduce((sum,d)=>sum+ev(root,d,strategy,player),0)/6;result=player===0?Math.max(result,score):Math.min(result,score);
  }best.push(result);
 }
 assert.ok(best[0]-best[1]<.06,`Nash gap ${best[0]-best[1]}`);
});
