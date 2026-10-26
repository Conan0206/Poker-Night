import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('private cards, illegal actions, all-in showdown and chip conservation',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101'},stdio:'pipe'});const clients=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
 async function join(code,name,spectating=false){const s=io('http://localhost:3101',{transports:['websocket']});clients.push(s);let state; s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));const identity=new Promise(r=>s.once('identity',r));s.emit('enter',{code,name,spectating});const id=await identity;await wait(40);return {s,id:id.id,get state(){return state;}};}
 const a=await join(null,'Alice'),b=await join(a.state.code,'Bob'),c=await join(a.state.code,'Carol'),watcher=await join(a.state.code,'Watcher',true);const players=[a,b,c];
 assert.equal(a.state.turnSeconds,30);assert.equal(a.state.spectators.length,1);assert.equal(a.state.spectators[0].name,'Watcher');
 b.s.emit('settings',{small:10,big:20,startingBank:2000,turnSeconds:45});await wait(45);assert.equal(a.state.big,20);assert.equal(a.state.players[0].chips,2000);assert.equal(a.state.turnSeconds,45);
 watcher.s.emit('settings',{small:1,big:2,startingBank:100,turnSeconds:5});await wait(40);assert.equal(a.state.big,2);assert.equal(b.state.startingBank,100);
 b.s.emit('settings',{small:5,big:10,startingBank:1000,turnSeconds:30});await wait(40);
 a.s.emit('start');await wait(100);
 assert.equal(watcher.state.players.find(p=>p.id===a.id).cards[0],'?');assert.equal(watcher.state.players.find(p=>p.id===watcher.id).inHand,false);
 const actor=players.find(p=>p.id===a.state.players[a.state.turn].id);const deadline=a.state.deadline;
 watcher.s.emit('timecard');await wait(30);assert.equal(a.state.deadline,deadline);
 actor.s.emit('timecard');await wait(40);assert.equal(a.state.deadline,deadline+60000);assert.equal(a.state.players.find(p=>p.id===actor.id).timeCards,2);
 actor.s.emit('timecard');actor.s.emit('timecard');actor.s.emit('timecard');await wait(40);assert.equal(a.state.deadline,deadline+180000);assert.equal(a.state.players.find(p=>p.id===actor.id).timeCards,0);
 b.s.emit('settings',{small:10,big:20,startingBank:1500,turnSeconds:50});await wait(40);assert.equal(a.state.big,10);assert.equal(a.state.pendingSettings.big,20);
 assert.equal(a.state.street,'preflop');assert.equal(a.state.players.find(p=>p.id===b.id).cards[0],'?');assert.equal(a.state.players.find(p=>p.id===a.id).cards.length,2);
 const turn=a.state.turn;players.find(p=>p.id!==a.state.players[turn].id).s.emit('action',{type:'raise',amount:900});await wait(40);assert.equal(a.state.bet,10);
 for(let step=0;step<20&&a.state.street!=='showdown'&&!a.state.runningOut;step++){const st=a.state,actor=players.find(p=>p.id===st.players[st.turn].id),p=st.players[st.turn];actor.s.emit('action',{type:p.chips+p.round>st.bet&&p.raiseAllowed?'raise':'call',amount:p.chips+p.round});await wait(55);}
 assert.equal(a.state.runningOut,true);assert.ok(a.state.players.filter(p=>p.inHand&&p.chips===0).every(p=>!p.spectating));assert.equal(a.state.board.length,0);assert.ok(watcher.state.players.filter(p=>p.inHand&&!p.folded).every(p=>p.cards.every(c=>c!=='?')));await wait(5800);assert.equal(a.state.street,'showdown');assert.ok(a.state.nextHandAt>Date.now());assert.equal(a.state.players.reduce((n,p)=>n+p.chips,0),3000);assert.equal(a.state.board.length,5);assert.ok(a.state.players.every(p=>p.cards.every(c=>c!=='?')));assert.equal(a.state.players[0].stats.hands,1);const busted=a.state.players.filter(p=>p.inHand&&p.chips===0);assert.ok(busted.every(p=>!p.spectating));assert.ok(busted.every(p=>!a.state.spectators.some(v=>v.id===p.id)));const remaining=a.state.nextHandAt-Date.now();await wait(remaining+100);assert.equal(a.state.street,'showdown');assert.ok(Date.now()>=a.state.nextHandAt);await wait(550);assert.ok(busted.every(p=>a.state.players.find(q=>q.id===p.id).spectating));assert.ok(busted.every(p=>a.state.spectators.some(v=>v.id===p.id)));assert.ok(a.state.players.filter(p=>p.chips>0).every(p=>!p.spectating));
 watcher.s.emit('sit');await wait(40);assert.equal(a.state.players.find(p=>p.id===watcher.id).spectating,false);watcher.s.emit('spectate');await wait(40);assert.equal(a.state.players.find(p=>p.id===watcher.id).spectating,true);
 await wait(7100);assert.equal(a.state.big,20);assert.equal(a.state.turnSeconds,50);assert.equal(a.state.startingBank,1500);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
test('post-hand reveal choices never disclose an unselected card',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3105'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(code){const s=io('http://localhost:3105',{transports:['websocket']});peers.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:code?'Guest':'Host'});await wait(70);return {s,get state(){return state;},get id(){return id;}};}const a=await join(),b=await join(a.state.code);a.s.emit('start');await wait(70);a.s.emit('reveal',3);a.s.emit('rabbit');await wait(30);assert.equal(b.state.rabbitBoard.length,0);assert.equal(b.state.players.find(p=>p.id===a.id).cards[0],'?');a.s.emit('action',{type:'fold'});await wait(60);assert.equal(b.state.street,'showdown');assert.equal(b.state.players.find(p=>p.id===b.id).wonHand,15);assert.equal(b.state.players.find(p=>p.id===a.id).wonHand,0);assert.deepEqual(b.state.players.find(p=>p.id===a.id).cards,['?','?']);a.s.emit('reveal',0);await wait(30);assert.deepEqual(b.state.players.find(p=>p.id===a.id).cards,['?','?']);a.s.emit('reveal',1);await wait(30);const shown=b.state.players.find(p=>p.id===a.id).cards;assert.notEqual(shown[0],'?');assert.equal(shown[1],'?');a.s.emit('reveal',2);await wait(30);assert.ok(b.state.players.find(p=>p.id===a.id).cards.every(c=>c!=='?'));const result=b.state.result,deadline=b.state.nextHandAt,chips=b.state.players.map(p=>p.chips);a.s.emit('rabbit');await wait(40);assert.equal(b.state.board.length,0);assert.equal(b.state.rabbitBoard.length,5);assert.equal(new Set(b.state.rabbitBoard).size,5);assert.equal(b.state.result,result);assert.equal(b.state.nextHandAt,deadline);assert.deepEqual(b.state.players.map(p=>p.chips),chips);const rabbit=[...b.state.rabbitBoard];a.s.emit('rabbit');await wait(30);assert.deepEqual(b.state.rabbitBoard,rabbit);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
test('main table is shared cash and home navigation folds and releases a seat',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3104'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(){const s=io('http://localhost:3104',{transports:['websocket']});peers.push(s);let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{code:'MAIN',name:'Main guest',mode:'tournament'});await wait(70);return {s,get state(){return state;}};}const a=await join(),b=await join();assert.equal(a.state.code,'MAIN');assert.equal(a.state.mode,'cash');assert.equal(a.state.players.length,2);a.s.emit('start');await wait(70);const leavingId=a.state.host;await new Promise(resolve=>a.s.emit('leave',resolve));await wait(50);assert.equal(b.state.street,'showdown');assert.notEqual(b.state.host,leavingId);assert.equal(b.state.players.filter(p=>!p.spectating).length,1);assert.equal(b.state.spectators.length,0);assert.equal(b.state.players.reduce((n,p)=>n+p.chips,0),2000);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
test('seated humans share management controls; spectators cannot kick; committed chips remain',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3103'},stdio:'pipe'}),peers=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,spectating=false){const s=io('http://localhost:3103',{transports:['websocket']});peers.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Player',spectating});await wait(70);return {s,get state(){return state;},get id(){return id;}};}
  const host=await join(),guest=await join(host.state.code),watcher=await join(host.state.code,true);
  assert.equal(host.state.canManage,true);assert.equal(guest.state.canManage,true);assert.equal(watcher.state.canManage,false);
  watcher.s.emit('kick',host.id);await wait(50);assert.equal(guest.state.players.find(p=>p.id===host.id).spectating,false);
  guest.s.emit('start');await wait(80);assert.equal(guest.state.street,'preflop');
  let kicked=false;host.s.on('kicked',()=>kicked=true);guest.s.emit('kick',host.id);await wait(80);assert.equal(kicked,true);assert.equal(guest.state.street,'showdown');assert.equal(guest.state.players.find(p=>p.id===host.id).folded,true);assert.equal(guest.state.players.reduce((n,p)=>n+p.chips,0),2000);
  guest.s.emit('addbot');await wait(50);const bot=guest.state.players.find(p=>p.bot);guest.s.emit('kick',bot.id);await wait(50);assert.equal(guest.state.players.find(p=>p.id===bot.id).spectating,true);assert.ok(!guest.state.spectators.some(p=>p.id===bot.id));
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});

test('bots take legal turns, keep private cards hidden and support watching then sitting',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3102'},stdio:'pipe'});let s;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});s=io('http://localhost:3102',{transports:['websocket']});let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{name:'Tester'});await wait(70);s.emit('addbot');s.emit('addbot');await wait(70);assert.equal(state.players.filter(p=>p.bot).length,2);s.emit('spectate');await wait(50);assert.equal(state.players[0].spectating,true);s.emit('start');await wait(100);assert.equal(state.street,'preflop');assert.ok(state.players.filter(p=>p.bot).every(p=>p.cards[0]==='?'));await wait(700);assert.ok(state.players.filter(p=>p.bot).every(p=>p.stats.actions===0));for(let n=0;n<32&&!state.players.some(p=>p.bot&&p.stats.actions>0);n++)await wait(250);assert.ok(state.players.some(p=>p.bot&&p.stats.actions>0));assert.equal(state.players.reduce((n,p)=>n+p.chips+(state.street==='showdown'?0:p.total),0),3000);s.emit('sit');await wait(50);assert.equal(state.players[0].spectating,false);assert.equal(state.players[0].inHand,false);for(let i=0;i<10;i++)s.emit('addbot');await wait(100);assert.equal(state.players.filter(p=>!p.spectating).length,8);
 }finally{s?.disconnect();child.kill();}
});

test('spectators can send rapid emotes to their room while seated repeat limits remain',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3110'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(code,spectating=false){const s=io('http://localhost:3110',{transports:['websocket']});peers.push(s);let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Emote tester',spectating});await wait(60);return {s,get state(){return state;}};}const a=await join(),b=await join(a.state.code,true),other=await join();const seen=[],hostSeen=[],outside=[];b.s.on('emote',v=>seen.push(v));a.s.on('emote',v=>hostSeen.push(v));other.s.on('emote',v=>outside.push(v));
 b.s.emit('emote',999);a.s.emit('emote',-1);b.s.emit('emote',{index:2,spectating:true});await wait(40);assert.equal(seen.length,0);
 for(let i=0;i<20;i++)b.s.emit('emote',i%16);await wait(100);
 assert.equal(seen.length,20);assert.equal(hostSeen.length,20);assert.ok(seen.every((e,i)=>e.index===i%16&&e.spectating===true&&e.playerId===b.state.players.find(p=>p.spectating).id));
 a.s.emit('emote',15);a.s.emit('emote',1);await wait(60);assert.equal(seen.length,21);assert.equal(seen.at(-1).index,15);assert.equal(seen.at(-1).spectating,false);assert.equal(seen.at(-1).playerId,a.state.players[0].id);assert.equal(outside.length,0);

 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});

test('normal showdown automatically exposes all surviving hands',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3111'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(code){const s=io('http://localhost:3111',{transports:['websocket']});peers.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Showdown tester'});await wait(60);return {s,get state(){return state;},get id(){return id;}};}const a=await join(),b=await join(a.state.code);a.s.emit('start');await wait(60);for(let n=0;n<12&&a.state.street!=='showdown';n++){const st=a.state,p=st.players[st.turn],actor=[a,b].find(c=>c.id===p.id);actor.s.emit('action',{type:st.bet>p.round?'call':'check'});await wait(40);}assert.equal(a.state.street,'showdown');assert.equal(a.state.board.length,5);assert.equal(a.state.players.reduce((n,p)=>n+(p.wonHand||0),0),a.state.pot);assert.ok(a.state.players.some(p=>p.wonHand>0));for(const winner of a.state.players.filter(p=>p.wonHand>0)){assert.equal(a.state.awards.flatMap(award=>award.winners).filter(w=>w.id===winner.id).reduce((sum,w)=>sum+w.amount,0),winner.wonHand);assert.ok(winner.winningHand);assert.equal(winner.winningCards.length,5);assert.equal(new Set(winner.winningCards).size,5);assert.ok(winner.winningCards.every(c=>[...winner.cards,...a.state.board].includes(c)));}assert.ok(a.state.players.filter(p=>p.inHand&&!p.folded).every(p=>p.shown===3&&p.cards.every(c=>c!=='?')));assert.ok(b.state.players.filter(p=>p.inHand&&!p.folded).every(p=>p.cards.every(c=>c!=='?')));
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});


test('full main table opens as spectator, reuses the session, and seats a returning watcher when space opens',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3112'},stdio:'pipe'}),peers=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(data){const socket=io('http://localhost:3112',{transports:['websocket']});peers.push(socket);let state,identity;const notices=[];socket.on('state',v=>state=v);socket.on('identity',v=>identity=v);socket.on('notice',v=>notices.push(v));await new Promise(r=>socket.on('connect',r));socket.emit('enter',data);await wait(70);return {socket,notices,get state(){return state;},get identity(){return identity;}};}
  const host=await join({code:'MAIN',name:'Host'});for(let i=0;i<7;i++)host.socket.emit('addbot');await wait(70);
  const guest=await join({code:'MAIN',name:'Guest',fromMenu:true});assert.ok(guest.identity);assert.equal(guest.state.code,'MAIN');assert.equal(guest.state.players.find(p=>p.id===guest.identity.id).spectating,true);assert.match(guest.notices[0],/main table is full/);assert.equal(guest.state.players.filter(p=>!p.spectating).length,8);
  const resumed=await join({code:'MAIN',name:'Guest',token:guest.identity.token,fromMenu:true});assert.equal(resumed.identity.id,guest.identity.id);assert.equal(resumed.state.players.filter(p=>!p.bot).length,2);assert.equal(resumed.state.spectators.length,1);
  host.socket.emit('kick',host.state.players.find(p=>p.bot).id);await wait(70);
  const seated=await join({code:'MAIN',name:'Guest',token:guest.identity.token,fromMenu:true});const self=seated.state.players.find(p=>p.id===seated.identity.id);assert.equal(self.spectating,false);assert.equal(self.chips,seated.state.startingBank);assert.equal(self.hideHoleCards,true);assert.equal(seated.state.players.filter(p=>!p.spectating&&!p.kicked).length,8);
  const privateHost=await join({name:'Private host'});for(let i=0;i<7;i++)privateHost.socket.emit('addbot');await wait(70);const rejected=await join({code:privateHost.state.code,name:'Extra guest'});assert.equal(rejected.identity,undefined);assert.match(rejected.notices[0],/Seats are full/);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
