/* Share the gesture-unlocked game audio context, including when watching a table. */
(() => {
 const bytes=fetch('/audio/all-in-theme-32s.mp3').then(r=>{if(!r.ok)throw Error('All-in audio unavailable');return r.arrayBuffer();});bytes.catch(()=>{});
 let current,key='',context,gain,buffer,source,offset=0,started=0,loading=false,failed=false;
 function stop(reset=false){
  if(source){const old=source;source=null;offset+=Math.max(0,context.currentTime-started);old.stop();old.disconnect();}
  if(reset)offset=0;
 }
 function sync(){
  const s=current,event=s?.allInSound;
  const next=event&&s.actionNumber===event.actionNumber&&s.street!=='showdown'&&s.street!=='waiting'?[s.code,s.handNumber,event.actionNumber].join(':'):'';
  if(next!==key){stop(true);key=next;}
  const muted=localStorage.getItem('poker-muted')==='true',volume=.5*window.pokerAudio.level('effects');
  if(!key||s.paused||muted||volume===0){stop();return;}
  const unlocked=window.pokerEffects?.audioContext?.();if(!unlocked)return;
  if(context!==unlocked){context=unlocked;gain=context.createGain();gain.connect(context.destination);context.addEventListener('statechange',sync);}
  if(!buffer&&!loading&&!failed){loading=true;bytes.then(data=>context.decodeAudioData(data.slice(0))).then(decoded=>{buffer=decoded;loading=false;sync();}).catch(()=>{loading=false;failed=true;});}
  gain.gain.setValueAtTime(volume,context.currentTime);
  if(context.state!=='running'||!buffer||source)return;
  const loopEnd=Math.min(32,buffer.duration);offset%=loopEnd;
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=loopEnd;source.connect(gain);started=context.currentTime;source.start(0,offset);
 }
 addEventListener('poker-state',({detail:{state}})=>{current=state;sync();});
 addEventListener('poker-volume-change',sync);
 document.addEventListener('pointerdown',sync);document.addEventListener('keydown',sync);document.addEventListener('click',sync);
 addEventListener('pagehide',()=>{stop(true);key='';});
 window.pokerAllInMusic={sync,get status(){return {pending:!!key,playing:!!source,unlocked:context?.state==='running',loaded:!!buffer};}};
})();
