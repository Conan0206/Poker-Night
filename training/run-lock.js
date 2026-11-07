import {open,readFile,unlink} from 'node:fs/promises';
export async function runningLock(path){try{const pid=Number(await readFile(path,'utf8'));if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function acquireLock(path){
 let file;try{file=await open(path,'wx');}catch(e){if(e.code!=='EEXIST')throw e;if(await runningLock(path))return null;await unlink(path).catch(e=>{if(e.code!=='ENOENT')throw e;});try{file=await open(path,'wx');}catch(e){if(e.code==='EEXIST')return null;throw e;}}
 await file.writeFile(String(process.pid));return async()=>{await file.close();await unlink(path).catch(()=>{});};
}
