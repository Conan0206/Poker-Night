export function chipLeaderboard(players,big){
 const entries=players.filter(p=>!p.kicked&&(!p.spectating||p.bot||p.chips>0||p.stats?.hands>0)).slice().sort((a,b)=>b.chips-a.chips||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 let rank=0;
 return entries.map((p,index)=>{
  if(index===0||p.chips!==entries[index-1].chips)rank=index+1;
  return {...p,rank,bb:big>0?p.chips/big:0,chipLeader:p.chips>0&&p.chips===entries[0].chips};
 });
}
