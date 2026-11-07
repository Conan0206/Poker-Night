import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={};vm.runInNewContext(readFileSync('public/deal-timing.js','utf8'),{window});const timing=window.pokerDealTiming;
const base={code:'CARDS',handNumber:1,activeRun:1,board:[],players:[{id:'me',inHand:true},{id:'bot',inHand:true},{id:'watch',spectating:true}]};
test('flop plays one triple-card cue, turn and river use one classic cue each',()=>{
 const flop={...base,board:['2s','3h','4c']},turn={...flop,board:[...flop.board,'5d']},river={...turn,board:[...turn.board,'6s']};
 for(const [s,old,kind] of [[flop,base,'flop'],[turn,flop,'deal'],[river,turn,'deal']]){const events=timing.sounds(s,old,'me');assert.equal(events.length,1);assert.equal(events[0].kind,kind);assert.equal(events[0].delay+timing.samplePeak,timing.boardDuration*timing.landing);}
 assert.equal(timing.sounds(flop,flop,'me').length,0);assert.equal(timing.sounds(flop,null,'me').length,0);
});
test('hole-card cues land with each player flight and never deal to spectators',()=>{
 const events=timing.sounds({...base,handNumber:2},base,'me');assert.equal(events.length,4);assert.ok(events.every(e=>e.kind==='deal'));
 assert.equal(events[0].delay+timing.samplePeak,timing.holeDuration*timing.landing);
 assert.equal(events[1].delay+timing.samplePeak-timing.holeGap,timing.ghostDuration*timing.ghostLanding);
 assert.equal(events[2].delay-events[0].delay,2*timing.holeGap);
});
test('second-board shared prefix is silent, new second-board cards still get their cues',()=>{
 const completed={...base,board:['2s','3h','4c','5d','6s']},prefix={...base,activeRun:2,board:['2s','3h','4c']};
 assert.equal(timing.sounds(prefix,completed,'me').length,0);assert.equal(timing.boardBefore(prefix,completed),3);
 assert.equal(timing.sounds({...prefix,board:[...prefix.board,'7d']},prefix,'me')[0].kind,'deal');
 const empty={...base,activeRun:2};assert.equal(timing.sounds({...empty,board:['7s','8h','9c']},empty,'me')[0].kind,'flop');
 assert.equal(timing.sounds({...base,board:['2s','3h','4c']},base,'me',true)[0].delay,0);
});
