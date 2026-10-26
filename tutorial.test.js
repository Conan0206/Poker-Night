import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('tutorial navigates every feature, remembers skipping, and places reveal beside emotes',()=>{
 const nodes=[],events={},saved=new Map(),timers=[];
 function element(tag,rect={left:50,top:100,right:110,bottom:150,width:60,height:50}){const e={tag,style:{},children:[],hidden:false,offsetWidth:300,offsetHeight:240,open:false,setAttribute(){},removeAttribute(){},cloneNode(){return element(tag,rect);},replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},getBoundingClientRect:()=>rect,getClientRects:()=>[rect],focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this[name]=fn;}};nodes.push(e);return e;}
 const targets={sitDown:element('button'),revealHands:element('button'),emoteToggle:element('button',{left:800,top:600,right:865,bottom:658,width:65,height:58}),rabbit:element('button'),board:element('div')};targets.revealHands.getBoundingClientRect=()=>({width:150,height:44});
 const header=element('header'),body=element('body'),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const document={body,activeElement:element('button'),getElementById:id=>targets[id],createElement:element,querySelector:selector=>selector==='dialog[open]'?nodes.find(e=>e.open):selector==='.headerLeftActions'?header:targets[selector.slice(1)]||targets.board};
 const window={visualViewport:{addEventListener(){}}};
 vm.runInNewContext(readFileSync('public/tutorial.js','utf8'),{document,window,localStorage:storage,ResizeObserver:class{observe(){}},addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>fn(),setTimeout:fn=>timers.push(fn),innerWidth:1000,innerHeight:800});
 assert.ok(header.children.includes(targets.sitDown));assert.equal(targets.revealHands.style.left,'638px');assert.equal(targets.revealHands.style.top,'607px');
 events['poker-state']();timers.shift()();const dialog=nodes.find(e=>e.id==='pokerTutorial');assert.equal(dialog.open,true);
 const skip=nodes.find(e=>e.textContent==='Skip tutorial'),next=nodes.find(e=>e.textContent==='Next'),title=nodes.find(e=>e.tag==='h2');
 assert.equal(title.textContent,'Add a bot');const titles=[];
 for(let i=0;i<11;i++){titles.push(title.textContent);if(i===1)assert.ok(nodes.some(e=>e.textContent==='Kick'));if(i===10)assert.ok(nodes.some(e=>e.className==='tutorialRabbitPreview'));next.onclick();}
 assert.equal(dialog.open,false);assert.equal(saved.get('poker-tutorial-v1'),'done');assert.ok(titles.includes('Player statistics'));assert.ok(titles.includes('Rabbit hunt'));assert.ok(titles.includes('Audio settings'));
 window.startPokerTutorial();assert.equal(dialog.open,true);skip.onclick();assert.equal(dialog.open,false);
 events['poker-state']();assert.equal(timers.length,0);
});
