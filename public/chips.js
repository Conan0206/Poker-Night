/* Visual chip transfers follow public wagers and server-settled pot awards. */
(()=>{
 let previous;const wagerPositions=new Map();const layer=document.createElement('div');layer.id='chipLayer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const denominations=[[1000,'#343a43'],[500,'#f1ce26'],[100,'#bd7b21'],[20,'#8252d7'],[5,'#e7465d'],[1,'#45cfe0']];
 const center=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const avatar=id=>center(document.querySelector('.seat[data-id="'+id+'"] .avatar'));
 function stake(id){const placed=wagerPositions.get(id);if(placed)return placed;const el=document.querySelector('.seat[data-id="'+id+'"] .avatar'),a=center(el),c=center(document.querySelector('#table .felt'));if(!a||!c)return null;const seat=el.closest('.seat'),plate=seat.querySelector('.nameplate').getBoundingClientRect();if(seat.dataset.slot==='2'){return {x:plate.right+(innerWidth<=700?35:54),y:a.y};}const dx=c.x-a.x,dy=c.y-a.y,distance=Math.hypot(dx,dy)||1,inset=el.getBoundingClientRect().width/2+(innerWidth<=700?28:45);return {x:a.x+dx/distance*inset,y:a.y+dy/distance*inset};}
 // Anchor wagers a fixed distance inside each avatar; avoid only visible pot badges, not their wide container.
 function placeWager(id,pile,occupied){
  const preferred=stake(id),felt=document.querySelector('#table .felt').getBoundingClientRect();if(!preferred)return null;
  const size=pile.getBoundingClientRect(),w=size.width,h=size.height,pad=9,leftMiddle=document.querySelector('.seat[data-id="'+id+'"]')?.dataset.slot==='2';
  const obstacles=[...document.querySelectorAll('.seat,.seatCards,#myCards,#pot .potBadge,#board,#result,#sitDown,#start,#rabbit')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).concat(occupied);
  const cx=felt.x+felt.width/2,cy=felt.y+felt.height/2,rx=felt.width/2-12,ry=felt.height/2-12;
  let best=null,score=Infinity;
  for(let y=felt.top+h/2+pad;y<felt.bottom-h/2-pad;y+=10)for(let x=felt.left+w/2+pad;x<felt.right-w/2-pad;x+=10){
   if(leftMiddle&&Math.abs(y-preferred.y)>24)continue;
   const rect={left:x-w/2-pad,right:x+w/2+pad,top:y-h/2-pad,bottom:y+h/2+pad};
   if([rect.left,rect.right].some(px=>[rect.top,rect.bottom].some(py=>((px-cx)/rx)**2+((py-cy)/ry)**2>1)))continue;
   if(obstacles.some(r=>rect.left<r.right&&rect.right>r.left&&rect.top<r.bottom&&rect.bottom>r.top))continue;
   const distance=(x-preferred.x)**2+(y-preferred.y)**2;const crowding=occupied.reduce((sum,r)=>{const dx=x-(r.left+r.right)/2,dy=y-(r.top+r.bottom)/2;return sum+Math.max(0,(innerWidth<=700?72:110)-Math.hypot(dx,dy))**2*2;},0);const candidateScore=distance+crowding;if(candidateScore<score){score=candidateScore;best={x,y,rect};}
  }
  if(best){occupied.push(best.rect);wagerPositions.set(id,{x:best.x,y:best.y});return best;}
  return null;
 }
 function stack(amount){const group=document.createElement('span');group.className='tableChipStack';let left=amount,count=0;for(const [value,color] of denominations){const n=Math.min(3,Math.floor(left/value));left%=value;for(let i=0;i<n&&count<7;i++,count++){const chip=document.createElement('i');chip.className='pokerChip';chip.dataset.value=value===1000?'1K':String(value);if(value===500)chip.style.setProperty('--chip-ink','#43350c');chip.style.setProperty('--chip-color',color);chip.style.left=(count%2)*9+'px';chip.style.top=(-Math.floor(count/2)*5)+'px';group.append(chip);}}return group;}
 function fly(amount,from,to,delay=0){if(!from||!to||amount<=0||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=stack(amount);el.classList.add('flyingChips');layer.append(el);const a=el.animate([{transform:`translate(${from.x}px,${from.y}px) scale(.85)`,opacity:0},{opacity:1,offset:.1},{transform:`translate(${to.x}px,${to.y}px) scale(1)`,opacity:1,offset:.85},{transform:`translate(${to.x}px,${to.y}px) scale(.9)`,opacity:0}],{duration:480,delay,fill:'both',easing:'cubic-bezier(.2,.65,.25,1)'});a.onfinish=()=>el.remove();setTimeout(()=>el.remove(),delay+700);}
 function piles(s){layer.querySelectorAll('.betChips').forEach(el=>el.remove());wagerPositions.clear();if(!['preflop','flop','turn','river'].includes(s.street)||s.runningOut)return;const occupied=[];for(const p of s.players){if(!p.inHand||!p.round)continue;const pile=document.createElement('span');pile.className='betChips';const amount=document.createElement('b');amount.textContent='$'+p.round.toLocaleString();const label=document.createElement('small');label.textContent='BET';const text=document.createElement('span');text.className='wagerValue';text.append(label,amount);pile.append(stack(p.round),text);layer.append(pile);pile.dataset.playerId=p.id;const at=placeWager(p.id,pile,occupied);if(at){pile.style.left=at.x+'px';pile.style.top=at.y+'px';}else pile.remove();}}

 function update(s){const old=previous,oldPositions=new Map(wagerPositions);previous=s;piles(s);if(!old||old.code!==s.code)return;
 const same=old.handNumber===s.handNumber,before=new Map(old.players.map(p=>[p.id,p]));const pot=center(document.querySelector('#pot .potAmount'))||center(document.querySelector('#table .felt'));
 let bet=false;for(const p of s.players){const prev=before.get(p.id),paid=same?p.total-(prev?.total||0):p.total;if(paid>0&&p.inHand){fly(paid,avatar(p.id),stake(p.id));bet=true;}}
 if(bet&&!document.hidden)window.pokerEffects?.stack(.05);
 const collect=same&&['preflop','flop','turn','river'].includes(old.street)&&!old.runningOut&&(old.street!==s.street||s.runningOut&&!old.runningOut);
 if(collect){for(const p of old.players){const now=s.players.find(q=>q.id===p.id),amount=p.round+Math.max(0,(now?.total||p.total)-p.total);if(amount>0)fly(amount,oldPositions.get(p.id)||stake(p.id),pot,bet?250:0);}if(!document.hidden)window.pokerEffects?.stack(bet?.65:.4);}
 if(s.street==='showdown'&&old.street!=='showdown'){
  for(const award of s.awards||[]){const origin=center(document.querySelectorAll('#pot .potAmount')[award.potIndex])||pot,delay=(collect?850:200)+award.potIndex*350;for(const winner of award.winners)fly(winner.amount,origin,avatar(winner.id),delay);if(!document.hidden)window.pokerEffects?.stack((delay+420)/1000);}
 }
 }
 window.addEventListener('poker-state',e=>update(e.detail.state));
 addEventListener('resize',()=>{if(previous)requestAnimationFrame(()=>piles(previous));});
 socket.on('disconnect',()=>{previous=null;layer.replaceChildren();});
})();
