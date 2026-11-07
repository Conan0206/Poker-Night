import {randomInt} from 'node:crypto';

// A preference for reducing variance, independent of hidden cards or training policy.
const twiceChance=Object.freeze({tag:.65,lag:.35,fish:.5,rock:.8});
export function chooseBotRuns(style,random=()=>randomInt(1_000_000)/1_000_000){
 return random()<(twiceChance[style]??.5)?2:1;
}
