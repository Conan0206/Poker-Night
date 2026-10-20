/* Optional browser notifications, enabled only through the player's bell. */
(()=>{
 const bell=document.getElementById('notificationToggle');
 const supported='Notification' in window&&window.isSecureContext;
 let enabled=localStorage.getItem('poker-notifications')==='true',previous;
 bell.innerHTML='<svg class="eyeIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20h4"/></svg>';
 function label(){const active=supported&&enabled&&Notification.permission==='granted';bell.setAttribute('aria-pressed',String(active));bell.setAttribute('aria-label',active?'Disable browser notifications':'Enable browser notifications');bell.title=active?'Browser notifications on':'Notify me about my turn and all-ins';}
 bell.onclick=async()=>{
  if(!supported){notice('Browser notifications are unavailable here.');return;}
  if(enabled&&Notification.permission==='granted')enabled=false;
  else {const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;enabled=permission==='granted';if(!enabled)notice('Allow notifications for Poker Night in your browser site settings.');}
  localStorage.setItem('poker-notifications',String(enabled));label();
 };
 function notify(title,body,tag){if(!enabled||!supported||Notification.permission!=='granted')return;try{const n=new Notification(title,{body,tag});n.onclick=()=>{window.focus();n.close();};setTimeout(()=>n.close(),10000);}catch{}}
 window.addEventListener('poker-state',({detail:{state:s,me}})=>{
  const old=previous;previous=s;if(!old||old.code!==s.code)return;
  const turn=s.players[s.turn];
  if(turn?.id===me&&!s.runningOut&&s.street!=='showdown'&&(s.turn!==old.turn||s.street!==old.street||s.handNumber!==old.handNumber))notify('Poker Night · Your turn','It’s your turn to act at table '+s.code+'.','poker-turn');
  const before=new Map(old.players.map(p=>[p.id,p]));
  for(const p of s.players){const prev=before.get(p.id);if(prev&&prev.chips>0&&p.chips===0&&p.inHand&&!p.folded&&!p.spectating&&s.street!=='showdown')notify('Poker Night · All in',p.name+' is all in!','poker-allin-'+p.id);}
 });label();
})();
