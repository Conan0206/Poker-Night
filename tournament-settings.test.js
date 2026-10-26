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
  const cash=await join(undefined,'cash');cash.s.emit('settings',{small:5,big:10,startingBank:1000,turnSeconds:30,tournamentBank:2200,levelMinutes:4});await wait(30);cash.s.emit('tournament');await wait(30);assert.equal(cash.state.startingBank,2200);assert.equal(cash.state.players[0].chips,2200);assert.equal(cash.state.levelMinutes,4);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
