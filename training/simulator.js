import {decideBot} from '../bot-strategy.js';
import {preflopQuality} from '../bot-ranges.js';
import {rank} from '../public/equity.js';
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
export function simulateHand({seed,seats=3,heroSeat=0,policy,incumbent,style='incumbent',samples=64,depth=100,decider}={}){
 if(!Number.isInteger(seats)||seats<2||seats>8)throw Error('Invalid seats');
 const deckRandom=seededRandom(seed),deck=[...'23456789TJQKA'].flatMap(v=>[...'shdc'].map(s=>v+s));
 for(let i=51;i>0;i--){const j=Math.floor(deckRandom()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const bank=depth*10,players=Array.from({length:seats},(_,i)=>({hole:[deck.pop(),deck.pop()],chips:bank,total:0,round:0,folded:false,acted:false,raiseAllowed:true,checked:false,pfr:false,action:'',random:seededRandom((seed^Math.imul(i+1,0x9e3779b9))>>>0)}));
 const dealer=(seed>>>0)%seats,sb=seats===2?dealer:(dealer+1)%seats,bb=(sb+1)%seats;
 const pay=(p,n)=>{n=Math.min(p.chips,n);p.chips-=n;p.total+=n;p.round+=n;};pay(players[sb],5);pay(players[bb],10);
 let board=[],previousStreetBoard=[],bet=10,minRaise=10,raises=0,preflopAggressor=-1,lastAggressor=-1,actions=0;
 const active=()=>players.filter(p=>!p.folded),next=(i,predicate)=>{for(let n=1;n<=seats;n++){const j=(i+n)%seats;if(predicate(players[j]))return j;}return -1;};
 for(let street=0;street<4&&active().length>1;street++){
  if(street){previousStreetBoard=[...board];deck.pop();board.push(...Array.from({length:street===1?3:1},()=>deck.pop()));bet=0;minRaise=10;raises=0;for(const p of players){p.round=0;p.acted=false;p.raiseAllowed=true;p.checked=false;p.action='';}}
  let cursor=street?dealer:bb;
  while(active().length>1){
   const actionable=players.filter(p=>!p.folded&&p.chips>0);if(!actionable.length)break;
   const index=next(cursor,p=>!p.folded&&p.chips>0&&(!p.acted||p.round<bet));if(index<0)break;
   const p=players[index];if(actionable.length===1&&p.round>=bet)break;
   const opponents=players.filter(q=>q!==p&&!q.folded),order=[];for(let n=1;n<=seats;n++){const j=(dealer+n)%seats;if(!players[j].folded)order.push(j);}
   const ownPosition=order.indexOf(index),view={hole:[...p.hole],board:[...board],previousStreetBoard:[...previousStreetBoard],opponents:opponents.length,pot:players.reduce((n,q)=>n+Math.min(q.total,p.total+p.chips),0),bet,round:p.round,stack:p.chips,big:10,minRaise,raiseAllowed:p.raiseAllowed,latePosition:ownPosition>=Math.floor(order.length*2/3),position:ownPosition/Math.max(1,order.length-1),raises,checkedThisStreet:p.checked,opponentRaisedPreflop:opponents.some(q=>q.pfr),opponentsChecked:opponents.every(q=>q.action==='check'),preflopAggressor:preflopAggressor===index,initiative:lastAggressor===index,limpers:opponents.filter(q=>q.action==='call'&&q.round===10).length,effectiveStack:Math.min(p.chips+p.round,Math.max(...opponents.map(q=>q.chips+q.round))),opponentStack:opponents[0]?.chips||0,opponentModels:opponents.map(q=>({hands:0,vpip:0,pfr:0,raisedPreflop:q.pfr,aggressor:players[lastAggressor]===q&&q.round>0})),policyParams:index===heroSeat?policy:incumbent,equitySamples:samples};
   const action=legalAction(view,decider?decider(view,index,p.random):index===heroSeat?decideBot(view,p.random):opponentAction(view,style,p.random));actions++;if(actions>400)throw Error('Simulation action limit');
   if(action.type==='fold')p.folded=true;
   else if(action.type==='call')pay(p,bet-p.round);
   else if(action.type==='check')p.checked=true;
   else{const before=bet,increase=action.amount-before;pay(p,action.amount-p.round);bet=action.amount;lastAggressor=index;raises++;if(!street){preflopAggressor=index;p.pfr=true;}if(increase>=minRaise){minRaise=increase;for(const q of players)if(q!==p&&!q.folded&&q.chips){q.acted=false;q.raiseAllowed=true;}}}
   p.acted=true;p.raiseAllowed=false;p.action=action.type;cursor=index;
  }
 }
 if(active().length>1)while(board.length<5){deck.pop();board.push(...Array.from({length:board.length===0?3:1},()=>deck.pop()));}
 let paid;if(active().length===1){paid=players.map(p=>p.folded?0:players.reduce((n,q)=>n+q.total,0));}else paid=settlePots(players,board,dealer);
 const balances=players.map((p,i)=>p.chips+paid[i]),rewards=balances.map(n=>(n-bank)/10);
 if(balances.reduce((n,v)=>n+v,0)!==bank*seats||balances.some(n=>n<0||!Number.isSafeInteger(n)))throw Error('Simulation chips not conserved');
 return {reward:rewards[heroSeat],rewards,balances,board,actions};
}
