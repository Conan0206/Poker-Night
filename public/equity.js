// Comparable seven-card hand ranks. Suits never break ties.
export function rank(cards){
 const counts=Array(15).fill(0), suits=[[],[],[],[]];
 for(const c of cards){const r='23456789TJQKA'.indexOf(c[0])+2;counts[r]++;suits['shdc'.indexOf(c[1])].push(r);}
 const descending=Array.from({length:13},(_,i)=>14-i);
 const straight=rs=>{const set=new Set(rs);if(set.has(14))set.add(1);for(let high=14;high>=5;high--)if([0,1,2,3,4].every(d=>set.has(high-d)))return high;return 0;};
 const encode=(category,rs)=>[category,...rs,...Array(5-rs.length).fill(0)].reduce((n,r)=>n*15+r,0);
 const flush=suits.find(s=>s.length>=5);if(flush){const sf=straight(flush);if(sf)return encode(8,[sf]);}
 const groups=n=>descending.filter(r=>counts[r]>=n),four=groups(4),three=groups(3),pairs=groups(2);
 if(four.length)return encode(7,[four[0],descending.find(r=>r!==four[0]&&counts[r])]);
 if(three.length){const pair=pairs.find(r=>r!==three[0]);if(pair)return encode(6,[three[0],pair]);}
 if(flush)return encode(5,flush.sort((a,b)=>b-a).slice(0,5));
 const st=straight(descending.filter(r=>counts[r]));if(st)return encode(4,[st]);
 if(three.length)return encode(3,[three[0],...descending.filter(r=>r!==three[0]&&counts[r]).slice(0,2)]);
 if(pairs.length>=2)return encode(2,[...pairs.slice(0,2),descending.find(r=>!pairs.slice(0,2).includes(r)&&counts[r])]);
 if(pairs.length)return encode(1,[pairs[0],...descending.filter(r=>r!==pairs[0]&&counts[r]).slice(0,3)]);
 return encode(0,descending.filter(r=>counts[r]).slice(0,5));
}
export function estimate({hole,board,opponents,samples=2500},random=Math.random){
 const known=[...hole,...board];if(hole.length!==2||board.length>5||new Set(known).size!==known.length||known.some(c=>! /^[2-9TJQKA][shdc]$/.test(c))||opponents<1||opponents>7)throw Error('Invalid equity input');
 const deck=[...'23456789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s)).filter(c=>!known.includes(c));let total=0;
 for(let n=0;n<samples;n++){const pool=deck.slice(),draw=()=>pool.splice(Math.floor(random()*pool.length),1)[0];const community=board.slice();while(community.length<5)community.push(draw());const own=rank([...hole,...community]);let ties=1,lost=false;for(let p=0;p<opponents;p++){const other=rank([draw(),draw(),...community]);if(other>own)lost=true;else if(other===own)ties++;}if(!lost)total+=1/ties;}
 return total/samples;
}
