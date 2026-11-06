// Contextual mixes use only the bot's own cards and public action history.
export function postflopTactic(v,{equity,features:f},random=Math.random){
 if(v.board.length<3||!v.raiseAllowed)return null;
 const call=Math.max(0,v.bet-v.round),maximum=v.round+v.stack,minimum=Math.min(maximum,v.bet+v.minRaise);
 if(maximum<=v.bet)return null;
 const raise=fraction=>({type:'raise',amount:Math.max(minimum,Math.min(maximum,Math.round((v.bet+(v.pot+call)*fraction)/v.big)*v.big))});
 const models=v.opponentModels||[],station=models.some(m=>m.facedBets>=12&&m.foldsToBet/m.facedBets<.25||m.hands>=20&&m.vpip/m.hands>.48);
 const draw=v.board.length<5&&(f.flushDraw||f.straightDraw),commitment=call/Math.max(1,v.stack),multi=v.opponents>1;
 if(call&&v.checkedThisStreet&&commitment<.4&&(v.raises||0)<2){
  if(equity>(multi?.85:.77)&&random()<.58)return raise(f.wet?.85:.65);
  if(draw&&v.opponents<=2&&equity>.36&&commitment<.22&&!station&&random()<.26)return raise(.72);
  if(!multi&&v.board.length===5&&f.category===0&&f.nutBlocker&&!station&&commitment<.16&&random()<.07)return raise(.9);
 }
 if(call)return null;
 const oop=!v.latePosition,initiative=v.initiative||v.preflopAggressor;
 if(oop&&!v.checkedThisStreet&&v.opponents<=2&&equity>.86&&f.category>=2&&random()<.26)return {type:'check'};
 const ranks=v.board.map(c=>'23456789TJQKA'.indexOf(c[0])+2),lowWet=Math.max(...ranks)<=11&&f.wet;
 const old=v.previousStreetBoard||[],newPair=v.board.length===4&&old.length===3&&old.some(c=>c[0]===v.board.at(-1)[0]);
 if(oop&&!initiative&&v.opponentRaisedPreflop&&!v.checkedThisStreet&&(lowWet||newPair)&&v.opponents<=2){
  if(equity>.68&&f.category>=2&&random()<.34)return raise(f.wet?.65:.4);
  if(draw&&equity>.4&&!station&&random()<.14)return raise(.55);
 }
 if(v.latePosition&&v.opponentsChecked&&!station&&v.opponents<=2&&equity<.45){
  const scare=old.length>=3&&ranks.at(-1)>=12&&ranks.at(-1)>Math.max(...old.map(c=>'23456789TJQKA'.indexOf(c[0])+2));
  const candidate=v.board.length===5?f.category===0&&f.nutBlocker:draw||f.category===0&&scare;
  if(candidate&&random()<(multi?.08:.27))return raise(v.board.length===5?.8:.6);
 }
 return null;
}
