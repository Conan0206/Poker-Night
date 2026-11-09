import test from 'node:test';import assert from 'node:assert/strict';
import {revealSelfPublicly,publicShowModel} from './public-show-knowledge.js';
import {revealPrivately} from './private-reveals.js';
import {publicOpeningCutoff,rangeEquity} from './bot-ranges.js';
import {publicRange} from './bot-solver.js';
import {publicModel} from './opponent-model.js';
import {seededRandom} from './training/simulator.js';
function fixture(){const p={id:'p',inHand:true,cards:['As','Ad'],shown:0},viewer={id:'viewer'};return {p,viewer,r:{mode:'cash',street:'showdown',handNumber:1,players:[p,viewer],actionLog:[{actorId:'p',street:'preflop',action:{type:'raise'}}]}};}
test('voluntary public shows remember exactly the shown cards for subsequent hands, once per hand',()=>{
 const {r,p}=fixture();assert.equal(revealSelfPublicly(r,p,1),true);assert.deepEqual(r.publicShowKnowledge.get(p.id)[0].cards,['As','?']);assert.equal(revealSelfPublicly(r,p,1),false);
 assert.equal(revealSelfPublicly(r,p,2),true);assert.equal(r.publicShowKnowledge.get(p.id).length,1);assert.deepEqual(r.publicShowKnowledge.get(p.id)[0].cards,['As','Ad']);
 assert.equal(publicShowModel(r,p.id).publicShows.length,0);r.handNumber=2;p.cards=['2c','3c'];p.shown=0;
 const model=publicShowModel(r,p.id);assert.deepEqual(model.publicShows[0].cards,['As','Ad']);assert.equal(model.shownOpenings,1);assert.equal(JSON.stringify(model).includes('2c'),false);
});
test('private viewer reveals never enter bot knowledge; rejected public reveals cannot poison it',()=>{
 const {r,p,viewer}=fixture();r.revealAllowance=3;assert.equal(revealPrivately(r,viewer,{handNumber:1,targetId:p.id}),'revealed');assert.equal(p.shown,0);assert.equal(r.publicShowKnowledge,undefined);
 for(const patch of [{mode:'tournament'},{street:'flop'}])assert.equal(revealSelfPublicly({...r,...patch},p,3),false);
 for(const patch of [{hideHoleCards:true},{kicked:true},{inHand:false},{bot:true}])assert.equal(revealSelfPublicly(r,{...p,...patch},3),false);
 for(const mask of [0,-1,4,1.5,'3'])assert.equal(revealSelfPublicly(r,p,mask),false);assert.equal(r.publicShowKnowledge,undefined);
});
test('public-card reads are bounded, require several complete shows and never fix a current opponent hand',()=>{
 const {r,p}=fixture();for(let n=1;n<=20;n++){r.handNumber=n;p.shown=0;assert.equal(revealSelfPublicly(r,p,3),true);}r.handNumber++;const model={...publicShowModel(r,p.id),raisedPreflop:true};assert.equal(model.publicShows.length,12);assert.equal(model.shownOpenings,12);assert.ok(publicOpeningCutoff(.62,model)>.62);assert.ok(publicOpeningCutoff(.62,model)<=.645);
 assert.equal(publicOpeningCutoff(.62,{shownOpenings:1,shownOpeningQuality:950}),.62);
 const range=publicRange(['2h','7h','8s'],model,20,seededRandom(5));assert.ok(range.some(h=>h.cards.some(c=>!['As','Ad'].includes(c))));
 // Historical As/Ad may be dealt again: they are not current-card blockers.
 assert.doesNotThrow(()=>rangeEquity({hole:['As','Ad'],board:['2h','7h','8s'],opponents:1,opponentModels:[model],equitySamples:16},seededRandom(6)));
 assert.equal('publicShows' in publicModel(model),false);assert.equal(publicModel(model).shownOpenings,12);
});
test('tournament views ignore cash public-show memory',()=>{const {r,p}=fixture();revealSelfPublicly(r,p,3);r.handNumber++;r.mode='tournament';assert.deepEqual(publicShowModel(r,p.id),{});});
