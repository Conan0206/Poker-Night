import {avatarChoices,defaultAvatar} from './avatar-catalog.js';
const picker=document.getElementById('menuAvatars'),input=document.getElementById('chosenAvatar');
const saved=localStorage.getItem('poker-avatar');
input.value=avatarChoices.some(([emoji])=>emoji===saved)?saved:defaultAvatar;
for(const [emoji,name] of avatarChoices){
 const button=document.createElement('button');button.type='button';button.textContent=emoji;
 button.className='menuAvatar';button.setAttribute('aria-label',name+' avatar');button.title=name;
 button.setAttribute('aria-pressed',String(input.value===emoji));
 button.addEventListener('click',()=>{input.value=emoji;localStorage.setItem('poker-avatar',emoji);for(const other of picker.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===button));});
 picker.append(button);
}
