export function captureStandings(room){
 room.standings={big:room.big,players:room.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:!!p.bot,spectating:!!p.spectating,kicked:!!p.kicked,chips:p.chips,eliminations:p.eliminations||0,stats:{hands:p.stats?.hands||0}}))};return room.standings;
}
