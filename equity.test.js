import test from 'node:test';import assert from 'node:assert/strict';import {rank,estimate} from './public/equity.js';
const cards=s=>s.split(' ');
test('hand ordering, wheel and two trips full house',()=>{assert(rank(cards('As Ks Qs Js Ts 2h 3d'))>rank(cards('Ah Ad Ac As Kh Qh Jh')));assert(rank(cards('Ah Ad Ac Kh Kd Kc 2s'))>rank(cards('Qh Qd Qc Ah Ad 2s 3s')));assert(rank(cards('As 2d 3h 4c 5s 9d Th'))>rank(cards('Ah Ad Kc Qs 9s 4h 2h')));assert.equal(rank(cards('As Ks Qs Js Ts 2h 3d')),rank(cards('As Ks Qs Js Ts 8h 9d')));});
test('equity shares locked board ties and detects unbeatable hand',()=>{assert.equal(estimate({hole:['2h','3h'],board:cards('As Ks Qs Js Ts'),opponents:3,samples:30}),.25);assert.equal(estimate({hole:['As','Ks'],board:cards('Qs Js Ts 2h 3d'),opponents:4,samples:30}),1);assert.throws(()=>estimate({hole:['As','As'],board:[],opponents:1}));});
import solver from 'pokersolver';const {Hand}=solver;
test('ranks agree with game evaluator on shuffled seven-card hands',()=>{const deck=[...'23456789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s));for(let n=0;n<300;n++){const shuffled=deck.slice().sort(()=>Math.random()-.5),a=shuffled.slice(0,7),b=shuffled.slice(7,14),ha=Hand.solve(a),hb=Hand.solve(b),w=Hand.winners([ha,hb]);const expected=w.length===2?0:w[0]===ha?1:-1;assert.equal(Math.sign(rank(a)-rank(b)),expected);}});

