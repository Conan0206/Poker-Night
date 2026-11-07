import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';
import {measuredStyle} from './public/style-metrics.js';
import {capturePlayerStyles} from './player-statistics.js';
import {BOT_STYLE_IDS,BOT_STYLES} from './public/bot-styles.js';
test('style chart uses completed-hand VPIP and aggressive versus calling decisions',()=>{
 assert.equal(measuredStyle().ready,false);assert.equal(measuredStyle({hands:3,vpip:0,raises:0,calls:0}).ready,false);
 for(const [vpip,raises,calls,id] of [[20,15,5,'tag'],[50,15,5,'lag'],[50,2,18,'fish'],[10,2,18,'rock']]){
  const result=measuredStyle({hands:100,vpip,raises,calls});assert.equal(result.id,id);assert.equal(result.loose,vpip/100);assert.equal(result.aggressive,raises/(raises+calls));assert.equal(result.early,false);
 }
 assert.equal(measuredStyle({hands:1,vpip:1,raises:1,calls:0}).early,true);
});
test('style label follows the same directional balance as the chart',()=>{
 // The reported examples must remain tight despite their assigned bot personalities.
 assert.equal(measuredStyle({hands:10,vpip:2,raises:5,calls:1}).id,'tag');
 assert.equal(measuredStyle({hands:13,vpip:4,raises:6,calls:1}).id,'tag');
 assert.equal(measuredStyle({hands:13,vpip:5,raises:2,calls:4}).id,'rock');
 for(const [vpip,raises,id] of [[49,51,'tag'],[51,51,'lag'],[49,49,'rock'],[51,49,'fish'],[50,50,'lag']]){
  const model=measuredStyle({hands:100,vpip,raises,calls:100-raises});
  assert.equal(model.id,id);assert.equal(model.loose>=1-model.loose,['lag','fish'].includes(id));assert.equal(model.aggressive>=1-model.aggressive,['tag','lag'].includes(id));
 }
});

test('chart counters ignore spectators, checks and folds and accumulate completed hand actions',()=>{
 const player={id:'human',inHand:true,vpip:true,stats:{}},watch={id:'watch',inHand:false,stats:{}};
 const room={players:[player,watch],actionLog:['call','check','raise','fold'].map(type=>({actorId:'human',action:{type}}))};
 assert.equal(player.stats.style,undefined);capturePlayerStyles(room);
 assert.deepEqual(player.stats.style,{hands:1,vpip:1,raises:1,calls:1});assert.equal(watch.stats.style,undefined);
 player.vpip=false;room.actionLog=[{actorId:'human',action:{type:'check'}}];capturePlayerStyles(room);
 assert.deepEqual(player.stats.style,{hands:2,vpip:1,raises:1,calls:1});
});
test('hand wins count once per completed deal, independently of chip payouts or uncalled returns',()=>{
 const p={id:'p',inHand:true,wonHand:1200,stats:{won:5000}},q={id:'q',inHand:true,wonHand:0,stats:{won:2000}};
 const room={players:[p,q],runBoards:[['As'],['Kh']],awards:[{winners:[{id:'p',amount:700}]},{winners:[{id:'p',amount:500}]}],actionLog:[]};
 capturePlayerStyles(room);assert.equal(p.stats.handsWon,1);assert.equal(q.stats.handsWon,0);
 p.wonHand=0;q.wonHand=100;capturePlayerStyles(room);assert.equal(p.stats.handsWon,1);assert.equal(q.stats.handsWon,1);assert.equal(p.stats.style.hands,2);
});
test('Add bot accepts each selected personality, supports Mixed and rejects invalid styles',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3188',DATABASE_URL:'',BOT_ARENA:'off',FEEDBACK_EMAIL_ENABLED:'false'},stdio:'pipe'});let socket;
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  socket=io('http://localhost:3188',{transports:['websocket']});let current;
  socket.on('state',s=>current=s);
  const state=predicate=>new Promise((resolve,reject)=>{if(current&&predicate(current))return resolve(current);const timer=setTimeout(()=>{socket.off('state',check);reject(Error('State timeout'));},3000);const check=s=>{if(predicate(s)){clearTimeout(timer);socket.off('state',check);resolve(s);}};socket.on('state',check);});
  await new Promise(resolve=>socket.on('connect',resolve));socket.emit('enter',{name:'Style test',mode:'tournament'});await state(s=>s.players.length===1);
  for(const [i,style] of BOT_STYLE_IDS.entries()){socket.emit('addbot',{style});const s=await state(s=>s.players.filter(p=>p.bot).length===i+1);assert.equal(s.players.filter(p=>p.bot).at(-1).botStyle,style);assert.equal(s.players.filter(p=>p.bot).at(-1).name,BOT_STYLES[style].label+' 1');}
  socket.emit('addbot',{style:'tag'});await state(s=>s.players.filter(p=>p.bot).length===5);assert.equal(current.players.at(-1).name,'TAG 2');
  socket.emit('addbot',{style:'mixed'});await state(s=>s.players.filter(p=>p.bot).length===6);const mixed=current.players.filter(p=>p.bot).at(-1);assert.ok(BOT_STYLE_IDS.includes(mixed.botStyle));assert.equal(mixed.name,BOT_STYLES[mixed.botStyle].label+' '+current.players.filter(p=>p.botStyle===mixed.botStyle).length);
  const notice=new Promise(resolve=>socket.once('notice',resolve));socket.emit('addbot',{style:'invalid'});assert.match(await notice,/Choose TAG/);assert.equal(current.players.filter(p=>p.bot).length,6);
 }finally{socket?.disconnect();child.kill();}
});
