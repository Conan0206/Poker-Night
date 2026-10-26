import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('homepage format cards route cash to MAIN and tournaments to a new tournament table',()=>{
 const elements=Object.fromEntries(['mode','welcome','joinMain','create','formatNote','name','chosenAvatar'].map(id=>['#'+id,{value:id==='mode'?'cash':id==='name'?'Tester':'😎',classList:{toggle(){}},textContent:''}]));
 const buttons=['cash','tournament'].map(mode=>({dataset:{gameFormat:mode},setAttribute(k,v){this[k]=v;}}));let request;
 const source=readFileSync('public/app.js','utf8');const start=source.indexOf('const formatChoices=');const end=source.indexOf(";document.querySelector('.brand')",start);
 vm.runInNewContext(source.slice(start,end),{$:id=>elements[id],document:{querySelectorAll:()=>buttons},joinFromMenu:data=>request=data});
 elements['#joinMain'].onclick();assert.equal(request.code,'MAIN');assert.equal(request.mode,'cash');buttons[1].onclick();assert.equal(elements['#joinMain'].textContent,'Create Tournament');assert.equal(buttons[1]['aria-pressed'],'true');elements['#joinMain'].onclick();assert.equal(request.code,undefined);assert.equal(request.mode,'tournament');assert.match(elements['#formatNote'].textContent,/7 minutes/);buttons[0].onclick();assert.equal(elements['#joinMain'].textContent,'Join Main Table');
});
