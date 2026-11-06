import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateHand,settlePots,legalAction} from './training/simulator.js';
import {promotionGate} from './training/evaluation.js';
import {normalizePolicy,DEFAULT_POLICY} from './bot-policy.js';
test('simulation is reproducible, conserves chips and never exposes hidden cards',()=>{
 for(const seats of [2,3,6,8]){
  const options={seed:729,seats,samples:16,depth:30};
  const result=simulateHand(options);assert.deepEqual(result,simulateHand(options));assert.equal(result.rewards.reduce((a,b)=>a+b,0),0);
  simulateHand({...options,decider:view=>{assert.equal(view.hole.length,2);assert.equal('deck' in view,false);assert.equal('players' in view,false);assert.ok(!view.opponentModels.some(m=>m.hole));return {type:view.bet>view.round?'call':'check'};}});
 }
});
test('main and side pots pay only eligible hands, with dealer-order odd chips',()=>{
 const board=['2s','3h','4d','8c','9s'];
 const players=[{hole:['As','Ah'],total:50},{hole:['Ks','Kh'],total:100},{hole:['Qs','Qh'],total:100}];
 assert.deepEqual(settlePots(players,board),[150,100,0]);
 players[0].folded=true;assert.deepEqual(settlePots(players,board),[0,250,0]);
 const tied=[{hole:['2h','3d'],total:5},{hole:['4h','5d'],total:5},{hole:['6h','7d'],total:5,folded:true}];
 assert.deepEqual(settlePots(tied,['As','Ks','Qs','Js','Ts'],0),[7,8,0]);
});
test('short all-in and closed betting cannot become an illegal raise',()=>{
 const v={bet:100,round:0,stack:125,minRaise:50,raiseAllowed:true};assert.equal(legalAction(v,{type:'raise',amount:125}).amount,125);
 assert.throws(()=>legalAction(v,{type:'raise',amount:120}));assert.throws(()=>legalAction({...v,raiseAllowed:false},{type:'raise',amount:125}));
});
test('policy gate rejects incomplete, noisy, under-sampled or regressing candidates',()=>{
 const groups=Object.fromEntries(['incumbent','station','tight','aggressive'].flatMap(s=>[3,6].map(n=>[`${s}-${n}`,Array(250).fill(1)])));
 const report={complete:true,validation:{samples:700,deltas:Array(2000).fill(1),groups}};assert.equal(promotionGate(report).qualified,true);
 assert.equal(promotionGate({...report,complete:false}).qualified,false);assert.equal(promotionGate({...report,validation:{...report.validation,samples:32}}).qualified,false);
 assert.equal(promotionGate({...report,validation:{...report.validation,deltas:Array.from({length:2000},(_,i)=>i%2?100:-100)}}).qualified,false);
 assert.equal(promotionGate({...report,validation:{...report.validation,groups:{...groups,'station-3':Array(250).fill(-1)}}}).qualified,false);
 assert.equal(normalizePolicy({trap:99}).trap,.4);assert.equal(normalizePolicy({trap:NaN}).trap,DEFAULT_POLICY.trap);
});
