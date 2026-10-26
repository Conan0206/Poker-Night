// Attribute a bust to the winners of the highest contested pot the player entered.
export function recordEliminations(room){
 if(room.mode!=='tournament'||room.eliminationsRecordedFor===room.handNumber)return;
 room.eliminationsRecordedFor=room.handNumber;
 for(const loser of room.players.filter(p=>p.inHand&&!p.kicked&&p.chips===0&&p.total>0)){
  const award=[...(room.awards||[])].reverse().find(a=>a.contributors?.includes(loser.id)&&a.winners.some(w=>w.id!==loser.id&&w.amount>0));
  const winners=award?.winners.filter(w=>w.id!==loser.id&&w.amount>0)||[];
  for(const winner of winners){const p=room.players.find(p=>p.id===winner.id);if(p)p.eliminations=(p.eliminations||0)+1/winners.length;}
 }
}
