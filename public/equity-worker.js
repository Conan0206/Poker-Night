import {estimate} from './equity.js';
onmessage=({data})=>{postMessage({key:data.key,equity:estimate(data)});};
