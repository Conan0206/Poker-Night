import test from 'node:test';import assert from 'node:assert/strict';import {potBreakdown} from './pots.js';
const p=(total,chips=100,folded=false)=>({total,chips,folded,inHand:true});
test('normal bets stay a single pot',()=>{assert.deepEqual(potBreakdown([p(5),p(10)]),[{amount:15,kind:'main'}]);});
test('unequal all-ins split main and side pots, including folded contributions',()=>{const pots=potBreakdown([p(50,0),p(100,0),p(200),p(200),p(75,200,true)]);assert.deepEqual(pots,[{amount:250,kind:'main'},{amount:175,kind:'side'},{amount:200,kind:'side'}]);assert.equal(pots.reduce((n,p)=>n+p.amount,0),625);});
test('uncalled excess is labelled separately',()=>{assert.deepEqual(potBreakdown([p(50,0),p(100)]),[{amount:100,kind:'main'},{amount:50,kind:'uncalled'}]);assert.deepEqual(potBreakdown([p(0),p(0)]),[]);});
