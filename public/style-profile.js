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
 const colors={tag:'#ef6a92',lag:'#f5c85a',fish:'#4bb6ee',rock:'#a77aef'};
 const badges={tag:[24,23],lag:[316,23],rock:[24,273],fish:[316,273]};
 if(model.ready){
  // A fixed colour field: top pink/red, right yellow, bottom blue, left purple.
  // Clip the measured shape against it instead of stretching a gradient to each shape.
  const clipId='playing-style-clip-'+(++serial),defs=svgNode('defs'),clip=svgNode('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});
  const shape=points(model.aggressive,model.loose,1-model.aggressive,1-model.loose);
  clip.append(svgNode('polygon',{points:shape}));defs.append(clip);svg.append(defs);
  const [bx,by]=badges[model.id];svg.append(svgNode('line',{x1:bx+30,y1:by+18,x2:cx+(model.loose*2-1)*r*.5,y2:cy+(1-model.aggressive*2)*r*.5,stroke:colors[model.id],'stroke-width':1.5,'stroke-opacity':.7}));
  const field=svgNode('foreignObject',{x:cx-r,y:cy-r,width:r*2,height:r*2}),paint=document.createElementNS('http://www.w3.org/1999/xhtml','div');paint.className='styleColorField';field.append(paint);
  const clipped=svgNode('g',{'clip-path':`url(#${clipId})`});clipped.append(field);svg.append(clipped,svgNode('polygon',{points:shape,fill:'none',stroke:'#dbe8f9','stroke-opacity':.35}));
 }
 for(const [id,[x,y]] of Object.entries(badges)){
  const active=model.id===id;svg.append(svgNode('rect',{x,y,width:60,height:36,rx:13,fill:active?colors[id]:'#161c24',stroke:active?colors[id]:'#46505c','stroke-opacity':active?1:.6}));svg.append(svgNode('text',{x:x+30,y:y+23,'text-anchor':'middle',class:'styleBadgeText',fill:active?'#121827':'#a5afba'},BOT_STYLES[id].label));
 }
 for(const [label,hint,x,y,color] of [['Aggressive','More bets & raises',200,43,colors.tag],['Loose','More hands',343,162,colors.lag],['Passive','More calls',200,289,colors.fish],['Tight','Fewer hands',58,162,colors.rock]]){
  svg.append(svgNode('text',{x,y,'text-anchor':'middle',class:'styleAxisLabel',fill:color},label));svg.append(svgNode('text',{x,y:y+16,'text-anchor':'middle',class:'styleAxisHint',fill:'#84939e'},hint));
 }
 if(!model.ready)svg.append(svgNode('text',{x:200,y:169,'text-anchor':'middle',class:'styleEmpty',fill:'#8c9ba6'},'Awaiting hand data'));
 card.append(svg);const note=document.createElement('p');note.className='styleProfileNote';note.textContent=model.ready?`${model.hands} completed ${model.hands===1?'hand':'hands'} · ${model.decisions} bets, raises & calls${model.early?' · small sample':''}`:'Play a hand with a bet, raise or call to build this chart.';card.append(note);
 return card;
}
export function renderBotStylePicker(body,socket,state){
 const intro=document.createElement('p');intro.className='botPickerIntro';intro.textContent='Choose a play style';body.append(intro);
 const grid=document.createElement('div');grid.className='botStyleChoices';
 const full=state.players.filter(p=>!p.spectating&&!p.kicked).length>=8,locked=state.practice||state.seatingClosed||full;
 for(const id of [...BOT_STYLE_IDS,'mixed']){
  const profile=BOT_STYLES[id],button=document.createElement('button');button.type='button';button.className='botStyleChoice';button.dataset.style=id;button.disabled=locked;
  const badge=document.createElement('strong'),copy=document.createElement('span'),name=document.createElement('b'),description=document.createElement('small'),add=document.createElement('span');badge.textContent=profile?.label||'MIXED';copy.className='botStyleCopy';name.textContent=profile?.name||'Random style';description.textContent=({tag:'Selective hands, strong betting',lag:'Wider ranges, more pressure',fish:'More calls, easier practice',rock:'Patient and cautious',mixed:'One bot, any play style'})[id];add.className='botChoicePlus';add.textContent='+';add.setAttribute('aria-hidden','true');copy.append(name,description);
  button.append(badge,copy,add);button.onclick=()=>{button.disabled=true;socket.emit('addbot',{style:id});document.getElementById('panel').close();};grid.append(button);
 }
 body.append(grid);if(locked){const note=document.createElement('p');note.textContent=full?'All eight seats are taken.':state.practice?'Bot training is managed automatically.':'Tournament seating is closed.';body.append(note);}
}
const statHelp={
 VPIP:'Voluntarily Put Money In Pot: the percentage of completed hands where you called or raised before the flop. Forced blinds do not count.',
 PFR:'Preflop Raise: the percentage of completed hands where you raised before the flop.',
 'Win rate':'Hands won divided by hands played. Winning any main or side pot counts once per hand; split pots and two-board hands still count only once.',
 Aggression:'Bets and raises divided by bets, raises and calls, from completed hands. Checks and folds are excluded.'
};
export function renderStatisticsGrid(stats){
 const grid=document.createElement('div');grid.className='statGrid';const hands=stats.hands||0,wins=stats.handsWon||0,percent=n=>hands?Math.round(n/hands*100)+'%':'0%';
 const actions=(stats.style?.raises||0)+(stats.style?.calls||0);
 const metrics=[['VPIP',percent(stats.vpip||0)],['PFR',percent(stats.pfr||0)],['Win rate',hands?percent(wins):'—'],['Aggression',actions?Math.round(stats.style.raises/actions*100)+'%':'—'],['Hands played',hands],['Hands won',wins]];
 for(const [label,value] of metrics){
  const box=document.createElement('div'),name=document.createElement('span'),number=document.createElement('strong');box.className='stat';box.dataset.stat=label;name.className='statLabel';name.textContent=label;number.textContent=value;box.append(name,number);
  if(statHelp[label]){const help=document.createElement('button'),tip=document.createElement('span'),id='stat-help-'+(++serial);help.type='button';help.className='statHelp';help.dataset.statHelp=label;help.textContent='?';help.setAttribute('aria-label','What is '+label+'?');help.setAttribute('aria-describedby',id);tip.id=id;tip.className='statHelpText';tip.setAttribute('role','tooltip');tip.textContent=statHelp[label];box.append(help,tip);}
  grid.append(box);
 }
 return grid;
}
window.renderPlayerStyle=renderPlayerStyle;window.renderBotStylePicker=renderBotStylePicker;window.renderStatisticsGrid=renderStatisticsGrid;
window.dispatchEvent(new Event('poker-style-ready'));
