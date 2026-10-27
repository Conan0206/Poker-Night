import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const window={};vm.runInNewContext(readFileSync('public/pot-payouts.js','utf8'),{window});vm.runInNewContext(readFileSync('public/history.js','utf8'),{window});
test('payout plan combines bands by displayed side pot and pays every side before the main pot',()=>{
 const plan=window.pokerPayoutPlan({pots:[{kind:'main',amount:150},{kind:'side',amount:100},{kind:'side',amount:80}],awards:[{potIndex:0,displayPotIndex:0,winners:[{id:'a',amount:150}]},{potIndex:1,displayPotIndex:1,winners:[{id:'b',amount:40}]},{potIndex:2,displayPotIndex:1,winners:[{id:'b',amount:60}]},{potIndex:3,displayPotIndex:2,winners:[{id:'c',amount:80}]}]});assert.deepEqual(Array.from(plan,p=>p.index),[2,1,0]);assert.equal(plan[1].winners[0].amount,100);assert.equal(plan.reduce((n,p)=>n+p.amount,0),330);
});
test('tournament history uses the big blind recorded with the hand',()=>{
 assert.equal(window.formatPokerHistory({mode:'tournament',big:20,message:'Alice +$600 · Bob +$100'}),'Alice +$600 (30 BB) · Bob +$100 (5 BB)');assert.equal(window.formatPokerHistory({mode:'cash',big:20,message:'Alice wins $600'}),'Alice wins $600');
});
test('three all-in pots are visible without a four-player threshold',()=>{
 function el(){return {children:[],dataset:{},style:{},append(...a){this.children.push(...a);},replaceChildren(){this.children=[];},setAttribute(){}};}const holder=el();const context={$:()=>holder,document:{createElement:el},window:{},appendTournamentBB(){}};const source=readFileSync('public/app.js','utf8').split('\n').find(s=>s.startsWith('function renderPots('));vm.runInNewContext(source,context);context.renderPots({code:'T',handNumber:1,mode:'tournament',big:10,allInCount:3,pot:330,pots:[{kind:'main',amount:150},{kind:'side',amount:100},{kind:'side',amount:80}]});assert.equal(holder.children.length,3);assert.equal(holder.children[0].children[0].textContent,'MAIN POT');assert.equal(holder.children[1].children[0].textContent,'SIDE POT 1');
});

test('side-pot counters reach zero before main-pot counter starts falling',()=>{
 let frame;const w={},context={window:w,matchMedia:()=>({matches:false}),performance:{now:()=>0},requestAnimationFrame:fn=>frame=fn,document:{querySelector:()=>({textContent:'',closest:()=>({classList:{toggle(){}}})})},appendTournamentBB(){}};vm.runInNewContext(readFileSync('public/pot-payouts.js','utf8'),context);const state={code:'T',handNumber:1,big:10,pots:[{kind:'main',amount:150},{kind:'side',amount:100},{kind:'side',amount:80}]};const plan=[{index:2,amount:80},{index:1,amount:100},{index:0,amount:150}];w.animatePokerPotCounts(state,plan,0);frame(500);assert.deepEqual(Array.from(w.pokerPotPayout.remaining),[150,100,0]);frame(1150);assert.deepEqual(Array.from(w.pokerPotPayout.remaining),[150,0,0]);frame(1800);assert.deepEqual(Array.from(w.pokerPotPayout.remaining),[0,0,0]);
});

test('history inserts a divider when recorded blind levels change',()=>{
 const w={},body={children:[],append(el){this.children.push(el);}},document={createElement:()=>({})};vm.runInNewContext(readFileSync('public/history.js','utf8'),{window:w,document});w.renderPokerHistory(body,{handHistory:[{mode:'tournament',level:2,small:10,big:20,message:'A wins $200'},{mode:'tournament',level:1,small:5,big:10,message:'B wins $100'}]});assert.equal(body.children.filter(p=>p.className==='historyLevelDivider').length,2);assert.equal(body.children[1].textContent,'A wins $200 (10 BB)');assert.equal(body.children[3].textContent,'B wins $100 (10 BB)');
});
