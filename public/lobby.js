(()=>{
 const welcome=document.getElementById('welcome'),list=document.getElementById('liveTableList'),status=document.getElementById('liveTableStatus');
 let timer,busy=false,last='';
 function render(tables){
  const signature=JSON.stringify(tables);if(signature===last)return;last=signature;list.replaceChildren();
  for(const table of tables){
   const row=document.createElement('div'),icon=document.createElement('span'),info=document.createElement('div'),name=document.createElement('strong'),details=document.createElement('small'),button=document.createElement('button');
   row.className='liveTableRow'+(table.practice?' arenaRow':'');icon.className='liveTableIcon';icon.textContent=table.practice?'🤖':table.private?'🔒':table.mode==='tournament'?'🏆':'♠';icon.setAttribute('aria-hidden','true');
   name.textContent=table.name;details.textContent=`${table.mode==='tournament'?'Tournament':table.practice?'Bot training':table.bankroll?'Cash':'Custom'} · ${table.players}/8 seated · ${table.watching} watching${table.playing?' · Playing':''}`;
   button.type='button';button.textContent=table.private?'Enter code':'Watch';button.setAttribute('aria-label',`${table.private?'Enter code for':'Watch'} ${table.name}`);
   button.onclick=()=>{if(table.private){document.getElementById('code').focus();status.textContent='Private tables need an invite code from the host.';}else window.joinDirectoryTable(table.code);};
   info.append(name,details);row.append(icon,info,button);list.append(row);
  }
 }
 async function refresh(){
  clearTimeout(timer);if(!welcome.open||document.hidden||busy)return;
  busy=true;try{const response=await fetch('/api/tables',{signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error();const data=await response.json();render(data.tables);status.textContent='Private tables stay invite-only. List refreshes automatically.';}catch{status.textContent='Table list unavailable. Retrying shortly…';}finally{busy=false;if(welcome.open&&!document.hidden)timer=setTimeout(refresh,8000);}
 }
 new MutationObserver(refresh).observe(welcome,{attributes:true,attributeFilter:['open']});document.addEventListener('visibilitychange',refresh);refresh();
 addEventListener('poker-state',event=>document.body.classList.toggle('watchingArena',!!event.detail.state.practice));
})();
