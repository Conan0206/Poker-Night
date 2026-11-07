import test from 'node:test';import assert from 'node:assert/strict';import {captureStandings} from './standings.js';
test('settled standings keep chips and elimination counts unchanged until captured again',()=>{
 const room={big:10,players:[{id:'a',name:'A',chips:1000,eliminations:0,stats:{hands:0}}]};const first=captureStandings(room);room.players[0].chips=600;room.players[0].eliminations=1;room.players[0].stats.hands=1;room.big=20;assert.equal(first.players[0].chips,1000);assert.equal(first.players[0].eliminations,0);assert.equal(first.players[0].stats.hands,0);assert.equal(first.big,10);const next=captureStandings(room);assert.equal(next.players[0].chips,600);assert.equal(next.players[0].eliminations,1);assert.equal(next.big,20);assert.equal(next.players[0].cards,undefined);
});

test('tournament bust-outs survive spectating, later hands and leaving, but reset clears them',()=>{
 const room={mode:'tournament',big:10,players:[{id:'a',name:'Winner',chips:2000,inHand:true},{id:'b',name:'Busted',chips:0,inHand:true,eliminations:2},{id:'c',name:'Watcher',chips:0,spectating:true}]};
 let snapshot=captureStandings(room);assert.equal(snapshot.players[1].eliminated,true);assert.equal(snapshot.players[2].eliminated,false);
 room.players[1].spectating=true;room.players[1].inHand=false;room.big=20;
 snapshot=captureStandings(room);assert.equal(snapshot.players[1].eliminated,true);assert.equal(snapshot.players[1].chips,0);
 room.players=room.players.filter(p=>p.id!=='b');snapshot=captureStandings(room);assert.equal(snapshot.players.find(p=>p.id==='b').eliminations,2);
 room.standings=null;snapshot=captureStandings(room);assert.equal(snapshot.players.some(p=>p.id==='b'),false);
 room.mode='cash';room.players[0].chips=0;assert.equal(captureStandings(room).players[0].eliminated,false);
});

import {spawn} from 'node:child_process';import {io} from 'socket.io-client';const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('server keeps standings through bets and a new street, then publishes awarded balances at showdown',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3152'},stdio:'pipe'}),clients=[];
 try{await new Promise((r,j)=>{child.stdout.once('data',r);child.once('error',j);});async function join(code){const s=io('http://localhost:3152',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,mode:'tournament',name:'Standings test'});await wait(50);return {s,get state(){return state;},get id(){return id;}};}
 const a=await join(),b=await join(a.state.code);a.s.emit('start');await wait(40);assert.ok(a.state.standings.players.every(p=>p.chips===1000));let actor=[a,b].find(c=>c.id===a.state.players[a.state.turn].id);actor.s.emit('action',{type:'call'});await wait(40);assert.ok(a.state.standings.players.every(p=>p.chips===1000));actor=[a,b].find(c=>c.id===a.state.players[a.state.turn].id);actor.s.emit('action',{type:'check'});await wait(40);assert.equal(a.state.street,'flop');assert.ok(a.state.standings.players.every(p=>p.chips===1000));actor=[a,b].find(c=>c.id===a.state.players[a.state.turn].id);actor.s.emit('action',{type:'fold'});await wait(40);assert.equal(a.state.street,'showdown');for(const p of a.state.players)assert.equal(a.state.standings.players.find(q=>q.id===p.id).chips,p.chips);assert.ok(a.state.standings.players.some(p=>p.chips!==1000));
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
