import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('private cards, illegal actions, all-in showdown and chip conservation',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101'},stdio:'pipe'});const clients=[];
 try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
 async function join(code,name){const s=io('http://localhost:3101',{transports:['websocket']});clients.push(s);let state; s.on('state',v=>state=v);await new Promise(r=>s.on('connect',r));const identity=new Promise(r=>s.once('identity',r));s.emit('enter',{code,name});const id=await identity;await wait(40);return {s,id:id.id,get state(){return state;}};}
 const a=await join(null,'Alice'),b=await join(a.state.code,'Bob'),c=await join(a.state.code,'Carol');const players=[a,b,c];a.s.emit('start');await wait(100);
 assert.equal(a.state.street,'preflop');assert.equal(a.state.players.find(p=>p.id===b.id).cards[0],'?');assert.equal(a.state.players.find(p=>p.id===a.id).cards.length,2);
 const turn=a.state.turn;players.find(p=>p.id!==a.state.players[turn].id).s.emit('action',{type:'raise',amount:900});await wait(40);assert.equal(a.state.bet,10);
 for(let step=0;step<20&&a.state.street!=='showdown';step++){const st=a.state,actor=players.find(p=>p.id===st.players[st.turn].id),p=st.players[st.turn];actor.s.emit('action',{type:p.chips+p.round>st.bet&&p.raiseAllowed?'raise':'call',amount:p.chips+p.round});await wait(55);}
 assert.equal(a.state.street,'showdown');assert.equal(a.state.players.reduce((n,p)=>n+p.chips,0),3000);assert.equal(a.state.board.length,5);assert.ok(a.state.players.every(p=>p.cards.every(c=>c!=='?')));assert.equal(a.state.players[0].stats.hands,1);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
