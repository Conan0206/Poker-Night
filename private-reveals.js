export function hasPrivateReveal(room,viewer,target){
 return room.mode==='cash'&&room.street==='showdown'&&room.privateRevealHandNumber===room.handNumber&&!!room.privateReveals?.get(viewer.id)?.has(target.id);
}
export function revealPrivately(room,viewer,{handNumber,targetId,allBots=false}={}){
 if(!room||room.mode!=='cash'||room.street!=='showdown'||!viewer||viewer.kicked||handNumber!==room.handNumber)return 'ignored';
 const targets=room.players.filter(target=>target!==viewer&&!target.kicked&&target.inHand&&target.cards.length===2&&(target.shown||0)!==3&&!hasPrivateReveal(room,viewer,target)&&(allBots?target.bot:target.id===targetId));
 if(!targets.length)return 'ignored';
 if((viewer.revealsUsed||0)>=(room.revealAllowance??3))return 'limit';
 if(room.privateRevealHandNumber!==room.handNumber){room.privateReveals=new Map();room.privateRevealHandNumber=room.handNumber;}
 room.privateReveals??=new Map();
 const revealed=room.privateReveals.get(viewer.id)||new Set();
 for(const target of targets)revealed.add(target.id);
 room.privateReveals.set(viewer.id,revealed);viewer.revealsUsed=(viewer.revealsUsed||0)+1;
 return 'revealed';
}
