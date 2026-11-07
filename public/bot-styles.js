export const BOT_STYLES=Object.freeze({
 balanced:{label:'Balanced',description:'Mixes value bets, draws and selective bluffs.',opening:0,aggression:1,bluff:1,trap:1,jam:1},
 tight:{label:'Tight',description:'Chooses stronger starting hands and protects its stack.',opening:.045,aggression:.85,bluff:.6,trap:1.1,jam:.8},
 pressure:{label:'Pressure',description:'Steals more often in position and pressures vulnerable stacks.',opening:-.035,aggression:1.15,bluff:1.2,trap:.7,jam:1.15},
 tricky:{label:'Tricky',description:'Mixes more traps, check-raises and blocker bluffs.',opening:.005,aggression:1.05,bluff:1.15,trap:1.4,jam:.95}
});
export const BOT_STYLE_IDS=Object.freeze(Object.keys(BOT_STYLES));
export const botStyle=id=>BOT_STYLES[id]||BOT_STYLES.balanced;
export const styleForBot=number=>BOT_STYLE_IDS[Math.max(0,number-1)%BOT_STYLE_IDS.length];
