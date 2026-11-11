(()=>{
 window.formatPokerHistory=h=>h.mode==='tournament'?h.message.replace(/\$(\d[\d,]*)/g,(match,n)=>match+' ('+(Number(n.replaceAll(',',''))/h.big).toLocaleString(undefined,{maximumFractionDigits:1})+' BB)'):h.message;
 // Also tidy older entries that only have the repeated "Run N · name +$amount" text.
 window.pokerHistoryRuns=h=>{
  if(h.runs?.length===2)return h.runs;
  const message=h.message||'',matches=[...message.matchAll(/(?:^| · )Run ([12]) · (.*?) \+\$(\d[\d,]*)(?= · Run [12] · |$)/g)];
  if(!matches.length||matches.map(m=>m[0]).join('')!==message||new Set(matches.map(m=>m[1])).size!==2)return null;
  return [1,2].map(number=>{const totals=new Map();for(const m of matches.filter(m=>Number(m[1])===number))totals.set(m[2],(totals.get(m[2])||0)+Number(m[3].replaceAll(',','')));return {number,winners:[...totals].map(([name,amount])=>({name,amount})),board:[],pots:[]};});
 };
 const money=(amount,h)=>'$'+amount.toLocaleString()+(h.mode==='tournament'?' ('+(amount/h.big).toLocaleString(undefined,{maximumFractionDigits:1})+' BB)':'');
 function replayButton(parent,h){if(!h.replayId)return;const b=document.createElement('button');b.type='button';b.className='historyReplay';b.textContent='▶ Replay';b.setAttribute('aria-label','Replay hand #'+h.handNumber);b.onclick=()=>window.replayHand?.(h.replayId);parent.append(b);}
 window.pokerHistorySummary=h=>{
  if(h.winners?.length)return {winners:h.winners,pots:h.pots||[],split:!!h.split};
  const chunks=(h.message||'').split(' · '),matches=chunks.map(s=>s.match(/^(.*?) \+\$(\d[\d,]*)$/));
  if(!matches.length||matches.some(m=>!m))return null;
  const totals=new Map();for(const m of matches)totals.set(m[1],(totals.get(m[1])||0)+Number(m[2].replaceAll(',','')));
  return {winners:[...totals].map(([name,amount])=>({name,amount})),pots:[],split:false};
 };
 function winnerRows(parent,winners,h){for(const winner of winners){const row=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong');row.className='historyWinner';name.textContent=winner.name;amount.textContent='+'+money(winner.amount,h);amount.title='Amount received from pots, not net profit.';row.append(name,amount);parent.append(row);}}
 function potDetails(parent,pots,h){if(pots.length<2)return;const details=document.createElement('details'),summary=document.createElement('summary');details.className='historyPotDetails';summary.textContent='Pot breakdown';details.append(summary);for(const pot of pots){const group=document.createElement('div'),label=document.createElement('small');label.textContent=pot.label;group.append(label);winnerRows(group,pot.winners,h);details.append(group);}parent.append(details);}
 function returnedNote(parent,h){if(!h.returned?.amount)return;const note=document.createElement('p');note.className='historyReturned';note.textContent='Uncalled chips returned · '+h.returned.name+' '+money(h.returned.amount,h);parent.append(note);}
 function renderSummary(body,h,data){const hand=document.createElement('article'),header=document.createElement('div'),label=document.createElement('strong'),number=document.createElement('span');hand.className='historySummaryHand';header.className='historySummaryHeader';label.textContent=data.split?'Split pot':data.winners.length>1?'Pot payouts':'Winner';number.textContent=h.handNumber?'Hand #'+h.handNumber:'';header.append(label,number);hand.append(header);winnerRows(hand,data.winners,h);potDetails(hand,data.pots,h);returnedNote(hand,h);replayButton(hand,h);body.append(hand);}
 function renderRuns(body,h,runs){
  const hand=document.createElement('article'),header=document.createElement('div'),title=document.createElement('strong'),tag=document.createElement('span');hand.className='historyRunHand';header.className='historyRunHeader';title.textContent=h.handNumber?'Hand #'+h.handNumber:'All-in hand';tag.textContent='Run it twice';header.append(title,tag);hand.append(header);
  for(const run of runs){
   const section=document.createElement('section'),heading=document.createElement('div'),label=document.createElement('strong');section.className='historyRun';section.dataset.run=run.number;heading.className='historyRunHeading';label.textContent='Run '+run.number;heading.append(label);
   if(run.board?.length){const board=document.createElement('div');board.className='historyBoard';board.setAttribute('aria-label','Run '+run.number+' community cards');for(const card of run.board){const chip=document.createElement('span');chip.className='historyCard'+('hd'.includes(card[1])?' red':'');chip.textContent=(card[0]==='T'?'10':card[0])+({s:'♠',h:'♥',d:'♦',c:'♣'}[card[1]]||'');board.append(chip);}heading.append(board);}
   section.append(heading);winnerRows(section,run.winners,h);
   potDetails(section,run.pots||[],h);
   hand.append(section);
  }
  returnedNote(hand,h);replayButton(hand,h);
  body.append(hand);
 }
 window.renderPokerHistory=(body,s)=>{const history=s?.handHistory||[];if(!history.length){for(const h of s?.history||[]){const row=document.createElement('p');row.textContent=h;body.append(row);}if(!s?.history?.length)body.textContent='Your completed hands will appear here.';return;}
 let group='';for(const h of history){const key=h.mode+':'+h.level+':'+h.small+':'+h.big;if(key!==group){group=key;const heading=document.createElement('h3');heading.className='historyLevelDivider';heading.textContent=h.mode==='tournament'?'Level '+Math.min(h.level,13)+' · $'+h.small+' ('+(h.small/h.big).toLocaleString(undefined,{maximumFractionDigits:1})+' BB) / $'+h.big+' (1 BB)':(h.practice?'Bot training':h.bankroll?'Cash':'Custom')+' · $'+h.small+' / $'+h.big;body.append(heading);}const runs=window.pokerHistoryRuns(h);if(runs){renderRuns(body,h,runs);continue;}const summary=window.pokerHistorySummary(h);if(summary){renderSummary(body,h,summary);continue;}const row=document.createElement('p');row.className='historyHand';row.textContent=window.formatPokerHistory(h);body.append(row);}
 };
})();
