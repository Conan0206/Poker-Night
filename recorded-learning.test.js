import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {newDb} from 'pg-mem';import {createDatabase} from './database.js';
import {handModels,mergeCompletedModel} from './opponent-model.js';
import {cleanScenario,captureScenario,recordedSplit,keepScenario} from './recorded-scenario.js';
import {simulateHand} from './training/simulator.js';
import {freezeCorpus,recordedPair,recordedGate,recordedScreen,validateRecorded} from './training/recorded-matches.js';
import {estimate,promotionGate} from './training/evaluation.js';
import {DEFAULT_POLICY} from './bot-policy.js';import {TOURNAMENT_DEFAULT} from './tournament-policy.js';
const player=(values={})=>({chips:900,total:100,round:0,folded:false,acted:false,raiseAllowed:true,checked:false,pfr:false,action:'',botStyle:'tag',model:{hands:40,vpip:12,...values.model},...values});
export const scenario={version:1,mode:'cash',hole:['As','Ad'],board:['Ah','7c','2d'],previousStreetBoard:[],heroSeat:0,dealerSeat:2,big:10,small:5,bet:0,minRaise:10,raises:0,preflopAggressor:0,lastAggressor:-1,players:[player(),player({botStyle:'fish'}),player({chips:40,total:60,botStyle:'rock'})]};
const hand=(id=randomUUID())=>({id,mode:'cash',small:5,big:10,boards:[['Ah','7c','2d','Ks','Qh']],results:[{id:'hero',bot:true},{id:'villain',bot:false}],actions:[{actorId:'hero',bot:true,street:'preflop',context:{call:10},action:{type:'raise',amount:30}},{actorId:'villain',bot:false,street:'preflop',context:{call:30},action:{type:'call'}},{actorId:'hero',bot:true,street:'flop',context:{call:0,scenario:{...scenario,players:scenario.players.map(p=>({...p,cards:['Jc','Jh'],token:'secret'})),future:['Ks','Qh']}},action:{type:'raise',amount:70}},{actorId:'villain',bot:false,street:'flop',context:{call:70},action:{type:'fold'}}]});
test('reservoir bounds snapshot storage while preserving every ordinary action',()=>{
 const log=[];for(let i=0;i<100;i++){const a={bot:true,context:{scenario:{i}},action:{type:'check'}};keepScenario(log,a,()=>i%2?.99:0);log.push(a);assert.ok(log.filter(a=>a.context.scenario).length<=4);}assert.equal(log.length,100);assert.equal(log.filter(a=>a.context.scenario).length,4);assert.ok(log.some(a=>a.context.scenario?.i>4));
});
test('models count public opportunities and whole-hand VPIP once, keeping cash and tournament separate',()=>{
 const models=handModels(hand()),hero=models.get('hero'),v=models.get('villain');assert.equal(hero.hands,1);assert.equal(hero.vpip,1);assert.equal(hero.pfr,1);assert.equal(hero.aggressive,2);assert.equal(v.vpip,1);assert.equal(v.facedBets,2);assert.equal(v.foldsToBet,1);assert.equal(v.callsToBet,1);
 assert.deepEqual(mergeCompletedModel({hands:20,vpip:4},{hands:10,vpip:3}),{hands:20,vpip:4});assert.equal(mergeCompletedModel({hands:2},{hands:3}).hands,3);
});
test('decision snapshots exclude hidden opponents, future board and all identity/connection fields',()=>{
 const dirty={...scenario,token:'secret',board2:['Ks'],players:scenario.players.map(p=>({...p,cards:['Jc','Jh'],name:'Private name',socket:'secret'}))};
 const clean=cleanScenario(dirty),text=JSON.stringify(clean);for(const secret of ['Jc','Jh','Private name','secret','board2'])assert.ok(!text.includes(secret));assert.deepEqual(clean.hole,scenario.hole);
 const room={mode:'cash',players:dirty.players.map((p,i)=>({...p,inHand:true,id:String(i),cards:i===0?scenario.hole:['Jc','Jh'],stats:p.model,checkedThisStreet:false})),board:scenario.board,previousStreetBoard:[],dealer:2,big:10,small:5,bet:0,minRaise:10};
 assert.ok(captureScenario(room,room.players[0]));assert.equal(cleanScenario({...scenario,hole:['Ah','Ad']}),null);
});
test('recorded continuations begin at the bot decision, use only known cards and conserve unequal/side-pot stacks',()=>{
 for(const mode of ['cash','tournament'])for(const length of [0,3,4,5])for(let seed=0;seed<5;seed++){
  const board=['Ah','7c','2d','Ks','Qh'].slice(0,length),sc={...scenario,mode,board};let first=true;
  const options={scenario:sc,seed,policy:DEFAULT_POLICY,incumbent:DEFAULT_POLICY,tournamentPolicy:TOURNAMENT_DEFAULT,tournamentIncumbent:TOURNAMENT_DEFAULT,samples:16,recordTrace:true,decider(view,index){assert.equal('deck' in view,false);assert.equal('players' in view,false);if(first){assert.equal(index,0);assert.deepEqual(view.hole,sc.hole);assert.deepEqual(view.board,board);first=false;}return {type:view.bet>view.round?'call':'check'};}};
  const r=simulateHand(options);assert.equal(r.balances.reduce((a,b)=>a+b,0),2100);assert.deepEqual(r,simulateHand(options));assert.equal(new Set([...r.board,...scenario.hole]).size,7);
 }
});
test('recorded pairs compare policies on matching sampled hidden cards without treating real winners as labels',()=>{
 const r=recordedPair({scenario},{seed:7,params:DEFAULT_POLICY,parent:DEFAULT_POLICY,mode:'cash',samples:16,repeats:2});assert.equal(r.delta,0);assert.equal(r.changed,false);assert.equal(recordedPair({scenario},{seed:7,params:DEFAULT_POLICY,parent:DEFAULT_POLICY,mode:'cash',deadline:0}),null);
});
test('database ingestion is idempotent, consumes legacy hands for models, and isolates mode and holdout',async()=>{
 const mem=newDb(),db=createDatabase({connectionString:'postgresql://test:test@localhost/test',PoolClass:mem.adapters.createPg().Pool});
 try{const a=hand(),b=hand();b.mode='tournament';b.actions=b.actions.map(row=>({...row,context:{call:row.context.call}}));await db.saveHand(a);await db.saveHand(b);
  assert.deepEqual(await db.ingestRecordedHands(),{processed:2,scenarios:1});assert.deepEqual(await db.ingestRecordedHands(),{processed:0,scenarios:0});
  assert.equal((await db.opponentModels('cash')).hero.hands,1);assert.equal((await db.opponentModels('tournament')).hero.hands,1);
  const corpus=await db.recordedCorpus('cash'),row=corpus[recordedSplit(a.id)][0];assert.equal(row.handId,a.id);assert.equal(JSON.stringify(row).includes('secret'),false);assert.equal(JSON.stringify(row.scenario).includes('Ks'),false);
  assert.equal((await db.recordedCorpus('tournament')).train.length,0);assert.equal((await db.recordedCorpus('tournament')).holdout.length,0);
 }finally{await db.close();}
});
test('frozen training data cannot use held-out models or duplicate hands; promotion still requires fresh recorded evidence',async()=>{
 const ids={train:[],holdout:[]};while(ids.train.length<32||ids.holdout.length<32){const id=randomUUID(),split=recordedSplit(id);if(ids[split].length<32)ids[split].push(id);}
 const data=freezeCorpus({train:ids.train.map(handId=>({handId,scenario})),holdout:ids.holdout.map(handId=>({handId,scenario})),models:[{hands:40,vpip:5}]},'cash');assert.equal(data.train.length,32);assert.equal(data.holdout.length,32);assert.equal(data.train[0].scenario.players[0].model.vpip,5);
 const report={mode:'cash',seed:1,recorded:data,candidate:{params:DEFAULT_POLICY}};let saves=0;
 assert.ok((await recordedScreen(report,DEFAULT_POLICY,DEFAULT_POLICY,Date.now()+10000,async()=>saves++,true)).deltas.length);assert.ok(await validateRecorded(report,DEFAULT_POLICY,Date.now()+10000,async()=>saves++,true));assert.ok(saves>=2);
 assert.ok(recordedGate(report,estimate).length);report.recordedValidation={samples:700,handIds:ids.holdout,deltas:Array(32).fill(1)};assert.deepEqual(recordedGate(report,estimate),[]);
 report.recordedValidation.handIds[0]=ids.train[0];assert.ok(recordedGate(report,estimate).some(r=>r.includes('overlap')));
 assert.equal(promotionGate({...report,complete:false}).qualified,false);
});
