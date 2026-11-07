import test from 'node:test';
import assert from 'node:assert/strict';
import {translateText} from './public/language-model.js';

test('English is the default and Chinese translates UI labels without touching amounts',()=>{
 assert.equal(translateText('Table settings'),'Table settings');
 assert.equal(translateText('Table settings','zh'),'牌桌设置');
 assert.equal(translateText('  Call $935 (93.5 BB)  ','zh'),'  跟注 $935 (93.5 BB)  ');
 for(const value of ['$1,000','100 BB','TAG 2','Conan','Call of Duty','中文'])assert.equal(translateText(value,'zh'),value);
 assert.equal(translateText('Call of Duty · Statistics','zh'),'Call of Duty · 统计');
});
test('Chinese preserves dynamic timer, blind, count and tutorial values',()=>{
 assert.equal(translateText('Blind levels · Level 4','zh'),'盲注级别 · 第 4 级');
 assert.equal(translateText('Your turn · 26s','zh'),'轮到你 · 26秒');
 assert.equal(translateText('Reveal hand (3)','zh'),'查看手牌 (3)');
 assert.equal(translateText('Average BB = 98.5 BB','zh'),'平均 BB = 98.5 BB');
 assert.equal(translateText('QUICK TOUR · 10 / 12','zh'),'快速教程 · 10 / 12');
});
