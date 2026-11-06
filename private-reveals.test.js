import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPrivateReveal,revealPrivately} from './private-reveals.js';
function fixture(){const viewer={id:'viewer'},other={id:'other'},human={id:'human',inHand:true,cards:['Ah','Kh'],shown:0},bots=[{id:'b1',bot:true,inHand:true,cards:['Qs','Qd'],shown:0},{id:'b2',bot:true,inHand:true,cards:['Js','Jd'],shown:0}];return {viewer,other,human,bots,room:{mode:'cash',street:'showdown',handNumber:5,players:[viewer,other,human,...bots],revealAllowance:3}};}
test('single reveals belong only to their viewer and do not change public shown flags',()=>{
 const {room,viewer,other,human}=fixture();assert.equal(revealPrivately(room,viewer,{handNumber:5,targetId:human.id}),'revealed');
 assert.equal(hasPrivateReveal(room,viewer,human),true);assert.equal(hasPrivateReveal(room,other,human),false);assert.equal(human.shown,0);assert.equal(viewer.revealsUsed,1);
 assert.equal(revealPrivately(room,viewer,{handNumber:5,targetId:human.id}),'ignored');assert.equal(viewer.revealsUsed,1);
});
test('cash all-bot reveal costs one use and excludes humans and already visible bots',()=>{
 const {room,viewer,other,human,bots}=fixture();
 assert.equal(revealPrivately(room,viewer,{handNumber:5,allBots:true}),'revealed');assert.equal(viewer.revealsUsed,1);
 for(const bot of bots){assert.equal(hasPrivateReveal(room,viewer,bot),true);assert.equal(hasPrivateReveal(room,other,bot),false);assert.equal(bot.shown,0);}
 assert.equal(hasPrivateReveal(room,viewer,human),false);assert.equal(revealPrivately(room,viewer,{handNumber:5,allBots:true}),'ignored');assert.equal(viewer.revealsUsed,1);
 bots[0].shown=3;assert.equal(revealPrivately(room,other,{handNumber:5,allBots:true}),'revealed');assert.equal(room.privateReveals.get(other.id).has(bots[0].id),false);assert.equal(other.revealsUsed,1);
});
test('phase, hand number, allowance, kicked players and the next deal enforce private reveal boundaries',()=>{
 const {room,viewer,bots}=fixture();
 for(const change of [{street:'preflop'},{mode:'tournament'}]){assert.equal(revealPrivately({...room,...change},viewer,{handNumber:5,allBots:true}),'ignored');}
 assert.equal(revealPrivately(room,viewer,{handNumber:4,allBots:true}),'ignored');viewer.kicked=true;assert.equal(revealPrivately(room,viewer,{handNumber:5,allBots:true}),'ignored');delete viewer.kicked;
 viewer.revealsUsed=3;assert.equal(revealPrivately(room,viewer,{handNumber:5,allBots:true}),'limit');viewer.revealsUsed=0;
 assert.equal(revealPrivately(room,viewer,{handNumber:5,allBots:true}),'revealed');room.street='preflop';assert.equal(hasPrivateReveal(room,viewer,bots[0]),false);room.privateReveals=new Map();room.handNumber++;room.street='showdown';assert.equal(hasPrivateReveal(room,viewer,bots[0]),false);
});
test('Bot training permits unlimited private single and all-bot reveals without consuming uses',()=>{
 const {room,viewer,other,bots}=fixture();room.practice=true;room.revealAllowance=0;viewer.revealsUsed=99;
 for(let hand=5;hand<15;hand++){
  room.handNumber=hand;
  assert.equal(revealPrivately(room,viewer,{handNumber:hand,targetId:bots[0].id}),'revealed');
  assert.equal(revealPrivately(room,viewer,{handNumber:hand,allBots:true}),'revealed');
  assert.equal(viewer.revealsUsed,99);
  for(const bot of bots){assert.equal(hasPrivateReveal(room,viewer,bot),true);assert.equal(hasPrivateReveal(room,other,bot),false);}
 }
 room.practice=false;assert.equal(revealPrivately(room,other,{handNumber:room.handNumber,allBots:true}),'limit');
});
