import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync('public/app.js','utf8'),start=app.indexOf('function directBotReveal()'),end=app.indexOf('function updateRevealButton()',start);
function setup(extra={}){
 const sent=[],panels=[],notices=[];
 const context={state:{mode:'cash',street:'showdown',handNumber:7,players:[{id:'self'},{id:'bot',bot:true,inHand:true,cards:['?','?']}],...extra},me:'self',socket:{emit:(...args)=>sent.push(args)},openPanel:p=>panels.push(p),notice:n=>notices.push(n)};
 vm.runInNewContext(app.slice(start,end),context);return {context,sent,panels,notices,click:()=>context.handleRevealHands()};
}
test('a solo human or all-bot training viewer reveals every bot with one click',()=>{
 for(const practice of [false,true]){const t=setup({practice});t.context.state.players.push({id:'watcher',spectating:true});t.click();assert.equal(t.sent[0][0],'revealAllBots');assert.equal(t.sent[0][1].handNumber,7);assert.equal(t.panels.length,0);}
});
test('another seated human retains the picker; kicked players and spectators do not',()=>{
 const t=setup();t.context.state.players.push({id:'other'});t.click();assert.deepEqual(t.panels,['reveal']);assert.equal(t.sent.length,0);
 t.context.state.players.at(-1).kicked=true;t.click();assert.equal(t.sent.length,1);
});
test('the shortcut never reveals during play, in tournaments, or when cards are already visible',()=>{
 for(const street of ['waiting','preflop','flop','turn','river']){const t=setup({street});t.click();assert.equal(t.sent.length,0);assert.equal(t.panels.length,0);assert.ok(t.notices.length);}
 const tournament=setup({mode:'tournament'});tournament.click();assert.equal(tournament.sent.length,0);
 const visible=setup();visible.context.state.players[1].cards=['As','Ks'];visible.click();assert.equal(visible.sent.length,0);assert.match(visible.notices[0],/already visible/);
});
