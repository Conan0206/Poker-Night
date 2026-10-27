import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {io} from 'socket.io-client';const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('tournament raises use half-BB totals, preserve minimum raises, and permit exact all-ins',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3149'},stdio:'pipe'}),clients=[];
 try{await new Promise((r,j)=>{child.stdout.once('data',r);child.once('error',j);});async function join(code){const s=io('http://localhost:3149',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(r=>s.on('connect',r));s.emit('enter',{code,mode:'tournament',name:'BB raise test'});await wait(50);return {s,get state(){return state;},get id(){return id;}};}
 const a=await join(),b=await join(a.state.code);a.s.emit('settings',{small:5,big:10,startingBank:1003,turnSeconds:30});await wait(40);a.s.emit('start');await wait(40);const actor=[a,b].find(c=>c.id===a.state.players[a.state.turn].id),other=actor===a?b:a;
 for(const amount of [15,21,29]){actor.s.emit('action',{type:'raise',amount});await wait(30);assert.equal(a.state.bet,10);}actor.s.emit('action',{type:'raise',amount:25});await wait(40);assert.equal(a.state.bet,25);other.s.emit('action',{type:'raise',amount:35});await wait(30);assert.equal(a.state.bet,25);other.s.emit('action',{type:'raise',amount:1003});await wait(40);assert.equal(a.state.bet,1003);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
