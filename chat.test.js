import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('incoming chat notifies only peers in the room and river folds allow optional reveals',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3114'},stdio:'pipe'}),clients=[];
 try{
 await new Promise((r,j)=>{child.stdout.once('data',r);child.once('error',j);});
 async function join(code){const s=io('http://localhost:3114',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,name:'Same name'});await pause(50);return {s,get state(){return state;},get id(){return id;}};}
 const a=await join(),b=await join(a.state.code),outside=await join();let own=0,peer=0,other=0;a.s.on('chatMessage',()=>own++);b.s.on('chatMessage',d=>{assert.equal(d.senderId,a.id);peer++;});outside.s.on('chatMessage',()=>other++);
 a.s.emit('chat','Hello');await pause(80);assert.equal(own,0);assert.equal(peer,1);assert.equal(other,0);assert.equal(b.state.chat.at(-1).text,'Hello');a.s.emit('start');await pause(80);assert.equal(peer,1);
 while(a.state.street!=='river'){const actor=a.state.players[a.state.turn].id===a.id?a:b;actor.s.emit('action',{type:actor.state.bet>actor.state.players[actor.state.turn].round?'call':'check'});await pause(45);}
 const actor=a.state.players[a.state.turn].id===a.id?a:b;actor.s.emit('action',{type:'fold'});await pause(70);assert.equal(a.state.street,'showdown');assert.equal(a.state.board.length,5);assert.equal(a.state.endedByFold,true);assert.equal(a.state.allInReveal,false);
 const winner=actor===a?b:a;winner.s.emit('reveal',1);await pause(60);const shown=actor.state.players.find(p=>p.id===winner.id);assert.notEqual(shown.cards[0],'?');assert.equal(shown.cards[1],'?');
 winner.s.emit('spectate');await pause(50);winner.s.emit('sit');await pause(60);const seated=winner.state.players.find(p=>p.id===winner.id);assert.equal(seated.spectating,false);assert.deepEqual(seated.cards,['?','?']);winner.s.emit('reveal',3);await pause(40);assert.deepEqual(winner.state.players.find(p=>p.id===winner.id).cards,['?','?']);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
