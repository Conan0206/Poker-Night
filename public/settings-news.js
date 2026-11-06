window.renderSettingsCommunity=(body,socket,category)=>{
 const section=document.createElement('section');section.className='settingsCommunity';
 const updates=document.createElement('details');
 const title=document.createElement('summary');title.textContent='What’s new · Recent improvements';updates.append(title);
 const date=document.createElement('p');date.className='fine';date.textContent='Latest update · 7 November 2026';updates.append(date);
 const list=document.createElement('ul');list.className='updateList';
 for(const text of [
  'Redesigned the homepage with live tables and a simpler invite-code join.',
  'Watch the live Bot arena and browse public or locked private tables from the homepage.',
  'Added resumable offline bot training with tested, versioned strategy updates.',
  'Join the main cash or tournament table from the homepage or mode switch.',
  'Tournament raises use BB, with half-BB controls and flexible typed values.',
  'Leaderboards show seated players and refresh after each completed hand.',
  'Added elimination rankings and a champion celebration with party blowers.',
  'Improved bet placement and made tournament BB amounts clearer.',
  'Added tournament reset beside Sit down to reopen seating.',
  'Added adjustable time cards beside the action panel.',
  'Hand rankings appear on community-card hover; tutorial highlights are improved.',
  'Homepage fits one screen; Settings opens on Table settings.',
  'Tournament card backs remain customizable while the felt stays fixed.'
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
