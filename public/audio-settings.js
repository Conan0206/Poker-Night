/* Personal audio preferences; never change another player's volume. */
(()=>{
 const defaults={main:100,effects:100,emotes:65};let saved={};try{saved=JSON.parse(localStorage.getItem('poker-volume')||'{}')||{};}catch{}
 const volumes={};for(const key of Object.keys(defaults))volumes[key]=Number.isFinite(saved[key])?Math.max(0,Math.min(100,saved[key])):defaults[key];
 window.pokerAudio={get(key){return volumes[key];},level(key){return volumes.main*volumes[key]/10000;},set(key,value){if(!(key in defaults)||!Number.isFinite(Number(value)))return;volumes[key]=Math.round(Math.max(0,Math.min(100,Number(value))));localStorage.setItem('poker-volume',JSON.stringify(volumes));window.dispatchEvent(new Event('poker-volume-change'));}};
})();
