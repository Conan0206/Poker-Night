import {mkdir,readFile,writeFile,open,unlink,rename} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import os from 'node:os';
import {createDatabase} from '../database.js';
import {DEFAULT_POLICY,BASELINE_POLICY_ID,normalizePolicy,TRAINABLE_KEYS} from '../bot-policy.js';
import {simulateHand,seededRandom} from '../training/simulator.js';
import {estimate,promotionGate} from '../training/evaluation.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'.training');await mkdir(out,{recursive:true});
const args=process.argv.slice(2),smoke=args.includes('--smoke'),secondsArg=args.find(a=>a.startsWith('--seconds='));
const seconds=secondsArg?Number(secondsArg.split('=')[1]):900;if(!Number.isFinite(seconds)||seconds<5||seconds>900)throw Error('Training limit must be 5–900 seconds');
const deadline=Date.now()+seconds*1000,lockPath=join(out,'runner.lock'),checkpointPath=join(out,smoke?'smoke-checkpoint.json':'checkpoint.json');let lock;
try{lock=await open(lockPath,'wx');await lock.writeFile(String(process.pid));}catch(error){if(error.code!=='EEXIST')throw error;const pid=Number(await readFile(lockPath,'utf8'));let running=true;try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH')running=false;}if(running){console.log('Training already running; skipped.');process.exit(0);}await unlink(lockPath);lock=await open(lockPath,'wx');await lock.writeFile(String(process.pid));}
try{os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
const db=createDatabase(),styles=['incumbent','station','tight','aggressive'],groups=styles.flatMap(style=>[3,6].map(seats=>({style,seats,key:`${style}-${seats}`})));
async function atomicJSON(path,value){const temp=path+'.tmp';await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,path);}
const hash=createHash('sha256');for(const file of ['bot-policy.js','bot-tactics.js','bot-strategy.js','bot-ranges.js','training/simulator.js','training/evaluation.js','scripts/train-bots.js'])hash.update(await readFile(join(root,file)));const fingerprint=hash.digest('hex');
let report;
try{
 const active=await db.activePolicy();if(!active&&!smoke)throw Error('Database unavailable; training skipped without changing the live policy. Run npm run db:check.');
 const parent=active||{id:BASELINE_POLICY_ID,params:DEFAULT_POLICY};
 let saved;try{saved=JSON.parse(await readFile(checkpointPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 report=!smoke&&saved?.kind==='nightly'&&saved.parentId===parent.id&&saved.fingerprint===fingerprint&&!saved.complete?saved:{id:randomUUID(),kind:smoke?'smoke':'nightly',parentId:parent.id,fingerprint,seed:randomBytes(4).readUInt32LE(),startedAt:new Date().toISOString(),scope:'multiway cash heuristic tactic frequencies; fixed-stack duplicate deals; heads-up heuristic continuation (not a CFR strength guarantee)',screening:[],validation:{samples:700,deltas:[],groups:{}},complete:false};
 const timedOut=()=>Date.now()>=deadline;
 function block(params,group,seed,samples){const deltas=[];for(let seat=0;seat<group.seats;seat++){if(timedOut())return null;const options={seed,seats:group.seats,heroSeat:seat,incumbent:parent.params,style:group.style,samples,depth:[30,60,100,150][seed%4]};const baseline=simulateHand({...options,policy:parent.params});if(timedOut())return null;const candidate=simulateHand({...options,policy:params});deltas.push(candidate.reward-baseline.reward);}return deltas.reduce((n,v)=>n+v,0)/deltas.length;}
 if(!report.candidate){
  const random=seededRandom(report.seed),candidates=Array.from({length:smoke?1:3},()=>normalizePolicy(Object.fromEntries(Object.entries(parent.params).map(([key,value])=>[key,TRAINABLE_KEYS.includes(key)?value*(.8+random()*.4):value]))));
  for(let i=report.screening.length;i<candidates.length&&!timedOut();i++){
   const deltas=[];for(const group of groups.slice(0,smoke?1:groups.length)){const delta=block(candidates[i],group,(report.seed+groups.indexOf(group)*7919)>>>0,32);if(delta===null)break;deltas.push(delta);}
   if(deltas.length!==(smoke?1:groups.length))break;
   report.screening.push({params:candidates[i],...estimate(deltas)});await atomicJSON(checkpointPath,report);
  }
  if(report.screening.length===candidates.length){const winner=[...report.screening].sort((a,b)=>b.bb100-a.bb100)[0];report.candidate={id:'policy-'+report.id,params:winner.params};}
 }
 if(report.candidate){
  const goal=smoke?1:2000;
  while(report.validation.deltas.length<goal&&!timedOut()){
   const i=report.validation.deltas.length,group=groups[i%groups.length];
   // No screening deals enter validation, and each validation block has its own seed.
   const seed=(report.seed^0xA5A5A5A5^Math.imul(i+1,104729))>>>0;
   const delta=block(report.candidate.params,group,seed,700);if(delta===null)break;
   report.validation.deltas.push(delta);(report.validation.groups[group.key]??=[]).push(delta);await atomicJSON(checkpointPath,report);
  }
  report.complete=!smoke&&report.validation.deltas.length>=2000;
 }
 report.gate=promotionGate(report);report.updatedAt=new Date().toISOString();report.smoke=smoke;report.promoted=false;
 const stored=await db.saveTraining(report);if(!stored&&!smoke)throw Error('Training report could not be saved to the database; live policy unchanged.');
 if(!smoke&&report.gate.qualified)report.promoted=await db.promotePolicy(report);
 report.status=smoke?'smoke':report.promoted?'promoted':report.complete?'rejected':'collecting';
 await atomicJSON(join(out,report.id+'.json'),report);if(!smoke)await atomicJSON(checkpointPath,report);if(stored)await db.saveTraining(report);
 console.log(JSON.stringify({status:report.status,validationBlocks:report.validation.deltas.length,requiredBlocks:2000,report:join(out,report.id+'.json'),promoted:report.promoted,reasons:report.gate.reasons.slice(0,3)},null,2));
}catch(error){console.error('Training stopped:',error.message.startsWith('Database')||error.message.startsWith('Training report')?error.message:'Local simulation or report error; inspect local code and rerun.');process.exitCode=1;}
finally{await db.close();await lock.close();await unlink(lockPath).catch(()=>{});}
