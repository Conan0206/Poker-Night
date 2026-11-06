/* Screen-coordinate geometry shared by every seat and game mode. */
(()=>{
 window.findPokerWagerPosition=({felt,avatar,width,height,obstacles=[],occupied=[],self=false,communityAnchor=null,target=null})=>{
  const cx=felt.left+felt.width/2,cy=felt.top+felt.height/2,rx=felt.width/2-8,ry=felt.height/2-8,pad=5;
  if(rx<=0||ry<=0)return null;
  const ax=avatar.left+avatar.width/2,ay=avatar.top+avatar.height/2,dx=cx-ax,dy=cy-ay,d=Math.hypot(dx,dy)||1;
  const preferred=target|| (self&&communityAnchor?{x:(communityAnchor.left+communityAnchor.right)/2,y:communityAnchor.bottom+height/2+10}:self?{x:avatar.right+width/2+10,y:ay-8}:{x:ax+dx/d*(avatar.width/2+width/3+18),y:ay+dy/d*(avatar.height/2+height/2+14)});
  let best=null,score=Infinity;
  for(let y=felt.top+height/2+pad;y<felt.bottom-height/2-pad;y+=6)for(let x=felt.left+width/2+pad;x<felt.right-width/2-pad;x+=6){
   if(self&&!communityAnchor&&(x-width/2<avatar.right+6||x-width/2>avatar.right+30))continue;
   if(self&&communityAnchor&&y-height/2<communityAnchor.bottom+6)continue;
   const rect={left:x-width/2-pad,right:x+width/2+pad,top:y-height/2-pad,bottom:y+height/2+pad};
   if([rect.left,rect.right].some(px=>[rect.top,rect.bottom].some(py=>((px-cx)/rx)**2+((py-cy)/ry)**2>1)))continue;
   if([...obstacles,...occupied].some(r=>rect.left<r.right&&rect.right>r.left&&rect.top<r.bottom&&rect.bottom>r.top))continue;
   const distance=target?12*((x-preferred.x)**2+(y-preferred.y)**2):self?12*(x-preferred.x)**2+(y-preferred.y)**2:(x-ax)**2+(y-ay)**2+.2*((x-preferred.x)**2+(y-preferred.y)**2);
   if(distance<score){score=distance;best={x,y,rect};}
  }
  return best;
 };
})();

/* Panel placement uses seat, card and control rectangles as hard exclusions. */
window.findPokerPanelPosition=({width,height,viewportWidth,viewportHeight,board,obstacles=[]})=>{const gap=12,preferred={x:board.left-width-20,y:board.top+(board.height-height)/2};let best=null,score=Infinity;const xs=[preferred.x,board.right+20,12,viewportWidth-width-12],ys=[preferred.y,board.top-height-20,board.bottom+20,140];for(let x=12;x<=viewportWidth-width-12;x+=16)xs.push(x);for(let y=12;y<=viewportHeight-height-12;y+=16)ys.push(y);for(const x of xs)for(const y of ys){if(x<12||y<12||x+width>viewportWidth-12||y+height>viewportHeight-12)continue;const rect={left:x,top:y,right:x+width,bottom:y+height};if(obstacles.some(r=>rect.left<r.right+gap&&rect.right>r.left-gap&&rect.top<r.bottom+gap&&rect.bottom>r.top-gap))continue;const d=(x-preferred.x)**2+(y-preferred.y)**2;if(d<score){score=d;best={x,y};}}return best;};
