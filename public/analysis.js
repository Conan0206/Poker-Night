const $=id=>document.getElementById(id),worker=new Worker('/equity-worker.js',{type:'module'});let current,key='';
worker.onmessage=({data})=>{if(data.key!==key)return;const pct=Math.round(data.equity*100);$('equityValue').textContent=pct+'%';$('equityFill').style.width=pct+'%';};
window.addEventListener('poker-state',({detail})=>{current=detail;const {state:s,me}=detail,p=s.players.find(p=>p.id===me);$('infoBlinds').textContent='$'+s.small.toLocaleString()+' / $'+s.big.toLocaleString();$('infoFormat').textContent=(s.mode==='cash'?'Cash Table':'Tournament')+' · blinds';
 const opponents=s.players.filter(q=>q.id!==me&&q.inHand&&!q.folded&&!q.spectating).length;
 const valid=p&&!p.spectating&&p.inHand&&!p.folded&&p.cards.length===2&&opponents>0&&s.street!=='showdown';
 if(!valid){key='';$('equityValue').textContent='—';$('equityFill').style.width='0%';$('equityNote').textContent=p?.spectating?'Take a seat to analyse your hand.':p?.folded?'You folded this hand.':s.street==='showdown'?'Hand finished. Next deal coming up.':'Deal a hand to see an estimate.';return;}
 const next=JSON.stringify([s.handNumber,p.cards,s.board,opponents]);if(next===key)return;key=next;$('equityValue').textContent='…';$('equityFill').style.width='0%';$('equityNote').textContent=`vs ${opponents} random ${opponents===1?'hand':'hands'} · approximate, ties shared. Uses your cards + public board.`;worker.postMessage({key,hole:p.cards,board:s.board,opponents});
});
