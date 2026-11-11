import {randomBytes} from 'node:crypto';
import {cashStake} from './public/cash-stakes.js';
import {isAllowedAvatar,defaultAvatar} from './public/avatar-catalog.js';
export function createCashGame({store,accountForSocket,rooms,sessions,createRoom,publish,deal,act,advance,io}){
 let entryQueue=Promise.resolve();
 const message=(s,e)=>s.emit('notice',e.code?e.message:'Cash bankroll is temporarily unavailable. Please try again.');
 const emitWallet=p=>{if(p.socket)io.to(p.socket).emit('bankrollChanged');};
 const seated=r=>r.players.filter(p=>!p.cashExit&&!p.kicked&&!p.spectating&&p.socket&&p.chips>0);
 async function cashOut(r,p){await store.cashOut(p.accountId,p.cashSeatId);p.chips=0;p.spectating=true;p.kicked=true;emitWallet(p);sessions.delete(p.token);}
 async function flushExits(r){for(const p of r.players.filter(p=>p.cashExit&&!p.kicked))await cashOut(r,p);}
 function retry(r,fn){clearTimeout(r.cashRetry);r.cashRetry=setTimeout(fn,2500);r.cashRetry.unref?.();}
 async function finish(r){if(!r.bankroll)return;r.cashBusy=true;const results=r.players.filter(p=>p.inHand&&p.cashSeatId).map(p=>({seatId:p.cashSeatId,chips:p.chips}));const save=async()=>{try{await store.settleHand(r.code,r.archiveId,results);await flushExits(r);r.cashBusy=false;r.cashError=null;r.players.forEach(emitWallet);publish(r);}catch(e){r.cashError=e.code==='LEASE_LOST'?'Cash connection expired. Return home and rejoin.':'Saving the Cash hand. Please wait…';publish(r);if(e.code!=='LEASE_LOST')retry(r,save);}};await save();}
 function beforeDeal(r){if(!r.bankroll)return true;if(r.cashPrepared){r.cashPrepared=false;return true;}if(r.cashBusy||r.cashError){if(!r.cashError)retry(r,()=>deal(r));return false;}const participants=seated(r);if(participants.length<2){r.street='waiting';r.started=false;r.turn=-1;r.result='Waiting for two funded Cash players';publish(r);return false;}r.cashBusy=true;void store.beginHand(r.code,participants.map(p=>({seatId:p.cashSeatId,chips:p.chips}))).then(id=>{r.cashHandId=id;r.cashParticipants=participants.map(p=>p.id);r.cashPrepared=true;r.cashBusy=false;deal(r);}).catch(e=>{r.cashBusy=false;r.cashError=e.code==='LEASE_LOST'?'Cash connection expired. Return home and rejoin.':'Cash table is reconnecting. Please wait…';publish(r);if(e.code!=='LEASE_LOST')retry(r,()=>{r.cashError=null;deal(r);});});return false;}
 async function enterImpl(s,data){
  const account=await accountForSocket(s);if(!account)throw Object.assign(Error('Sign in with Google to play Cash.'),{code:'SIGN_IN'});
  const stake=cashStake(data.code);if(!stake)throw Object.assign(Error('Choose Stage 1 or Stage 2 in Cash.'),{code:'STAKES'});
  let r=rooms.get(stake.code);if(r?.cashBusy)throw Object.assign(Error('Cash chips are being saved. Please try again shortly.'),{code:'BUSY'});if(r?.cashError)throw Object.assign(Error(r.cashError),{code:'TABLE'});
  if(r&&!r.started){const dealer=r.players[r.dealer]?.id;r.players=r.players.filter(p=>!p.kicked);r.dealer=r.players.findIndex(p=>p.id===dealer);}if(r?.players.length>=40)throw Object.assign(Error('This Cash table has too many watchers.'),{code:'FULL'});
  const existing=r?.players.find(p=>p.accountId===account&&!p.kicked);
  if(existing){if(existing.cashExit)throw Object.assign(Error('Your Cash hand is finishing. Your chips will return to the wallet afterward.'),{code:'EXIT'});const old=existing.socket;existing.socket=s.id;clearTimeout(existing.cashDisconnect);if(old&&old!==s.id)io.sockets.sockets.get(old)?.disconnect(true);publish(r);s.emit('identity',{id:existing.id,token:existing.token});return {room:r,player:existing};}
  const open=r?.players.filter(p=>!p.kicked&&!p.spectating).length||0;if(open>=8&&!data.spectating)throw Object.assign(Error('This Cash table is full. You can watch instead.'),{code:'FULL'});
  // Buying in also claims a table lease and recovers any interrupted older instance.
  let seat;if(!data.spectating)seat=await store.buyIn(account,stake.code,Number(data.buyIn));
  else{const profile=await store.profile(account);if(profile?.seats.some(p=>p.code===stake.code))throw Object.assign(Error('Rejoin your funded Cash seat before watching.'),{code:'SEATED'});}
  if(!r){r=createRoom(stake.code,'cash');Object.assign(r,{bankroll:{...stake},small:stake.small,big:stake.big,baseSmall:stake.small,baseBig:stake.big,minRaise:stake.big,startingBank:stake.maxBuyIn});rooms.set(r.code,r);}
  if(!seat&&data.spectating){/* A viewing-only room has no chips to protect yet. */}
  const token=randomBytes(24).toString('hex'),p={id:randomBytes(8).toString('hex'),token,name:String(data.name||'Player').trim().slice(0,18)||'Player',socket:s.id,chips:seat?.chips||0,cashSeatId:seat?.id,accountId:account,spectating:!seat,timeCards:3,timeCardsUsed:0,cards:[],total:0,round:0,inHand:false,avatar:isAllowedAvatar(data.avatar)?data.avatar:defaultAvatar,stats:{hands:0,handsWon:0,vpip:0,pfr:0,won:0,actions:0,aggressive:0}};
  r.players.push(p);sessions.set(token,{room:r,player:p});s.emit('identity',{id:p.id,token});publish(r);if(!r.started&&seated(r).length>=2)deal(r);return {room:r,player:p};
 }
 async function leave(r,p,s){
  if(!p.cashSeatId){p.kicked=true;p.spectating=true;p.socket=null;sessions.delete(p.token);publish(r);return {pending:false};}
  p.cashExit=true;clearTimeout(p.cashDisconnect);const pending=r.cashBusy||r.started&&!['waiting','showdown'].includes(r.street);
  if(pending){if(p.inHand&&!p.folded&&p.chips>0){if(r.players[r.turn]===p)act(r,p,'fold',undefined,true);else{p.folded=true;if(r.players.filter(q=>q.inHand&&!q.folded).length<=1)advance(r);else publish(r);}}if(s)s.emit('notice','Your Cash hand will finish before the remaining stack returns to your wallet.');}
  else{r.cashBusy=true;try{await cashOut(r,p);}catch(e){p.cashExit=false;throw e;}finally{r.cashBusy=false;}}
  p.socket=null;p.spectating=true;publish(r);return {pending};
 }
 function disconnect(r,p){p.socket=null;publish(r);p.cashDisconnect=setTimeout(()=>{if(!p.socket)void leave(r,p).catch(()=>{r.cashError='Cash-out is pending. Rejoin to recover your seat.';publish(r);});},15000);p.cashDisconnect.unref?.();}
 async function topUp(r,p,amount,s){if(p.cashExit||!p.cashSeatId||r.cashBusy||r.started&&r.street!=='showdown')throw Object.assign(Error('Top up between hands.'),{code:'IN_HAND'});r.cashBusy=true;try{p.chips=await store.topUp(p.accountId,p.cashSeatId,Number(amount));p.spectating=false;publish(r);emitWallet(p);}finally{r.cashBusy=false;}if(!r.started&&seated(r).length>=2)deal(r);}
 const heartbeat=setInterval(()=>{const codes=[...rooms.values()].filter(r=>r.bankroll&&r.players.some(p=>p.cashSeatId&&!p.kicked)).map(r=>r.code);void store.renew(codes).then(lost=>{for(const code of codes.filter(c=>!lost.includes(c))){const r=rooms.get(code);if(r.cashLeaseRecovering){r.cashLeaseRecovering=false;r.cashError=null;publish(r);if(!r.started&&seated(r).length>=2)deal(r);}}for(const code of lost){const r=rooms.get(code);r.cashError='Cash connection expired. Return home and rejoin.';clearTimeout(r.timer);publish(r);}}).catch(()=>{for(const code of codes){const r=rooms.get(code);r.cashLeaseRecovering=true;r.cashError='Cash connection is recovering. Please wait…';publish(r);}});},15000);heartbeat.unref();
 function enter(s,data){const job=entryQueue.then(()=>enterImpl(s,data));entryQueue=job.catch(()=>{});return job;}
 return {enter,leave,disconnect,finish,beforeDeal,topUp,message};
}
