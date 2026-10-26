(() => {
 const settings=document.querySelector('[data-panel="settings"]');
 const pause=document.createElement('button');pause.id='pauseGame';pause.textContent='Ⅱ Pause';pause.hidden=true;document.body.append(pause);
 pause.onclick=()=>socket.emit('pause');
 function positionPause(){const b=settings.getBoundingClientRect();pause.style.top=(b.bottom+8)+'px';pause.style.left=Math.max(8,Math.min(innerWidth-pause.offsetWidth-8,b.right-pause.offsetWidth))+'px';}
 const info=document.getElementById('tableInfo'),heading=info.querySelector('.eyebrow');
 const tournament=document.createElement('button');tournament.id='tournamentMode';tournament.hidden=true;tournament.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h17l-5-5M21 17H4l5 5"/></svg><span>Tournament</span>';document.body.append(tournament);const tournamentLabel=tournament.querySelector('span');
 function positionTournament(){if(tournament.hidden)return;const b=info.getBoundingClientRect();tournament.style.left=Math.max(8,Math.min(innerWidth-tournament.offsetWidth-8,b.right+12))+'px';tournament.style.top=Math.max(8,Math.min(innerHeight-tournament.offsetHeight-8,b.top+(b.height-tournament.offsetHeight)/2))+'px';}
 const levels=document.createElement('details');levels.id='blindLevels';levels.hidden=true;const summary=document.createElement('summary'),scheduleTitle=document.createElement('span'),countdown=document.createElement('small');summary.append(scheduleTitle,countdown);const schedule=document.createElement('div');schedule.className='blindSchedule';levels.append(summary,schedule);document.getElementById('infoTimer').parentElement.before(levels);let blindState,blindSignature='';
 function updateBlindClock(){if(!blindState||levels.hidden)return;const remaining=window.pokerClock.remaining(blindState.nextBlindAt,blindState.pausedAt);countdown.textContent=(blindState.level||1)>=13?'Maximum blind level':!blindState.nextBlindAt?(blindState.levelMinutes??7)+' minutes per level':remaining<=0?'Increase at next hand':(blindState.paused?'Paused · ':'Next level · ')+Math.floor(remaining/60000)+':'+String(Math.floor(remaining/1000)%60).padStart(2,'0');}setInterval(updateBlindClock,1000);
 function renderBlindLevels(s){blindState=s;levels.hidden=s.mode!=='tournament';if(levels.hidden)return;const current=Math.min(s.level||1,13);scheduleTitle.textContent='Blind levels · Level '+current;const minutes=s.levelMinutes??7;const signature=[current,s.baseSmall,s.baseBig,minutes].join(':');if(signature===blindSignature){updateBlindClock();return;}blindSignature=signature;schedule.replaceChildren();for(let i=0;i<13;i++){const row=document.createElement('div');row.className='blindLevelRow';if(i+1===current){row.classList.add('current');row.setAttribute('aria-current','true');}const label=document.createElement('span'),amount=document.createElement('strong'),time=document.createElement('small');label.textContent='Level '+(i===12?'13+':i+1);amount.textContent='$'+((s.baseSmall||25)*2**i).toLocaleString()+' / $'+((s.baseBig||50)*2**i).toLocaleString();time.textContent=i===12?12*minutes+'+ min':i*minutes+'–'+(i+1)*minutes+' min';row.append(label,amount,time);schedule.append(row);}updateBlindClock();}
 const dialog=document.createElement('dialog');dialog.id='tournamentConfirm';dialog.setAttribute('aria-labelledby','tournamentConfirmTitle');
 const title=document.createElement('h2');title.id='tournamentConfirmTitle';title.textContent='Switch to tournament?';
 const text=document.createElement('p');
 const buttons=document.createElement('div');buttons.className='modeConfirmActions';
 const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
 const confirm=document.createElement('button');confirm.textContent='Switch to tournament';confirm.className='primary';confirm.onclick=()=>{socket.emit('tournament');dialog.close();};buttons.append(cancel,confirm);dialog.append(title,text,buttons);document.body.append(dialog);
 tournament.onclick=()=>{const bank=state.tournamentBank??1000,minutes=state.pendingSettings?.levelMinutes??state.levelMinutes??7;text.textContent='The current hand will finish first. Every seated player and bot starts with '+bank.toLocaleString()+' chips and $25 / $50 blinds. Blind levels last '+minutes+' minutes. Seating closes when play begins, eliminated players spectate, and hand reveals are disabled. This replaces the current cash-game stacks.';dialog.showModal();};
 window.updateTableTools=()=>{
  const self=state?.players.find(p=>p.id===me);tournament.hidden=!self;pause.hidden=!self;pause.disabled=!self||!state.canManage;
  pause.textContent=state?.paused?'▶ Resume':'Ⅱ Pause';pause.setAttribute('aria-pressed',String(!!state?.paused));
  tournament.disabled=!self||self.spectating||state.mode==='tournament'||!!state.pendingMode;
  tournamentLabel.textContent=state.pendingMode?'Next hand':'Tournament';tournament.classList.toggle('modeActive',state.mode==='tournament');document.body.classList.toggle('tournamentTheme',state.mode==='tournament');for(const el of [heading,info.querySelector('.equityHeading'),info.querySelector('.equityTrack'),document.getElementById('equityNote')])el.hidden=state.mode==='tournament';renderBlindLevels(state);
  tournament.title=state.pendingMode?'Tournament starts after this hand':'Switch this table to tournament mode';
  positionPause();positionTournament();
 };
 addEventListener('resize',()=>{positionPause();positionTournament();});window.visualViewport?.addEventListener('resize',()=>{positionPause();positionTournament();});new ResizeObserver(positionTournament).observe(info);
 new ResizeObserver(positionPause).observe(settings);
})();
