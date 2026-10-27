(()=>{
 window.formatPokerHistory=h=>h.mode==='tournament'?h.message.replace(/\$(\d[\d,]*)/g,(match,n)=>match+' ('+(Number(n.replaceAll(',',''))/h.big).toLocaleString(undefined,{maximumFractionDigits:1})+' BB)'):h.message;
 window.renderPokerHistory=(body,s)=>{const history=s?.handHistory||[];if(!history.length){for(const h of s?.history||[]){const row=document.createElement('p');row.textContent=h;body.append(row);}if(!s?.history?.length)body.textContent='Your completed hands will appear here.';return;}
 let group='';for(const h of history){const key=h.mode+':'+h.level+':'+h.small+':'+h.big;if(key!==group){group=key;const heading=document.createElement('h3');heading.className='historyLevelDivider';heading.textContent=h.mode==='tournament'?'Level '+Math.min(h.level,13)+' · $'+h.small+' ('+(h.small/h.big).toLocaleString(undefined,{maximumFractionDigits:1})+' BB) / $'+h.big+' (1 BB)':'Cash · $'+h.small+' / $'+h.big;body.append(heading);}const row=document.createElement('p');row.className='historyHand';row.textContent=window.formatPokerHistory(h);body.append(row);}
 };
})();
