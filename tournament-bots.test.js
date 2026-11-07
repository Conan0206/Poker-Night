import test from 'node:test';
import assert from 'node:assert/strict';
import {tournamentContext,tournamentSituation,tournamentTactic,TOURNAMENT_DEFAULT} from './tournament-policy.js';
import {simulateTournament,TrainingDeadline} from './training/tournament-simulator.js';
import {tournamentPromotionGate,TOURNAMENT_GROUPS} from './training/tournament-evaluation.js';
import {decideBot} from './bot-strategy.js';
import {chooseBotAction} from './bot-engine.js';
import {BOT_STYLE_IDS,styleForBot} from './public/bot-styles.js';
import {seededRandom} from './training/simulator.js';
const view=(extra={})=>({mode:'tournament',botStyle:'tag',hole:['As','5s'],board:[],opponents:1,pot:15,bet:10,round:0,stack:100,big:10,minRaise:10,raiseAllowed:true,latePosition:true,position:1,effectiveStack:100,opponentModels:[],tournamentPolicy:TOURNAMENT_DEFAULT,tournament:{level:1,levelSeconds:420,secondsToNext:300,nextBig:20},...extra});
test('blind clock pressure uses public next-level data, respects pause and stops at the final level',()=>{
 const room={mode:'tournament',began:1000,level:1,levelMinutes:7,baseSmall:5,baseBig:10,players:[{chips:100,total:0},{chips:200,total:10},{chips:999,spectating:true}]};
 const c=tournamentContext(room,411000);assert.equal(c.secondsToNext,10);assert.equal(c.remaining,2);
 assert.deepEqual(tournamentContext({...room,paused:true,pausedAt:411000},999999),c);
 assert.equal(tournamentSituation(view({tournament:c})).threatened,true);
 assert.equal(tournamentSituation(view()).threatened,false);
 assert.equal(tournamentSituation(view({big:800,tournament:{...c,nextBig:800}})).soon,false);
 assert.equal(tournamentContext({...room,mode:'cash'}),undefined);
});
test('selective short shoves and river bluffs avoid deep stacks, calling stations and closed raises',()=>{
 const context={quality:.55,equity:.46,features:null};
 assert.deepEqual(tournamentTactic(view(),context,()=>0),{type:'raise',amount:100});
 for(const extra of [{raiseAllowed:false},{stack:1000},{opponents:4},{opponentModels:[{facedBets:20,foldsToBet:1,hands:50,vpip:40}]}]){
  const action=tournamentTactic(view(extra),context,()=>0);assert.notEqual(action?.amount,view(extra).stack);
 }
 const river=view({hole:['Ah','2c'],board:['Kh','9h','7h','4s','Td'],pot:200,bet:0,opponentsChecked:true});
 assert.equal(tournamentTactic(river,{quality:.5,equity:.2,features:{category:0,nutBlocker:true}},()=>0).amount,100);
 assert.equal(tournamentTactic({...river,mode:'cash'},{quality:.5,equity:.2,features:{category:0,nutBlocker:true}},()=>0),null);
 assert.equal(tournamentTactic({...river,opponents:3},{quality:.5,equity:.2,features:{category:0,nutBlocker:true}},()=>0),null);
});
test('persistent personalities produce different opening ranges without changing legality',async()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>styleForBot(i+1)),[...BOT_STYLE_IDS,...BOT_STYLE_IDS]);
 let pressure=0,tight=0;
 for(let seed=1;seed<=12;seed++)for(const style of ['lag','rock']){
  const v=view({hole:['Ks','8h'],opponents:5,stack:1000,effectiveStack:1000,botStyle:style,equitySamples:16});
  const action=decideBot(v,seededRandom(seed));if(action.type==='raise'){assert.ok(action.amount<=v.stack&&action.amount>=20);if(style==='lag')pressure++;else tight++;}
 }
 assert.ok(pressure>tight);
 const v=view({raiseAllowed:false,bet:0,hole:['7s','2h']});const result=await chooseBotAction(v);assert.equal(result.source,'tournament-context-v1');assert.equal(result.action.type,'check');
});
test('tournament rollouts carry stacks, eliminate players, conserve chips and keep cards private',()=>{
 const decision=(v)=>{assert.equal('deck' in v,false);assert.equal('players' in v,false);assert.equal(v.hole.length,2);assert.equal(v.mode,'tournament');return v.raiseAllowed&&v.stack+v.round>v.bet?{type:'raise',amount:v.stack+v.round}:{type:v.bet>v.round?'call':'check'};};
 for(const seats of [3,6]){
  const options={seed:729,seats,depth:15,samples:16,decision};const a=simulateTournament(options);assert.deepEqual(a,simulateTournament(options));
  assert.equal(a.stacks.reduce((n,v)=>n+v,0),seats*150);assert.ok(a.finish>=1&&a.finish<=seats);assert.ok(a.won===0||a.won===1);
 }
 assert.throws(()=>simulateTournament({seed:1,deadline:0}),TrainingDeadline);
});
test('tournament promotion needs held-out win-rate gains across all pools and personalities',()=>{
 const validation={samples:700,deltas:Array(512).fill(1),placementDeltas:Array(512).fill(.1),groups:Object.fromEntries(TOURNAMENT_GROUPS.map(g=>[g.key,Array(64).fill(1)])),personalities:Object.fromEntries(BOT_STYLE_IDS.map(s=>[s,Array(128).fill(1)]))};
 const report={mode:'tournament',metric:'tournament-win-rate',complete:true,validation};assert.equal(tournamentPromotionGate(report).qualified,true);
 for(const change of [{complete:false},{mode:'cash'},{metric:'chip-profit'},{validation:{...validation,deltas:Array(512).fill(0)}},{validation:{...validation,placementDeltas:Array(512).fill(-.1)}},{validation:{...validation,personalities:{...validation.personalities,rock:Array(128).fill(-1)}}}])assert.equal(tournamentPromotionGate({...report,...change}).qualified,false);
});
