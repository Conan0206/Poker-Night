import test from 'node:test';
import assert from 'node:assert/strict';
import {handRankings,currentHandRank} from './public/hand-rankings-data.js';
test('ranking guide distinguishes all ten categories',()=>{for(const hand of handRankings)assert.equal(currentHandRank(hand.cards.slice(0,2),hand.cards.slice(2)),hand.id,hand.name);});
test('ranking guide uses the best hand, including board-only hands and ace-low straights',()=>{
 assert.equal(currentHandRank(['2h','3d'],['Ts','Js','Qs','Ks','As']),'royal');
 assert.equal(currentHandRank(['Ah','2s'],['3d','4c','5h']),'straight');
 assert.equal(currentHandRank(['Ah','Ad'],['Ac','Kh','Kd','Ks','2h']),'full-house');
 assert.equal(currentHandRank(['Kh','Kd'],[]),'pair');
 assert.equal(currentHandRank(['Kh','2d'],[]),'high');
});
test('unknown, incomplete, or duplicate cards never produce a highlight',()=>{
 assert.equal(currentHandRank(['?','?'],['Ah','Kh','Qh']),null);
 assert.equal(currentHandRank([],['Ah','Kh','Qh']),null);
 assert.equal(currentHandRank(['Ah','Ad'],['Ah','Kh','Qh']),null);
 assert.equal(currentHandRank(['Ah','Ad'],['Kh']),null);
});
