import {CASH_STAKES} from './public/cash-stakes.js';
// The directory never exposes private invite codes, player names or session IDs.
export function tableDirectory(rooms){
 const result=['MAIN','TOUR'].map(code=>({code,name:code==='MAIN'?'Main custom table':'Main tournament',mode:code==='MAIN'?'cash':'tournament',players:0,watching:0,playing:false,private:false}));
 result.splice(1,0,...CASH_STAKES.map(s=>({...s,name:'Cash · Stage '+s.stage,bankroll:true,mode:'cash',players:0,watching:0,playing:false,private:false})));
 let privateNumber=0;
 for(const room of rooms.values()){
  const seated=room.players.filter(p=>!p.kicked&&!p.spectating&&(p.bot||p.socket));
  const watching=room.players.filter(p=>!p.bot&&!p.kicked&&p.spectating&&p.socket).length;
  const main=result.find(t=>t.code===room.code);
  if(!main&&!seated.length&&!watching)continue;
  const entry={mode:room.mode,players:seated.length,watching,playing:!!room.started,private:!main&&!room.practice};
  if(main)Object.assign(main,entry);
  else if(room.practice)result.unshift({...entry,code:'BOTS',name:'Bot training',practice:true});
  else result.push({...entry,name:'Private table '+(++privateNumber)});
 }
 return result;
}
