export const CASH_STAKES=Object.freeze([
 Object.freeze({code:'CASH1',stage:1,small:1,big:2,minBuyIn:40,maxBuyIn:200}),
 Object.freeze({code:'CASH2',stage:2,small:5,big:10,minBuyIn:200,maxBuyIn:1000})
]);
export const cashStake=code=>CASH_STAKES.find(s=>s.code===String(code).toUpperCase());
