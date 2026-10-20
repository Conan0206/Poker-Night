// Keep search off the Socket.IO event loop. Two jobs maximum; bounded fallback under load.
import {Worker} from 'node:worker_threads';
import {decideBot} from './bot-strategy.js';
const slots=[];let nextId=0;
export function chooseBotAction(view,deadline=Date.now()+1500){
 const fallback=()=>({action:decideBot(view),source:'range-heuristic'});
 const budget=Math.min(850,deadline-Date.now()-150);
 if(view.board.length<3||view.opponents!==1||budget<200)return Promise.resolve(fallback());
 let slot=slots.find(s=>!s.busy);
 if(!slot){if(slots.length>=2)return Promise.resolve(fallback());slot={worker:new Worker(new URL('./bot-worker.js',import.meta.url)),busy:false};slot.worker.unref();slots.push(slot);const created=slot;created.worker.on('error',()=>{});created.worker.on('exit',()=>{const i=slots.indexOf(created);if(i>=0)slots.splice(i,1);});}
 slot.busy=true;const current=slot,id=++nextId;
 return new Promise(resolve=>{
  let finished=false;
  const finish=(result,terminate=false)=>{
   if(finished)return;finished=true;clearTimeout(timer);current.worker.off('message',message);current.worker.off('error',error);current.worker.off('exit',error);
   current.busy=false;
   if(terminate){const index=slots.indexOf(current);if(index>=0)slots.splice(index,1);current.worker.terminate().catch(()=>{});}else current.worker.unref();
   resolve(result||fallback());
  };
  const message=data=>{if(data.id===id)finish(data.result);};
  const error=()=>finish(null,true);
  const timer=setTimeout(()=>finish(null,true),budget+100);
  current.worker.on('message',message);current.worker.once('error',error);current.worker.once('exit',error);current.worker.ref();
  current.worker.postMessage({id,view,budget});
 });
}
export async function closeBotWorkers(){const workers=slots.splice(0);await Promise.all(workers.map(s=>s.worker.terminate()));}
