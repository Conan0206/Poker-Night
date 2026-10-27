import test from 'node:test';
import assert from 'node:assert/strict';
import {chipLeaderboard,eliminationLeaderboard} from './public/leaderboard-model.js';
import {tournamentSchedule,tournamentBlinds} from './public/tournament-structure.js';
test('chip ranking converts current stacks to BB, stars tied leaders, and excludes every spectator',()=>{
 const players=[{id:'a',name:'Alice',chips:1000},{id:'b',name:'Bot',bot:true,chips:1200},{id:'c',name:'Carol',chips:1200},{id:'d',name:'Busted',chips:0,spectating:true,stats:{hands:5}},{id:'e',name:'Watcher',chips:0,spectating:true},{id:'f',name:'Kicked',chips:5000,kicked:true}];
 const entries=chipLeaderboard(players,20);assert.deepEqual(entries.map(p=>p.name),['Bot','Carol','Alice']);assert.deepEqual(entries.map(p=>p.rank),[1,1,3]);assert.deepEqual(entries.map(p=>p.bb),[60,60,50]);assert.deepEqual(entries.map(p=>p.chipLeader),[true,true,false]);assert.equal(players[0].rank,undefined);assert.equal(chipLeaderboard(players,0)[0].bb,0);
});
test('tournament structure starts at 100 BB and uses gradual whole-chip increases with a cap',()=>{
 const levels=tournamentSchedule();assert.equal(1000/levels[0].big,100);assert.deepEqual(levels.slice(0,5).map(p=>[p.small,p.big]),[[5,10],[10,20],[15,30],[20,40],[30,60]]);for(let i=0;i<levels.length;i++){assert.equal(levels[i].big,levels[i].small*2);assert.ok(Number.isInteger(levels[i].small));if(i)assert.ok(levels[i].big>levels[i-1].big);}assert.deepEqual(tournamentBlinds(5,10,1000),{small:400,big:800});assert.equal(tournamentSchedule(10,20)[2].big,60);
});

test('spectators with chips, past hands or eliminations never affect either leaderboard',()=>{
 const players=[{id:'a',name:'Seated',chips:1000,eliminations:1},{id:'b',name:'Watching',spectating:true,chips:9000,eliminations:10,stats:{hands:20}},{id:'c',name:'Watching bot',bot:true,spectating:true,chips:5000,eliminations:5}];
 assert.deepEqual(chipLeaderboard(players,10).map(p=>p.id),['a']);assert.deepEqual(eliminationLeaderboard(players).map(p=>p.id),['a']);players[0].spectating=true;assert.equal(chipLeaderboard(players,10).length,0);assert.equal(eliminationLeaderboard(players).length,0);
});
