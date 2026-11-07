export const BOT_STYLES=Object.freeze({
 tag:{label:'TAG',name:'Tight-aggressive',description:'Selective starting hands, strong value bets and timed bluffs.',opening:.025,aggression:1.1,bluff:.8,trap:.9,jam:1},
 lag:{label:'LAG',name:'Loose-aggressive',description:'Wider ranges, more steals and pressure in position.',opening:-.055,aggression:1.2,bluff:1.35,trap:.7,jam:1.2},
 fish:{label:'FISH',name:'Loose-passive · beginner',description:'Plays more hands and calls too often. Easier to practise against.',opening:-.07,aggression:.6,bluff:.25,trap:.6,jam:.6},
 rock:{label:'ROCK',name:'Very tight-passive',description:'Waits for strong hands, with fewer bluffs and cautious betting.',opening:.1,aggression:.65,bluff:.15,trap:1.1,jam:.65}
});
export const BOT_STYLE_IDS=Object.freeze(Object.keys(BOT_STYLES));
const legacy={balanced:'tag',tight:'rock',pressure:'lag',tricky:'tag'};
export const botStyle=id=>BOT_STYLES[id]||BOT_STYLES[legacy[id]]||BOT_STYLES.tag;
export const styleForBot=number=>BOT_STYLE_IDS[Math.max(0,number-1)%BOT_STYLE_IDS.length];
