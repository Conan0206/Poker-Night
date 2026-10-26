import {chipLeaderboard} from './leaderboard-model.js';

const menu=document.createElement('aside');menu.id='leaderboardMenu';menu.hidden=true;
const panel=document.createElement('section');panel.className='leaderboardPanel';panel.setAttribute('aria-label','Leaderboard');
const title=document.createElement('h3');title.textContent='Leaderboard';
const note=document.createElement('p');note.className='leaderboardNote';
const table=document.createElement('table'),head=document.createElement('thead'),row=document.createElement('tr');
for(const label of ['Rank','Player','Stack','BB']){const th=document.createElement('th');th.scope='col';th.textContent=label;row.append(th);}head.append(row);
const body=document.createElement('tbody');table.append(head,body);panel.append(title,note,table);menu.append(panel);
document.body.append(menu);
addEventListener('poker-state',({detail:{state,me}})=>{
 menu.hidden=state.mode!=='tournament';if(menu.hidden){return;}
 const entries=chipLeaderboard(state.players,state.big);note.textContent='★ Chip leader · BB = $'+state.big.toLocaleString()+' · '+entries.length+' players';body.replaceChildren();
 for(const p of entries){
  const row=document.createElement('tr');if(p.id===me)row.classList.add('leaderboardSelf');
  const rank=document.createElement('td');rank.textContent=String(p.rank);
  const player=document.createElement('td'),name=document.createElement('span');name.textContent=p.avatar+' '+p.name+(p.bot?' · BOT':'');
  if(p.chipLeader){const star=document.createElement('span');star.className='chipLeaderStar';star.textContent='★';star.setAttribute('aria-label','Chip leader');player.append(star);}player.append(name);
  const chips=document.createElement('td');chips.textContent='$'+p.chips.toLocaleString();
  const bb=document.createElement('td');bb.textContent=p.bb>0&&p.bb<.1?'<0.1 BB':p.bb.toLocaleString(undefined,{maximumFractionDigits:1})+' BB';row.append(rank,player,chips,bb);body.append(row);
 }
});
