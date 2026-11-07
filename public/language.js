import {translateText} from './language-model.js';

let language='en';
try{if(localStorage.getItem('poker-language')==='zh')language='zh';}catch{}
const originals=new WeakMap(),attributes=new WeakMap();
const skip='script,style,textarea,input,[data-i18n-skip],.playerName,.card,.homePlayingCard,#chatMessages,.chatline,#spectatorNames,.runVotePlayers li>span,.runWinner,.historyWinner>span,#championTitle,.betOwner,.betPlayerName,.tableChipStack,.pokerChip';
const attributeNames=['aria-label','title','placeholder'];
function text(node){
 if(node.parentElement?.closest(skip))return;
 const current=node.nodeValue,previous=originals.get(node),source=previous&&previous.output===current?previous.source:current;
 const output=translateText(source,language);originals.set(node,{source,output});if(output!==current)node.nodeValue=output;
}
function labels(element){
 if(element.closest(skip)&&!element.matches('input,textarea'))return;
 let record=attributes.get(element);if(!record){record={};attributes.set(element,record);}
 for(const name of attributeNames){
  if(!element.hasAttribute(name))continue;
  const current=element.getAttribute(name),previous=record[name],source=previous&&previous.output===current?previous.source:current,output=translateText(source,language);
  record[name]={source,output};if(current!==output)element.setAttribute(name,output);
 }
}
function localize(root){
 if(root.nodeType===Node.TEXT_NODE){text(root);return;}
 if(root.nodeType!==Node.ELEMENT_NODE||root.closest('script,style,[data-i18n-skip]'))return;
 labels(root);for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]'))labels(el);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())text(walker.currentNode);
}
const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributeNames};
const observer=new MutationObserver(records=>{
 // Disconnect while writing translated copy, avoiding observer feedback loops.
 observer.disconnect();
 const roots=new Set();for(const record of records){if(record.type==='attributes')labels(record.target);else if(record.type==='characterData')text(record.target);else for(const node of record.addedNodes)roots.add(node);}
 for(const root of roots)if(root.isConnected)localize(root);
 observer.observe(document.body,options);
});
function apply(){observer.disconnect();document.documentElement.lang=language==='zh'?'zh-Hans':'en';localize(document.body);observer.observe(document.body,options);}
window.pokerLanguage={
 get:()=>language,
 set(value){
  if(!['en','zh'].includes(value))return;
  language=value;try{localStorage.setItem('poker-language',value);}catch{}
  apply();window.dispatchEvent(new CustomEvent('poker-language-change',{detail:{language}}));requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 },
 translate:source=>translateText(source,language)
};
window.renderLanguageSettings=body=>{
 const heading=document.createElement('h3');heading.textContent='Language';
 const label=document.createElement('label');label.className='languageSetting';label.textContent='Choose your language';
 const select=document.createElement('select');select.id='languageChoice';select.setAttribute('aria-label','Language');
 for(const [value,name] of [['en','English'],['zh','中文']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}
 select.value=language;select.onchange=()=>window.pokerLanguage.set(select.value);label.append(select);
 const note=document.createElement('p');note.className='fine';note.textContent='Saved for this browser.';body.append(heading,label,note);
};
apply();
