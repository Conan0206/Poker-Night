(() => {
 const sit=document.getElementById('sitDown');
 document.querySelector('.headerLeftActions').append(sit);
 const reveal=document.getElementById('revealHands'),emote=document.getElementById('emoteToggle');
 function positionReveal(){
  if(reveal.hidden)return;
  const box=emote.getBoundingClientRect(),own=reveal.getBoundingClientRect();
  reveal.style.left=Math.max(8,box.left-own.width-12)+'px';
  reveal.style.top=(box.top+(box.height-own.height)/2)+'px';
 }
 new ResizeObserver(positionReveal).observe(emote);
 new ResizeObserver(positionReveal).observe(reveal);
 addEventListener('resize',positionReveal);
 window.visualViewport?.addEventListener('resize',positionReveal);
 const steps=[
  ['#addbot','Add a bot','Use Add bot to fill an open seat for practice. A table supports up to eight seated players.'],
  ['.seat:not(.self) .avatar','Kick a bot','When table management is available, hover a bot avatar and choose Kick, then confirm. On touch screens the Kick control is shown on the avatar.'],
  ['.seat .avatar','Player statistics','Click a player or bot avatar to see VPIP, preflop raises, hands played, and aggression for this table.'],
  ['#soundToggle','Game sound','Use the music icon to mute or unmute game sounds.'],
  ['#notificationToggle','Turn notifications','Use the bell to enable browser notifications for your turn and all-ins. Popups appear only while you are away from this tab. Your browser may ask for permission.'],
  ['#fullscreen','Fullscreen','Expand the table into fullscreen for more space. Use the same button or Escape to leave fullscreen.'],
  ['[data-panel="collection"]','Customize your table','Choose a table felt and card-back design with the customize button.'],
  ['[data-panel="settings"]','Audio settings','Open Settings → Audio to adjust main audio, sound effects, and emote volume separately. Table settings, feedback, and recent updates have their own categories.'],
  ['#emoteToggle','Clash Royale emotes','Open the emote bank to send a reaction. Star favourites to put them first; use arrows, dots, or swipe to see more. Spectators can send emotes too.'],
  ['#revealHands','Reveal a hand','In cash games, the number in brackets is your remaining reveals. Hand reveals are disabled in tournaments. After a hand ends, choose a player or bot to reveal their cards. The button turns grey at zero. Change the allowance in Table settings.'],
  ['#board','Hand rankings','Hover over the five community-card slots to see the hand rankings and your current hand. Move outside those five slots and the guide disappears immediately. On touch screens, press and hold the cards.'],
  ['#rabbit','Rabbit hunt','After a hand ends before the river, Rabbit appears beside the community cards. Reveal the undealt board to see what might have happened. It does not change the result.']
 ];
 const dialog=document.createElement('dialog');dialog.id='pokerTutorial';dialog.setAttribute('aria-label','Poker Night tutorial');
 const spot=document.createElement('div');spot.className='tutorialSpotlight';spot.setAttribute('aria-hidden','true');
 const card=document.createElement('section');card.className='tutorialCard';
 const preview=document.createElement('div');preview.className='tutorialPreview';preview.setAttribute('aria-hidden','true');
 const progress=document.createElement('small'),title=document.createElement('h2'),text=document.createElement('p'),buttons=document.createElement('div');buttons.className='tutorialButtons';
 const skip=document.createElement('button'),next=document.createElement('button');skip.textContent='Skip tutorial';next.className='primary';buttons.append(skip,next);card.append(progress,title,preview,text,buttons);dialog.append(spot,card);document.body.append(dialog);
 let index=0,previousFocus,starting=false,entryPending=false;
 function position(){
  if(!dialog.open)return;
  let target=document.querySelector(steps[index][0]);
  const rabbitDemo=steps[index][0]==='#rabbit'&&(!target||target.hidden||!target.getClientRects().length);
  spot.hidden=rabbitDemo;dialog.setAttribute('data-preview-only',String(rabbitDemo));
  if(rabbitDemo){card.style.left=Math.max(12,(innerWidth-card.offsetWidth)/2)+'px';card.style.top=Math.max(12,(innerHeight-card.offsetHeight)/2)+'px';return;}
  if(!target||!target.getClientRects().length)target=document.getElementById('board');
  const b=target.getBoundingClientRect(),padding=6;
  Object.assign(spot.style,{left:(b.left-padding)+'px',top:(b.top-padding)+'px',width:(b.width+padding*2)+'px',height:(b.height+padding*2)+'px'});
  const w=card.offsetWidth,h=card.offsetHeight;
  let x=b.left+w>innerWidth-12?b.right-w:b.left,y=b.bottom+18;
  if(y+h>innerHeight-12)y=b.top-h-18;
  // Small screens keep the explanation inside the viewport.
  x=Math.max(12,Math.min(innerWidth-w-12,x));y=Math.max(12,Math.min(innerHeight-h-12,y));
  card.style.left=x+'px';card.style.top=y+'px';
 }
 function renderPreview(){preview.replaceChildren();preview.hidden=true;if(index===1){const sample=document.createElement('div');sample.className='tutorialDemoAvatar';const face=document.createElement('span');face.textContent='🤖';const kick=document.createElement('span');kick.className='tutorialDemoKick';kick.textContent='Kick';sample.append(face,kick);preview.append(sample);preview.hidden=false;}else if(steps[index][0]==='#rabbit'){const sample=document.getElementById('rabbit').cloneNode(true);sample.removeAttribute('id');sample.removeAttribute('hidden');sample.hidden=false;sample.className='tutorialRabbitPreview';sample.setAttribute('tabindex','-1');sample.setAttribute('inert','');preview.append(sample);preview.hidden=false;}}
 function show(){renderPreview();progress.textContent='QUICK TOUR · '+(index+1)+' / '+steps.length;title.textContent=steps[index][1];text.textContent=steps[index][2];next.textContent=index===steps.length-1?'Finish tutorial':'Next';position();next.focus();}
 function finish(){localStorage.setItem('poker-tutorial-v1','done');dialog.close();previousFocus?.focus();}
 window.startPokerTutorial=()=>{if(dialog.open)return;previousFocus=document.activeElement;index=0;dialog.showModal();show();};
 skip.onclick=finish;next.onclick=()=>{if(index===steps.length-1)finish();else{index++;show();}};
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
 function scheduleEntryTutorial(){if(!entryPending||starting)return;starting=true;setTimeout(()=>{starting=false;if(!entryPending)return;if(!document.querySelector('dialog[open]')){entryPending=false;window.startPokerTutorial();}},600);}
 addEventListener('poker-entered',()=>{entryPending=true;scheduleEntryTutorial();});
 addEventListener('poker-state',()=>{
  requestAnimationFrame(()=>{positionReveal();position();});
  scheduleEntryTutorial();
 });
 positionReveal();
})();
