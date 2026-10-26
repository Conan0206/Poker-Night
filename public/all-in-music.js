/* The supplied theme is trimmed to 32 seconds and loops only for a pending all-in. */
(() => {
 const music=new Audio('/audio/all-in-theme-32s.mp3');music.preload='auto';music.loop=true;
 let current,key='';
 function sync(){
  const s=current,event=s?.allInSound;
  const next=event&&s.actionNumber===event.actionNumber&&s.street!=='showdown'&&s.street!=='waiting'?[s.code,s.handNumber,event.actionNumber].join(':'):'';
  if(next!==key){music.pause();music.currentTime=0;key=next;}
  const muted=localStorage.getItem('poker-muted')==='true';music.volume=.5*window.pokerAudio.level('effects');
  if(!key||s.paused||muted||music.volume===0){music.pause();return;}
  if(music.paused)music.play().catch(()=>{});
 }
 addEventListener('poker-state',({detail:{state}})=>{current=state;sync();});
 addEventListener('poker-volume-change',sync);
 document.addEventListener('pointerdown',sync);document.addEventListener('keydown',sync);document.addEventListener('click',sync);
 addEventListener('pagehide',()=>{music.pause();});window.pokerAllInMusic={sync};
})();
