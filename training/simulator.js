import {decideBot} from '../bot-strategy.js';
import {preflopQuality} from '../bot-ranges.js';
import {rank} from '../public/equity.js';
import {cleanScenario} from '../recorded-scenario.js';
export function seededRandom(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function settlePots(players,board,dealer=0){
 const paid=players.map(()=>0),levels=[...new Set(players.map(p=>p.total).filter(Boolean))].sort((a,b)=>a-b);let previous=0;
 for(const level of levels){
  const contributors=players.map((p,i)=>({p,i})).filter(({p})=>p.total>=level),amount=(level-previous)*contributors.length;previous=level;
  const eligible=contributors.filter(({p})=>!p.folded);if(!eligible.length)throw Error('Pot without eligible player');
  const scored=eligible.map(({p,i})=>({i,rank:rank([...p.hole,...board])})),best=Math.max(...scored.map(s=>s.rank));
  const winners=scored.filter(s=>s.rank===best).sort((a,b)=>(a.i-dealer-1+players.length)%players.length-(b.i-dealer-1+players.length)%players.length);
  winners.forEach(({i},n)=>paid[i]+=Math.floor(amount/winners.length)+(n<amount%winners.length?1:0));
 }
 return paid;
}
export function legalAction(view,action){
 const call=Math.max(0,view.bet-view.round),maximum=view.round+view.stack;
 if(action?.type==='fold'&&call>0||action?.type==='check'&&call===0||action?.type==='call'&&call>0)return action;
 if(action?.type==='raise'&&view.raiseAllowed&&Number.isSafeInteger(action.amount)&&action.amount>view.bet&&action.amount<=maximum&&(action.amount>=view.bet+view.minRaise||action.amount===maximum))return action;
 throw Error('Illegal simulated bot action');
}
function opponentAction(view,style,random){
 if(style==='incumbent')return decideBot(view,random);
 const call=Math.max(0,view.bet-view.round),quality=preflopQuality(view.hole),max=view.round+view.stack;
 if(style==='station')return {type:call?'call':'check'};
 if(style==='tight'){
  if(call>0&&quality<.67&&call>view.big)return {type:'fold'};
  return decideBot({...view,policyParams:undefined},random);
 }
 if(style==='aggressive'&&view.raiseAllowed&&max>view.bet&&random()<.3)return {type:'raise',amount:Math.min(max,Math.max(view.bet+view.minRaise,Math.round((view.bet+(view.pot+call)*.8)/view.big)*view.big))};
 return decideBot(view,random);
}
// Independent full hands: shuffled cards, rotated positions and fixed starting stacks.
// Decisions receive their own hole cards and public information, never the deck.
export function simulateHand({seed,seats=3,heroSeat=0,policy,incumbent,style='incumbent',samples=64,depth=100,decider,beforeDecision,startingStacks,dealerSeat,big=10,small=big/2,mode='cash',tournament,botStyles=[],tournamentPolicy,tournamentIncumbent,recordTrace=false,scenario,models=[]}={}){
 const recorded=scenario?cleanScenario(scenario):null;if(scenario&&!recorded)throw Error('Invalid recorded scenario');
 if(recorded){({heroSeat,dealerSeat,big,small,mode,tournament}=recorded);seats=recorded.players.length;botStyles=recorded.players.map(p=>p.botStyle);models=recorded.players.map(p=>p.model);}
 if(!Number.isInteger(seats)||seats<2||seats>8)throw Error('Invalid seats');
 const known=recorded?[...recorded.hole,...recorded.board]:[],deckRandom=seededRandom(seed),deck=[...'23456789TJQKA'].flatMap(v=>[...'shdc'].map(s=>v+s)).filter(c=>!known.includes(c));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(deckRandom()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const bank=depth*big,initial=recorded?recorded.players.map(p=>p.chips+p.total):startingStacks||Array(seats).fill(bank);if(initial.length!==seats||initial.some(n=>!Number.isSafeInteger(n)||n<0||!recorded&&n===0)||!Number.isSafeInteger(big)||big<1||!Number.isSafeInteger(small)||small<1)throw Error('Invalid simulation stacks/blinds');
 function unknownHole(i){if(!recorded)return [deck.pop(),deck.pop()];const m=models[i]||{},p=recorded.players[i],vpip=m.hands>=20?Math.max(.12,Math.min(.65,m.vpip/m.hands)):.3,cutoff=p.pfr?.82-vpip*.55:.43;let a,b;
  for(let n=0;n<16;n++){a=Math.floor(deckRandom()*deck.length);b=Math.floor(deckRandom()*(deck.length-1));if(b>=a)b++;if(p.folded||deckRandom()<Math.max(.025,Math.min(1,.38+(preflopQuality([deck[a],deck[b]])-cutoff)*4)))break;}
  const hole=[deck[a],deck[b]];deck.splice(Math.max(a,b),1);deck.splice(Math.min(a,b),1);return hole;}
 const players=Array.from({length:seats},(_,i)=>({...recorded?.players[i],hole:recorded&&i===heroSeat?[...recorded.hole]:unknownHole(i),chips:recorded?recorded.players[i].chips:initial[i],total:recorded?.players[i].total||0,round:recorded?.players[i].round||0,folded:recorded?.players[i].folded||false,acted:recorded?.players[i].acted||false,raiseAllowed:recorded?recorded.players[i].raiseAllowed:true,checked:recorded?.players[i].checked||false,pfr:recorded?.players[i].pfr||false,action:recorded?.players[i].action||'',random:seededRandom((seed^Math.imul(i+1,0x9e3779b9))>>>0)}));
 const dealer=dealerSeat??((seed>>>0)%seats),sb=seats===2?dealer:(dealer+1)%seats,bb=(sb+1)%seats;
 const pay=(p,n)=>{n=Math.min(p.chips,n);p.chips-=n;p.total+=n;p.round+=n;};if(!recorded){pay(players[sb],small);pay(players[bb],big);}
 const decisionTrace=recordTrace?[]:null;
 let board=recorded?[...recorded.board]:[],previousStreetBoard=recorded?[...recorded.previousStreetBoard]:[],bet=recorded?.bet??big,minRaise=recorded?.minRaise??big,raises=recorded?.raises||0,preflopAggressor=recorded?.preflopAggressor??-1,lastAggressor=recorded?.lastAggressor??-1,actions=0;
 const active=()=>players.filter(p=>!p.folded),next=(i,predicate)=>{for(let n=1;n<=seats;n++){const j=(i+n)%seats;if(predicate(players[j]))return j;}return -1;};
 const firstStreet=recorded?({0:0,3:1,4:2,5:3})[board.length]:0;
 for(let street=firstStreet;street<4&&active().length>1;street++){
  if(street&&(!recorded||street!==firstStreet)){previousStreetBoard=[...board];deck.pop();board.push(...Array.from({length:street===1?3:1},()=>deck.pop()));bet=0;minRaise=big;raises=0;for(const p of players){p.round=0;p.acted=false;p.raiseAllowed=true;p.checked=false;p.action='';}}
  let cursor=recorded&&street===firstStreet?(heroSeat+seats-1)%seats:street?dealer:bb;
  while(active().length>1){
   const actionable=players.filter(p=>!p.folded&&p.chips>0);if(!actionable.length)break;
   const index=next(cursor,p=>!p.folded&&p.chips>0&&(!p.acted||p.round<bet));if(index<0)break;
   const p=players[index];if(actionable.length===1&&p.round>=bet)break;
   const opponents=players.filter(q=>q!==p&&!q.folded),order=[];for(let n=1;n<=seats;n++){const j=(dealer+n)%seats;if(!players[j].folded)order.push(j);}
   const ownPosition=order.indexOf(index),view={mode,botStyle:botStyles[index],tournament,tournamentPolicy:index===heroSeat?tournamentPolicy:tournamentIncumbent,hole:[...p.hole],board:[...board],previousStreetBoard:[...previousStreetBoard],opponents:opponents.length,pot:players.reduce((n,q)=>n+Math.min(q.total,p.total+p.chips),0),bet,round:p.round,stack:p.chips,big,minRaise,raiseAllowed:p.raiseAllowed,latePosition:ownPosition>=Math.floor(order.length*2/3),position:ownPosition/Math.max(1,order.length-1),raises,checkedThisStreet:p.checked,opponentRaisedPreflop:opponents.some(q=>q.pfr),opponentsChecked:opponents.every(q=>q.action==='check'),preflopAggressor:preflopAggressor===index,initiative:lastAggressor===index,limpers:opponents.filter(q=>q.action==='call'&&q.round===big).length,effectiveStack:Math.min(p.chips+p.round,Math.max(...opponents.map(q=>q.chips+q.round))),opponentStack:opponents[0]?.chips||0,opponentModels:opponents.map(q=>({...models[players.indexOf(q)],hands:models[players.indexOf(q)]?.hands||0,vpip:models[players.indexOf(q)]?.vpip||0,pfr:models[players.indexOf(q)]?.pfr||0,raisedPreflop:q.pfr,aggressor:players[lastAggressor]===q&&q.round>0})),policyParams:index===heroSeat?policy:incumbent,equitySamples:samples};
   beforeDecision?.();const action=legalAction(view,decider?decider(view,index,p.random):index===heroSeat?decideBot(view,p.random):opponentAction(view,style,p.random));if(decisionTrace)decisionTrace.push(index+':'+street+':'+action.type+':'+(action.amount??''));actions++;if(actions>400)throw Error('Simulation action limit');
   if(action.type==='fold')p.folded=true;
   else if(action.type==='call')pay(p,bet-p.round);
   else if(action.type==='check')p.checked=true;
   else{const before=bet,increase=action.amount-before;pay(p,action.amount-p.round);bet=action.amount;lastAggressor=index;raises++;if(!street){preflopAggressor=index;p.pfr=true;}if(increase>=minRaise){minRaise=increase;for(const q of players)if(q!==p&&!q.folded&&q.chips){q.acted=false;q.raiseAllowed=true;}}}
   p.acted=true;p.raiseAllowed=false;p.action=action.type;cursor=index;
  }
 }
 if(active().length>1)while(board.length<5){deck.pop();board.push(...Array.from({length:board.length===0?3:1},()=>deck.pop()));}
 let paid;if(active().length===1){paid=players.map(p=>p.folded?0:players.reduce((n,q)=>n+q.total,0));}else paid=settlePots(players,board,dealer);
 const balances=players.map((p,i)=>p.chips+paid[i]),rewards=balances.map((n,i)=>(n-initial[i])/big);
 if(balances.reduce((n,v)=>n+v,0)!==initial.reduce((a,b)=>a+b,0)||balances.some(n=>n<0||!Number.isSafeInteger(n)))throw Error('Simulation chips not conserved');
 return {reward:rewards[heroSeat],rewards,balances,board,actions,...(decisionTrace?{decisionTrace:decisionTrace.join(';')}:{})};
}
