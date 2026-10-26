window.renderSettingsCommunity=(body,socket,category)=>{
 const section=document.createElement('section');section.className='settingsCommunity';
 const updates=document.createElement('details');
 const title=document.createElement('summary');title.textContent='What’s new · Recent improvements';updates.append(title);
 const date=document.createElement('p');date.className='fine';date.textContent='Latest update · 26 October 2026';updates.append(date);
 const list=document.createElement('ul');list.className='updateList';
 for(const text of [
  'Shared pause: any seated player can pause or resume the clocks, bots, board runout, and next deal.',
  'Switch to tournament beside Live Hand Analysis: confirm a fresh 5,000-chip tournament after the current hand.',
  'All-in music: the opening 32 seconds of Frontend Theme loops until the next valid action or the hand ends.',
  'Guided tutorial: learn the controls, bots, statistics, emotes, reveals, and Rabbit. Replay it from settings.',
  'Corner controls: Reveal hand sits to the left of emotes, and Sit down is in the top-left toolbar, clear of player cards.',
  'Reveal hand button: choose a player or bot after a hand ends. Remaining uses appear on the button; the allowance is adjustable in settings.',
  'Returning from spectate: choose to reset your chips to the starting amount or keep your previous stack.',
  'Chip guide: hover the top-right chip icon for coloured chips and their values.',
  'Player statistics: click any player or bot avatar to see their statistics.',
  'Next-hand countdown: synchronized with server time and pauses briefly at 0 seconds before dealing.',
  'Bot practice: range-aware decisions, human-paced thinking, and a bounded heads-up postflop CFR solver. Preflop and multiway play use heuristics.',
  'Smoother card dealing, clearer wager positions, chip collection animations, and distinct payout sounds.',
  'Spectator emotes: rapid reactions with up to 10 displayed in two columns and five rows. Favourite emotes appear first.',
  'Turn alerts, optional background-tab notifications, chat unread counts, and separate audio volume controls.',
  'Hand-ranking guide, winning-card highlights, rabbit hunt beside the community cards, and improved table spacing.',
  'Full main tables open in spectate mode. Busted players move to spectate after the hand finishes.',
  'Settings categories: Audio, Table settings, Send feedback, and Recent updates each have their own section.',
  'Feedback: send suggestions and report problems directly from settings.'
 ]){const li=document.createElement('li');li.textContent=text;list.append(li);}updates.append(list);
 const feedback=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Write feedback';feedback.append(summary);
 const intro=document.createElement('p');intro.className='fine';intro.textContent='Suggest an improvement or report a problem. Your table name and feedback are emailed to the game owner through FormSubmit. A backup is saved in server logs.';feedback.append(intro);
 const form=document.createElement('form'),kindLabel=document.createElement('label'),kind=document.createElement('select');kindLabel.textContent='Feedback type';kind.setAttribute('aria-label','Feedback type');
 for(const [value,text]of [['suggestion','Suggestion'],['problem','Report a problem'],['other','Other']]){const option=document.createElement('option');option.value=value;option.textContent=text;kind.append(option);}kindLabel.append(kind);
 const label=document.createElement('label'),input=document.createElement('textarea');label.textContent='Your feedback';input.setAttribute('aria-label','Your feedback');input.placeholder='What could we improve?';input.maxLength=2000;input.required=true;input.value=localStorage.getItem('poker-feedback-draft')||'';input.oninput=()=>localStorage.setItem('poker-feedback-draft',input.value);label.append(input);
 const send=document.createElement('button');send.type='submit';send.className='primary';send.textContent='Send feedback';
 const status=document.createElement('p');status.className='feedbackStatus';status.setAttribute('role','status');
 form.onsubmit=e=>{e.preventDefault();if(!input.value.trim()){status.textContent='Please write your feedback first.';return;}if(!socket.connected){status.textContent='Reconnect to the table before sending.';return;}send.disabled=true;status.textContent='Sending…';socket.timeout(18000).emit('feedback',{category:kind.value,message:input.value.trim()},(error,result)=>{send.disabled=false;status.textContent=error?'Could not confirm delivery. Your draft is still here; please try again.':result?.message||'Please try again.';if(!error&&result?.ok){input.value='';localStorage.removeItem('poker-feedback-draft');}});};
 form.append(kindLabel,label,send,status);feedback.append(form);if(category==='updates'){updates.open=true;section.append(updates);}else{feedback.open=true;section.append(feedback);}body.append(section);
};
