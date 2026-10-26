import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
test('feedback validates membership and content, acknowledges delivery, and limits repeats',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3141'},stdio:'pipe'});let logs='',socket;
 child.stdout.on('data',v=>logs+=v);
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  socket=io('http://localhost:3141',{transports:['websocket']});await new Promise(r=>socket.on('connect',r));
  const send=data=>new Promise((resolve,reject)=>socket.timeout(2000).emit('feedback',data,(error,result)=>error?reject(error):resolve(result)));
  assert.equal((await send({category:'suggestion',message:'Test'})).ok,false);
  const state=new Promise(r=>socket.once('state',r));socket.emit('enter',{name:'Feedback tester'});const joined=await state;
  for(const data of [{category:'invalid',message:'Test'},{category:'problem',message:'  '},{category:'other',message:'x'.repeat(2001)}])assert.equal((await send(data)).ok,false);
  assert.equal((await send({category:'suggestion',message:' Add clearer controls '})).ok,true);
  assert.equal((await send({category:'problem',message:'Repeat'})).ok,false);
  await new Promise(r=>setTimeout(r,30));const rows=logs.split('\n').filter(x=>x.startsWith('{')).map(x=>JSON.parse(x));
  assert.equal(rows.length,1);assert.equal(rows[0].event,'player-feedback');assert.equal(rows[0].table,joined.code);assert.equal(rows[0].name,'Feedback tester');assert.equal(rows[0].message,'Add clearer controls');
 }finally{socket?.disconnect();child.kill();}
});
