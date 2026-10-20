/* Visual chip transfers follow public wagers and server-settled pot awards. */
(()=>{
 let previous;const layer=document.createElement('div');layer.id='chipLayer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const denominations=[[1000,'#343a43'],[500,'#f1ce26'],[100,'#bd7b21'],[20,'#8252d7'],[5,'#e7465d'],[1,'#45cfe0']];
 const center=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const avatar=id=>center(document.querySelector('.seat[data-id="'+id+'"] .avatar'));
 function stake(id){const a=avatar(id),c=center(document.querySelector('#table .felt'));return a&&c?{x:a.x+(c.x-a.x)*.28,y:a.y+(c.y-a.y)*.28}:null;}
 function stack(amount){const group=document.createElement('span');group.className='tableChipStack';let left=amount,count=0;for(const [value,color] of denominations){const n=Math.min(3,Math.floor(left/value));left%=value;for(let i=0;i<n&&count<7;i++,count++){const chip=document.createElement('i');chip.className='pokerChip';chip.style.setProperty('--chip-color',color);chip.style.left=(count%2)*7+'px';chip.style.top=(-Math.floor(count/2)*4)+'px';group.append(chip);}}return group;}
 function fly(amount,from,to,delay=0){if(!from||!to||amount<=0||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=stack(amount);el.classList.add('flyingChips');layer.append(el);const a=el.animate([{transform:`translate(${from.x}px,${from.y}px) scale(.85)`,opacity:0},{opacity:1,offset:.1},{transform:`translate(${to.x}px,${to.y}px) scale(1)`,opacity:1,offset:.85},{transform:`translate(${to.x}px,${to.y}px) scale(.9)`,opacity:0}],{duration:480,delay,fill:'both',easing:'cubic-bezier(.2,.65,.25,1)'});a.onfinish=()=>el.remove();setTimeout(()=>el.remove(),delay+700);}
 function piles(s){layer.querySelectorAll('.betChips').forEach(el=>el.remove());if(!['preflop','flop','turn','river'].includes(s.street)||s.runningOut)return;for(const p of s.players){if(!p.inHand||!p.round)continue;const at=stake(p.id);if(!at)continue;const pile=document.createElement('span');pile.className='betChips';pile.style.left=at.x+'px';pile.style.top=at.y+'px';const amount=document.createElement('b');amount.textContent='$'+p.round.toLocaleString();pile.append(stack(p.round),amount);layer.append(pile);}}
 function update(s){const old=previous;previous=s;piles(s);if(!old||old.code!==s.code)return;
 const same=old.handNumber===s.handNumber,before=new Map(old.players.map(p=>[p.id,p]));const pot=center(document.querySelector('#pot .potAmount'))||center(document.querySelector('#table .felt'));
 let bet=false;for(const p of s.players){const prev=before.get(p.id),paid=same?p.total-(prev?.total||0):p.total;if(paid>0&&p.inHand){fly(paid,avatar(p.id),stake(p.id));bet=true;}}
 if(bet&&!document.hidden)window.pokerEffects?.stack(.05);
 const collect=same&&['preflop','flop','turn','river'].includes(old.street)&&!old.runningOut&&(old.street!==s.street||s.runningOut&&!old.runningOut);
 if(collect){for(const p of old.players){const now=s.players.find(q=>q.id===p.id),amount=p.round+Math.max(0,(now?.total||p.total)-p.total);if(amount>0)fly(amount,stake(p.id),pot,bet?250:0);}if(!document.hidden)window.pokerEffects?.stack(bet?.65:.4);}
 if(s.street==='showdown'&&old.street!=='showdown'){
  for(const award of s.awards||[]){const origin=center(document.querySelectorAll('#pot .potAmount')[award.potIndex])||pot,delay=(collect?850:200)+award.potIndex*350;for(const winner of award.winners)fly(winner.amount,origin,avatar(winner.id),delay);if(!document.hidden)window.pokerEffects?.stack((delay+420)/1000);}
 }
 }
 window.addEventListener('poker-state',e=>update(e.detail.state));
 addEventListener('resize',()=>{if(previous)requestAnimationFrame(()=>piles(previous));});
 socket.on('disconnect',()=>{previous=null;layer.replaceChildren();});
})();
