import test from 'node:test';import assert from 'node:assert/strict';import {tournamentChampion} from './tournament-champion.js';
test('champion is declared only after the final opponent loses their stack',()=>{
 const room={mode:'tournament',code:'TOUR',started:true,began:Date.now(),handNumber:8,players:[{id:'a',name:'Alice',avatar:'😎',chips:1500,inHand:true},{id:'b',name:'Bob',chips:500,inHand:true}]};assert.equal(tournamentChampion(room),null);room.players[0].chips=2000;room.players[1].chips=0;const c=tournamentChampion(room);assert.equal(c.id,'a');assert.equal(c.chips,2000);assert.ok(c.eventId.startsWith('TOUR:8:'));room.champion=c;assert.equal(tournamentChampion(room),c);
});
test('cash wins, single-player waiting tables, and another funded participant do not declare a champion',()=>{
 const room={mode:'cash',started:true,began:Date.now(),handNumber:1,code:'A',players:[{id:'a',chips:2000,inHand:true},{id:'b',chips:0,inHand:true}]};assert.equal(tournamentChampion(room),null);room.mode='tournament';room.started=false;assert.equal(tournamentChampion(room),null);room.started=true;room.players.pop();assert.equal(tournamentChampion(room),null);room.players.push({id:'b',chips:0,inHand:true},{id:'c',chips:100,spectating:false,inHand:false});assert.equal(tournamentChampion(room),null);
});
