import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
test('chosen avatars reach private, main, spectator and reconnect states; invalid values fall back',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3113'},stdio:'pipe'}),sockets=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function enter(data){const socket=io('http://localhost:3113',{transports:['websocket']});sockets.push(socket);await new Promise(r=>socket.on('connect',r));const identity=new Promise(r=>socket.once('identity',r)),state=new Promise(r=>socket.once('state',r));socket.emit('enter',{name:'Avatar tester',...data});return {socket,identity:await identity,state:await state};}
  const host=await enter({avatar:'👻'});assert.equal(host.state.players[0].avatar,'👻');
  const guest=await enter({code:host.state.code,avatar:'🦊'});assert.equal(guest.state.players.find(p=>p.id===guest.identity.id).avatar,'🦊');assert.equal(guest.state.players.find(p=>p.id===host.identity.id).avatar,'👻');
  const main=await enter({code:'MAIN',avatar:'🐼'});assert.equal(main.state.players.find(p=>p.id===main.identity.id).avatar,'🐼');
  const watcher=await enter({code:host.state.code,avatar:'🐸',spectating:true});const player=watcher.state.players.find(p=>p.id===watcher.identity.id);assert.equal(player.avatar,'🐸');assert.equal(player.spectating,true);assert.equal(watcher.state.spectators.find(p=>p.id===watcher.identity.id).avatar,'🐸');
  const invalid=await enter({avatar:'<img src=x>'});assert.equal(invalid.state.players[0].avatar,'😎');
  host.socket.disconnect();const resumed=await enter({token:host.identity.token});assert.equal(resumed.state.players.find(p=>p.id===host.identity.id).avatar,'👻');
  resumed.socket.disconnect();const menuResume=await enter({token:host.identity.token,avatar:'🦄',fromMenu:true});const returning=menuResume.state.players.find(p=>p.id===host.identity.id);assert.equal(returning.avatar,'🦄');assert.equal(returning.hideHoleCards,true);assert.equal(returning.chips,host.state.players[0].chips);assert.equal(menuResume.state.players.filter(p=>p.id===host.identity.id).length,1);
 }finally{sockets.forEach(s=>s.disconnect());child.kill();}
});
