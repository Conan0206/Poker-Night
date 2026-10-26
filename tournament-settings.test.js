import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('tournament defaults and configurable levels apply safely; optional reveals are disabled',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3144'},stdio:'pipe'}),clients=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,mode='tournament'){const s=io('http://localhost:3144',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,mode,name:'Tournament config test'});await wait(40);return {s,get state(){return state;},get id(){return id;}};}
  const a=await join(),b=await join(a.state.code);assert.equal(a.state.startingBank,1000);assert.equal(a.state.levelMinutes,7);assert.equal(a.state.revealsRemaining,0);
  const settings={small:25,big:50,startingBank:1500,turnSeconds:30,levelMinutes:2};a.s.emit('settings',settings);await wait(40);assert.equal(a.state.levelMinutes,2);assert.ok(a.state.players.every(p=>p.chips===1500));
  a.s.emit('settings',{...settings,levelMinutes:0});await wait(20);assert.equal(a.state.levelMinutes,2);
  a.s.emit('start');await wait(40);assert.ok(a.state.nextBlindAt-a.state.serverNow>119000&&a.state.nextBlindAt-a.state.serverNow<=120000);
  a.s.emit('settings',{...settings,startingBank:1700,levelMinutes:3});await wait(30);assert.equal(a.state.levelMinutes,2);assert.equal(a.state.pendingSettings.levelMinutes,3);
  const actor=[a,b].find(p=>p.id===a.state.players[a.state.turn].id);actor.s.emit('action',{type:'fold'});await wait(40);actor.s.emit('reveal',3);b.s.emit('revealHand',{id:a.id,handNumber:a.state.handNumber});await wait(30);const observer=actor===a?b:a;assert.deepEqual(observer.state.players.find(p=>p.id===actor.id).cards,['?','?']);assert.equal(a.state.players.find(p=>p.id===actor.id).shown,0);
  await wait(7800);assert.equal(a.state.levelMinutes,3);assert.equal(a.state.startingBank,1700);assert.ok(a.state.nextBlindAt-a.state.serverNow>179000&&a.state.nextBlindAt-a.state.serverNow<=180000);assert.equal(a.state.players.reduce((sum,p)=>sum+p.chips+p.total,0),3000);
  const cash=await join(undefined,'cash');cash.s.emit('settings',{small:2,big:4,startingBank:1000,turnSeconds:30,tournamentBank:2200,levelMinutes:4});await wait(30);cash.s.emit('tournament');await wait(30);assert.equal(cash.state.startingBank,2200);assert.equal(cash.state.players[0].chips,2200);assert.equal(cash.state.levelMinutes,4);cash.s.emit('switchMode',{mode:'cash'});await wait(30);assert.equal(cash.state.mode,'cash');assert.equal(cash.state.small,2);assert.equal(cash.state.big,4);assert.equal(cash.state.startingBank,1000);assert.equal(cash.state.players[0].chips,2200);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});

test('switching either mode removes every bot and leaves a lone human ready to add replacements',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3145'},stdio:'pipe'});let socket,state;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});socket=io('http://localhost:3145',{transports:['websocket']});socket.on('state',s=>state=s);await new Promise(r=>socket.on('connect',r));socket.emit('enter',{name:'Mode bot test'});await wait(50);
 for(const mode of ['tournament','cash']){socket.emit('addbot');socket.emit('addbot');await wait(50);assert.equal(state.players.filter(p=>p.bot).length,2);socket.emit('switchMode',{mode});await wait(50);assert.equal(state.mode,mode);assert.equal(state.players.length,1);assert.equal(state.started,false);assert.equal(state.seatingClosed,false);assert.equal(state.big,10);assert.equal(state.players[0].chips,1000);}
 }finally{socket?.disconnect();child.kill();}
});
