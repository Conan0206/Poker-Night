(()=>{
 const format=n=>n.toLocaleString(undefined,{maximumFractionDigits:2});
 function bounds(s,p){const step=s.big%2?1:.5,max=p.chips+p.round,min=Math.min(s.bet+s.minRaise,max);return {step,max,min,low:Math.ceil(min/s.big/step)*step,high:Math.floor(max/s.big/step)*step};}
 window.tournamentRaiseBounds=bounds;
 window.setupTournamentRaise=(box,s,p,close)=>{
  const b=bounds(s,p);let allIn=b.low>b.high;let value=allIn?b.max/s.big:b.low;
  box.replaceChildren();const adjust=document.createElement('div');adjust.className='raiseAdjust';
  const minus=document.createElement('button'),plus=document.createElement('button'),slider=document.createElement('input'),input=document.createElement('input'),confirm=document.createElement('button');
  minus.textContent='−';plus.textContent='+';minus.className=plus.className='raiseStep';minus.title='−'+b.step+' BB';plus.title='+'+b.step+' BB';slider.type='range';slider.min=b.low;slider.max=Math.max(b.low,b.high);slider.step=b.step;input.type='number';input.step='any';input.min=b.min/s.big;input.max=b.max/s.big;input.setAttribute('aria-label','Raise total in BB');input.title='Type any legal BB total; slider and buttons use '+b.step+' BB steps';slider.setAttribute('aria-label','Raise total in BB slider');confirm.className='primary';
  const amount=()=>allIn?b.max:Math.round(value*s.big);
  function sync(){input.value=String(value);slider.value=value;minus.disabled=allIn||value<=b.low;plus.disabled=allIn||value>=b.high;input.disabled=false;slider.disabled=b.low>b.high;confirm.textContent='Confirm '+format(value)+' BB';confirm.disabled=false;}
  function choose(n){resetAllIn();allIn=false;value=Math.max(b.low,Math.min(b.high,Math.round(n/b.step)*b.step));sync();}
  minus.onclick=()=>choose(value-b.step);plus.onclick=()=>choose(value+b.step);slider.oninput=()=>choose(Number(slider.value));input.oninput=()=>{const n=Number(input.value),chips=n*s.big;confirm.disabled=input.value.trim()===''||!Number.isFinite(n)||chips<b.min||chips>b.max||Math.abs(chips-Math.round(chips))>1e-7;if(!confirm.disabled){value=Math.round(chips)/s.big;allIn=Math.round(chips)===b.max;slider.value=value;minus.disabled=b.low>b.high||value<=b.low;plus.disabled=b.low>b.high||value>=b.high;confirm.textContent='Confirm '+format(value)+' BB';}resetAllIn();};input.onchange=input.oninput;
  confirm.onclick=()=>{if(confirm.disabled)return;socket.emit('action',{type:'raise',amount:amount()});confirm.disabled=true;};
  const field=document.createElement('div'),unit=document.createElement('span');field.className='bbRaiseField';unit.textContent='BB';field.append(input,unit);adjust.append(minus,slider,plus);box.append(field,adjust,confirm);
  const call=Math.max(0,s.bet-p.round);const presets=[['Pot',Math.max(b.min,s.pot)],['¼',Math.max(b.min,p.round+call+Math.floor((s.pot+call)/4))],['½',Math.max(b.min,p.round+call+Math.floor((s.pot+call)/2))],['¾',Math.max(b.min,p.round+call+Math.floor((s.pot+call)*3/4))],['All in',b.max]];
  for(const [label,chips]of presets){const button=document.createElement('button');button.className='betPreset'+(label==='All in'?' allInPreset':'');button.textContent=label;button.disabled=label!=='All in'&&b.low>b.high;button.onclick=()=>{if(label==='All in'){if(button.dataset.armed==='true'){socket.emit('action',{type:'raise',amount:b.max});button.disabled=true;return;}resetAllIn();allIn=true;value=b.max/s.big;sync();button.dataset.armed='true';button.textContent='Tap again · '+format(value)+' BB';}else choose(chips/s.big);};box.append(button);}
  box.append(close);sync();
 };
})();
