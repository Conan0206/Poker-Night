import {botStyle} from './public/bot-styles.js';
import {tournamentBlinds} from './public/tournament-structure.js';
export const TOURNAMENT_BASELINE_ID='tournament-context-v1-default';
export const TOURNAMENT_DEFAULT=Object.freeze({steal:.22,blindPressure:.035,shortJam:.3,reshove:.13,riverJam:.09});
export const TOURNAMENT_BOUNDS=Object.freeze({steal:[.1,.34],blindPressure:[.01,.055],shortJam:[.15,.4],reshove:[.05,.2],riverJam:[.03,.14]});
export function normalizeTournamentPolicy(params={}){
 return Object.fromEntries(Object.entries(TOURNAMENT_DEFAULT).map(([k,v])=>[k,Number.isFinite(params[k])?Math.max(TOURNAMENT_BOUNDS[k][0],Math.min(TOURNAMENT_BOUNDS[k][1],params[k])):v]));
}
// Public clock and chip counts only. Blind increases take effect on the next hand.
export function tournamentContext(room,now=Date.now()){
 if(room.mode!=='tournament')return undefined;
 const seconds=(room.levelMinutes??7)*60,clock=room.paused?room.pausedAt:now;
 const nextAt=room.began+(room.level||1)*seconds*1000;
 return {level:room.level||1,levelSeconds:seconds,secondsToNext:room.began?Math.max(0,(nextAt-clock)/1000):seconds,
  nextBig:tournamentBlinds(room.baseSmall,room.baseBig,(room.level||1)+1).big,
  remaining:room.players.filter(p=>!p.kicked&&!p.spectating&&p.chips+p.total>0).length};
}
export function tournamentSituation(v){
 const t=v.tournament||{},own=(v.stack+v.round)/v.big,next=t.nextBig>v.big?t.nextBig:v.big;
 const soon=t.secondsToNext>=0&&t.secondsToNext<=Math.min(60,(t.levelSeconds||420)*.2)&&next>v.big;
 const threatened=soon&&(v.stack+v.round)/next<=12;
 const covers=soon&&v.effectiveStack>0&&v.stack>v.effectiveStack*1.35&&v.effectiveStack/next<=12;
 const style=botStyle(v.botStyle),params=normalizeTournamentPolicy(v.tournamentPolicy);
 return {own,soon,threatened,pressure:threatened||covers,style,params,opening:style.opening-(threatened||covers?params.blindPressure:0)};
}
export function frequentCaller(v){return (v.opponentModels||[]).some(m=>m.facedBets>=12&&m.foldsToBet/m.facedBets<.25||m.hands>=20&&m.vpip/m.hands>.48);}
// Conservative fold-equity screen, not an equilibrium/ICM model. No unobserved cards.
function profitableJam(v,equity){
 if(frequentCaller(v)||v.opponents>2)return false;
 const folds=(v.opponentModels||[]).slice(0,v.opponents).map(m=>m.facedBets>=12?Math.max(.15,Math.min(.65,m.foldsToBet/m.facedBets)):.45);
 while(folds.length<v.opponents)folds.push(.45);
 const fold=folds.reduce((a,b)=>a*b,1),call=Math.max(0,v.bet-v.round);
 const risk=Math.min(v.stack,Math.max(call,(v.effectiveStack||v.stack+v.round)-v.round));
 return fold*v.pot+(1-fold)*(equity*(v.pot+2*risk)-risk)>v.big*.15;
}
export function tournamentTactic(v,{quality,equity,features:f},random=Math.random){
 if(v.mode!=='tournament'||!v.raiseAllowed||v.round+v.stack<=v.bet)return null;
 const {own,threatened,pressure,style,params}=tournamentSituation(v),max=v.round+v.stack;
 const call=Math.max(0,v.bet-v.round),min=Math.min(max,v.bet+v.minRaise);
 const step=v.big%2?v.big:v.big/2;
 const raise=n=>({type:'raise',amount:Math.max(min,Math.min(max,Math.round(n/step)*step))});
 const ranks=v.hole.map(c=>'23456789TJQKA'.indexOf(c[0])+2).sort((a,b)=>b-a),suited=v.hole[0][1]===v.hole[1][1];
 const blocker=ranks[0]===14||suited&&ranks[0]>=12;
 const unraised=v.bet<=v.big&&!(v.limpers>0),late=v.latePosition&&v.opponents<=3;
 if(!v.board.length){
  // Short-stack semi-bluffs need blockers/playability, position and plausible fold equity.
  if(unraised&&late&&own>=6&&own<=18&&quality>.43&&blocker&&profitableJam(v,equity)
   &&random()<Math.min(.55,params.shortJam*style.jam*(threatened?1.35:1)))return raise(max);
  if(!unraised&&v.opponents<=2&&v.latePosition&&own>=9&&own<=20&&v.bet<=v.big*3.5
   &&(v.raises||0)<=1&&suited&&blocker&&quality>.5&&equity>.3&&profitableJam(v,equity)
   &&random()<params.reshove*style.jam)return raise(max);
  // Smaller steals preserve room to fold instead of risking a deep stack.
  if(unraised&&late&&own>18&&!frequentCaller(v)&&quality>.42+style.opening
   &&random()<params.steal*style.aggression*(pressure?1.2:1))return raise(v.big*2.5);
 }else if(v.board.length===5&&v.opponents===1&&own<=18&&f.category===0&&f.nutBlocker
  &&(v.initiative||v.opponentsChecked)&&call<=v.stack*.15&&v.stack<=v.pot*.9
  &&equity<.4&&profitableJam(v,equity)&&random()<params.riverJam*style.bluff)return raise(max);
 return null;
}
