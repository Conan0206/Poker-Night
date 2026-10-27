(()=>{
 window.pokerPayoutPlan=s=>{const pots=(s.pots||[]).filter(p=>p.kind!=='uncalled'),groups=new Map();for(const a of s.awards||[]){const index=a.displayPotIndex??a.potIndex;if(!pots[index])continue;if(!groups.has(index))groups.set(index,{index,amount:pots[index].amount,winners:[]});const group=groups.get(index);for(const w of a.winners){let winner=group.winners.find(p=>p.id===w.id);if(!winner){winner={id:w.id,amount:0};group.winners.push(winner);}winner.amount+=w.amount;}}
 return [...groups.values()].sort((a,b)=>a.index===0?1:b.index===0?-1:b.index-a.index);};
 window.animatePokerPotCounts=(s,plan,initialDelay)=>{const key=s.code+':'+s.handNumber,duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:500,start=performance.now()+initialDelay;
 const payout={key,remaining:(s.pots||[]).filter(p=>p.kind!=='uncalled').map(p=>p.amount)};window.pokerPotPayout=payout;
 function frame(now){if(window.pokerPotPayout!==payout)return;let pending=false;plan.forEach((pot,i)=>{const elapsed=now-start-i*650;if(elapsed<0){pending=true;return;}const progress=duration?Math.min(1,elapsed/duration):1;if(progress<1)pending=true;const amount=Math.max(0,Math.round(pot.amount*(1-progress)));payout.remaining[pot.index]=amount;const el=document.querySelector('#pot [data-pot-index="'+pot.index+'"] strong');if(el){el.textContent='$'+amount.toLocaleString();appendTournamentBB(el,amount,s);el.closest('.potBadge').classList.toggle('payingOut',progress<1);}});if(pending)requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
 };
})();
