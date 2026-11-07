import {botStyle} from './public/bot-styles.js';
export const DEFAULT_POLICY=Object.freeze({checkRaiseValue:.58,checkRaiseDraw:.26,checkRaiseBluff:.07,trap:.26,donkValue:.34,donkDraw:.14,lateBluff:.27,multiBluff:.08});
export const POLICY_BOUNDS=Object.freeze({checkRaiseValue:[.35,.75],checkRaiseDraw:[.1,.38],checkRaiseBluff:[.01,.1],trap:[.1,.4],donkValue:[.15,.48],donkDraw:[.03,.22],lateBluff:[.1,.35],multiBluff:[.01,.12]});
export const BASELINE_POLICY_ID='mixed-tactics-v2-default';
export const TRAINABLE_KEYS=Object.freeze(['checkRaiseValue','checkRaiseDraw','trap','donkValue','donkDraw','multiBluff']);
export function normalizePolicy(params={}){return Object.fromEntries(Object.entries(DEFAULT_POLICY).map(([key,value])=>{const [low,high]=POLICY_BOUNDS[key];return [key,Number.isFinite(params[key])?Math.max(low,Math.min(high,params[key])):value];}));}
// Learned frequencies are deliberately limited to multiway cash decisions.
export function tacticPolicy(view){
 const base=view.mode!=='tournament'&&view.opponents>=2?normalizePolicy(view.policyParams):DEFAULT_POLICY;
 const style=botStyle(view.botStyle);
 return normalizePolicy({...base,checkRaiseValue:base.checkRaiseValue*style.aggression,checkRaiseDraw:base.checkRaiseDraw*style.aggression,
  checkRaiseBluff:base.checkRaiseBluff*style.bluff,trap:base.trap*style.trap,donkValue:base.donkValue*style.aggression,
  donkDraw:base.donkDraw*style.bluff,lateBluff:base.lateBluff*style.bluff,multiBluff:base.multiBluff*style.bluff});
}
