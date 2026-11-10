import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {io} from 'socket.io-client';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('a different tab saved as muted cannot silence the unmuted tournament theme',async()=>{
 const events={},stored=new Map([['poker-muted','true']]);let tabMuted=false;
 const context={state:'running',currentTime:0,destination:{},addEventListener(){},decodeAudioData:async()=>({duration:32}),createGain:()=>({connect(){},gain:{setValueAtTime(){}}}),createBufferSource:()=>({connect(){},disconnect(){},stop(){},start(){}})};
 const window={pokerAudio:{level:()=>1},pokerEffects:{audioContext:()=>context,isMuted:()=>tabMuted}};
 vm.runInNewContext(readFileSync('public/all-in-music.js','utf8'),{window,document:{addEventListener:(name,fn)=>events[name]=fn},addEventListener:(name,fn)=>events[name]=fn,localStorage:{getItem:k=>stored.get(k)},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),clearTimeout,setTimeout});
 const state={code:'TOUR',handNumber:1,street:'preflop',allInSound:{actionNumber:1}};
 events['poker-state']({detail:{state}});await tick();assert.equal(window.pokerAllInMusic.status.playing,true);assert.equal(window.pokerAllInMusic.status.muted,false);
 // The reverse mismatch must still respect this tab's mute button.
 stored.set('poker-muted','false');tabMuted=true;events.click();assert.equal(window.pokerAllInMusic.status.playing,false);assert.equal(window.pokerAllInMusic.status.muted,true);
 tabMuted=false;events.click();assert.equal(window.pokerAllInMusic.status.playing,true);
});
test('theme preloads before the first all-in and retries a failed MP3 request instead of remaining silent',async()=>{
 const events={},timers=[];let attempts=0,now=1000,starts=0;
 const context={state:'running',currentTime:0,destination:{},addEventListener(){},decodeAudioData:async()=>({duration:32}),createGain:()=>({connect(){},gain:{setValueAtTime(){}}}),createBufferSource:()=>({connect(){},disconnect(){},stop(){},start(){starts++;}})};
 const window={pokerAudio:{level:()=>1},pokerEffects:{audioContext:()=>context}};
 vm.runInNewContext(readFileSync('public/all-in-music.js','utf8'),{window,document:{addEventListener:(name,fn)=>events[name]=fn},addEventListener:(name,fn)=>events[name]=fn,localStorage:{getItem:()=>null},Date:{now:()=>now},clearTimeout(){},setTimeout:fn=>{timers.push(fn);return timers.length;},fetch:async()=>{if(++attempts===1)throw Error('Temporary request failure');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 events.click();await tick();assert.equal(window.pokerAllInMusic.status.retries,1);assert.equal(starts,0);
 now+=1000;timers.shift()();await tick();assert.equal(window.pokerAllInMusic.status.loaded,true);assert.equal(starts,0);assert.equal(attempts,2);
 const state={code:'TOUR',handNumber:1,street:'preflop',actionNumber:1,allInSound:{actionNumber:1}};events['poker-state']({detail:{state}});assert.equal(starts,1);
});
test('spectators and seated players share unlocked 32-second all-in audio, with pause, mute and volume controls',async()=>{
 const events={},stored=new Map(),sources=[],gains=[];let volume=1,unlocked=false;
 const context={state:'running',currentTime:0,destination:{},addEventListener(){},decodeAudioData:async()=>({duration:32}),createGain(){const gain={connect(){},gain:{setValueAtTime(value){gain.value=value;}}};gains.push(gain);return gain;},createBufferSource(){const source={connect(){},disconnect(){},start(time,offset){this.offset=offset;},stop(){this.stopped=true;}};sources.push(source);return source;}};
 const window={pokerAudio:{level:()=>volume},pokerEffects:{audioContext:()=>unlocked?context:null}},document={addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(readFileSync('public/all-in-music.js','utf8'),{window,document,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),addEventListener:(name,fn)=>events[name]=fn,localStorage:{getItem:k=>stored.get(k)},clearTimeout,setTimeout});
 const state={code:'TEST',mode:'tournament',handNumber:1,street:'preflop',actionNumber:0,allInSound:{actionNumber:0},paused:false,spectating:true};
 const update=()=>events['poker-state']({detail:{state}});update();assert.equal(sources.length,0);
 unlocked=true;events.click();await tick();assert.equal(window.pokerAllInMusic.status.playing,true);assert.equal(sources[0].loop,true);assert.equal(sources[0].loopEnd,32);
 context.currentTime=12;state.paused=true;update();assert.equal(sources[0].stopped,true);assert.equal(window.pokerAllInMusic.status.playing,false);
 state.paused=false;update();assert.equal(sources[1].offset,12);
 stored.set('poker-muted','true');events.click();assert.equal(window.pokerAllInMusic.status.playing,false);
 stored.set('poker-muted','false');volume=0;events['poker-volume-change']();assert.equal(window.pokerAllInMusic.status.playing,false);
 volume=.5;events['poker-volume-change']();assert.equal(gains[0].value,.25);assert.equal(window.pokerAllInMusic.status.playing,true);
 const sourcesBefore=sources.length;state.actionNumber=1;update();assert.equal(window.pokerAllInMusic.status.playing,true);assert.equal(sources.length,sourcesBefore);
 state.allInSound={actionNumber:1};state.handNumber=2;state.spectating=false;state.mode='cash';update();assert.equal(window.pokerAllInMusic.status.playing,true);assert.equal(sources.at(-1).offset,0);
 state.street='showdown';update();assert.equal(window.pokerAllInMusic.status.playing,false);
});

test('tournament blinds emit the same all-in cue to seated players and spectators',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3171',BOT_ARENA:'off',DATABASE_URL:''},stdio:'pipe'}),clients=[];
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  async function join(code,spectating=false){const s=io('http://localhost:3171',{transports:['websocket']});clients.push(s);let state,id;s.on('state',v=>state=v);s.on('identity',v=>id=v.id);await new Promise(resolve=>s.on('connect',resolve));s.emit('enter',{code,mode:'tournament',spectating,name:'Audio test'});for(let i=0;i<100&&!state;i++)await wait(20);assert.ok(state);return {s,get state(){return state;},get id(){return id;}};}
  const a=await join(),b=await join(a.state.code),watch=await join(a.state.code,true);
  a.s.emit('settings',{small:25,big:50,startingBank:50,turnSeconds:30});await wait(80);a.s.emit('start');
  for(let i=0;i<100&&!watch.state.started;i++)await wait(20);
  const st=watch.state;assert.equal(st.street,'preflop');assert.ok(st.allInSound);assert.equal(st.allInSound.actionNumber,st.actionNumber);assert.equal(st.players.find(p=>p.id===st.allInSound.playerId).chips,0);assert.deepEqual(st.allInSound,a.state.allInSound);
  const actor=[a,b].find(p=>p.id===st.players[st.turn].id);actor.s.emit('action',{type:'call'});await wait(100);
  assert.ok(watch.state.allInSound.actionNumber>st.allInSound.actionNumber);assert.equal(watch.state.allInSound.actionNumber,watch.state.actionNumber);
 }finally{clients.forEach(s=>s.disconnect());child.kill();}
});
