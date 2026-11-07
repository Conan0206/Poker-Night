import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('tutorial navigates every feature, opens on every entry after skipping, and places reveal beside emotes',()=>{
 const nodes=[],events={},saved=new Map(),timers=[];
 function element(tag,rect={left:50,top:100,right:110,bottom:150,width:60,height:50}){const e={tag,style:{},children:[],hidden:false,offsetWidth:300,offsetHeight:240,open:false,setAttribute(){},removeAttribute(){},cloneNode(){return element(tag,rect);},replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},getBoundingClientRect:()=>rect,getClientRects:()=>[rect],focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this[name]=fn;}};nodes.push(e);return e;}
 const targets={sitDown:element('button'),revealHands:element('button'),emoteToggle:element('button',{left:800,top:600,right:865,bottom:658,width:65,height:58}),rabbit:element('button'),board:element('div')};targets.revealHands.getBoundingClientRect=()=>({width:150,height:44});
 const header=element('header'),body=element('body'),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 body.classList={toggle(){},remove(){}};
 const document={body,activeElement:element('button'),getElementById:id=>targets[id],createElement:element,querySelector:selector=>selector==='dialog[open]'?nodes.find(e=>e.open):selector==='.headerLeftActions'?header:targets[selector.slice(1)]||targets.board};
 const window={visualViewport:{addEventListener(){}}};
 vm.runInNewContext(readFileSync('public/tutorial.js','utf8'),{document,window,localStorage:storage,ResizeObserver:class{observe(){}},addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>fn(),setTimeout:fn=>timers.push(fn),innerWidth:1000,innerHeight:800});
 assert.ok(header.children.includes(targets.sitDown));assert.equal(targets.revealHands.style.left,'638px');assert.equal(targets.revealHands.style.top,'607px');
 events['poker-entered']();events['poker-state']();timers.shift()();const dialog=nodes.find(e=>e.id==='pokerTutorial');assert.equal(dialog.open,true);
 const skip=nodes.find(e=>e.textContent==='Skip tutorial'),next=nodes.find(e=>e.textContent==='Next'),title=nodes.find(e=>e.tag==='h2');
 assert.equal(title.textContent,'Back to home');targets.rabbit.hidden=true;targets.revealHands.hidden=true;const titles=[];
 for(let i=0;i<13;i++){titles.push(title.textContent);if(title.textContent==='Kick a bot')assert.ok(nodes.some(e=>e.textContent==='Kick'));if(title.textContent==='Reveal a hand'){assert.ok(nodes.some(e=>e.className==='tutorialRevealButton'&&e.textContent.includes('(3)')));assert.equal(nodes.find(e=>e.className==='tutorialSpotlight').hidden,true);}if(title.textContent==='Hand rankings'){assert.equal(nodes.some(e=>e.className==='tutorialRankingCards'),false);assert.equal(nodes.find(e=>e.className==='tutorialSpotlight').hidden,false);}if(title.textContent==='Rabbit hunt'){assert.ok(nodes.some(e=>e.className==='tutorialRabbitPreview'));assert.equal(nodes.find(e=>e.className==='tutorialSpotlight').hidden,true);}next.onclick();}
 assert.equal(dialog.open,false);assert.equal(saved.get('poker-tutorial-v1'),'done');assert.ok(titles.includes('Player statistics'));assert.ok(titles.includes('Rabbit hunt'));assert.ok(titles.includes('Audio settings'));assert.ok(titles.includes('Hand rankings'));
 window.startPokerTutorial();assert.equal(dialog.open,true);skip.onclick();assert.equal(dialog.open,false);
 events['poker-state']();assert.equal(timers.length,0);events['poker-entered']();timers.shift()();assert.equal(dialog.open,true);skip.onclick();
 events['poker-entered']();events['poker-state']({detail:{state:{practice:true}}});timers.shift()();assert.equal(dialog.open,true);
 assert.equal(title.textContent,'Back to home');next.onclick();assert.equal(title.textContent,'Bot training');
 events['poker-state']({detail:{state:{practice:true}}});assert.equal(dialog.open,true);assert.equal(title.textContent,'Bot training');
 const botTitles=[];for(let i=0;i<20&&dialog.open;i++){botTitles.push(title.textContent);if(title.textContent==='Reveal bot hands')assert.ok(nodes.some(e=>e.className==='tutorialRevealButton'&&e.textContent.includes('(∞)')));next.onclick();}
 assert.equal(dialog.open,false);assert.ok(botTitles.includes('Reveal bot hands'));for(const unavailable of ['Add a bot','Kick a bot','Turn notifications','Rabbit hunt'])assert.equal(botTitles.includes(unavailable),false);
 events['poker-state']({detail:{state:{mode:'tournament'}}});window.startPokerTutorial();const tournamentTitles=[];for(let i=0;i<20&&dialog.open;i++){tournamentTitles.push(title.textContent);next.onclick();}assert.equal(tournamentTitles.includes('Reveal a hand'),false);assert.equal(tournamentTitles[0],'Back to home');
});
