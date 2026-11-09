import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {handHistoryEntry} from './history-record.js';
test('run history totals repeated payout bands per player and board without private cards',()=>{
 const room={mode:'cash',handNumber:9,level:1,small:5,big:10,players:[{id:'a',name:'Conan',cards:['Ac','Ad'],token:'secret-token',total:1000,inHand:true},{id:'b',name:'Bot',total:1000,inHand:true},{id:'c',name:'Folded player',total:10,inHand:true,folded:true},{id:'d',name:'Other folded player',total:5,inHand:true,folded:true}],runBoards:[['2h','3h','4d','5c','6s'],['7s','8s','9h','Tc','Jd']],awards:[
  {run:1,displayPotIndex:0,winners:[{id:'a',amount:10,cards:['Ac','Ad']}]},{run:2,displayPotIndex:0,winners:[{id:'a',amount:10}]},
  {run:1,displayPotIndex:0,winners:[{id:'a',amount:8}]},{run:2,displayPotIndex:0,winners:[{id:'a',amount:7}]},
  {run:1,displayPotIndex:1,winners:[{id:'a',amount:990}]},{run:2,displayPotIndex:1,winners:[{id:'a',amount:990}]}]};
 const entry=handHistoryEntry(room,'old text');assert.equal(entry.runs[0].winners[0].amount,1008);assert.equal(entry.runs[1].winners[0].amount,1007);assert.equal(entry.runs[0].pots[0].winners[0].amount,18);assert.equal(entry.runs[0].pots[1].label,'Side pot 1');
 room.runBoards[0][0]='Qh';assert.equal(entry.runs[0].board[0],'2h');for(const secret of ['Ac','Ad','secret-token','privateReveals'])assert.ok(!JSON.stringify(entry).includes(secret));
});
test('uncalled chips stay separate and players with identical names retain distinct totals',()=>{
 const entry=handHistoryEntry({mode:'cash',players:[{id:'a',name:'Player',inHand:true,total:150},{id:'b',name:'Player',inHand:true,total:100}],runBoards:[[],[]],awards:[{run:1,displayPotIndex:0,winners:[{id:'a',amount:100},{id:'b',amount:50}]}]},'');
 assert.equal(entry.returned.amount,50);assert.equal(entry.runs[0].winners.length,2);assert.equal(entry.runs[0].winners.reduce((n,w)=>n+w.amount,0),150);
});

test('single-board split payouts are totalled once per player in cash, Bot training and tournaments',()=>{
 for(const mode of ['cash','tournament']){
  const room={mode,practice:mode==='cash',handNumber:3,small:5,big:10,players:[{id:'r',name:'ROCK 1',total:715,inHand:true},{id:'l',name:'LAG 1',total:715,inHand:true}],awards:[{displayPotIndex:0,winners:[{id:'r',amount:15},{id:'l',amount:15}]},{displayPotIndex:1,winners:[{id:'r',amount:700},{id:'l',amount:700}]}]};
  const h=handHistoryEntry(room,'long message');assert.deepEqual(h.winners.map(p=>p.amount),[715,715]);assert.equal(h.split,true);assert.equal(h.pots.length,2);assert.equal(h.returned,undefined);
 }
});

test('fold settlements separate returned chips without changing the underlying awards',()=>{
 const room={mode:'cash',endedByFold:true,players:[{id:'a',name:'A',total:100,inHand:true},{id:'b',name:'B',total:10,inHand:true,folded:true}],awards:[{potIndex:0,winners:[{id:'a',amount:110}]}]};
 const h=handHistoryEntry(room,'A wins $110');assert.equal(h.winners[0].amount,20);assert.equal(h.returned.amount,90);assert.equal(room.awards[0].winners[0].amount,110);
});
function historyRuntime(){const window={},document={createElement:tag=>({tag,children:[],dataset:{},append(...items){this.children.push(...items);},setAttribute(){}})};vm.runInNewContext(readFileSync('public/history.js','utf8'),{window,document});return window;}

test('legacy repeated payouts condense safely and structured tournament rows include BB',()=>{
 const w=historyRuntime();const summary=w.pokerHistorySummary({message:'ROCK 1 +$15 · LAG 1 +$15 · ROCK 1 +$700 · LAG 1 +$700'});
 assert.deepEqual(Array.from(summary.winners,p=>p.amount),[715,715]);assert.equal(w.pokerHistorySummary({message:'Switched tables · A +$50'}),null);
 const body={children:[],append(el){this.children.push(el);}};
 w.renderPokerHistory(body,{handHistory:[{mode:'tournament',level:1,small:5,big:10,handNumber:3,winners:[{id:'a',name:'A',amount:715}],pots:[{label:'Main pot',winners:[{name:'A',amount:15}]},{label:'Side pot 1',winners:[{name:'A',amount:700}]}]}]});
 const hand=body.children[1];assert.equal(hand.className,'historySummaryHand');const winner=hand.children.find(n=>n.className==='historyWinner');assert.equal(winner.children[1].textContent,'+$715 (71.5 BB)');assert.equal(hand.children.at(-1).tag,'details');assert.equal(hand.children.at(-1).open,undefined);
});
test('older run-twice messages become two summed rows while ordinary history stays unchanged',()=>{
 const w=historyRuntime(),runs=w.pokerHistoryRuns({message:'Run 1 · Conan +$10 · Run 2 · Conan +$10 · Run 1 · Conan +$8 · Run 2 · Conan +$7 · Run 1 · Conan +$990 · Run 2 · Conan +$990'});
 assert.equal(runs[0].winners[0].amount,1008);assert.equal(runs[1].winners[0].amount,1007);assert.equal(w.pokerHistoryRuns({message:'Bot wins $80'}),null);assert.equal(w.pokerHistoryRuns({message:'Unrecognized · Run 1 · Conan +$10 · Run 2 · Conan +$10'}),null);
 const body={children:[],append(el){this.children.push(el);}};w.renderPokerHistory(body,{handHistory:[{mode:'cash',level:1,small:5,big:10,message:'',runs:[{number:1,winners:[{name:'A',amount:100}],pots:[{label:'Main pot',winners:[{name:'A',amount:50}]},{label:'Side pot 1',winners:[{name:'A',amount:50}]}]},{number:2,winners:[{name:'B',amount:100}]}]}]});
 const hand=body.children[1];assert.equal(hand.className,'historyRunHand');const sections=hand.children.filter(n=>n.className==='historyRun');assert.equal(sections.length,2);assert.equal(sections[0].children.at(-1).tag,'details');assert.equal(sections[0].children.at(-1).open,undefined);
});
