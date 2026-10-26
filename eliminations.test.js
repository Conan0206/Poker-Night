import test from 'node:test';
import assert from 'node:assert/strict';
import {recordEliminations} from './eliminations.js';
import {eliminationLeaderboard} from './public/leaderboard-model.js';
test('knockouts use the final relevant side pot, split ties, and record once per tournament hand',()=>{
 const players=[{id:'a',name:'A',chips:300,inHand:true,total:100},{id:'b',name:'B',chips:400,inHand:true,total:200},{id:'c',name:'C',chips:0,inHand:true,total:100},{id:'d',name:'D',chips:0,inHand:true,total:200}];
 const room={mode:'tournament',handNumber:1,players,awards:[{contributors:['a','b','c','d'],winners:[{id:'a',amount:400}]},{contributors:['b','d'],winners:[{id:'b',amount:200}]}]};recordEliminations(room);assert.equal(players[0].eliminations,1);assert.equal(players[1].eliminations,1);recordEliminations(room);assert.equal(players[0].eliminations,1);
 room.handNumber=2;room.awards=[{contributors:['a','b','c','d'],winners:[{id:'a',amount:200},{id:'b',amount:200}]}];recordEliminations(room);assert.equal(players[0].eliminations,2);assert.equal(players[1].eliminations,2);
 const entries=eliminationLeaderboard(players);assert.deepEqual(entries.map(p=>p.rank),[1,1,3,3]);assert.equal(entries.filter(p=>p.eliminationLeader).length,2);
 room.mode='cash';room.handNumber=3;recordEliminations(room);assert.equal(players[0].eliminations,2);
});
test('uncalled returns and players with chips do not count as eliminations',()=>{
 const players=[{id:'a',name:'A',chips:200,inHand:true,total:100},{id:'b',name:'B',chips:1,inHand:true,total:100}];recordEliminations({mode:'tournament',handNumber:1,players,awards:[{contributors:['a','b'],winners:[{id:'a',amount:200}]}]});assert.equal(players[0].eliminations,undefined);assert.ok(eliminationLeaderboard(players).every(p=>!p.eliminationLeader));
});
