/* One layout pass reserves independent areas for seats, board and action dock. */
(()=>{
 const game=document.getElementById('game'),main=document.querySelector('main'),seats=document.getElementById('seats'),table=document.getElementById('table'),controls=document.getElementById('controls');game.append(seats);
 const arrangements={1:[4],2:[2,6],3:[2,4,6],4:[1,3,5,7],5:[1,2,4,6,7],6:[1,2,3,5,6,7],7:[1,2,3,4,5,6,7],8:[0,1,2,3,4,5,6,7]};
 let frame=0;
 function layout(){
 frame=0;
 const mobile=innerWidth<=700,dock=controls.offsetHeight;
 const viewportHeight=window.visualViewport?.height||innerHeight;
 const base=Math.max(viewportHeight,mobile?1120:950);
 const height=base+Math.max(0,dock-110),scale=Math.min(1,viewportHeight/height);
 // Scale the reserved layout as one stage, so every bottom control stays in view.
 main.style.zoom=String(scale);main.style.width=(innerWidth/scale)+'px';
 main.style.height=height+'px';main.style.minHeight=height+'px';game.style.minHeight=height+'px';
 document.documentElement.style.setProperty('--dock-height',dock+'px');
 const info=document.getElementById('tableInfo');info.style.top=mobile?((document.querySelector('.headerLeftActions').getBoundingClientRect().bottom+12)/scale)+'px':'';
 table.style.top=base*(mobile?.40:.22)+'px';table.style.height=base*(mobile?.26:.32)+'px';
 const own=seats.querySelector('.seat.self');if(own){own.style.left='50%';own.style.top='auto';}
 // Bring the rail to the local avatar, then place other avatars on that ellipse.
 const stageWidth=main.clientWidth,top=base*(mobile?.36:.20);
 const bottom=own?own.offsetTop+own.querySelector('.avatar').offsetHeight/2:base*(mobile?.73:.73);
 const tableHeight=Math.max(mobile?280:300,bottom-top);
 table.style.top=top+'px';table.style.height=tableHeight+'px';
 const cx=table.offsetLeft+table.offsetWidth/2,cy=top+tableHeight/2;
 const rx=table.offsetWidth/2-15,ry=tableHeight/2-8;
 const others=[...seats.querySelectorAll('.seat:not(.self)')].sort((a,b)=>Number(a.dataset.seatOrder)-Number(b.dataset.seatOrder));
 const slots=arrangements[others.length]||[];
 others.forEach((seat,i)=>{
 const slot=slots[i];if(slot===undefined)return;
 const angle=slot*Math.PI/4,avatar=seat.querySelector('.avatar');
 const x=cx-rx*Math.sin(angle),y=cy+ry*Math.cos(angle);
 const left=Math.max(8,Math.min(stageWidth-seat.offsetWidth-8,x-avatar.offsetLeft-avatar.offsetWidth/2));
 seat.dataset.slot=slot;seat.style.left=(left+seat.offsetWidth/2)+'px';
 seat.style.top=(y-avatar.offsetTop-avatar.offsetHeight/2+seat.offsetHeight/2)+'px';
 seat.classList.toggle('rightSeat',x>cx);
 });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
 window.layoutPokerTable=layout;new ResizeObserver(schedule).observe(controls);addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);layout();
})();
