/* Launch times shared by card motion and its sound cues (milliseconds). */
(()=>{
 const timing={holeDuration:1500,holeGap:180,ghostDuration:1200,boardDuration:1000,boardGap:200};
 const boardLength=s=>s?.rabbitBoard?.length||s?.board?.length||0;
 timing.boardBefore=(s,old)=>!old?boardLength(s):(old.activeRun||1)!==(s.activeRun||1)?boardLength(s):boardLength(old);
 timing.sounds=(s,old,id)=>{
  if(!old||old.code!==s.code)return [];
  if(s.handNumber!==old.handNumber){
   const recipients=s.players.filter(p=>p.inHand&&!p.spectating),self=s.players.find(p=>p.id===id),events=[];let index=0;
   for(let round=0;round<2;round++)for(const player of recipients){const own=player.id===id&&!self?.spectating;events.push({kind:'deal',playerId:player.id,cardIndex:round,own,delay:index++*timing.holeGap});}
   return events;
  }
  const before=timing.boardBefore(s,old),after=boardLength(s),events=[];
  if(after<=before)return events;
  let first=before;
  if(before===0&&after>=3){events.push({kind:'flop',boardIndex:0,delay:0});first=3;}
  for(let i=first;i<after;i++)events.push({kind:'deal',boardIndex:i,delay:(i-before)*timing.boardGap});
  return events;
 };
 window.pokerDealTiming=Object.freeze(timing);
})();
