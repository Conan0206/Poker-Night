import {handRankings,currentHandRank} from './hand-rankings-data.js';
const board=document.getElementById('board');
const panel=document.createElement('aside');panel.id='handRankings';panel.hidden=true;
panel.setAttribute('aria-label','Hand rankings');
const heading=document.createElement('div');heading.className='rankHeading';
const title=document.createElement('h2');title.textContent='Hand rankings';
heading.append(title);
const summary=document.createElement('p');summary.className='rankSummary';summary.textContent='Deal a hand to see your rank.';summary.setAttribute('aria-live','polite');
const list=document.createElement('ol');list.className='rankList';
const suits={s:'♠',h:'♥',d:'♦',c:'♣'};
const rows=new Map();
for(const rank of handRankings){
 const row=document.createElement('li');row.dataset.rank=rank.id;
 const examples=document.createElement('span');examples.className='rankCards';examples.setAttribute('aria-hidden','true');
 rank.cards.forEach((card,i)=>{const tile=document.createElement('span');tile.className='rankCard'+('hd'.includes(card[1])?' redSuit':'')+(i>=rank.used?' kicker':'');const value=document.createElement('span');value.textContent=card[0]==='T'?'10':card[0];const suit=document.createElement('b');suit.textContent=suits[card[1]];tile.append(value,suit);examples.append(tile);});
 const text=document.createElement('span');text.className='rankText';const name=document.createElement('strong');name.textContent=rank.name;const description=document.createElement('small');description.textContent=rank.description;text.append(name,description);row.append(examples,text);list.append(row);rows.set(rank.id,row);
}
panel.append(heading,summary,list);document.body.append(panel);
board.tabIndex=0;board.setAttribute('role','group');board.setAttribute('aria-label','Community cards · hover for hand rankings');board.setAttribute('aria-controls',panel.id);board.setAttribute('aria-expanded','false');
function show(){panel.hidden=false;board.setAttribute('aria-expanded','true');}
function hide(){panel.hidden=true;board.setAttribute('aria-expanded','false');}
board.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show();});
board.addEventListener('pointerleave',hide);board.addEventListener('pointercancel',hide);
board.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')show();});board.addEventListener('pointerup',e=>{if(e.pointerType==='touch')hide();});
board.addEventListener('focus',()=>{if(board.matches(':focus-visible'))show();});board.addEventListener('blur',hide);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
window.addEventListener('poker-state',({detail:{state,me}})=>{
 const player=state.players.find(p=>p.id===me);
 const valid=player&&!player.spectating&&player.inHand&&state.street!=='waiting';
 const id=valid?currentHandRank(player.cards,state.rabbitBoard?.length?state.rabbitBoard:state.board):null;
 for(const [key,row] of rows){row.classList.toggle('matched',key===id);if(key===id)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');}
 const name=handRankings.find(r=>r.id===id)?.name;
 summary.textContent=name?`${player.folded?'Your folded hand':'Your hand'}: ${name}${state.board.length?'':' · preflop'}`:player?.spectating?'Take a seat to see your hand rank.':'Deal a hand to see your rank.';
});
window.dispatchEvent(new Event('poker-state-request'));
