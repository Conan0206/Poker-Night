import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
import {measuredStyle} from './public/style-metrics.js';
import {capturePlayerStyles} from './player-statistics.js';
import {BOT_STYLE_IDS} from './public/bot-styles.js';
test('style chart uses completed-hand VPIP and aggressive versus calling decisions',()=>{
 assert.equal(measuredStyle().ready,false);assert.equal(measuredStyle({hands:3,vpip:0,raises:0,calls:0}).ready,false);
 for(const [vpip,raises,calls,id] of [[20,15,5,'tag'],[50,15,5,'lag'],[50,2,18,'fish'],[10,2,18,'rock']]){
  const result=measuredStyle({hands:100,vpip,raises,calls});assert.equal(result.id,id);assert.equal(result.loose,vpip/100);assert.equal(result.aggressive,raises/(raises+calls));assert.equal(result.early,false);
 }
 assert.equal(measuredStyle({hands:1,vpip:1,raises:1,calls:0}).early,true);
});
test('chart counters ignore spectators, checks and folds and accumulate completed hand actions',()=>{
 const player={id:'human',inHand:true,vpip:true,stats:{}},watch={id:'watch',inHand:false,stats:{}};
 const room={players:[player,watch],actionLog:['call','check','raise','fold'].map(type=>({actorId:'human',action:{type}}))};
 assert.equal(player.stats.style,undefined);capturePlayerStyles(room);
 assert.deepEqual(player.stats.style,{hands:1,vpip:1,raises:1,calls:1});assert.equal(watch.stats.style,undefined);
 player.vpip=false;room.actionLog=[{actorId:'human',action:{type:'check'}}];capturePlayerStyles(room);
 assert.deepEqual(player.stats.style,{hands:2,vpip:1,raises:1,calls:1});
});
test('Add bot accepts each selected personality, supports Mixed and rejects invalid styles',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3188',DATABASE_URL:'',BOT_ARENA:'off',FEEDBACK_EMAIL_ENABLED:'false'},stdio:'pipe'});let socket;
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  socket=io('http://localhost:3188',{transports:['websocket']});let current;
  socket.on('state',s=>current=s);
  const state=predicate=>new Promise((resolve,reject)=>{if(current&&predicate(current))return resolve(current);const timer=setTimeout(()=>{socket.off('state',check);reject(Error('State timeout'));},3000);const check=s=>{if(predicate(s)){clearTimeout(timer);socket.off('state',check);resolve(s);}};socket.on('state',check);});
  await new Promise(resolve=>socket.on('connect',resolve));socket.emit('enter',{name:'Style test',mode:'tournament'});await state(s=>s.players.length===1);
  for(const [i,style] of BOT_STYLE_IDS.entries()){socket.emit('addbot',{style});const s=await state(s=>s.players.filter(p=>p.bot).length===i+1);assert.equal(s.players.filter(p=>p.bot).at(-1).botStyle,style);}
  socket.emit('addbot',{style:'mixed'});await state(s=>s.players.filter(p=>p.bot).length===5);assert.ok(BOT_STYLE_IDS.includes(current.players.filter(p=>p.bot).at(-1).botStyle));
  const notice=new Promise(resolve=>socket.once('notice',resolve));socket.emit('addbot',{style:'invalid'});assert.match(await notice,/Choose TAG/);assert.equal(current.players.filter(p=>p.bot).length,5);
 }finally{socket?.disconnect();child.kill();}
});
