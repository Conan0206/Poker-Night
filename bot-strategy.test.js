import test from 'node:test';
import assert from 'node:assert/strict';
import {decideBot,botThinkDelay,rangeEquity,boardFeatures} from './bot-strategy.js';
const random=(initial=231)=>{let seed=initial;return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};};
const view=(extra={})=>({hole:['As','Ah'],board:[],opponents:1,pot:30,bet:20,round:0,stack:1000,big:10,minRaise:10,raiseAllowed:true,latePosition:true,...extra});
test('bots release weak hands against expensive shoves and continue with aces',()=>{
 const weak=decideBot(view({hole:['7s','2h'],pot:1010,bet:1000}),random());assert.equal(weak.type,'fold');
 const strong=decideBot(view({pot:1010,bet:1000}),random());assert.equal(strong.type,'call');
});
test('bots value-bet unbeatable hands and never fold a free check when raising is closed',()=>{
 const nuts=decideBot(view({hole:['As','Ks'],board:['Qs','Js','Ts','2d','3h'],bet:0,round:0,pot:150}),random());assert.equal(nuts.type,'raise');assert.ok(nuts.amount>=10&&nuts.amount<=1000);
 const free=decideBot(view({hole:['7h','2d'],board:['As','Kc','9s'],bet:0,round:0,raiseAllowed:false}),random());assert.equal(free.type,'check');
});
test('actions stay legal for short stacks, multiple opponents and closed raising',()=>{
 for(let n=0;n<30;n++){
  const v=view({hole:['Jh','Th'],board:n%2?['9h','8s','2h']:[],opponents:1+n%6,stack:5+n*13,round:10,bet:40,minRaise:35,raiseAllowed:n%3!==0});const action=decideBot(v,random());
  assert.ok(['fold','call','raise'].includes(action.type));if(action.type==='raise'){assert.equal(v.raiseAllowed,true);assert.ok(Number.isInteger(action.amount));assert.ok(action.amount>v.bet&&action.amount<=v.stack+v.round);assert.ok(action.amount>=v.bet+v.minRaise||action.amount===v.stack+v.round);}
 }
});
test('thinking time varies and difficult calls take longer on average',()=>{
 const routine=botThinkDelay({call:0,pot:100,stack:1000,street:'flop'},()=>.5),hard=botThinkDelay({call:500,pot:600,stack:1000,street:'river'},()=>.5);
 assert.ok(routine>=1500);assert.ok(hard>routine);assert.notEqual(botThinkDelay({call:0,pot:10,stack:1000,street:'preflop'},()=>0),botThinkDelay({call:0,pot:10,stack:1000,street:'preflop'},()=>1));
});

test('late position opens wider while early position folds marginal offsuit hands',()=>{
 let late=0,early=0;for(let n=1;n<=30;n++){
  const base=view({hole:['Ks','9h'],bet:10,pot:15,round:0,opponents:5});
  late+=decideBot({...base,position:1,latePosition:true},random(n)).type==='raise';
  early+=decideBot({...base,position:0,latePosition:false},random(n)).type==='raise';
 }
 assert.ok(late>=20);assert.equal(early,0);
});
test('suited ace blockers mix three-bets instead of always passively calling',()=>{
 let raises=0;for(let n=1;n<=45;n++){const a=decideBot(view({hole:['As','5s'],bet:25,pot:40,round:0,raises:1,stack:1000,latePosition:true}),random(n));raises+=a.type==='raise';}
 assert.ok(raises>2&&raises<35);
});
test('public tight raising ranges reduce marginal-hand equity compared with loose ranges',()=>{
 const base=view({hole:['Ac','Jh'],bet:30,board:[],opponents:1});
 const tight=rangeEquity({...base,opponentModels:[{hands:100,vpip:14,raisedPreflop:true}]},random(1));
 const loose=rangeEquity({...base,opponentModels:[{hands:100,vpip:60,raisedPreflop:false}]},random(1));
 assert.ok(tight<loose);
});
test('board texture identifies real draws and nut-flush blockers',()=>{
 assert.equal(boardFeatures(['Ah','Qh'],['Jh','7h','2c']).flushDraw,true);
 assert.equal(boardFeatures(['8s','9d'],['6h','7c','Kd']).straightDraw,true);
 assert.equal(boardFeatures(['Ah','2c'],['Kh','8h','5h','4s','Td']).nutBlocker,true);
 assert.equal(boardFeatures(['Ah','Qh'],['Jh','7h','2c','4d','8s']).flushDraw,false);
});
test('unraised strong short stacks pressure opponents with legal all-in openings',()=>{
 const a=decideBot(view({hole:['Ac','Kh'],bet:10,pot:15,round:0,stack:100,effectiveStack:100,opponents:2}),random(8));
 assert.equal(a.type,'raise');assert.equal(a.amount,100);
});
