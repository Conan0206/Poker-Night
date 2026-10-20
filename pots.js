export function potBreakdown(players){
 const total=players.reduce((n,p)=>n+p.total,0);if(!total)return [];
 const max=Math.max(...players.map(p=>p.total));
 const caps=[...new Set(players.filter(p=>p.inHand&&!p.folded&&p.chips===0&&p.total>0&&p.total<max).map(p=>p.total))].sort((a,b)=>a-b);
 const pots=[];let previous=0;
 for(const cap of [...caps,max]){const amount=players.reduce((n,p)=>n+Math.max(0,Math.min(p.total,cap)-previous),0);const contributors=players.filter(p=>p.total>previous).length;if(amount)pots.push({amount,kind:pots.length===0?'main':contributors===1?'uncalled':'side'});previous=cap;}
 return pots;
}
