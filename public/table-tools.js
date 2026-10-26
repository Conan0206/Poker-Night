(() => {
 const settings=document.querySelector('[data-panel="settings"]');
 const pause=document.createElement('button');pause.id='pauseGame';pause.textContent='Ⅱ Pause';pause.hidden=true;document.body.append(pause);
 pause.onclick=()=>socket.emit('pause');
 function positionPause(){const b=settings.getBoundingClientRect();pause.style.top=(b.bottom+8)+'px';pause.style.left=Math.max(8,Math.min(innerWidth-pause.offsetWidth-8,b.right-pause.offsetWidth))+'px';}
 const info=document.getElementById('tableInfo'),heading=info.querySelector('.eyebrow'),row=document.createElement('div');row.className='analysisTitleRow';heading.before(row);row.append(heading);
 const tournament=document.createElement('button');tournament.id='tournamentMode';tournament.textContent='♛ Tournament';row.append(tournament);
 const dialog=document.createElement('dialog');dialog.id='tournamentConfirm';dialog.setAttribute('aria-labelledby','tournamentConfirmTitle');
 const title=document.createElement('h2');title.id='tournamentConfirmTitle';title.textContent='Switch to tournament?';
 const text=document.createElement('p');text.textContent='The current hand will finish first. Every seated player and bot starts the tournament with 5,000 chips and $25 / $50 blinds. Blinds rise every 10 minutes. Seating then closes, and eliminated players spectate. This replaces the current cash-game stacks.';
 const buttons=document.createElement('div');buttons.className='modeConfirmActions';
 const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
 const confirm=document.createElement('button');confirm.textContent='Switch to tournament';confirm.className='primary';confirm.onclick=()=>{socket.emit('tournament');dialog.close();};buttons.append(cancel,confirm);dialog.append(title,text,buttons);document.body.append(dialog);
 tournament.onclick=()=>dialog.showModal();
 window.updateTableTools=()=>{
  const self=state?.players.find(p=>p.id===me);pause.hidden=!self;pause.disabled=!self||!state.canManage;
  pause.textContent=state?.paused?'▶ Resume':'Ⅱ Pause';pause.setAttribute('aria-pressed',String(!!state?.paused));
  tournament.disabled=!self||self.spectating||state.mode==='tournament'||!!state.pendingMode;
  tournament.textContent=state.mode==='tournament'?'♛ Tournament':state.pendingMode?'♛ Next hand':'♛ Tournament';
  tournament.title=state.pendingMode?'Tournament starts after this hand':'Switch this table to tournament mode';
  positionPause();
 };
 addEventListener('resize',positionPause);window.visualViewport?.addEventListener('resize',positionPause);
 new ResizeObserver(positionPause).observe(settings);
})();
