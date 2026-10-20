// Chance-sampled CFR. Information sets contain only the acting player's private state.
// Regrets are signed; regret matching uses their positive part (standard CFR, not CFR+).
export function regretStrategy(regrets){
 const positive=regrets.map(r=>Math.max(0,r)),sum=positive.reduce((a,b)=>a+b,0);
 return sum?positive.map(r=>r/sum):positive.map(()=>1/positive.length);
}
export function trainCfr({root,sample,infoKey,payoff,iterations=24000,burnIn=1000,maxMs=Infinity}){
 const infos=new Map(),started=performance.now();let completed=0;
 function walk(node,deal,reach,update,weight){
  if(node.terminal)return payoff(node,deal);
  const actor=node.actor,key=infoKey(node,deal);let info=infos.get(key);
  if(!info){info={regrets:node.actions.map(()=>0),sum:node.actions.map(()=>0),visits:0};infos.set(key,info);}
  const strategy=regretStrategy(info.regrets),values=[];let value=0;
  for(let a=0;a<node.actions.length;a++){
   const next=[...reach];next[actor]*=strategy[a];
   values[a]=walk(node.actions[a].next,deal,next,update,weight);value+=strategy[a]*values[a];
  }
  if(actor===update){
   const sign=actor===0?1:-1;
   for(let a=0;a<strategy.length;a++){
    info.regrets[a]+=reach[1-actor]*sign*(values[a]-value);
    info.sum[a]+=weight*reach[actor]*strategy[a];
   }
   info.visits++;
  }
  return value;
 }
 for(let i=0;i<iterations;i++){
  if(i&&i%128===0&&performance.now()-started>maxMs)break;
  const deal=sample(),weight=Math.max(0,i-burnIn);
  walk(root,deal,[1,1],0,weight);walk(root,deal,[1,1],1,weight);completed++;
 }
 function strategy(key){const info=infos.get(key);if(!info)return null;const sum=info.sum.reduce((a,b)=>a+b,0);return sum?info.sum.map(v=>v/sum):regretStrategy(info.regrets);}
 return {infos,strategy,iterations:completed,elapsedMs:performance.now()-started};
}
