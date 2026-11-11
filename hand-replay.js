import {potBreakdown} from './pots.js';
const clone=value=>structuredClone(value),LIMIT=256;
const publicMask=(r,p)=>(p.shown||0)|(r.allInReveal&&p.inHand&&!p.folded?3:0);
const action=p=>p.folded?'fold':p.chips===0?'allin':p.action?.startsWith('Raise ')?'raise':p.action||'';
function awards(r){return (r.runPreview?.awards||[]).flatMap(a=>(a.winners||[]).map(w=>({id:w.id,amount:w.amount,cards:[...(w.cards||[])]})));}
function snapshot(r,event){
 const record=r.currentReplay;
 const players=record.players.map(meta=>{const p=r.players.find(p=>p.id===meta.id);return p?{id:p.id,chips:p.chips,bet:p.round||0,folded:!!p.folded,shown:publicMask(r,p),action:action(p)}:{id:meta.id,chips:0,bet:0,folded:true,shown:0,action:'fold'};});
 const pots=(r.remainingPots||r.displayPots||potBreakdown(r.players)).map((p,i)=>({label:p.kind==='uncalled'?'Uncalled chips':i?'Side pot '+i:'Main pot',amount:p.amount}));
 return {street:r.runningOut?({0:'preflop',3:'flop',4:'turn',5:'river'}[r.board.length]||r.street):r.street,run:r.activeRun||1,board:[...r.board],pot:r.players.reduce((n,p)=>n+p.total,0)-(r.paidRunAmount||0),pots,players,event:event||{kind:r.runPreview?'winner':'street'},winners:awards(r)};
}
function append(record,frame){
 if(record.frames.length>=LIMIT){record.truncated=true;return;}
 record.frames.push(clone(frame));
}
export function startHandReplay(r){
 const seated=r.players.filter(p=>p.inHand);
 r.currentReplay={id:r.archiveId,handNumber:r.handNumber,mode:r.mode,practice:!!r.practice,level:r.level||1,small:r.small,big:r.big,players:seated.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:!!p.bot})),holes:new Map(seated.map(p=>[p.id,[...p.cards]])),privateRights:new Map(),frames:[],complete:false};
 captureHandReplay(r,{kind:'blinds'});
}
export function captureHandReplay(r,event){
 const record=r.currentReplay;if(!record||record.handNumber!==r.handNumber)return;
 if(record.complete){
  if(r.street!=='showdown'||r.mode!==record.mode)return;
  const last=record.frames.at(-1);if(!last)return;
  const updated=clone(last);let changed=false;
  for(const p of updated.players){const live=r.players.find(q=>q.id===p.id),shown=p.shown|(live?publicMask(r,live):0);if(shown!==p.shown){p.shown=shown;changed=true;updated.event={kind:'show',actorId:p.id};}}
  if(changed)append(record,updated);return;
 }
 const frame=snapshot(r,event),last=record.frames.at(-1);
 if(!event&&last&&JSON.stringify(last.board)===JSON.stringify(frame.board)&&frame.players.some(p=>p.shown!==(last.players.find(q=>q.id===p.id)?.shown||0)))frame.event={kind:'show'};
 if(!event&&last&&JSON.stringify([last.street,last.run,last.board,last.pot,last.players,last.winners])===JSON.stringify([frame.street,frame.run,frame.board,frame.pot,frame.players,frame.winners]))return;
 // A first-run payout is visible before the second board replaces it.
 if(event?.kind==='payout'&&r.runPayout)frame.winners=r.runPayout.awards.flatMap(a=>a.winners.map(w=>({id:w.id,amount:w.amount,cards:[...(w.cards||[])]})));
 append(record,frame);
}
export function finishHandReplay(r,entry){
 const record=r.currentReplay;if(!record||record.complete||record.handNumber!==r.handNumber)return null;
 const last=record.frames.at(-1);if(!last)return null;
 const final=snapshot(r,{kind:'payout'}),view=clone(last);
 view.street='showdown';view.board=[...r.board];view.run=r.activeRun||1;view.event={kind:'winner'};
 view.players.forEach(p=>{const q=final.players.find(q=>q.id===p.id);if(q){p.shown=q.shown;p.folded=q.folded;p.action=q.action;p.bet=0;}});
 const remaining=(r.awards||[]).filter(a=>!r.firstRunPaid||a.run===2);
 const byPot=new Map();
 for(const a of remaining){const index=a.displayPotIndex??0;const rows=byPot.get(index)||[];for(const w of a.winners||[]){let amount=w.amount;if(r.endedByFold&&entry.returned&&[...r.players].sort((a,b)=>b.total-a.total)[0]?.id===w.id)amount-=entry.returned.amount;if(amount>0)rows.push({id:w.id,amount,cards:[...(w.cards||[])]});}byPot.set(index,rows);}
 view.winners=[...byPot.values()].flat();append(record,view);
 for(const [index,rows] of [...byPot].sort((a,b)=>b[0]-a[0])){
  const amount=rows.reduce((n,w)=>n+w.amount,0);if(!amount)continue;
  for(const w of rows){const p=view.players.find(p=>p.id===w.id);if(p)p.chips+=w.amount;}
  view.pot=Math.max(0,view.pot-amount);view.event={kind:'payout',label:index?'Side pot '+index:'Main pot'};view.winners=rows;
  if(view.pots[index])view.pots[index].amount=Math.max(0,view.pots[index].amount-amount);
  append(record,view);
 }
 // Any uncalled chips are returned separately, using the engine's settled balances.
 const differences=final.players.filter(p=>p.chips!==view.players.find(q=>q.id===p.id)?.chips);
 if(differences.length){for(const p of differences){const q=view.players.find(q=>q.id===p.id);if(q)q.chips=p.chips;}view.pot=0;view.pots.forEach(p=>p.amount=0);view.event={kind:'return'};append(record,view);}
 record.complete=true;record.message=entry.message;
 if(record.truncated)return null;
 r.replayHistory??=new Map();r.replayHistory.set(record.id,record);while(r.replayHistory.size>30)r.replayHistory.delete(r.replayHistory.keys().next().value);
 return record.id;
}
export function grantReplayPrivateCards(r,viewerId){
 const record=r.currentReplay;if(!record?.complete||record.handNumber!==r.handNumber)return;
 const rights=record.privateRights.get(viewerId)||new Map();for(const target of r.privateReveals?.get(viewerId)||[])if(!rights.has(target))rights.set(target,record.frames.length-1);record.privateRights.set(viewerId,rights);
}
export function handReplayForViewer(r,id,viewerId){
 const raw=r.replayHistory?.get(id);if(!raw?.complete||raw.truncated)return null;
 const rights=raw.privateRights.get(viewerId);
 return {id:raw.id,handNumber:raw.handNumber,mode:raw.mode,practice:raw.practice,level:raw.level,small:raw.small,big:raw.big,message:raw.message,players:raw.players.map(p=>({...p,self:p.id===viewerId})),frames:raw.frames.map((f,index)=>({street:f.street,run:f.run,board:[...f.board],pot:f.pot,pots:clone(f.pots),event:clone(f.event),winners:f.winners.map(w=>({...w,cards:(w.cards||[]).map(c=>c.replace(/^10/,'T')).filter(c=>f.board.includes(c)||f.players.some(p=>p.shown===3&&raw.holes.get(p.id)?.includes(c)))})),players:f.players.map(p=>({id:p.id,chips:p.chips,bet:p.bet,folded:p.folded,action:p.action,cards:(raw.holes.get(p.id)||[]).map((c,i)=>p.id===viewerId||p.shown&(1<<i)||rights?.has(p.id)&&index>=rights.get(p.id)?c:'?')}))}))};
}
