import {createHash} from 'node:crypto';
import {publicModel} from './opponent-model.js';
const card=c=>typeof c==='string'&&/^[2-9TJQKA][shdc]$/.test(c);
const numeric=['chips','total','round'];
// Strict whitelist prevents hidden opponent cards, future boards and connection data leaking.
export function cleanScenario(value){
 if(!value||value.version!==1||!['cash','tournament'].includes(value.mode)||!Array.isArray(value.players)||value.players.length<2||value.players.length>8)return null;
 const n=value.players.length,hero=value.heroSeat;
 if(!Number.isInteger(hero)||hero<0||hero>=n||!Number.isInteger(value.dealerSeat)||value.dealerSeat<0||value.dealerSeat>=n)return null;
 if(!Array.isArray(value.hole)||value.hole.length!==2||!value.hole.every(card)||!Array.isArray(value.board)||![0,3,4,5].includes(value.board.length)||!value.board.every(card)||new Set([...value.hole,...value.board]).size!==value.hole.length+value.board.length)return null;
 if(!['big','small','bet','minRaise'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=(k==='bet'?0:1))||value.small>value.big)return null;
 const players=[];
 for(const p of value.players){if(!p||!numeric.every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)||p.round>p.total)return null;
  players.push({...Object.fromEntries(numeric.map(k=>[k,p[k]])),folded:!!p.folded,acted:!!p.acted,raiseAllowed:!!p.raiseAllowed,checked:!!p.checked,pfr:!!p.pfr,action:['fold','check','call','raise'].includes(p.action)?p.action:'',botStyle:['tag','lag','fish','rock'].includes(p.botStyle)?p.botStyle:'tag',model:publicModel(p.model)});
 }
 if(players[hero].folded||!players[hero].chips||players.filter(p=>!p.folded).length<2||players.some(p=>p.round>value.bet))return null;
 const index=k=>Number.isInteger(value[k])&&value[k]>=0&&value[k]<n?value[k]:-1;
 const old=Array.isArray(value.previousStreetBoard)&&value.previousStreetBoard.every(c=>value.board.includes(c))?value.previousStreetBoard:[];
 // Tournament information is a public clock/stack summary, not the whole room object.
 const tournament=value.tournament?Object.fromEntries(Object.entries(value.tournament).filter(([k,v])=>['level','levelSeconds','secondsToNext','nextBig','remaining'].includes(k)&&Number.isFinite(v))):undefined;
 return {version:1,mode:value.mode,hole:[...value.hole],board:[...value.board],previousStreetBoard:[...old],players,heroSeat:hero,dealerSeat:value.dealerSeat,big:value.big,small:value.small,bet:value.bet,minRaise:value.minRaise,raises:Math.max(0,Math.min(100,Number(value.raises)||0)),preflopAggressor:index('preflopAggressor'),lastAggressor:index('lastAggressor'),...(tournament?{tournament}:{})};
}
export function captureScenario(room,actor,tournament){
 const seated=room.players.filter(p=>p.inHand),index=p=>seated.indexOf(p);
 const scenario={version:1,mode:room.mode,hole:actor.cards,board:room.board,previousStreetBoard:room.previousStreetBoard,heroSeat:index(actor),dealerSeat:seated.includes(room.players[room.dealer])?index(room.players[room.dealer]):0,big:room.big,small:room.small,bet:room.bet,minRaise:room.minRaise,raises:room.streetRaises||0,preflopAggressor:seated.findIndex(p=>p.id===room.preflopAggressor),lastAggressor:seated.findIndex(p=>p.id===room.lastAggressor),tournament,
  players:seated.map(p=>({chips:p.chips,total:p.total,round:p.round,folded:p.folded,acted:p.acted,raiseAllowed:p.raiseAllowed,checked:p.checkedThisStreet,pfr:p.pfr,action:p.action?.startsWith('Raise ')?'raise':p.action,botStyle:p.botStyle,model:p.completedModel||p.stats}))};
 return cleanScenario(scenario);
}
export function recordedSplit(handId){return createHash('sha256').update(String(handId)).digest()[0]<64?'holdout':'train';}
export function keepScenario(log,observed,random=Math.random){
 if(!observed.context?.scenario)return;
 const seen=log.filter(a=>a.bot).length+1;if(seen<=4)return;
 const slot=Math.floor(random()*seen);if(slot>=4){delete observed.context.scenario;return;}
 const saved=log.filter(a=>a.context?.scenario);if(saved[slot])delete saved[slot].context.scenario;
}
