export function tournamentChampion(room){
 if(room.mode!=='tournament'||!room.started||!room.began||room.champion)return room.champion||null;
 const entrants=room.players.filter(p=>p.inHand&&!p.kicked);
 const remaining=room.players.filter(p=>!p.kicked&&!p.spectating&&p.chips>0);
 if(entrants.length<2||remaining.length!==1)return null;
 const p=remaining[0];return {id:p.id,name:p.name,avatar:p.avatar,chips:p.chips,eventId:room.code+':'+room.handNumber+':'+Date.now()};
}
