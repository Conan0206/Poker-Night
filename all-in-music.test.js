import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('all-in theme loops until another action, respects pause and volume, and stops at showdown',()=>{
 const events={},stored=new Map(),audio=[];let volume=1;
 class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;audio.push(this);}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}}
 const window={pokerAudio:{level:()=>volume}},document={addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(readFileSync('public/all-in-music.js','utf8'),{window,document,Audio,addEventListener:(name,fn)=>events[name]=fn,localStorage:{getItem:k=>stored.get(k)}});
 const track=audio[0],state={code:'TEST',handNumber:1,street:'preflop',actionNumber:1,allInSound:{actionNumber:1},paused:false};
 const update=()=>events['poker-state']({detail:{state}});update();assert.equal(track.loop,true);assert.equal(track.paused,false);assert.ok(track.src.endsWith('all-in-theme-32s.mp3'));
 track.currentTime=12;state.paused=true;update();assert.equal(track.paused,true);assert.equal(track.currentTime,12);state.paused=false;update();assert.equal(track.paused,false);assert.equal(track.currentTime,12);
 stored.set('poker-muted','true');events.click();assert.equal(track.paused,true);stored.set('poker-muted','false');volume=0;events['poker-volume-change']();assert.equal(track.paused,true);volume=.5;events['poker-volume-change']();assert.equal(track.volume,.25);assert.equal(track.paused,false);
 state.actionNumber=2;update();assert.equal(track.paused,true);assert.equal(track.currentTime,0);state.allInSound={actionNumber:2};update();assert.equal(track.paused,false);state.street='showdown';update();assert.equal(track.paused,true);
});
