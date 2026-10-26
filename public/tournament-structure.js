// Gentler, whole-chip levels for a 100 BB starting stack at the default 5/10.
export const blindMultipliers=[1,2,3,4,6,8,10,15,20,30,40,60,80];
export function tournamentBlinds(small=5,big=10,level=1){
 const multiplier=blindMultipliers[Math.max(0,Math.min(blindMultipliers.length-1,level-1))];
 return {small:small*multiplier,big:big*multiplier};
}
export function tournamentSchedule(small=5,big=10){
 return blindMultipliers.map((_,index)=>({level:index+1,...tournamentBlinds(small,big,index+1)}));
}
