/* Notifications are a personal choice, requested before the first table entry. */
(()=>{
 const bell=document.getElementById('notificationToggle'),supported='Notification' in window&&window.isSecureContext;
 let enabled=localStorage.getItem('poker-notifications')==='true',chosen=localStorage.getItem('poker-notification-choice')==='true',previous,pendingEntry,finishEntry;
 const help='In Chrome, click the site icon beside the address and allow Notifications. In Windows Settings → System → Notifications → Google Chrome, enable notification banners. Check Do not disturb too.';
 const permission=()=>supported?Notification.permission:'unsupported';
 function save(){localStorage.setItem('poker-notifications',String(enabled));localStorage.setItem('poker-notification-choice',String(chosen));label();}
 function label(){const active=supported&&enabled&&permission()==='granted';bell.setAttribute('aria-pressed',String(active));bell.setAttribute('aria-label',active?'Disable browser notifications':'Enable browser notifications');bell.title=active?'Browser notifications on · test them in Settings → Audio':'Notify me about my turn and all-ins';}
 bell.innerHTML='<svg class="eyeIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20h4"/><path class="bellOffSlash" d="M3 3l18 18"/></svg>';
 async function enable(){
  if(!supported){notice('Browser notifications are unavailable here.');return false;}
  try{const result=permission()==='default'?await Notification.requestPermission():permission();enabled=result==='granted';}catch{enabled=false;}
  chosen=true;save();if(!enabled)notice('Notifications are not enabled. Allow them using the site icon beside the address.');return enabled;
 }
 bell.onclick=async()=>{if(enabled&&permission()==='granted'){enabled=false;chosen=true;save();}else await enable();};
 const prompt=document.createElement('dialog');prompt.id='notificationPrompt';prompt.className='notificationPrompt';prompt.setAttribute('aria-labelledby','notificationPromptTitle');
 const title=document.createElement('h2');title.id='notificationPromptTitle';title.textContent='Enable turn alerts?';
 const text=document.createElement('p');text.textContent='Get a pop-up for your turn and all-ins when you switch tabs or apps.';
 const status=document.createElement('p');status.className='notificationPermissionStatus';status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='notificationPromptActions';
 const later=document.createElement('button');later.type='button';later.textContent='Not now';
 const allow=document.createElement('button');allow.type='button';allow.className='primary';allow.textContent='Enable alerts';
 actions.append(later,allow);prompt.append(title,text,status,actions);document.body.append(prompt);
 function finish(){prompt.close();const resolve=finishEntry;finishEntry=null;pendingEntry=null;resolve?.();}
 later.onclick=()=>{enabled=false;chosen=true;save();finish();};
 allow.onclick=async()=>{allow.disabled=true;later.disabled=true;await enable();later.disabled=false;allow.disabled=false;finish();};
 prompt.addEventListener('cancel',event=>{event.preventDefault();later.onclick();});
 function beforeEnter(){
  if(!supported||enabled&&permission()==='granted'||chosen)return Promise.resolve();
  if(pendingEntry)return pendingEntry;
  status.textContent=permission()==='denied'?'Chrome has blocked notifications. '+help:'You can change this later with the bell. Notifications are optional.';
  allow.disabled=permission()==='denied';later.textContent=permission()==='denied'?'Continue without alerts':'Not now';
  pendingEntry=new Promise(resolve=>finishEntry=resolve);prompt.showModal();return pendingEntry;
 }
 function notify(title,body,tag,force=false){
  if(!force&&!document.hidden&&document.hasFocus()||!enabled||!supported||permission()!=='granted')return false;
  try{const n=new Notification(title,{body,tag});n.onclick=()=>{window.focus();n.close();};n.onerror=()=>notice('The browser could not send the notification. Check Chrome and Windows notification settings.');setTimeout(()=>n.close(),10000);return true;}catch{notice('The browser could not send the notification. Check Chrome and Windows notification settings.');return false;}
 }
 function test(){if(!enabled||permission()!=='granted'){notice('Enable browser notifications first.');return false;}const sent=notify('Poker Night · Test notification','Turn and all-in alerts will appear here while you are away from the table.','poker-test',true);if(sent)notice('Test sent. If no pop-up appears, check Windows notification banners for Chrome and Do not disturb.');return sent;}
 function renderSettings(container){
  const section=document.createElement('section');section.className='notificationSettings';const heading=document.createElement('h3');heading.textContent='Browser notifications';
  const info=document.createElement('p'),buttons=document.createElement('div'),toggle=document.createElement('button'),send=document.createElement('button'),details=document.createElement('details'),summary=document.createElement('summary'),instructions=document.createElement('p');buttons.className='notificationSettingsActions';toggle.type=send.type='button';send.textContent='Send test notification';summary.textContent='No pop-up?';instructions.textContent=help;details.append(summary,instructions);
  function update(){const active=enabled&&permission()==='granted';info.textContent=!supported?'Notifications are unavailable in this browser.':permission()==='denied'?'Blocked by Chrome. Allow notifications using the site icon beside the address.':active?'On · alerts appear when you switch tabs or apps. Test alerts can appear while this page is open.':'Off · enable alerts for your turn and all-ins.';toggle.textContent=active?'Disable notifications':'Enable notifications';toggle.disabled=!supported;send.disabled=!supported||!active;}
  toggle.onclick=async()=>{await bell.onclick();update();};send.onclick=test;buttons.append(toggle,send);section.append(heading,info,buttons,details);container.append(section);update();
 }
 window.pokerNotifications={beforeEnter,test,renderSettings};
 window.addEventListener('focus',label);document.addEventListener('visibilitychange',label);
 window.addEventListener('storage',event=>{if(event.key==='poker-notifications'){enabled=event.newValue==='true';label();}});
 window.addEventListener('poker-state',({detail:{state:s,me}})=>{
  const old=previous;previous=s;if(!old||old.code!==s.code||s.paused)return;
  const turn=s.players[s.turn],oldTurn=old.players[old.turn];
  if(turn?.id===me&&!s.runningOut&&s.street!=='showdown'&&(turn.id!==oldTurn?.id||s.street!==old.street||s.handNumber!==old.handNumber))notify('Poker Night · Your turn','It’s your turn to act at table '+s.code+'.','poker-turn');
  const before=new Map(old.players.map(p=>[p.id,p]));
  for(const p of s.players){const prev=before.get(p.id);if(prev&&prev.chips>0&&p.chips===0&&p.inHand&&!p.folded&&!p.spectating&&s.street!=='showdown')notify('Poker Night · All in',p.name+' is all in!','poker-allin-'+p.id);}
 });label();
})();
