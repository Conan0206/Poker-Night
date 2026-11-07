// Derive chart counters only from validated actions in a completed hand.
export function capturePlayerStyles(room){
 for(const p of room.players){
  if(!p.inHand)continue;
  p.stats.handsWon??=0;if((p.wonHand||0)>0)p.stats.handsWon++;
  const stats=p.stats.style??={hands:0,vpip:0,raises:0,calls:0};
  stats.hands++;if(p.vpip)stats.vpip++;
  for(const a of room.actionLog||[])if(a.actorId===p.id){if(a.action.type==='raise')stats.raises++;else if(a.action.type==='call')stats.calls++;}
 }
}
