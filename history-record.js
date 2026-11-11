// Store public board/payout snapshots, never private hole cards or reveal maps.
export function handHistoryEntry(room,message){
 const entry={message,bankroll:!!room.bankroll,practice:!!room.practice,mode:room.mode,handNumber:room.handNumber,level:room.level||1,small:room.small,big:room.big};
 const players=new Map(room.players.map(p=>[p.id,p]));
 const contributors=[...room.players].filter(p=>p.total>0).sort((a,b)=>b.total-a.total),largest=contributors[0],uncalled=largest?largest.total-(contributors[1]?.total||0):0;
 if(uncalled>0&&largest.inHand&&!largest.folded)entry.returned={name:largest.name,amount:uncalled};
 const awards=(room.awards||[]).map(a=>({...a,winners:(a.winners||[]).map(w=>({...w,amount:w.amount-(room.endedByFold&&entry.returned&&w.id===largest.id?uncalled:0)}))}));
 function totalWinners(awards){const totals=new Map();for(const award of awards)for(const winner of award.winners||[]){if(winner.amount<=0)continue;const previous=totals.get(winner.id)||{id:winner.id,name:players.get(winner.id)?.name||'Player',amount:0};previous.amount+=winner.amount;totals.set(winner.id,previous);}return [...totals.values()];}
 function potRows(items){const indices=[...new Set(items.map(a=>a.displayPotIndex??a.potIndex??0))].sort((a,b)=>a-b);return indices.map(index=>({label:index===0?'Main pot':'Side pot '+index,winners:totalWinners(items.filter(a=>(a.displayPotIndex??a.potIndex??0)===index))}));}
 entry.winners=totalWinners(awards);entry.split=awards.some(a=>a.winners.filter(w=>w.amount>0).length>1);entry.pots=potRows(awards);
 if(room.runBoards?.length!==2)return entry;
 entry.runs=room.runBoards.map((board,i)=>{
  const items=awards.filter(a=>a.run===i+1);
  return {number:i+1,board:[...board],winners:totalWinners(items),pots:potRows(items)};
 });
 return entry;
}
