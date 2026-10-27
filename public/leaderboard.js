import {chipLeaderboard,eliminationLeaderboard} from './leaderboard-model.js';

const menu=document.createElement('details');menu.id='leaderboardMenu';menu.hidden=true;
const toggle=document.createElement('summary');toggle.setAttribute('aria-label','Leaderboard');toggle.title='Leaderboard';toggle.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 29V17h8v12M11 29V11h10v18M21 29V21h8v8M2 29h28"/><path class="podiumStar" d="m16 2 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.5-3 1.5.6-3.2-2.4-2.3 3.3-.5Z"/></svg>';
const panel=document.createElement('section');panel.className='leaderboardPanel';panel.setAttribute('aria-label','Leaderboard');
const title=document.createElement('h3');title.textContent='Leaderboard';
const note=document.createElement('p');note.className='leaderboardNote';
const table=document.createElement('table'),head=document.createElement('thead'),row=document.createElement('tr');
for(const label of ['Rank','Player','Stack','BB']){const th=document.createElement('th');th.scope='col';th.textContent=label;row.append(th);}head.append(row);
const body=document.createElement('tbody');table.append(head,body);panel.append(title,note,table);const eliminationTitle=document.createElement('h3');eliminationTitle.className='eliminationTitle';eliminationTitle.textContent='🔥 Most eliminations';
const eliminationNote=document.createElement('p');eliminationNote.className='leaderboardNote';eliminationNote.textContent='This tournament · tied pot knockouts share credit';
const eliminationTable=document.createElement('table'),eliminationHead=document.createElement('thead'),eliminationRow=document.createElement('tr'),eliminationBody=document.createElement('tbody');
for(const label of ['Rank','Player','Eliminations']){const th=document.createElement('th');th.textContent=label;th.scope='col';eliminationRow.append(th);}eliminationHead.append(eliminationRow);eliminationTable.append(eliminationHead,eliminationBody);panel.append(eliminationTitle,eliminationNote,eliminationTable);const chipColumn=document.createElement('div'),eliminationColumn=document.createElement('div');chipColumn.className=eliminationColumn.className='leaderboardColumn';chipColumn.append(title,note,table);eliminationColumn.append(eliminationTitle,eliminationNote,eliminationTable);panel.replaceChildren(chipColumn,eliminationColumn);menu.append(toggle,panel);
document.querySelector('[data-panel="history"]').before(menu);
addEventListener('poker-state',({detail:{state,me}})=>{
 menu.hidden=state.mode!=='tournament';if(menu.hidden){menu.open=false;return;}
 eliminationBody.replaceChildren();for(const p of eliminationLeaderboard(state.players)){const row=document.createElement('tr');if(p.id===me)row.className='leaderboardSelf';for(const value of [p.rank,(p.eliminationLeader?'🔥 ':'')+p.avatar+' '+p.name+(p.bot?' · BOT':''),p.eliminations.toLocaleString(undefined,{maximumFractionDigits:2})]){const td=document.createElement('td');td.textContent=String(value);row.append(td);}eliminationBody.append(row);}
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

menu.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')menu.open=true;});
menu.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!menu.contains(document.activeElement))menu.open=false;});
menu.addEventListener('focusout',e=>{if(!menu.contains(e.relatedTarget))menu.open=false;});
menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;toggle.focus();}});
document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false;});

function fitStandings(){if(!menu.open)return;const available=Math.max(100,innerHeight-toggle.getBoundingClientRect().bottom-16);const scale=Math.min(1,available/panel.offsetHeight);panel.style.zoom=String(Math.floor(scale*1000)/1000);}
menu.addEventListener('toggle',fitStandings);new ResizeObserver(fitStandings).observe(panel);addEventListener('resize',fitStandings);
