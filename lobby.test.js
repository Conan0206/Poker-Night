import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
import {tableDirectory} from './lobby.js';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('directory includes live private tables without leaking codes or identities',()=>{
 const rooms=new Map([['SECRET',{code:'SECRET',mode:'cash',started:true,players:[{id:'secret-id',name:'Private name',socket:'private-socket',token:'secret-token'},{bot:true},{socket:'watch-socket',spectating:true}]}]]);
 const rows=tableDirectory(rooms);assert.equal(rows.length,5);assert.ok(rows.some(r=>r.code==='CASH1'&&r.bankroll&&r.minBuyIn===40&&r.maxBuyIn===200));const entry=rows.find(p=>p.private);assert.equal(entry.players,2);assert.equal(entry.watching,1);assert.equal(entry.playing,true);
 for(const secret of ['SECRET','secret-id','Private name','private-socket','secret-token','watch-socket'])assert.ok(!JSON.stringify(rows).includes(secret));
});
test('bot training plays across hands without people, stays watch-only and releases disconnected watchers',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3192',DATABASE_URL:''},stdio:'pipe'});let socket;
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  const initial=await (await fetch('http://localhost:3192/api/tables')).json();assert.equal(initial.tables[0].code,'BOTS');assert.equal(initial.tables[0].players,4);assert.equal(initial.tables[0].playing,true);
  // Leave the arena completely unwatched until at least its second hand.
  const until=Date.now()+65000;let state;
  socket=io('http://localhost:3192',{transports:['websocket'],autoConnect:false});socket.on('state',s=>state=s);
  await wait(2000);socket.connect();await new Promise(r=>socket.once('connect',r));socket.emit('enter',{code:'BOTS',name:'Arena viewer',spectating:false});
  while(!state&&Date.now()<until)await wait(30);assert.equal(state.practice,true);assert.equal(state.canManage,false);assert.equal(state.players.filter(p=>p.bot).length,4);assert.equal(state.players.find(p=>p.name==='Arena viewer').spectating,true);
  const big=state.big;socket.emit('pause');socket.emit('addbot');socket.emit('settings',{small:1,big:2,startingBank:100,turnSeconds:5});socket.emit('sit');socket.emit('switchMode',{mode:'tournament'});await wait(100);assert.equal(state.big,big);assert.equal(state.paused,false);assert.equal(state.mode,'cash');assert.equal(state.players.filter(p=>p.bot).length,4);
  socket.disconnect();await wait(100);let watched=await (await fetch('http://localhost:3192/api/tables')).json();assert.equal(watched.tables.find(p=>p.code==='BOTS').watching,0);
  socket.connect();await new Promise(r=>socket.once('connect',r));socket.emit('enter',{code:'BOTS',spectating:true});
  while((!state||state.handNumber<2)&&Date.now()<until)await wait(200);
  assert.ok(state.handNumber>=2);assert.equal(state.players.filter(p=>p.bot&&!p.spectating).length,4);
 }finally{socket?.disconnect();child.kill();}
});
