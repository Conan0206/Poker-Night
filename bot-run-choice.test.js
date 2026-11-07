import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {chooseBotRuns} from './bot-run-choice.js';

test('each bot style can choose once or twice; cautious styles prefer reducing variance more often',()=>{
 for(const style of ['tag','lag','fish','rock',undefined]){
  assert.equal(chooseBotRuns(style,()=>0),2);
  assert.equal(chooseBotRuns(style,()=>.999999),1);
 }
 assert.equal(chooseBotRuns('lag',()=>.6),1);
 assert.equal(chooseBotRuns('rock',()=>.6),2);
});

test('a bot once vote resolves immediately, unanimous bots run twice, and a human can still choose',()=>{
 const source=readFileSync('server.js','utf8').split('\n').find(line=>line.startsWith('function beginRunout('));
 for(const [choices,human,expected] of [[[1,2],false,1],[[2,2],false,2],[[2],true,null],[[1],true,1]]){
  const players=choices.map((choice,i)=>({id:'bot'+i,bot:true,choice,inHand:true}));
  if(human)players.push({id:'human',socket:'connected',inHand:true});
  const room={mode:'cash',board:[],players,turnSeconds:30,handNumber:4};let timer=false;
  const ctx={clearTimeout,live:p=>p.inHand,chooseBotRuns:()=>choices.shift(),publish(){},resolveRunVote:(r,count)=>{r.resolved=count;},roomTimer:()=>{timer=true;}};
  vm.runInNewContext(source,ctx);ctx.beginRunout(room);
  assert.equal(room.resolved??null,expected);assert.equal(timer,expected===null);
 }
});
