/* One layout pass reserves independent areas for seats, board and action dock. */
(()=>{
 const game=document.getElementById('game'),main=document.querySelector('main'),seats=document.getElementById('seats'),table=document.getElementById('table'),controls=document.getElementById('controls');game.append(seats);
 const arrangements={1:[4],2:[2,6],3:[2,4,6],4:[1,3,5,7],5:[1,2,4,6,7],6:[1,2,3,5,6,7],7:[1,2,3,4,5,6,7],8:[0,1,2,3,4,5,6,7]};
 const anchors={0:[50,79],1:[25,65],2:[10,44],3:[28,24],4:[50,16],5:[72,24],6:[90,44],7:[75,65]};
 const mobileAnchors={0:[50,81],1:[16,73],2:[15,48],3:[23,35],4:[50,26],5:[77,35],6:[85,48],7:[84,73]};
 let frame=0;
 function layout(){frame=0;const mobile=innerWidth<=700,dock=controls.getBoundingClientRect().height,extra=Math.max(0,dock-110),base=Math.max(innerHeight,mobile?1120:950),height=base+extra;main.style.height=height+'px';main.style.minHeight=height+'px';game.style.minHeight=height+'px';document.documentElement.style.setProperty('--dock-height',dock+'px');table.style.top=base*(mobile?.40:.22)+'px';table.style.height=base*(mobile?.26:.32)+'px';
 const others=[...seats.querySelectorAll('.seat:not(.self)')].sort((a,b)=>Number(a.dataset.seatOrder)-Number(b.dataset.seatOrder));const slots=arrangements[others.length]||[];others.forEach((seat,i)=>{const slot=slots[i],point=(mobile?mobileAnchors:anchors)[slot];if(!point)return;seat.dataset.slot=slot;seat.style.left=point[0]+'%';seat.style.top=base*point[1]/100+'px';seat.classList.toggle('rightSeat',point[0]>50);});
 const own=seats.querySelector('.seat.self');if(own){own.style.left='50%';own.style.top='auto';}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
 window.layoutPokerTable=layout;new ResizeObserver(schedule).observe(controls);addEventListener('resize',schedule);layout();
})();
