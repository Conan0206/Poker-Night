import {measuredStyle} from './style-metrics.js';
import {BOT_STYLES,BOT_STYLE_IDS} from './bot-styles.js';
let serial=0;
const svgNode=(tag,attrs={},text)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;};
export function renderPlayerStyle(stats,mode){
 const model=measuredStyle(stats),card=document.createElement('section');card.className='playerStyleProfile';card.dataset.mode=mode||'cash';
 const header=document.createElement('div');header.className='styleProfileHeader';const title=document.createElement('strong');title.textContent='Playing style';const status=document.createElement('span');status.textContent=model.ready?(model.early?'Early estimate':'Style estimate'):'Building profile';header.append(title,status);card.append(header);
 const svg=svgNode('svg',{viewBox:'0 0 400 330',role:'img','aria-label':model.ready?`${BOT_STYLES[model.id].label} style estimate. VPIP ${Math.round(model.loose*100)}%. Aggression ${Math.round(model.aggressive*100)}%. ${model.hands} completed hands.`:'Playing-style chart. Not enough completed betting data yet.'});
 const cx=200,cy=165,r=88,points=(top,right,bottom,left)=>`${cx},${cy-r*top} ${cx+r*right},${cy} ${cx},${cy+r*bottom} ${cx-r*left},${cy}`;
 for(const scale of [1,.75,.5,.25])svg.append(svgNode('polygon',{points:points(scale,scale,scale,scale),fill:'none',stroke:'#52606b','stroke-opacity':scale===1?.65:.35,'stroke-dasharray':scale===1?'none':'3 5'}));
 svg.append(svgNode('path',{d:'M112 165H288M200 77V253',stroke:'#536371','stroke-opacity':.28,fill:'none'}));
 const colors={tag:'#ec83c8',lag:'#f4c575',fish:'#54d2e7',rock:'#9d91ff'};
 const badges={tag:[24,23],lag:[316,23],rock:[24,273],fish:[316,273]};
 if(model.ready){
  const gradientId='playing-style-gradient-'+(++serial),defs=svgNode('defs'),gradient=svgNode('linearGradient',{id:gradientId,x1:'0%',y1:'0%',x2:'90%',y2:'100%'});
  for(const [offset,color] of [['0%','#aa76ff'],['28%','#f176c7'],['50%','#f4ca79'],['72%','#4edbe2'],['100%','#658df6']])gradient.append(svgNode('stop',{offset,'stop-color':color}));defs.append(gradient);svg.append(defs);
  const [bx,by]=badges[model.id];svg.append(svgNode('line',{x1:bx+30,y1:by+18,x2:cx+(model.loose*2-1)*r*.5,y2:cy+(1-model.aggressive*2)*r*.5,stroke:colors[model.id],'stroke-width':1.5,'stroke-opacity':.7}));
  svg.append(svgNode('polygon',{points:points(model.aggressive,model.loose,1-model.aggressive,1-model.loose),fill:`url(#${gradientId})`,'fill-opacity':.95,stroke:'#dbe8f9','stroke-opacity':.35}));
 }
 for(const [id,[x,y]] of Object.entries(badges)){
  const active=model.id===id;svg.append(svgNode('rect',{x,y,width:60,height:36,rx:13,fill:active?colors[id]:'#161c24',stroke:active?colors[id]:'#46505c','stroke-opacity':active?1:.6}));svg.append(svgNode('text',{x:x+30,y:y+23,'text-anchor':'middle',class:'styleBadgeText',fill:active?'#121827':'#a5afba'},BOT_STYLES[id].label));
 }
 for(const [label,hint,x,y,color] of [['Aggressive','More bets & raises',200,43,'#ec83c8'],['Loose','More hands',343,162,'#f4c575'],['Passive','More calls',200,289,'#54d2e7'],['Tight','Fewer hands',58,162,'#b58bf2']]){
  svg.append(svgNode('text',{x,y,'text-anchor':'middle',class:'styleAxisLabel',fill:color},label));svg.append(svgNode('text',{x,y:y+16,'text-anchor':'middle',class:'styleAxisHint',fill:'#84939e'},hint));
 }
 if(!model.ready)svg.append(svgNode('text',{x:200,y:169,'text-anchor':'middle',class:'styleEmpty',fill:'#8c9ba6'},'Awaiting hand data'));
 card.append(svg);const note=document.createElement('p');note.className='styleProfileNote';note.textContent=model.ready?`${model.hands} completed ${model.hands===1?'hand':'hands'} · ${model.decisions} bets, raises & calls${model.early?' · small sample':''}`:'Play a hand with a bet, raise or call to build this chart.';card.append(note);
 return card;
}
export function renderBotStylePicker(body,socket,state){
 const intro=document.createElement('p');intro.textContent='Choose the opponent you want to practise against.';body.append(intro);
 const grid=document.createElement('div');grid.className='botStyleChoices';
 const full=state.players.filter(p=>!p.spectating&&!p.kicked).length>=8,locked=state.practice||state.seatingClosed||full;
 for(const id of [...BOT_STYLE_IDS,'mixed']){
  const profile=BOT_STYLES[id],button=document.createElement('button');button.type='button';button.className='botStyleChoice';button.dataset.style=id;button.disabled=locked;
  const badge=document.createElement('strong'),name=document.createElement('span'),description=document.createElement('small');badge.textContent=profile?.label||'MIXED';name.textContent=profile?.name||'Surprise me';description.textContent=profile?.description||'Adds one bot with a randomly chosen play style.';
  button.append(badge,name,description);button.onclick=()=>{button.disabled=true;socket.emit('addbot',{style:id});document.getElementById('panel').close();};grid.append(button);
 }
 body.append(grid);if(locked){const note=document.createElement('p');note.textContent=full?'All eight seats are taken.':state.practice?'Bot training is managed automatically.':'Tournament seating is closed.';body.append(note);}
}
window.renderPlayerStyle=renderPlayerStyle;window.renderBotStylePicker=renderBotStylePicker;
window.dispatchEvent(new Event('poker-style-ready'));
