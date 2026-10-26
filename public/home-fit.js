// Keep every menu control visible on shorter screens without clipping content.
(()=>{
 const menu=document.querySelector('.homeMenu'),welcome=document.getElementById('welcome');
 function fit(){
  if(!welcome.open)return;
  const available=Math.max(180,innerHeight-(innerWidth<=700?96:24));
  const scale=Math.min(1,available/menu.offsetHeight);
  const value=String(Math.floor(scale*1000)/1000);
  if(menu.style.zoom!==value)menu.style.zoom=value;
 }
 new ResizeObserver(fit).observe(menu);new MutationObserver(fit).observe(welcome,{attributes:true,attributeFilter:['open']});addEventListener('resize',fit);document.fonts.ready.then(fit);fit();
})();
