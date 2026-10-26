import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('bot reveals require a finished current hand, never expose humans, and broadcast to spectators',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3140'},stdio:'pipe'}),clients=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,spectating=false){const s=io('http://localhost:3140',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Reveal test',spectating});await wait(60);return {s,get state(){return state;},get id(){return id;}};}
  const a=await join(),b=await join(a.state.code),watch=await join(a.state.code,true);
  a.s.emit('addbot');await wait(40);a.s.emit('start');await wait(50);
  const bot=a.state.players.find(p=>p.bot),handNumber=a.state.handNumber;
  a.s.emit('revealBot',{id:bot.id,handNumber});await wait(30);
  assert.deepEqual(watch.state.players.find(p=>p.id===bot.id).cards,['?','?']);
  for(let i=0;i<100&&a.state.street!=='showdown';i++){
   const actor=a.state.players[a.state.turn];const peer=[a,b].find(p=>p.id===actor?.id);
   if(peer)peer.s.emit('action',{type:'fold'});await wait(70);
  }
  assert.equal(a.state.street,'showdown');
  watch.s.emit('revealBot',{id:a.id,handNumber});watch.s.emit('revealBot',{id:bot.id,handNumber:handNumber-1});await wait(40);
  assert.deepEqual(watch.state.players.find(p=>p.id===a.id).cards,['?','?']);
  assert.deepEqual(watch.state.players.find(p=>p.id===bot.id).cards,['?','?']);
  const chips=watch.state.players.map(p=>p.chips),next=watch.state.nextHandAt;
  watch.s.emit('revealBot',{id:bot.id,handNumber});await wait(50);
  assert.ok(watch.state.players.find(p=>p.id===bot.id).cards.every(c=>c!=='?'));
  assert.deepEqual(a.state.players.find(p=>p.id===bot.id).cards,watch.state.players.find(p=>p.id===bot.id).cards);
  assert.deepEqual(watch.state.players.map(p=>p.chips),chips);assert.equal(watch.state.nextHandAt,next);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
