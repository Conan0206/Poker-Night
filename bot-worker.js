import {parentPort} from 'node:worker_threads';
import {solveHeadsUp} from './bot-solver.js';
import {decideBot} from './bot-strategy.js';
parentPort.on('message',({id,view,budget})=>{
 try{
  const solved=solveHeadsUp(view,Math.random,{maxMs:budget});
  parentPort.postMessage({id,result:solved?{action:solved.action,source:solved.engine,iterations:solved.iterations}:{action:decideBot(view),source:'range-heuristic'}});
 }catch{parentPort.postMessage({id,result:{action:decideBot(view),source:'range-heuristic'}});}
});
