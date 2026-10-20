import {rank} from './equity.js';

export const handRankings = [
 {id:'royal',name:'Royal Flush',description:'A, K, Q, J, 10 in one suit',cards:['Ah','Kh','Qh','Jh','Th'],used:5},
 {id:'straight-flush',name:'Straight Flush',description:'Five suited cards in sequence',cards:['Jc','Tc','9c','8c','7c'],used:5},
 {id:'four',name:'Four of a Kind',description:'Four cards of the same rank',cards:['8s','8h','8c','8d','6s'],used:4},
 {id:'full-house',name:'Full House',description:'Three of a kind plus a pair',cards:['Ah','Ac','Ad','Ts','Td'],used:5},
 {id:'flush',name:'Flush',description:'Five cards of the same suit',cards:['Ks','Js','9s','8s','2s'],used:5},
 {id:'straight',name:'Straight',description:'Five cards in sequence',cards:['Tc','9d','8s','7h','6s'],used:5},
 {id:'three',name:'Three of a Kind',description:'Three cards of the same rank',cards:['7s','7h','7c','Kh','Jc'],used:3},
 {id:'two-pair',name:'Two Pair',description:'Two different pairs',cards:['Jc','Jd','4c','4d','Qc'],used:4},
 {id:'pair',name:'Pair',description:'Two cards of the same rank',cards:['Kc','Kd','9c','2s','Tc'],used:2},
 {id:'high',name:'High Card',description:'Your highest card plays',cards:['Ac','7c','3h','9c','2c'],used:1}
];

// Only the local player's known cards and the actual revealed board are inputs.
export function currentHandRank(hole,board){
 const cards=[...hole,...board];
 if(hole.length!==2||![0,3,4,5].includes(board.length)||new Set(cards).size!==cards.length||cards.some(c=>! /^[2-9TJQKA][shdc]$/.test(c)))return null;
 const score=rank(cards),category=Math.floor(score/15**5);
 if(category===8)return Math.floor(score/15**4)%15===14?'royal':'straight-flush';
 return ['high','pair','two-pair','three','straight','flush','full-house','four'][category]||null;
}
