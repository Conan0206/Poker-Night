import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const context={window:{}};vm.runInNewContext(readFileSync('public/wager-layout.js','utf8'),context);const place=context.window.findPokerWagerPosition;
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function inside(at,felt){const cx=felt.left+felt.width/2,cy=felt.top+felt.height/2,rx=felt.width/2-8,ry=felt.height/2-8;for(const x of [at.rect.left,at.rect.right])for(const y of [at.rect.top,at.rect.bottom])assert.ok(((x-cx)/rx)**2+((y-cy)/ry)**2<=1);}
test('top wager stays near the avatar and wholly inside the felt; own wager stays on the right',()=>{
 const felt=rect(100,100,900,400),top=rect(510,65,80,80),self=rect(510,430,80,80),pot=rect(475,245,150,60),board=rect(350,310,400,95),obstacles=[top,self,pot,board],occupied=[];
 const mine=place({felt,avatar:self,width:120,height:34,self:true,obstacles,occupied});assert.ok(mine);inside(mine,felt);assert.ok(mine.rect.left>self.right);assert.ok(Math.hypot(mine.x-550,mine.y-470)<160);occupied.push(mine.rect);
 const other=place({felt,avatar:top,width:120,height:34,obstacles,occupied});assert.ok(other);inside(other,felt);assert.ok(other.rect.top>top.bottom);assert.ok(Math.hypot(other.x-550,other.y-105)<150);
});
test('all other seats keep wagers within the oval without covering avatars',()=>{
 const felt=rect(30,80,1000,450);for(const [x,y]of [[85,305],[220,155],[850,155],[970,305],[850,440],[220,440]]){const avatar=rect(x-35,y-35,70,70);const at=place({felt,avatar,width:110,height:32,obstacles:[avatar]});assert.ok(at);inside(at,felt);assert.ok(Math.hypot(at.x-x,at.y-y)<200);assert.ok(at.rect.right<=avatar.left||at.rect.left>=avatar.right||at.rect.bottom<=avatar.top||at.rect.top>=avatar.bottom);}
});
