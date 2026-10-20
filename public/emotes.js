(()=>{
 const toggle=document.getElementById('emoteToggle'),picker=document.getElementById('emotePicker'),choices=document.getElementById('emoteChoices');let catalog=[],spectatorSequence=0;const playing=new Map(),mediaPool=new Map();
 const close=()=>{picker.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{picker.hidden=!picker.hidden;toggle.setAttribute('aria-expanded',String(!picker.hidden));};
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#emoteDock'))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});

 let page=0,favourites=[];try{const saved=JSON.parse(localStorage.getItem('poker-emote-favourites')||'[]');if(Array.isArray(saved))favourites=saved.filter(id=>typeof id==='string');}catch{}
 const pageSize=4,dots=document.createElement('div');dots.className='emoteDots';dots.setAttribute('role','group');dots.setAttribute('aria-label','Emote pages');choices.after(dots);choices.setAttribute('aria-label','Emote bank');choices.tabIndex=0;
 const status=document.createElement('span');status.className='emotePageStatus';status.setAttribute('aria-live','polite');dots.after(status);
 function renderBank(){
 const ordered=catalog.map((item,index)=>({...item,index})).sort((a,b)=>Number(favourites.includes(b.id))-Number(favourites.includes(a.id))||a.index-b.index);const pages=Math.max(1,Math.ceil(ordered.length/pageSize));page=Math.max(0,Math.min(page,pages-1));choices.replaceChildren();dots.replaceChildren();
 for(const item of ordered.slice(page*pageSize,(page+1)*pageSize)){const tile=document.createElement('div');tile.className='emoteTile';const b=document.createElement('button');b.className='sendEmote';b.setAttribute('aria-label',item.name+' emote');const img=document.createElement('img');img.src='/emotes/'+item.thumbnail;img.alt='';b.append(img);b.onclick=()=>{const self=state?.players.find(p=>p.id===me);if(!self||self.kicked)return;showEmote(me,item.index,!!self.spectating);socket.emit('emote',item.index);if(!self.spectating)close();};const star=document.createElement('button');const active=favourites.includes(item.id);star.className='favouriteEmote';star.textContent=active?'★':'☆';star.setAttribute('aria-label',(active?'Unfavourite ':'Favourite ')+item.name);star.setAttribute('aria-pressed',String(active));star.onclick=()=>{favourites=active?favourites.filter(id=>id!==item.id):[...favourites,item.id];localStorage.setItem('poker-emote-favourites',JSON.stringify(favourites));page=0;renderBank();const target=[...choices.querySelectorAll('.favouriteEmote')].find(b=>b.getAttribute('aria-label').endsWith(item.name));target?.focus();};tile.append(b,star);choices.append(tile);}
 const previous=document.createElement('button');previous.className='emotePageArrow';previous.textContent='‹';previous.setAttribute('aria-label','Previous emote page');previous.disabled=page===0;previous.onclick=()=>{page--;renderBank();};dots.append(previous);for(let i=0;i<pages;i++){const dot=document.createElement('button');dot.className='emotePageDot';dot.setAttribute('aria-label','Emote page '+(i+1));dot.setAttribute('aria-current',i===page?'page':'false');dot.onclick=()=>{page=i;renderBank();choices.focus();};dots.append(dot);}const next=document.createElement('button');next.className='emotePageArrow';next.textContent='›';next.setAttribute('aria-label','Next emote page');next.disabled=page===pages-1;next.onclick=()=>{page++;renderBank();};dots.append(next);status.textContent=(page+1)+' / '+pages+' · '+favourites.length+(favourites.length===1?' favourite':' favourites');
 }
 let lastScroll=0,touchX=0;const navigate=delta=>{const now=Date.now();if(now-lastScroll<220)return;lastScroll=now;page+=delta;renderBank();};choices.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();navigate(e.key==='ArrowRight'?1:-1);}});choices.addEventListener('wheel',e=>{e.preventDefault();navigate((e.deltaX||e.deltaY)>0?1:-1);},{passive:false});choices.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});choices.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>35)navigate(delta<0?1:-1);},{passive:true});
 picker.querySelector('strong').textContent='Emote bank';picker.querySelector('small').textContent='Star favourites to pin them first · swipe or use dots';
 function makeVideo(item){const video=document.createElement('video');video.className='avatarEmote';video.setAttribute('role','img');video.setAttribute('aria-label',item.name+' emote');video.playsInline=true;video.preload='auto';video.poster='/emotes/'+item.thumbnail;video.src='/emotes/'+item.video;video.load();return video;}
 fetch('/emotes/manifest.json').then(r=>r.json()).then(items=>{catalog=items;for(const item of items)mediaPool.set(item.id,[makeVideo(item)]);renderBank();}).catch(()=>{choices.textContent='Emotes could not load. Refresh to try again.';});

 function clear(id){const old=playing.get(id);if(!old)return;old.audio.pause();old.img.getAnimations().forEach(a=>a.cancel());old.img.remove();old.audio.onended=null;old.audio.onplaying=null;old.audio.currentTime=0;const pool=mediaPool.get(old.item.id);if(pool&&pool.length<2)pool.push(old.audio);playing.delete(id);}

 function showEmote(playerId,index,spectating=false){
  const item=catalog[index];if(!item)return;
  const key=spectating?'spectator-'+(++spectatorSequence):playerId;
  if(!spectating)clear(key);
  // Repeated spectator sends play immediately. Retire the oldest visual only when
  // ten simultaneous videos are already running, keeping memory/audio bounded.
  const audience=[...playing].filter(([,entry])=>entry.spectating);
  if(spectating&&audience.length>=10)clear(audience[0][0]);
  const occupied=new Set([...playing.values()].filter(e=>e.spectating).map(e=>e.slot));let slot=0;while(occupied.has(slot))slot++;
  const pool=mediaPool.get(item.id)||[],video=pool.pop()||makeVideo(item);
  video.classList.toggle('spectatorEmote',spectating);video.currentTime=0;video.volume=window.pokerAudio.level('emotes');video.muted=localStorage.getItem('poker-muted')==='true';document.body.append(video);
  const entry={img:video,audio:video,item,playerId,spectating,slot,end:Date.now()+15000};playing.set(key,entry);
  video.onplaying=()=>{entry.end=Date.now()+Math.max(0,item.duration-video.currentTime)*1000+500;};
  video.onended=()=>{if(playing.get(key)===entry)clear(key);};position();
  if(spectating&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.animate([{opacity:0,transform:'translateX(-95px) scale(.85)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
  video.play().catch(()=>{if(playing.get(key)!==entry)return;entry.autoplayMuted=true;video.muted=true;video.play().catch(()=>clear(key));});
 }
 socket.on('emote',({playerId,index,spectating})=>{if(playerId!==me)showEmote(playerId,index,!!spectating);});

 function position(){
  const mobile=innerWidth<=700;
  const header=document.querySelector('.headerLeftActions')?.getBoundingClientRect(),info=document.querySelector('#tableInfo')?.getBoundingClientRect();
  const top=Math.max((header?.bottom||100)+22,mobile?(info?.bottom||0)+15:0);
  const bottom=mobile?innerHeight-130:Math.min(innerHeight-30,info?.top||innerHeight-30);
  const rows=5,size=Math.max(16,Math.min(mobile?68:80,(bottom-top-32)/rows)),gap=size+8;
  for(const [key,entry]of playing){
   if(Date.now()>=entry.end){clear(key);continue;}
   if(entry.spectating){const lane=entry.slot%10;entry.img.style.width=size+'px';entry.img.style.height=size+'px';entry.img.style.left=(16+Math.floor(lane/rows)*gap)+'px';entry.img.style.top=(top+(lane%rows)*gap)+'px';}
   else{const avatar=document.querySelector('.seat[data-id="'+entry.playerId+'"] .avatar');if(!avatar){clear(key);continue;}const rect=avatar.getBoundingClientRect();entry.img.style.left=rect.x+rect.width/2+'px';entry.img.style.top=rect.y+rect.height/2+'px';}
   entry.audio.volume=window.pokerAudio.level('emotes');entry.audio.muted=!!entry.autoplayMuted||localStorage.getItem('poker-muted')==='true';
  }
 }

 setInterval(position,50);socket.on('disconnect',()=>{for(const id of playing.keys())clear(id);});
})();

