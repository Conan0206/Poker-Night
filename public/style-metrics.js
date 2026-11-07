export function measuredStyle(stats={}){
 const count=n=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
 const hands=count(stats.hands),raises=count(stats.raises),calls=count(stats.calls),decisions=raises+calls;
 const loose=hands?Math.min(1,count(stats.vpip)/hands):null,aggressive=decisions?raises/decisions:null;
 const ready=loose!==null&&aggressive!==null;
 const id=ready?(loose>=.3?(aggressive>=.45?'lag':'fish'):(aggressive>=.45?'tag':'rock')):null;
 return {hands,decisions,loose,aggressive,id,ready,early:hands<10||decisions<10};
}
