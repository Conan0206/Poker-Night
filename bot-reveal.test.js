import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('limited hand reveals validate phase, target, allowance and retain chips when sitting',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3140'},stdio:'pipe'}),clients=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,spectating=false){const s=io('http://localhost:3140',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Reveal test',spectating});await wait(60);return {s,get state(){return state;},get id(){return id;}};}
  const a=await join(),b=await join(a.state.code),watch=await join(a.state.code,true);
  a.s.emit('addbot');await wait(40);a.s.emit('start');await wait(50);
  const bot=a.state.players.find(p=>p.bot),handNumber=a.state.handNumber;
  a.s.emit('revealHand',{id:bot.id,handNumber});await wait(30);
  assert.deepEqual(watch.state.players.find(p=>p.id===bot.id).cards,['?','?']);
  for(let i=0;i<100&&a.state.street!=='showdown';i++){
   const actor=a.state.players[a.state.turn];const peer=[a,b].find(p=>p.id===actor?.id);
   if(peer)peer.s.emit('action',{type:'fold'});await wait(70);
  }
  assert.equal(a.state.street,'showdown');
  watch.s.emit('revealHand',{id:watch.id,handNumber});watch.s.emit('revealHand',{id:bot.id,handNumber:handNumber-1});await wait(40);
  assert.deepEqual(watch.state.players.find(p=>p.id===a.id).cards,['?','?']);
  assert.deepEqual(watch.state.players.find(p=>p.id===bot.id).cards,['?','?']);
  assert.equal(watch.state.revealsRemaining,3);
  const chips=watch.state.players.map(p=>p.chips),next=watch.state.nextHandAt;
  watch.s.emit('revealHand',{id:bot.id,handNumber});await wait(50);
  assert.ok(watch.state.players.find(p=>p.id===bot.id).cards.every(c=>c!=='?'));
  assert.deepEqual(a.state.players.find(p=>p.id===bot.id).cards,watch.state.players.find(p=>p.id===bot.id).cards);
  assert.equal(watch.state.revealsRemaining,2);watch.s.emit('revealHand',{id:bot.id,handNumber});await wait(30);assert.equal(watch.state.revealsRemaining,2);watch.s.emit('revealHand',{id:a.id,handNumber});await wait(30);assert.ok(watch.state.players.find(p=>p.id===a.id).cards.every(c=>c!=='?'));assert.equal(watch.state.revealsRemaining,1);
  a.s.emit('settings',{small:5,big:10,startingBank:1000,turnSeconds:30,revealAllowance:2});await wait(30);assert.equal(watch.state.revealsRemaining,0);watch.s.emit('revealHand',{id:b.id,handNumber});await wait(30);assert.deepEqual(watch.state.players.find(p=>p.id===b.id).cards,['?','?']);
  assert.deepEqual(watch.state.players.map(p=>p.chips),chips);assert.equal(watch.state.nextHandAt,next);
  const previous=a.state.players.find(p=>p.id===a.id).chips;a.s.emit('spectate');await wait(30);a.s.emit('sit',{mode:'keep'});await wait(30);assert.equal(a.state.players.find(p=>p.id===a.id).chips,previous);assert.equal(a.state.players.find(p=>p.id===a.id).spectating,false);a.s.emit('spectate');await wait(30);a.s.emit('sit',{mode:'reset'});await wait(30);assert.equal(a.state.players.find(p=>p.id===a.id).chips,1000);assert.ok(a.state.players.find(p=>p.id===a.id).cards.every(c=>c==='?'));
  watch.s.emit('sit',{mode:'keep'});await wait(30);assert.equal(watch.state.players.find(p=>p.id===watch.id).spectating,true);assert.equal(watch.state.revealsRemaining,0);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
