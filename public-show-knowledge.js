import {preflopQuality} from './bot-ranges.js';
// Only the player's explicit public self-show enters this table-session memory.
// Viewer-private reveals and automatic all-in/showdown exposure never call this path.
export function revealSelfPublicly(room,player,value){
 if(!room||room.mode!=='cash'||room.street!=='showdown'||!player?.inHand||player.bot||player.hideHoleCards||player.kicked||!Number.isInteger(value)||value<0||value>3||player.cards?.length!==2)return false;
 const mask=(player.shown||0)|value;if(mask===(player.shown||0))return false;player.shown=mask;
 room.publicShowKnowledge??=new Map();const previous=room.publicShowKnowledge.get(player.id)||[];
 const cards=player.cards.map((c,i)=>mask&(1<<i)?c:'?');
 const record={handNumber:room.handNumber,cards,preflopRaised:(room.actionLog||[]).some(a=>a.actorId===player.id&&a.street==='preflop'&&a.action.type==='raise')};
 room.publicShowKnowledge.set(player.id,[record,...previous.filter(h=>h.handNumber!==room.handNumber)].slice(0,12));
 return true;
}
export function publicShowModel(room,playerId){
 if(room.mode!=='cash')return {};
 const publicShows=(room.publicShowKnowledge?.get(playerId)||[]).filter(h=>h.handNumber<room.handNumber).map(h=>({...h,cards:[...h.cards]}));
 const openings=publicShows.filter(h=>h.preflopRaised&&h.cards.every(c=>/^[2-9TJQKA][shdc]$/.test(c)));
 return {publicShows,shownOpenings:openings.length,shownOpeningQuality:openings.reduce((n,h)=>n+Math.round(preflopQuality(h.cards)*1000),0)};
}
