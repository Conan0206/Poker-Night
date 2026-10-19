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
 watcher.s.emit('settings',{small:1,big:2,startingBank:100,turnSeconds:5});await wait(40);assert.equal(a.state.big,20);
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
 for(let step=0;step<20&&a.state.street!=='showdown';step++){const st=a.state,actor=players.find(p=>p.id===st.players[st.turn].id),p=st.players[st.turn];actor.s.emit('action',{type:p.chips+p.round>st.bet&&p.raiseAllowed?'raise':'call',amount:p.chips+p.round});await wait(55);}
 assert.equal(a.state.street,'showdown');assert.equal(a.state.players.reduce((n,p)=>n+p.chips,0),3000);assert.equal(a.state.board.length,5);assert.ok(a.state.players.every(p=>p.cards.every(c=>c!=='?')));assert.equal(a.state.players[0].stats.hands,1);
 watcher.s.emit('sit');await wait(40);assert.equal(a.state.players.find(p=>p.id===watcher.id).spectating,false);watcher.s.emit('spectate');await wait(40);assert.equal(a.state.players.find(p=>p.id===watcher.id).spectating,true);
 await wait(6600);assert.equal(a.state.big,20);assert.equal(a.state.turnSeconds,50);assert.equal(a.state.startingBank,1500);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
test('main table is shared cash and home navigation folds and releases a seat',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3104'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(){const s=io('http://localhost:3104',{transports:['websocket']});peers.push(s);let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{code:'MAIN',name:'Main guest',mode:'tournament'});await wait(70);return {s,get state(){return state;}};}const a=await join(),b=await join();assert.equal(a.state.code,'MAIN');assert.equal(a.state.mode,'cash');assert.equal(a.state.players.length,2);a.s.emit('start');await wait(70);const leavingId=a.state.host;await new Promise(resolve=>a.s.emit('leave',resolve));await wait(50);assert.equal(b.state.street,'showdown');assert.notEqual(b.state.host,leavingId);assert.equal(b.state.players.filter(p=>!p.spectating).length,1);assert.equal(b.state.spectators.length,0);assert.equal(b.state.players.reduce((n,p)=>n+p.chips,0),2000);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
test('host can kick during a hand; other players cannot; committed chips remain',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3103'},stdio:'pipe'});const peers=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});async function join(code){const s=io('http://localhost:3103',{transports:['websocket']});peers.push(s);let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:code?'Guest':'Host'});await wait(70);return {s,get state(){return state;}};}const host=await join(),guest=await join(host.state.code);const hostId=host.state.host,guestId=host.state.players.find(p=>p.id!==hostId).id;guest.s.emit('kick',hostId);await wait(40);assert.equal(host.state.players.find(p=>p.id===hostId).spectating,false);host.s.emit('start');await wait(70);let kicked=false;guest.s.on('kicked',()=>kicked=true);host.s.emit('kick',guestId);await wait(70);assert.ok(kicked);assert.equal(host.state.street,'showdown');assert.equal(host.state.players.find(p=>p.id===guestId).folded,true);assert.equal(host.state.players.reduce((n,p)=>n+p.chips,0),2000);host.s.emit('addbot');await wait(40);const bot=host.state.players.find(p=>p.bot);host.s.emit('kick',bot.id);await wait(40);assert.equal(host.state.players.find(p=>p.id===bot.id).spectating,true);assert.equal(host.state.spectators.length,0);assert.equal(host.state.players.find(p=>p.id===bot.id).socket,null);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
test('bots take legal turns, keep private cards hidden and support watching then sitting',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3102'},stdio:'pipe'});let s;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});s=io('http://localhost:3102',{transports:['websocket']});let state;s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));s.emit('enter',{name:'Tester'});await wait(70);s.emit('addbot');s.emit('addbot');await wait(70);assert.equal(state.players.filter(p=>p.bot).length,2);s.emit('spectate');await wait(50);assert.equal(state.players[0].spectating,true);s.emit('start');await wait(100);assert.equal(state.street,'preflop');assert.ok(state.players.filter(p=>p.bot).every(p=>p.cards[0]==='?'));await wait(1500);assert.ok(state.players.some(p=>p.bot&&p.stats.actions>0));assert.equal(state.players.reduce((n,p)=>n+p.chips+p.total,0),3000);s.emit('sit');await wait(50);assert.equal(state.players[0].spectating,false);assert.equal(state.players[0].inHand,false);for(let i=0;i<10;i++)s.emit('addbot');await wait(100);assert.equal(state.players.filter(p=>!p.spectating).length,8);
 }finally{s?.disconnect();child.kill();}
});
