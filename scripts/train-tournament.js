import {freezeCorpus,recordedScreen,validateRecorded} from '../training/recorded-matches.js';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import os from 'node:os';
import {createDatabase} from '../database.js';
import {TOURNAMENT_BASELINE_ID,TOURNAMENT_DEFAULT,normalizeTournamentPolicy,TOURNAMENT_BOUNDS} from '../tournament-policy.js';
import {BOT_STYLE_IDS} from '../public/bot-styles.js';
import {seededRandom} from '../training/simulator.js';
import {simulateTournament,TrainingDeadline} from '../training/tournament-simulator.js';
import {TOURNAMENT_GROUPS as groups,TOURNAMENT_VALIDATION_BLOCKS,tournamentPromotionGate} from '../training/tournament-evaluation.js';
import {acquireLock} from '../training/run-lock.js';
import {proposePolicies,selectScreenedCandidate,screeningReason,earlyRejection,cachedBaseline,evaluationSeed} from '../training/screening.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'.training');await mkdir(out,{recursive:true});
const args=process.argv.slice(2),smoke=args.includes('--smoke'),seconds=Number(args.find(a=>a.startsWith('--seconds='))?.split('=')[1]||900);
if(!Number.isFinite(seconds)||seconds<5||seconds>900)throw Error('Training limit must be 5–900 seconds');
const deadline=Date.now()+seconds*1000,release=await acquireLock(join(out,'tournament-runner.lock'));
if(!release){console.log('Tournament training already running; skipped.');process.exit(0);}
try{os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
const db=createDatabase(),checkpoint=join(out,smoke?'tournament-smoke-checkpoint.json':'tournament-checkpoint.json');
async function atomicJSON(path,data){await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);}
const hash=createHash('sha256');for(const file of ['tournament-policy.js','public/bot-styles.js','public/tournament-structure.js','bot-policy.js','bot-tactics.js','bot-strategy.js','bot-ranges.js','training/simulator.js','training/tournament-simulator.js','training/tournament-evaluation.js','training/screening.js','scripts/train-tournament.js','opponent-model.js','recorded-scenario.js','training/recorded-matches.js'])hash.update(await readFile(join(root,file)));const fingerprint=hash.digest('hex');
try{
 const loaded=await db.activePolicy('tournament');if(!loaded&&!smoke)throw Error('Database unavailable; tournament policy unchanged.');
 const parent=loaded||{id:TOURNAMENT_BASELINE_ID,params:TOURNAMENT_DEFAULT};let saved;
 try{saved=JSON.parse(await readFile(checkpoint,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const report=!smoke&&saved?.parentId===parent.id&&saved.fingerprint===fingerprint&&!saved.complete&&!saved.screeningRejected&&!saved.earlyRejected?saved:{id:randomUUID(),mode:'tournament',metric:'tournament-win-rate',parentId:parent.id,fingerprint,seed:randomBytes(4).readUInt32LE(),startedAt:new Date().toISOString(),scope:'single-table winner-take-all tournaments; rising blinds; 3/6 seats; 15/30/60/100 BB; four personalities; no rebuys; heuristic decisions shared with live tournament bots',phase:'screening',screening:[],validation:{samples:700,deltas:[],placementDeltas:[],groups:{},personalities:{},changedPairs:0},complete:false};
 if(!smoke&&!await db.ingestRecordedHands())throw Error('Database match ingestion unavailable');if(!report.recorded){const data=await db.recordedCorpus('tournament');if(!data&&!smoke)throw Error('Database recorded corpus unavailable');report.recorded=freezeCorpus(data,'tournament');}
 const proposals=proposePolicies(parent.params,TOURNAMENT_BOUNDS,normalizeTournamentPolicy,Object.keys(TOURNAMENT_DEFAULT),seededRandom(report.seed),smoke?1:3),baselineCache=new Map();
 function pair(params,group,index,validation){
  const seed=evaluationSeed(report.seed,index,validation);
  const heroStyle=BOT_STYLE_IDS[Math.floor(index/groups.length)%4],heroSeat=Math.floor(index/(groups.length*4))%group.seats;
  const options={seed,seats:group.seats,heroSeat,heroStyle,incumbent:parent.params,style:group.style,depth:[15,30,60,100][Math.floor(index/(validation?96:32))%4],samples:validation&&!smoke?700:32,deadline,recordTrace:true};
  const simulate=()=>simulateTournament({...options,policy:parent.params});
  const base=validation?simulate():cachedBaseline(baselineCache,[seed,group.key,heroStyle,heroSeat,options.depth,options.samples].join(':'),simulate),candidate=simulateTournament({...options,policy:params});
  return {delta:candidate.won-base.won,placement:candidate.placement-base.placement,heroStyle,changed:candidate.decisionTrace!==base.decisionTrace};
 }
 try{
  for(let c=0;c<proposals.length&&!report.candidate;c++){
   const screening=report.screening[c]??(report.screening[c]={params:proposals[c],deltas:[],changedPairs:0});
   for(let i=screening.deltas.length;i<(smoke?1:128);i++){
    const result=pair(screening.params,groups[i%groups.length],i,false);screening.deltas.push(result.delta);screening.changedPairs+=Number(result.changed);await atomicJSON(checkpoint,report);
   }
  }
  if(!report.candidate){let recordedDone=true;for(const item of report.screening){const result=await recordedScreen(report,item.params,parent.params,deadline,()=>atomicJSON(checkpoint,report),smoke);if(!result){recordedDone=false;break;}item.recordedMean=result.deltas.length?result.deltas.reduce((a,b)=>a+b,0)/result.deltas.length:0;}const best=recordedDone?(smoke?report.screening[0]:selectScreenedCandidate(report.screening.filter(s=>s.recordedMean>=0))):null;if(best){report.candidate={id:'tournament-policy-'+report.id,params:best.params};report.phase='validation';}else if(recordedDone){report.screeningRejected=true;report.rejectionReason=screeningReason(report.screening)+' Recorded-scenario losses also exclude a candidate.';}}
  while(report.candidate&&report.validation.deltas.length<(smoke?1:TOURNAMENT_VALIDATION_BLOCKS)){
   const i=report.validation.deltas.length,group=groups[i%groups.length],result=pair(report.candidate.params,group,i,true);
   report.validation.deltas.push(result.delta);report.validation.changedPairs+=Number(result.changed);report.validation.placementDeltas.push(result.placement);
   (report.validation.groups[group.key]??=[]).push(result.delta);(report.validation.personalities[result.heroStyle]??=[]).push(result.delta);
   await atomicJSON(checkpoint,report);
   const reason=smoke?null:earlyRejection(report.validation,64);if(reason){report.earlyRejected=true;report.rejectionReason=reason;break;}
  }
  const full=report.validation.deltas.length>=TOURNAMENT_VALIDATION_BLOCKS;if(full&&!report.earlyRejected){report.phase='recorded-validation';await validateRecorded(report,parent.params,deadline,()=>atomicJSON(checkpoint,report),smoke);}
  report.complete=!smoke&&!report.screeningRejected&&!report.earlyRejected&&full&&(!report.recorded.train.length||(report.recordedValidation?.deltas.length||0)>=Math.min(32,report.recorded.holdout.length));
 }catch(e){if(!(e instanceof TrainingDeadline))throw e;}
 if(report.screeningRejected||report.earlyRejected||report.complete)report.phase='finished';
 report.smoke=smoke;report.gate=tournamentPromotionGate(report);report.promoted=false;report.updatedAt=new Date().toISOString();
 const stored=await db.saveTraining(report);if(!stored&&!smoke)throw Error('Database report write failed; tournament policy unchanged.');
 if(!smoke&&report.gate.qualified)report.promoted=await db.promotePolicy(report);
 report.status=smoke?'smoke':report.promoted?'promoted':report.screeningRejected?'screened_out':report.complete||report.earlyRejected?'rejected':'collecting';
 await atomicJSON(join(out,report.id+'.json'),report);if(!smoke)await atomicJSON(checkpoint,report);if(stored)await db.saveTraining(report);
 console.log(JSON.stringify({mode:'tournament',status:report.status,phase:report.phase,promoted:report.promoted,validationPairs:report.validation.deltas.length,requiredPairs:TOURNAMENT_VALIDATION_BLOCKS,changedPairs:report.validation.changedPairs,screeningChangedPairs:report.screening.reduce((n,s)=>n+s.changedPairs,0),recordedHands:report.recorded.processedHands,recordedTraining:report.recorded.train.length,recordedHoldout:report.recorded.holdout.length,recordedValidated:report.recordedValidation?.deltas.length||0,screenedPairs:report.screening.reduce((n,s)=>n+s.deltas.length,0),report:join(out,report.id+'.json'),reasons:[...(report.rejectionReason?[report.rejectionReason]:[]),...report.gate.reasons].slice(0,3)},null,2));
}catch(e){console.error('Tournament training stopped:',/^(Database|Tournament)/.test(e.message)?e.message:'Local simulation/report error; no policy promoted.');process.exitCode=1;}
finally{await db.close();await release();}
