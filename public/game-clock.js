// Server deadlines must not depend on the player's computer clock.
(() => {
 let serverTime = 0, receivedAt = 0, ready = false;
 window.pokerClock = {
  observe(timestamp) {
   if (!Number.isFinite(timestamp)) return;
   serverTime = timestamp;
   receivedAt = performance.now();
   ready = true;
  },
  remaining(deadline) {
   if (!Number.isFinite(deadline)) return 0;
   const now = ready ? serverTime + performance.now() - receivedAt : Date.now();
   return Math.max(0, deadline - now);
  }
 };
})();
