import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import os from 'node:os';
import {createDatabase} from '../database.js';
import {DEFAULT_POLICY,BASELINE_POLICY_ID,normalizePolicy,TRAINABLE_KEYS,POLICY_BOUNDS} from '../bot-policy.js';
import {simulateHand,seededRandom} from '../training/simulator.js';
import {BOT_STYLE_IDS} from '../public/bot-styles.js';
import {promotionGate} from '../training/evaluation.js';
import {acquireLock} from '../training/run-lock.js';
import {proposePolicies,selectScreenedCandidate,screeningReason,earlyRejection,cachedBaseline,evaluationSeed} from '../training/screening.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'.training');await mkdir(out,{recursive:true});
const args=process.argv.slice(2),smoke=args.includes('--smoke'),secondsArg=args.find(a=>a.startsWith('--seconds='));
const seconds=secondsArg?Number(secondsArg.split('=')[1]):900;if(!Number.isFinite(seconds)||seconds<5||seconds>900)throw Error('Training limit must be 5–900 seconds');
const deadline=Date.now()+seconds*1000,lockPath=join(out,'runner.lock'),checkpointPath=join(out,smoke?'smoke-checkpoint.json':'checkpoint.json'),release=await acquireLock(lockPath);
if(!release){console.log('Training already running; skipped.');process.exit(0);}
try{os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
const db=createDatabase(),styles=['incumbent','station','tight','aggressive'],groups=styles.flatMap(style=>[3,6].map(seats=>({style,seats,key:`${style}-${seats}`})));
async function atomicJSON(path,value){const temp=path+'.tmp';await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,path);}
const hash=createHash('sha256');for(const file of ['bot-policy.js','public/bot-styles.js','tournament-policy.js','bot-tactics.js','bot-strategy.js','bot-ranges.js','training/simulator.js','training/evaluation.js','training/screening.js','scripts/train-bots.js'])hash.update(await readFile(join(root,file)));const fingerprint=hash.digest('hex');
let report;
try{
 const active=await db.activePolicy();if(!active&&!smoke)throw Error('Database unavailable; training skipped without changing the live policy. Run npm run db:check.');
 const parent=active||{id:BASELINE_POLICY_ID,params:DEFAULT_POLICY};
 let saved;try{saved=JSON.parse(await readFile(checkpointPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 report=!smoke&&saved?.kind==='nightly'&&saved.parentId===parent.id&&saved.fingerprint===fingerprint&&!saved.complete&&!saved.screeningRejected&&!saved.earlyRejected?saved:{id:randomUUID(),kind:smoke?'smoke':'nightly',parentId:parent.id,fingerprint,seed:randomBytes(4).readUInt32LE(),startedAt:new Date().toISOString(),scope:'multiway cash heuristic tactic frequencies; fixed-stack duplicate deals; heads-up heuristic continuation (not a CFR strength guarantee)',phase:'screening',screening:[],validation:{samples:700,deltas:[],groups:{},changedPairs:0},complete:false};
 const timedOut=()=>Date.now()>=deadline,baselineCache=new Map();
 function block(params,group,seed,samples,index){
  const deltas=[];let changed=false;
  for(let seat=0;seat<group.seats;seat++){
   if(timedOut())return null;
   const options={seed,seats:group.seats,heroSeat:seat,incumbent:parent.params,style:group.style,samples,depth:[30,60,100,150][Math.floor(index/groups.length)%4],botStyles:Array.from({length:group.seats},(_,i)=>BOT_STYLE_IDS[(Math.floor(index/(groups.length*4))+i)%BOT_STYLE_IDS.length]),recordTrace:true};
   const simulate=()=>simulateHand({...options,policy:parent.params});
   const baseline=samples===32?cachedBaseline(baselineCache,[seed,group.key,seat,samples,options.depth,options.botStyles.join(',')].join(':'),simulate):simulate();
   if(timedOut())return null;
   const candidate=simulateHand({...options,policy:params});
   deltas.push(candidate.reward-baseline.reward);changed ||= candidate.decisionTrace!==baseline.decisionTrace;
  }
  return {delta:deltas.reduce((n,v)=>n+v,0)/deltas.length,changed};
 }
 if(!report.candidate&&!report.screeningRejected){
  const candidates=proposePolicies(parent.params,POLICY_BOUNDS,normalizePolicy,TRAINABLE_KEYS,seededRandom(report.seed),smoke?1:3),goal=smoke?1:128;
  for(let c=0;c<candidates.length&&!timedOut();c++){
   const screening=report.screening[c]??(report.screening[c]={params:candidates[c],deltas:[],changedPairs:0});
   for(let i=screening.deltas.length;i<goal&&!timedOut();i++){
    const group=groups[i%groups.length],result=block(screening.params,group,evaluationSeed(report.seed,i,false),32,i);
    if(!result)break;screening.deltas.push(result.delta);screening.changedPairs+=Number(result.changed);await atomicJSON(checkpointPath,report);
   }
  }
  if(report.screening.length===candidates.length&&report.screening.every(s=>s.deltas.length===goal)){
   const winner=smoke?report.screening[0]:selectScreenedCandidate(report.screening);
   if(winner){report.candidate={id:'policy-'+report.id,params:winner.params};report.phase='validation';}
   else{report.screeningRejected=true;report.rejectionReason=screeningReason(report.screening);}
  }
 }
 if(report.candidate){
  const goal=smoke?1:2000;
  while(report.validation.deltas.length<goal&&!timedOut()){
   const i=report.validation.deltas.length,group=groups[i%groups.length];
   // No screening deals enter validation, and each validation block has its own seed.
   const seed=evaluationSeed(report.seed,i,true);
   const result=block(report.candidate.params,group,seed,700,i);if(!result)break;
   report.validation.deltas.push(result.delta);report.validation.changedPairs+=Number(result.changed);(report.validation.groups[group.key]??=[]).push(result.delta);await atomicJSON(checkpointPath,report);
   const reason=smoke?null:earlyRejection(report.validation,250);
   if(reason){report.earlyRejected=true;report.rejectionReason=reason;break;}
  }
  report.complete=!smoke&&!report.earlyRejected&&report.validation.deltas.length>=2000;
 }
 if(report.screeningRejected||report.earlyRejected||report.complete)report.phase='finished';
 report.gate=promotionGate(report);report.updatedAt=new Date().toISOString();report.smoke=smoke;report.promoted=false;
 const stored=await db.saveTraining(report);if(!stored&&!smoke)throw Error('Training report could not be saved to the database; live policy unchanged.');
 if(!smoke&&report.gate.qualified)report.promoted=await db.promotePolicy(report);
 report.status=smoke?'smoke':report.promoted?'promoted':report.screeningRejected?'screened_out':report.complete||report.earlyRejected?'rejected':'collecting';
 await atomicJSON(join(out,report.id+'.json'),report);if(!smoke)await atomicJSON(checkpointPath,report);if(stored)await db.saveTraining(report);
 console.log(JSON.stringify({status:report.status,phase:report.phase,validationBlocks:report.validation.deltas.length,requiredBlocks:2000,changedBlocks:report.validation.changedPairs,screeningChangedBlocks:report.screening.reduce((n,s)=>n+s.changedPairs,0),screenedBlocks:report.screening.reduce((n,s)=>n+s.deltas.length,0),report:join(out,report.id+'.json'),promoted:report.promoted,reasons:[...(report.rejectionReason?[report.rejectionReason]:[]),...report.gate.reasons].slice(0,3)},null,2));
}catch(error){console.error('Training stopped:',error.message.startsWith('Database')||error.message.startsWith('Training report')?error.message:'Local simulation or report error; inspect local code and rerun.');process.exitCode=1;}
finally{await db.close();await release();}
