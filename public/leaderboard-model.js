export function chipLeaderboard(players,big){
 const entries=players.filter(p=>p.eliminated||!p.kicked&&!p.spectating).slice().sort((a,b)=>b.chips-a.chips||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 let rank=0;
 return entries.map((p,index)=>{
  if(index===0||p.chips!==entries[index-1].chips)rank=index+1;
  return {...p,rank,bb:big>0?p.chips/big:0,chipLeader:p.chips>0&&p.chips===entries[0].chips};
 });
}

export function settledLeaderboardPlayers(state){
 const current=new Map(state.players.map(p=>[p.id,p]));
 return (state.standings?.players||state.players).filter(p=>p.eliminated||current.has(p.id)&&!current.get(p.id).spectating&&!current.get(p.id).kicked);
}

export function eliminationLeaderboard(players){
 const entries=chipLeaderboard(players,1).sort((a,b)=>(b.eliminations||0)-(a.eliminations||0)||b.chips-a.chips||a.name.localeCompare(b.name));
 let rank=0;return entries.map((p,i)=>{const count=p.eliminations||0;if(!i||count!==(entries[i-1].eliminations||0))rank=i+1;return {...p,rank,eliminations:count,eliminationLeader:count>0&&count===(entries[0].eliminations||0)};});
}
