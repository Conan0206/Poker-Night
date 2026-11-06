// Store public board/payout snapshots, never private hole cards or reveal maps.
export function handHistoryEntry(room,message){
 const entry={message,mode:room.mode,handNumber:room.handNumber,level:room.level||1,small:room.small,big:room.big};
 if(room.runBoards?.length!==2)return entry;
 const players=new Map(room.players.map(p=>[p.id,p]));
 function totalWinners(awards){const totals=new Map();for(const award of awards)for(const winner of award.winners||[]){if(winner.amount<=0)continue;const previous=totals.get(winner.id)||{id:winner.id,name:players.get(winner.id)?.name||'Player',amount:0};previous.amount+=winner.amount;totals.set(winner.id,previous);}return [...totals.values()];}
 entry.runs=room.runBoards.map((board,i)=>{
  const awards=(room.awards||[]).filter(a=>a.run===i+1);
  const indices=[...new Set(awards.map(a=>a.displayPotIndex))].sort((a,b)=>a-b);
  return {number:i+1,board:[...board],winners:totalWinners(awards),pots:indices.map(index=>({label:index===0?'Main pot':'Side pot '+index,winners:totalWinners(awards.filter(a=>a.displayPotIndex===index))}))};
 });
 const contributors=[...room.players].filter(p=>p.total>0).sort((a,b)=>b.total-a.total),largest=contributors[0],uncalled=largest?largest.total-(contributors[1]?.total||0):0;
 if(uncalled>0&&largest.inHand&&!largest.folded)entry.returned={name:largest.name,amount:uncalled};
 return entry;
}
