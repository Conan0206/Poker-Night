import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function runtime({permission='default',enabled=false,chosen=false,supported=true,request,broken=false}={}){
 const nodes=[],events={},notifications=[],notices=[],emits=[],saved=new Map([['poker-notifications',String(enabled)],['poker-notification-choice',String(chosen)]]);let requests=0;
 function node(tag){const el={tag,children:[],hidden:false,open:false,append(...items){this.children.push(...items);},setAttribute(k,v){this[k]=v;},addEventListener(name,fn){this[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}};nodes.push(el);return el;}
 const bell=node('button'),status=node('p'),document={body:node('body'),hidden:false,focused:true,hasFocus(){return this.focused;},createElement:node,getElementById:()=>bell,addEventListener:(name,fn)=>events[name]=fn};
 class Notification{static permission=permission;static requestPermission(){requests++;return request?request():Promise.resolve(Notification.permission='granted');}constructor(title,options){if(broken)throw Error('Delivery failed');this.title=title;this.options=options;notifications.push(this);}close(){}}
 const window={isSecureContext:true,addEventListener:(name,fn)=>events[name]=fn,focus(){document.focused=true;}};if(supported)window.Notification=Notification;
 const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},ctx=vm.createContext({window,document,Notification,localStorage:storage,sessionStorage:storage,notice:text=>notices.push(text),setTimeout(){},$:()=>status,socket:{emit:(...args)=>emits.push(args)}});
 vm.runInContext(readFileSync('public/notifications.js','utf8'),ctx);
 const app=readFileSync('public/app.js','utf8');vm.runInContext(app.slice(app.indexOf('let enteringFromMenu='),app.indexOf('window.moveToMainTable=')),ctx);
 return {window,document,Notification,bell,nodes,saved,notifications,notices,emits,events,get requests(){return requests;},join:data=>vm.runInContext('joinFromMenu',ctx)(data),button:text=>nodes.find(n=>n.textContent===text)};
}
test('first table entry waits for the player choice and browser permission; repeated clicks enter once',async()=>{
 let resolve;const r=runtime({request:()=>new Promise(done=>resolve=done)}),entry=r.join({name:'Test',code:'MAIN'});r.join({name:'Test',code:'TOUR'});
 assert.equal(r.emits.length,0);assert.equal(r.nodes.find(n=>n.id==='notificationPrompt').open,true);
 const enabling=r.button('Enable alerts').onclick();assert.equal(r.requests,1);assert.equal(r.emits.length,0);r.Notification.permission='granted';resolve('granted');await enabling;await entry;
 assert.equal(r.emits.length,1);assert.equal(r.emits[0][1].code,'MAIN');assert.equal(r.saved.get('poker-notifications'),'true');assert.equal(r.nodes.find(n=>n.id==='notificationPrompt').open,false);
});
test('not now, blocked permissions and unsupported browsers allow entry without repeated prompts',async()=>{
 const r=runtime(),entry=r.join({name:'Test',code:'MAIN'});r.button('Not now').onclick();await entry;assert.equal(r.requests,0);assert.equal(r.emits.length,1);await r.join({name:'Test',code:'MAIN'});assert.equal(r.nodes.find(n=>n.id==='notificationPrompt').open,false);
 const denied=runtime({permission:'denied'}),pending=denied.join({name:'Test',code:'MAIN'});assert.equal(denied.button('Enable alerts').disabled,true);denied.button('Continue without alerts').onclick();await pending;assert.equal(denied.requests,0);assert.equal(denied.emits.length,1);
 const unsupported=runtime({supported:false});await unsupported.join({name:'Test',code:'MAIN'});assert.equal(unsupported.emits.length,1);assert.equal(unsupported.nodes.find(n=>n.id==='notificationPrompt').open,false);
});
test('saved enabled permission skips entry prompts; bell choices and storage sync stay personal',async()=>{
 const r=runtime({permission:'granted',enabled:true});await r.join({name:'Test',code:'MAIN'});assert.equal(r.requests,0);assert.equal(r.nodes.find(n=>n.id==='notificationPrompt').open,false);await r.bell.onclick();assert.equal(r.saved.get('poker-notifications'),'false');assert.equal(r.bell['aria-pressed'],'false');r.events.storage({key:'poker-notifications',newValue:'true'});assert.equal(r.bell['aria-pressed'],'true');
});
test('turn/all-in alerts work while unfocused, suppress active/paused duplicates, and tests bypass focus',()=>{
 const r=runtime({permission:'granted',enabled:true}),base={code:'MAIN',handNumber:1,street:'preflop',turn:1,players:[{id:'me',chips:100,inHand:true},{id:'other',name:'Other',chips:100,inHand:true}]};const send=s=>r.events['poker-state']({detail:{state:s,me:'me'}});
 send(base);send({...base,turn:0});assert.equal(r.notifications.length,0);
 r.document.focused=false;send({...base,turn:0,street:'flop'});assert.equal(r.notifications.length,1);send({...base,turn:0,street:'flop'});assert.equal(r.notifications.length,1);send({...base,turn:0,street:'turn',paused:true});assert.equal(r.notifications.length,1);
 send({...base,turn:0,street:'turn',players:[base.players[0],{...base.players[1],chips:0}]});assert.equal(r.notifications.length,2);assert.equal(r.notifications[1].options.tag,'poker-allin-other');r.document.focused=true;assert.equal(r.window.pokerNotifications.test(),true);assert.equal(r.notifications.length,3);assert.equal(r.notifications[2].options.tag,'poker-test');
});
test('test delivery errors produce a useful error instead of claiming Windows displayed a notification',()=>{
 const r=runtime({permission:'granted',enabled:true,broken:true});assert.equal(r.window.pokerNotifications.test(),false);assert.match(r.notices.at(-1),/could not send/);
});
