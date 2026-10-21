import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('seven-second countdown completes with either computer clock skew and clock changes',()=>{
 for(const skew of [-5000,5000]){
  let elapsed=0,wall=100000+skew;
  const window={};
  vm.runInNewContext(readFileSync('public/game-clock.js','utf8'),{window,performance:{now:()=>elapsed},Date:{now:()=>wall}});
  window.pokerClock.observe(100000);
  const values=[];
  for(elapsed=0;elapsed<=7000;elapsed+=1000){
   wall+=23000;
   values.push(Math.ceil(window.pokerClock.remaining(107000)/1000));
  }
  assert.deepEqual(values,[7,6,5,4,3,2,1,0]);
  assert.equal(window.pokerClock.remaining(107000),0);
 }
});

test('state refresh and time-card extension retain the server deadline',()=>{
 let elapsed=0;const window={};
 vm.runInNewContext(readFileSync('public/game-clock.js','utf8'),{window,performance:{now:()=>elapsed},Date});
 window.pokerClock.observe(100000);elapsed=5000;
 window.pokerClock.observe(105000);
 assert.equal(window.pokerClock.remaining(107000),2000);
 assert.equal(window.pokerClock.remaining(167000),62000);
 window.pokerClock.observe(undefined);
 elapsed=7000;assert.equal(window.pokerClock.remaining(107000),0);
});
