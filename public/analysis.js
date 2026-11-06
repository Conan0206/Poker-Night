// Public table facts only; player winrate analysis is no longer shown.
window.addEventListener('poker-state',({detail:{state:s}})=>{
 document.getElementById('infoBlinds').textContent=s.mode==='tournament'?s.small.toLocaleString()+'$/'+s.big.toLocaleString()+'$ (1BB)':'$'+s.small.toLocaleString()+' / $'+s.big.toLocaleString();
 document.getElementById('infoFormat').textContent=(s.mode==='cash'?'Cash Table':'Tournament')+' · blinds';
});
