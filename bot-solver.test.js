import test from 'node:test';
import assert from 'node:assert/strict';
import {bettingTree,publicRange,solveHeadsUp} from './bot-solver.js';
import {chooseBotAction,closeBotWorkers} from './bot-engine.js';
const rng=(seed=231)=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const view=(extra={})=>({hole:['As','Ks'],board:['Qs','Js','Ts','2d','3h'],opponents:1,pot:150,bet:0,round:0,stack:1000,opponentStack:1000,big:10,minRaise:10,raiseAllowed:true,latePosition:true,...extra});
test('sampled ranges respect public board blockers and retain the queried hand',()=>{
 const board=['Qs','Js','Ts'],hole=['As','Ks'],range=publicRange(board,{},40,rng(),hole);
 assert.ok(range.some(h=>h.cards.every(c=>hole.includes(c))));assert.ok(range.every(h=>h.weight>0&&h.cards.length===2&&h.cards[0]!==h.cards[1]&&h.cards.every(c=>!board.includes(c))));
});
test('river solver value-bets the nuts and returns normalized nonnegative frequencies',()=>{
 const result=solveHeadsUp(view(),rng(),{maxMs:5000});assert.ok(result);assert.equal(result.engine,'sampled-heads-up-street-cfr');assert.ok(result.frequencies.filter(a=>a.type==='raise').reduce((sum,a)=>sum+a.probability,0)>.9);
 assert.ok(Math.abs(result.frequencies.reduce((sum,a)=>sum+a.probability,0)-1)<1e-9);assert.ok(result.frequencies.every(a=>a.probability>=0));
});
test('solver never folds an unbeatable hand facing a bet',()=>{
 const result=solveHeadsUp(view({bet:100,pot:250,opponentModels:[{aggressor:true}]}),rng(8),{maxMs:5000});assert.ok(result);assert.ok(result.frequencies.find(a=>a.type==='fold').probability<.01);assert.notEqual(result.action.type,'fold');
});
test('restricted street tree respects closed raising, short calls and minimum raises',()=>{
 for(const extra of [{bet:100,stack:50},{bet:100,round:20,minRaise:80,opponentStack:25},{bet:100,raiseAllowed:false},{bet:0,stack:7}]){
  const v=view(extra),tree=bettingTree(v);
  for(const a of tree.actions){if(a.type==='raise'){assert.ok(v.raiseAllowed);assert.ok(a.amount>v.bet&&a.amount<=v.round+v.stack);assert.ok(a.amount-v.bet>=v.minRaise||a.amount===v.round+v.stack);}}
  assert.ok(tree.actions.some(a=>a.type===(v.bet>v.round?'call':'check')));
 }
});
test('solver handles flop/turn rollouts and declines unsupported multiway/preflop spots',()=>{
 for(const board of [['Qs','Js','Ts'],['Qs','Js','Ts','2d']]){const result=solveHeadsUp(view({board}),rng(),{maxMs:5000,iterations:8000});assert.ok(result);assert.ok(result.iterations>=8000);}
 assert.equal(solveHeadsUp(view({board:[]}),rng()),null);assert.equal(solveHeadsUp(view({opponents:2}),rng()),null);
});
test('public-card solver does not consume hypothetical opponent hole-card fields',()=>{
 const a=solveHeadsUp(view({opponentHoleCards:['Ah','Ad']}),rng(6),{maxMs:5000,iterations:8000});
 const b=solveHeadsUp(view({opponentHoleCards:['7h','6d']}),rng(6),{maxMs:5000,iterations:8000});
 assert.deepEqual(a.frequencies,b.frequencies);
});
test('worker uses the solver without blocking the event loop and respects tight deadlines',async()=>{
 try{
  let heartbeat=false;const task=chooseBotAction(view(),Date.now()+5000);setTimeout(()=>{heartbeat=true;},5);const result=await task;
  assert.equal(result.source,'sampled-heads-up-street-cfr');assert.ok(heartbeat);assert.ok(result.iterations>1000);
  const quick=await chooseBotAction(view(),Date.now()+100);assert.equal(quick.source,'range-heuristic');
 }finally{await closeBotWorkers();}
});
