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

test('eight-player table keeps every wager clear and YOU wager directly beside its avatar',()=>{
 const felt=rect(200,210,1400,440),avatars=[rect(850,530,100,100),rect(390,550,80,80),rect(190,390,80,80),rect(390,240,80,80),rect(860,175,80,80),rect(1330,240,80,80),rect(1530,390,80,80),rect(1330,550,80,80)];
 const plates=[rect(810,635,180,120),rect(480,530,140,120),rect(285,377,140,120),rect(480,220,140,115),rect(950,155,140,115),rect(1425,220,140,115),rect(1625,377,140,120),rect(1425,530,140,120)];
 const obstacles=[...avatars,...plates,rect(690,415,450,115),rect(810,345,180,60),rect(870,310,65,20)],occupied=[];
 for(let i=0;i<avatars.length;i++){const at=place({felt,avatar:avatars[i],width:145,height:36,obstacles,occupied,self:i===0});assert.ok(at,'seat '+i+' has a visible wager');inside(at,felt);if(i===0){assert.ok(at.rect.left>=avatars[0].right);assert.ok(at.rect.left-avatars[0].right<=30);}occupied.push(at.rect);}
});

test('own wager is anchored directly below the turn and river slots',()=>{
 const felt=rect(200,200,1400,450),avatar=rect(860,520,96,96),board=rect(695,406,428,113),anchor={left:956,right:1123,bottom:519};
 const at=place({felt,avatar,width:145,height:36,obstacles:[avatar,board,rect(820,625,180,120)],self:true,communityAnchor:anchor});assert.ok(at);inside(at,felt);assert.ok(at.rect.top>=anchor.bottom);assert.ok(Math.abs(at.x-(anchor.left+anchor.right)/2)<10);assert.ok(at.y-anchor.bottom<45);
});
test('seven-player left seats reuse approved eight-player anchors; six-player lower left moves above its nameplate',()=>{
 const target=context.window.pokerWagerTarget,avatar=rect(300,300,80,80),plate=rect(390,280,140,110);
 for(const order of [1,2,3])assert.deepEqual(target({count:7,order,avatar,plate,width:150,height:38}),target({count:8,order,avatar,plate,width:150,height:38}));
 const six=target({count:6,order:1,avatar,plate,width:150,height:38});assert.ok(six.x-75>plate.right);assert.ok(six.y+19<plate.top);
 assert.equal(target({count:6,order:2,avatar,plate,width:150,height:38}),null);
});

test('six-seat spectators see three separate wagers beside the matching left-side panels',()=>{
 const felt=rect(210,240,1360,400),avatars=[rect(395,555,80,80),rect(205,400,80,80),rect(395,245,80,80)];
 const plates=[rect(490,538,140,88),rect(295,383,140,88),rect(490,227,140,88)];
 const obstacles=[...avatars,...plates,rect(695,422,430,114)],occupied=[];
 for(let order=0;order<3;order++){
  const target=context.window.pokerWagerTarget({count:6,order,avatar:avatars[order],plate:plates[order],width:160,height:38,spectating:true});
  const at=place({felt,avatar:avatars[order],width:160,height:38,obstacles,occupied,target});
  assert.ok(at);inside(at,felt);assert.ok(at.rect.left>=plates[order].right);assert.ok(Math.abs(at.y-(plates[order].top+44))<20);occupied.push(at.rect);
 }
 assert.equal(context.window.pokerWagerTarget({count:6,order:0,avatar:avatars[0],plate:plates[0],width:160,height:38,spectating:false}),null);
});
