import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('tournament info hides equity, keeps table facts, and lists the server blind schedule',()=>{
 const nodes=[],classes=()=>{const set=new Set();return {add:v=>set.add(v),toggle(v,on){on?set.add(v):set.delete(v);},has:v=>set.has(v)};};
 function el(tag){const e={tag,style:{},children:[],hidden:false,classList:classes(),offsetWidth:80,append(...x){this.children.push(...x);for(const c of x)c.parentElement=this;},before(){},setAttribute(k,v){this[k]=v;},getBoundingClientRect:()=>({bottom:70,right:990}),querySelector(){return this.span||(this.span=el('span'));},replaceChildren(...x){this.children=x;},showModal(){this.open=true;},close(){this.open=false;}};nodes.push(e);return e;}
 const body=el('body'),heading=el('span'),equity=el('div'),track=el('div'),note=el('p'),info=el('aside'),format=el('span'),bank=el('b');el('div').append(format);el('div').append(bank);
 info.querySelector=s=>s==='.eyebrow'?heading:s==='.equityHeading'?equity:track;
 const settings=el('button'),ids={tableInfo:info,infoFormat:format,infoBank:bank,equityNote:note};
 const document={body,querySelector:()=>settings,getElementById:id=>ids[id],createElement:el};
 const state={players:[{id:'me',spectating:false}],canManage:true,mode:'tournament',level:2,baseSmall:25,baseBig:50,nextBlindAt:700000,paused:false};
 const window={visualViewport:{addEventListener(){}},pokerClock:{remaining:()=>61000}};
 vm.runInNewContext(readFileSync('public/table-tools.js','utf8'),{window,document,state,me:'me',socket:{emit(){}},innerWidth:1000,setInterval(){},addEventListener(){},ResizeObserver:class{observe(){}}});
 window.updateTableTools();assert.equal(heading.hidden,true);assert.equal(equity.hidden,true);assert.equal(track.hidden,true);assert.equal(note.hidden,true);assert.ok(body.classList.has('tournamentTheme'));
 const schedule=nodes.find(e=>e.className==='blindSchedule');assert.equal(schedule.children.length,13);assert.ok(schedule.children[1].classList.has('current'));assert.equal(schedule.children[1].children[1].textContent,'$50 / $100');assert.equal(schedule.children[12].children[1].textContent,'$102,400 / $204,800');
 const facts=nodes.find(e=>e.className==='modeFacts');assert.ok(facts.children.some(e=>e.id==='tournamentMode'));assert.equal(format.parentElement.parentElement.className,'modeFactsValues');
 state.mode='cash';window.updateTableTools();assert.equal(heading.hidden,false);assert.equal(note.hidden,false);assert.equal(nodes.find(e=>e.id==='blindLevels').hidden,true);assert.equal(body.classList.has('tournamentTheme'),false);
});
