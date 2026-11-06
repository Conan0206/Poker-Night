import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('shared pause preserves turn, runout and next-deal timers; tournament conversion waits for settlement',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3142'},stdio:'pipe'}),clients=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,spectating=false){const s=io('http://localhost:3142',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Control tester',spectating});await wait(40);return {s,get state(){return state;},get id(){return id;}};}
  const a=await join(),b=await join(a.state.code),watch=await join(a.state.code,true);
  watch.s.emit('pause');watch.s.emit('tournament');watch.s.emit('switchMode',{mode:'tournament'});await wait(30);assert.equal(a.state.paused,false);assert.equal(a.state.pendingMode,null);
  a.s.emit('start');await wait(40);const actor=[a,b].find(p=>p.id===a.state.players[a.state.turn].id);
  a.s.emit('pause');await wait(30);const deadline=a.state.deadline,turn=a.state.turn;
  actor.s.emit('action',{type:'fold'});actor.s.emit('timecard');await wait(650);assert.equal(a.state.paused,true);assert.equal(a.state.turn,turn);assert.equal(a.state.deadline,deadline);assert.equal(a.state.actionNumber,0);
  b.s.emit('pause');await wait(40);assert.equal(a.state.paused,false);assert.ok(a.state.deadline-deadline>=650);
  actor.s.emit('action',{type:'raise',amount:1000});await wait(40);assert.equal(a.state.allInSound.actionNumber,a.state.actionNumber);const sound=a.state.allInSound.actionNumber;
  const next=[a,b].find(p=>p.id===a.state.players[a.state.turn].id);next.s.emit('action',{type:'call'});await wait(40);assert.ok(a.state.actionNumber>sound);if(a.state.runVote){next.s.emit('runVote',{handNumber:a.state.handNumber,count:1});await wait(40);}assert.equal(a.state.runningOut,true);
  a.s.emit('pause');await wait(30);await wait(1600);assert.equal(a.state.board.length,0);b.s.emit('pause');await wait(5800);assert.equal(a.state.street,'showdown');
  a.s.emit('pause');a.s.emit('tournament');await wait(40);assert.equal(a.state.pendingMode,'tournament');assert.equal(a.state.mode,'cash');const nextAt=a.state.nextHandAt;await wait(7600);assert.equal(a.state.street,'showdown');assert.equal(a.state.nextHandAt,nextAt);
  b.s.emit('pause');await wait(40);const delay=a.state.nextHandAt-Date.now()+700;await wait(Math.max(0,delay));assert.equal(a.state.mode,'tournament');assert.equal(a.state.pendingMode,null);assert.equal(a.state.street,'preflop');assert.equal(a.state.startingBank,1000);assert.equal(a.state.small,5);assert.equal(a.state.big,10);assert.equal(a.state.seatingClosed,true);assert.equal(a.state.players.filter(p=>!p.spectating).reduce((n,p)=>n+p.chips+p.total,0),2000);a.s.emit('switchMode',{mode:'cash'});await wait(30);assert.equal(a.state.mode,'tournament');assert.equal(a.state.pendingMode,'cash');const finalActor=[a,b].find(p=>p.id===a.state.players[a.state.turn].id);finalActor.s.emit('action',{type:'fold'});await wait(7800);assert.equal(a.state.mode,'cash');assert.equal(a.state.pendingMode,null);assert.equal(a.state.small,5);assert.equal(a.state.big,10);assert.equal(a.state.seatingClosed,false);assert.equal(a.state.revealsRemaining,3);assert.equal(a.state.players.reduce((n,p)=>n+p.chips+p.total,0),2000);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});

test('bot thinking and turn timeout stay frozen while paused',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3143'},stdio:'pipe'});let socket,state,id;
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});socket=io('http://localhost:3143',{transports:['websocket']});socket.on('state',s=>state=s);socket.on('identity',s=>id=s.id);await new Promise(r=>socket.on('connect',r));socket.emit('enter',{name:'Bot pause test'});await wait(40);socket.emit('settings',{small:5,big:10,startingBank:1000,turnSeconds:5});socket.emit('addbot');await wait(40);socket.emit('start');await wait(40);assert.equal(state.players[state.turn].id,id);socket.emit('action',{type:'call'});await wait(30);assert.equal(state.players[state.turn].bot,true);socket.emit('pause');await wait(30);const number=state.actionNumber;await wait(5500);assert.equal(state.actionNumber,number);assert.equal(state.paused,true);socket.emit('pause');for(let i=0;i<60&&state.actionNumber===number;i++)await wait(100);assert.ok(state.actionNumber>number);
 }finally{socket?.disconnect();child.kill();}
});
