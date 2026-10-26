import test from 'node:test';
import assert from 'node:assert/strict';
import {sendFeedbackEmail} from './feedback-email.js';
const feedback={name:'Player',table:'ABC123',category:'problem',createdAt:'2026-10-27T00:00:00Z',message:'The raise button overlaps.'};
test('feedback emails use the fixed owner address and include the submitted details',async()=>{
 let captured;const result=await sendFeedbackEmail(feedback,{enabled:true,fetchImpl:async(url,options)=>{captured={url,...options};return {ok:true,json:async()=>({success:'true'})};}});
 assert.equal(result.ok,true);assert.equal(captured.url,'https://formsubmit.co/ajax/conantai2006@gmail.com');const data=JSON.parse(captured.body);assert.equal(data.player,feedback.name);assert.equal(data.message,feedback.message);assert.equal(data.table,feedback.table);assert.ok(data._subject.includes('problem'));assert.ok(captured.signal);
});
test('provider rejections, invalid responses, and network failures never claim delivery',async()=>{
 for(const fetchImpl of [async()=>({ok:false,json:async()=>({success:true})}),async()=>({ok:true,json:async()=>({success:false})}),async()=>{throw Error('network unavailable');},async()=>({ok:true,json:async()=>{throw Error('invalid json');}})])assert.equal((await sendFeedbackEmail(feedback,{enabled:true,fetchImpl})).ok,false);
});
test('logs-only mode makes no email request',async()=>{const result=await sendFeedbackEmail(feedback,{enabled:false,fetchImpl:async()=>{throw Error('must not call');}});assert.equal(result.loggedOnly,true);});
