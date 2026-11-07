export function captureStandings(room){
 const eliminated=new Map(room.mode==='tournament'?(room.standings?.players||[]).filter(p=>p.eliminated).map(p=>[p.id,p]):[]);
 const players=room.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:!!p.bot,spectating:!!p.spectating,kicked:!!p.kicked,chips:p.chips,eliminations:p.eliminations||0,eliminated:room.mode==='tournament'&&(eliminated.has(p.id)||!!p.inHand&&!p.kicked&&!p.spectating&&p.chips===0),stats:{hands:p.stats?.hands||0}}));
 // Keep final results even after a busted entrant leaves the room.
 const present=new Set(players.map(p=>p.id));for(const [id,p] of eliminated)if(!present.has(id))players.push({...p});
 room.standings={big:room.big,players};return room.standings;
}
