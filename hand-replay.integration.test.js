import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<100;i++){if(check())return;await wait(25);}throw Error('Timed out waiting for replay state');}
test('socket replays enforce room membership, card ownership and private/public reveal boundaries',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3205',DATABASE_URL:'',BOT_ARENA:'off'},stdio:'pipe'}),peers=[];
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,name,spectating=false){const socket=io('http://localhost:3205',{transports:['websocket']});peers.push(socket);let state,id;socket.on('state',s=>state=s);socket.on('identity',v=>id=v.id);await new Promise(r=>socket.on('connect',r));socket.emit('enter',{code,name,spectating});await until(()=>state&&id);return {socket,get state(){return state;},get id(){return id;},replay:id=>socket.timeout(1500).emitWithAck('handReplay',{id})};}
  const a=await join(null,'Same name'),b=await join(a.state.code,'Same name'),viewer=await join(a.state.code,'Private viewer',true),other=await join(a.state.code,'Other viewer',true),outsider=await join(null,'Other table');
  a.socket.emit('start');await until(()=>a.state.street==='preflop');assert.ok((await viewer.replay('not-completed')).error);
  const actor=[a,b].find(p=>p.id===a.state.players[a.state.turn].id),own=[...actor.state.players.find(p=>p.id===actor.id).cards];actor.socket.emit('action',{type:'fold'});await until(()=>a.state.street==='showdown');
  const id=a.state.handHistory[0].replayId;assert.ok(id);const snapshot=JSON.stringify(a.state.players.map(p=>p.chips));
  const mine=(await actor.replay(id)).replay,watch=(await viewer.replay(id)).replay;assert.deepEqual(mine.frames[0].players.find(p=>p.id===actor.id).cards,own);assert.ok(watch.frames.every(f=>f.players.every(p=>p.cards.every(c=>c==='?'))));assert.ok((await outsider.replay(id)).error);
  assert.equal(watch.players.length,2);assert.equal(watch.frames.at(-1).pot,0);for(const f of watch.frames)assert.equal(f.pot+f.players.reduce((n,p)=>n+p.chips,0),2000);
  viewer.socket.emit('revealHand',{handNumber:a.state.handNumber,id:actor.id});await until(()=>viewer.state.players.find(p=>p.id===actor.id).privatelyRevealed);const privateView=(await viewer.replay(id)).replay;assert.deepEqual(privateView.frames.at(-1).players.find(p=>p.id===actor.id).cards,own);assert.deepEqual(privateView.frames[0].players.find(p=>p.id===actor.id).cards,['?','?']);assert.deepEqual((await other.replay(id)).replay.frames.at(-1).players.find(p=>p.id===actor.id).cards,['?','?']);
  actor.socket.emit('reveal',1);await until(()=>other.state.players.find(p=>p.id===actor.id).shown===1);const publicView=(await other.replay(id)).replay;assert.deepEqual(publicView.frames.at(-1).players.find(p=>p.id===actor.id).cards,[own[0],'?']);assert.deepEqual(publicView.frames[0].players.find(p=>p.id===actor.id).cards,['?','?']);assert.equal(JSON.stringify(a.state.players.map(p=>p.chips)),snapshot);assert.equal(a.state.turn,-1);
 }finally{peers.forEach(s=>s.disconnect());child.kill();}
});
