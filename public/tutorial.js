(() => {
 const sit=document.getElementById('sitDown');
 document.querySelector('.headerLeftActions').append(sit);const resetTournament=document.getElementById('resetTournament');if(resetTournament)document.querySelector('.headerLeftActions').append(resetTournament);
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
 const tableSteps=[
  ['#addbot','Add a bot','Use Add bot to fill an open seat for practice. A table supports up to eight seated players.'],
  ['.seat:not(.self) .avatar','Kick a bot','When table management is available, hover a bot avatar and choose Kick, then confirm. On touch screens the Kick control is shown on the avatar.'],
  ['.seat .avatar','Player statistics','Click a player or bot avatar to see VPIP, preflop raises, hands played, and aggression for this table.'],
  ['#soundToggle','Game sound','Use the music icon to mute or unmute game sounds.'],
  ['#notificationToggle','Turn notifications','Enable turn alerts before joining, or use the bell later. Pop-ups appear when you switch tabs or apps. Try Send test notification in Settings → Audio. Your browser may ask for permission.'],
  ['#fullscreen','Fullscreen','Expand the table into fullscreen for more space. Use the same button or Escape to leave fullscreen.'],
  ['[data-panel="collection"]','Customize your table','Choose a table felt and card-back design with the customize button.'],
  ['[data-panel="settings"]','Audio settings','Open Settings → Audio to adjust main audio, sound effects, and emote volume separately. Table settings, language, and recent updates have their own categories.'],
  ['#emoteToggle','Clash Royale emotes','Open the emote bank to send a reaction. Star favourites to put them first; use arrows, dots, or swipe to see more. Spectators can send emotes too.'],
  ['#revealHands','Reveal a hand','Reveal a player’s hand of your choice. Only you can see it.'],
  ['#board','Hand rankings','Hover over the five community-card slots to see the hand rankings and your current hand. Move outside those five slots and the guide disappears immediately. On touch screens, press and hold the cards.'],
  ['#rabbit','Rabbit hunt','After a hand ends before the river, Rabbit appears beside the community cards. Reveal the undealt board to see what might have happened. It does not change the result.']
 ];
 function stepsFor(s){
  const home=['.brand','Back to home','Click the Poker Night logo at the top left to return to the home page.'];
  const intro=['#roomBadge','Bot training','Watch TAG, LAG, FISH and ROCK bots play automatically. This table is watch-only.'];
  const steps=tableSteps.filter(step=>!s.practice||!['#addbot','.seat:not(.self) .avatar','#notificationToggle','#rabbit'].includes(step[0])).filter(step=>s.mode!=='tournament'||step[0]!=='#revealHands').map(step=>[...step]);
  if(s.practice){
   const reveal=steps.find(step=>step[0]==='#revealHands');if(reveal){reveal[1]='Reveal bot hands';reveal[2]='After a hand ends, click Reveal hand to see all bot cards. Reveals are unlimited and visible only to you.';}
   const audio=steps.find(step=>step[0]==='[data-panel="settings"]');if(audio)audio[2]='Adjust sound and language in Settings. Bot training table settings are managed automatically.';
   const rankings=steps.find(step=>step[0]==='#board');if(rankings)rankings[2]='Hover over the five community-card slots to see hand rankings. Move away to hide the guide. On touch screens, press and hold the cards.';
  }
  if(s.mode==='tournament'){const customize=steps.find(step=>step[0]==='[data-panel="collection"]');if(customize)customize[2]='Choose a card-back design. Tournament table felt stays fixed.';}
  return [home,...(s.practice?[intro]:[]),...steps];
 }
 const dialog=document.createElement('dialog');dialog.id='pokerTutorial';dialog.setAttribute('aria-label','Poker Night tutorial');
 const spot=document.createElement('div');spot.className='tutorialSpotlight';spot.setAttribute('aria-hidden','true');
 const card=document.createElement('section');card.className='tutorialCard';
 const preview=document.createElement('div');preview.className='tutorialPreview';preview.setAttribute('aria-hidden','true');
 const progress=document.createElement('small'),title=document.createElement('h2'),text=document.createElement('p'),buttons=document.createElement('div');buttons.className='tutorialButtons';
 const skip=document.createElement('button'),next=document.createElement('button');skip.textContent='Skip tutorial';next.className='primary';buttons.append(skip,next);card.append(progress,title,preview,text,buttons);dialog.append(spot,card);document.body.append(dialog);
 let index=0,previousFocus,starting=false,entryPending=false,tableState={},steps=stepsFor(tableState);
 function position(){
  if(!dialog.open)return;
  document.body.classList.toggle('tutorialCommunityHighlight',steps[index][0]==='#board');dialog.setAttribute('data-home-step',String(steps[index][0]==='.brand'));
  let target=document.querySelector(steps[index][0]);
  const sampleStep=['#rabbit','#revealHands'].includes(steps[index][0]);const targetBox=target?.getBoundingClientRect();const rabbitDemo=sampleStep&&(!target||target.hidden||!target.getClientRects().length||!targetBox?.width||!targetBox?.height||targetBox.bottom<0||targetBox.top>innerHeight);
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
 function renderPreview(){preview.replaceChildren();preview.hidden=true;if(steps[index][0]==='.seat:not(.self) .avatar'){const sample=document.createElement('div');sample.className='tutorialDemoAvatar';const face=document.createElement('span');face.textContent='🤖';const kick=document.createElement('span');kick.className='tutorialDemoKick';kick.textContent='Kick';sample.append(face,kick);preview.append(sample);preview.hidden=false;}else if(steps[index][0]==='#revealHands'){const sample=document.createElement('div');sample.className='tutorialRevealDemo';const button=document.createElement('span');button.className='tutorialRevealButton';button.textContent=tableState.practice?'◉ Reveal hand (∞)':'◉ Reveal hand (3)';const note=document.createElement('small');note.textContent=tableState.practice?'Unlimited bot reveals · only visible to you':'3 reveals available · cash games only';sample.append(button,note);preview.append(sample);preview.hidden=false;}else if(steps[index][0]==='#rabbit'){const sample=document.getElementById('rabbit').cloneNode(true);sample.removeAttribute('id');sample.removeAttribute('hidden');sample.hidden=false;sample.className='tutorialRabbitPreview';sample.setAttribute('tabindex','-1');sample.setAttribute('inert','');preview.append(sample);preview.hidden=false;}}
 function show(){renderPreview();progress.textContent='QUICK TOUR · '+(index+1)+' / '+steps.length;title.textContent=steps[index][1];text.textContent=steps[index][2];next.textContent=index===steps.length-1?'Finish tutorial':'Next';position();next.focus();}
 function finish(){document.body.classList.remove('tutorialCommunityHighlight');localStorage.setItem('poker-tutorial-v1','done');dialog.close();previousFocus?.focus();}
 window.startPokerTutorial=()=>{if(dialog.open)return;previousFocus=document.activeElement;steps=stepsFor(tableState);index=0;dialog.showModal();show();};
 skip.onclick=finish;next.onclick=()=>{if(index===steps.length-1)finish();else{index++;show();}};
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
 function scheduleEntryTutorial(){if(!entryPending||starting)return;starting=true;setTimeout(()=>{starting=false;if(!entryPending)return;if(!document.querySelector('dialog[open]')){entryPending=false;window.startPokerTutorial();}},600);}
 addEventListener('poker-entered',()=>{entryPending=true;scheduleEntryTutorial();});
 addEventListener('poker-state',event=>{
  if(event?.detail?.state)tableState=event.detail.state;
  requestAnimationFrame(()=>{positionReveal();position();});
  scheduleEntryTutorial();
 });
 positionReveal();
})();
