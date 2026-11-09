import {estimate} from './evaluation.js';

export function evaluationSeed(seed,index,validation){
 const value=(seed+Math.imul(index+1,104729))&0x7fffffff;
 return (validation?value|0x80000000:value)>>>0;
}

// Screening may reject a candidate, but can never approve a live policy.
// Use both nearby and wider bounded proposals instead of repeatedly testing near-copies.
export function proposePolicies(parent,bounds,normalize,keys,random,count=3){
 return Array.from({length:count},(_,i)=>normalize(Object.fromEntries(Object.entries(parent).map(([key,value])=>{
  if(!keys.includes(key))return [key,value];
  const [low,high]=bounds[key];
  return [key,i===0?value*(.6+random()*.8):low+random()*(high-low)];
 }))));
}

export function selectScreenedCandidate(screening){
 return screening.filter(s=>s.deltas.length&&s.changedPairs>0&&estimate(s.deltas).bb100>0)
  .sort((a,b)=>estimate(b.deltas).bb100-estimate(a.deltas).bb100)[0]||null;
}

export function screeningReason(screening){
 return screening.some(s=>s.changedPairs>0)?'No candidate showed positive gain in screening.':'Candidates made no different decisions in screening.';
}

export function earlyRejection(validation,minimum){
 const values=validation.deltas||[];if(values.length<minimum)return null;
 if(validation.changedPairs===0)return 'No decision changes observed during validation.';
 const result=estimate(values);
 if(result.standardError!==null&&result.bb100+2.576*result.standardError<0)return 'Candidate is clearly behind the baseline; stopped early.';
 return null;
}

// Independent seeds/contexts have separate keys; never reuse screening data as validation.
// Bounded to the small screening set; the callers cache screening baselines only.
export function cachedBaseline(cache,key,simulate){
 if(!cache.has(key))cache.set(key,simulate());
 return cache.get(key);
}
