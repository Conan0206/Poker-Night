import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('master volume scales effects and emotes independently and persists settings',()=>{
 const storage=new Map();const code=readFileSync('public/audio-settings.js','utf8');
 function load(){const window={dispatchEvent(){}};vm.runInNewContext(code,{window,Event:class{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});return window.pokerAudio;}
 const audio=load();audio.set('main',50);audio.set('effects',20);audio.set('emotes',80);assert.equal(audio.level('effects'),.1);assert.equal(audio.level('emotes'),.4);audio.set('main',0);assert.equal(audio.level('effects'),0);assert.equal(audio.level('emotes'),0);audio.set('main',50);assert.equal(load().get('emotes'),80);assert.equal(load().level('effects'),.1);audio.set('effects',1000);assert.equal(audio.get('effects'),100);audio.set('main',NaN);assert.equal(audio.get('main'),50);
});
