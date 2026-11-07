// Public table facts only; player winrate analysis is no longer shown.
window.addEventListener('poker-state',({detail:{state:s}})=>{
 document.getElementById('infoBlinds').textContent='$'+s.small.toLocaleString()+' / $'+s.big.toLocaleString()+(s.mode==='tournament'?' (1BB)':'');
 document.getElementById('infoFormat').textContent=(s.mode==='cash'?'Cash Table':'Tournament')+' · blinds';
});
