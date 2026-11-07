import {simulateHand,seededRandom} from './simulator.js';
import {tournamentBlinds} from '../public/tournament-structure.js';
import {BOT_STYLE_IDS} from '../public/bot-styles.js';

export class TrainingDeadline extends Error{}
// A complete single-table, winner-take-all tournament. No rebuys or hidden-card access.
export function simulateTournament({seed,seats=3,heroSeat=0,policy,incumbent,style='incumbent',heroStyle='balanced',samples=700,depth=30,levelMinutes=7,decision,deadline=Infinity}={}){
 if(!Number.isInteger(seats)||seats<2||seats>8||!Number.isInteger(heroSeat)||heroSeat<0||heroSeat>=seats)throw Error('Invalid tournament seats');
 const random=seededRandom(seed^0x7531),bank=depth*10,stacks=Array(seats).fill(bank);
 const styles=Array.from({length:seats},(_,i)=>i===heroSeat?heroStyle:BOT_STYLE_IDS[(i+seed)%BOT_STYLE_IDS.length]);
 let dealer=seed%seats,elapsed=0,hands=0,heroFinish;
 while(stacks.filter(n=>n>0).length>1){
  if(Date.now()>=deadline)throw new TrainingDeadline('Tournament pair not completed');
  const active=stacks.map((chips,id)=>({chips,id})).filter(p=>p.chips>0);
  // Keep the dealer moving around surviving seats after eliminations.
  const dealerIndex=active.findIndex(p=>p.id>=dealer),button=dealerIndex<0?0:dealerIndex;
  const level=Math.floor(elapsed/(levelMinutes*60))+1,{small,big}=tournamentBlinds(5,10,level);
  const context={level,levelSeconds:levelMinutes*60,secondsToNext:levelMinutes*60-elapsed%(levelMinutes*60),nextBig:tournamentBlinds(5,10,level+1).big,remaining:active.length};
  const hero=active.findIndex(p=>p.id===heroSeat);
  const result=simulateHand({seed:(seed^Math.imul(hands+1,104729))>>>0,seats:active.length,heroSeat:hero,
   startingStacks:active.map(p=>p.chips),dealerSeat:button,big,small,mode:'tournament',tournament:context,
   botStyles:active.map(p=>styles[p.id]),tournamentPolicy:policy,tournamentIncumbent:incumbent,style,samples,
   beforeDecision:()=>{if(Date.now()>=deadline)throw new TrainingDeadline();},
   // The simulator's default opponent pool remains active unless a test decider is supplied.
   decider:decision?((view,index,rng)=>{if(Date.now()>=deadline)throw new TrainingDeadline();return decision(view,active[index].id,rng);}):undefined});
  active.forEach((p,i)=>{stacks[p.id]=result.balances[i];});
  if(stacks.reduce((a,b)=>a+b,0)!==bank*seats)throw Error('Tournament chips not conserved');
  if(stacks[heroSeat]===0){
   const busted=active.filter(p=>stacks[p.id]===0),heroBank=active[hero].chips;
   // Equal starting stacks share finishing rank; no arbitrary seat advantage.
   heroFinish=stacks.filter(n=>n>0).length+1+busted.filter(p=>p.chips>heroBank).length;
   break;
  }
  dealer=(active[(button+1)%active.length].id);
  // Fixed exogenous hand time preserves paired timing despite different betting choices.
  elapsed+=35+Math.floor(random()*31);hands++;
  if(hands>400)throw Error('Tournament hand limit; incomplete games cannot enter evaluation');
 }
 const won=stacks[heroSeat]===bank*seats,finish=won?1:heroFinish;
 if(!Number.isInteger(finish))throw Error('Incomplete tournament result');
 return {won:won?1:0,finish,placement:(seats-finish)/(seats-1),hands:hands+1,stacks,level:Math.floor(elapsed/(levelMinutes*60))+1};
}
