import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePolicies,selectScreenedCandidate,earlyRejection,cachedBaseline,evaluationSeed} from './training/screening.js';
import {simulateHand,seededRandom} from './training/simulator.js';
import {simulateTournament} from './training/tournament-simulator.js';
import {DEFAULT_POLICY,POLICY_BOUNDS,normalizePolicy,TRAINABLE_KEYS} from './bot-policy.js';
import {TOURNAMENT_DEFAULT} from './tournament-policy.js';
import {promotionGate} from './training/evaluation.js';
import {tournamentPromotionGate} from './training/tournament-evaluation.js';

test('screening cannot select unchanged, losing or tied candidates, and cannot promote a screened winner',()=>{
 const unchanged={id:'unchanged',deltas:[10,10],changedPairs:0};
 const tied={id:'tied',deltas:[1,-1],changedPairs:2},loser={id:'loser',deltas:[-1,-2],changedPairs:2};
 const winner={id:'winner',deltas:[1,2],changedPairs:2};
 assert.equal(selectScreenedCandidate([unchanged,tied,loser]),null);
 assert.equal(selectScreenedCandidate([unchanged,tied,loser,winner]),winner);
 const validation={samples:32,deltas:winner.deltas};
 assert.equal(promotionGate({complete:true,validation}).qualified,false);
 assert.equal(tournamentPromotionGate({mode:'tournament',metric:'tournament-win-rate',complete:true,validation}).qualified,false);
});

test('early rejection only stops unresponsive or clearly losing candidates after a minimum sample',()=>{
 assert.equal(earlyRejection({deltas:Array(20).fill(-1),changedPairs:10},64),null);
 assert.match(earlyRejection({deltas:Array(64).fill(-1),changedPairs:20},64),/behind/);
 assert.match(earlyRejection({deltas:Array(64).fill(0),changedPairs:0},64),/No decision changes/);
 assert.equal(earlyRejection({deltas:Array(64).fill(0),changedPairs:2},64),null);
 assert.equal(earlyRejection({deltas:Array(64).fill(1),changedPairs:20},64),null);
 assert.equal(earlyRejection({deltas:Array.from({length:64},(_,i)=>i%2?10:-10),changedPairs:20},64),null);
});

test('bounded proposals are reproducible, explore beyond near-copies and keep nontrainable fields fixed',()=>{
 const make=()=>proposePolicies(DEFAULT_POLICY,POLICY_BOUNDS,normalizePolicy,TRAINABLE_KEYS,seededRandom(27));
 const proposals=make();assert.deepEqual(proposals,make());assert.equal(proposals.length,3);
 for(const proposal of proposals)for(const [key,value] of Object.entries(proposal)){
  assert.ok(value>=POLICY_BOUNDS[key][0]&&value<=POLICY_BOUNDS[key][1]);
  if(!TRAINABLE_KEYS.includes(key))assert.equal(value,DEFAULT_POLICY[key]);
 }
 assert.ok(proposals.some(p=>TRAINABLE_KEYS.some(k=>Math.abs(p[k]/DEFAULT_POLICY[k]-1)>.2)));
});

test('screening seeds cannot leak into held-out validation',()=>{
 for(const base of [0,1,0x7fffffff,0xffffffff]){
  const screen=new Set(Array.from({length:32},(_,i)=>evaluationSeed(base,i,false)));
  const validation=Array.from({length:2000},(_,i)=>evaluationSeed(base,i,true));
  assert.equal(new Set(validation).size,2000);assert.equal(validation.some(seed=>screen.has(seed)),false);
 }
});

test('caching reuses equivalent baseline results without crossing contexts',()=>{
 const cache=new Map();let calls=0;
 const options={seed:729,seats:3,samples:16,policy:DEFAULT_POLICY,recordTrace:true};
 const simulate=()=>{calls++;return simulateHand(options);};
 const a=cachedBaseline(cache,'seed729:three-seats',simulate);
 assert.deepEqual(a,simulateHand(options));
 for(let i=0;i<3;i++)assert.strictEqual(cachedBaseline(cache,'seed729:three-seats',simulate),a);
 assert.equal(calls,1);cachedBaseline(cache,'seed729:six-seats',simulate);assert.equal(calls,2);
});

test('decision tracing leaves hand and tournament results unchanged and records different actions',()=>{
 const options={seed:729,seats:3,samples:16};
 const {decisionTrace,...traced}=simulateHand({...options,recordTrace:true});
 assert.deepEqual(traced,simulateHand(options));assert.match(decisionTrace,/fold|raise|call|check/);
 assert.doesNotMatch(decisionTrace,/[2-9TJQKA][shdc]/);
 const tournament={...options,depth:15,policy:TOURNAMENT_DEFAULT,incumbent:TOURNAMENT_DEFAULT};
 const {decisionTrace:t,...result}=simulateTournament({...tournament,recordTrace:true});
 assert.deepEqual(result,simulateTournament(tournament));assert.ok(t.length>0);
 const passive=simulateHand({...options,recordTrace:true,decider:v=>({type:v.bet>v.round?'call':'check'})});
 const aggressive=simulateHand({...options,recordTrace:true,decider:v=>v.raiseAllowed&&v.stack+v.round>v.bet?{type:'raise',amount:v.stack+v.round}:{type:v.bet>v.round?'call':'check'}});
 assert.notEqual(passive.decisionTrace,aggressive.decisionTrace);
});
