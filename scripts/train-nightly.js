import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {acquireLock,runningLock} from '../training/run-lock.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'.training');await mkdir(out,{recursive:true});
const args=process.argv.slice(2),smoke=args.includes('--smoke'),limit=Number(args.find(a=>a.startsWith('--seconds='))?.split('=')[1]||(smoke?45:900));
if(!Number.isFinite(limit)||limit<10||limit>900)throw Error('Training limit must be 10–900 seconds');
const release=await acquireLock(join(out,'nightly-runner.lock'));
if(!release){console.log('Training already running; skipped.');process.exit(0);}
try{
 if(await runningLock(join(out,'runner.lock'))||await runningLock(join(out,'tournament-runner.lock'))){console.log('Training already running; skipped.');}
 else for(const [mode,script] of [['cash','train-bots.js'],['tournament','train-tournament.js']]){
  console.log(`Starting bounded ${mode} training.`);
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[join(root,'scripts',script),`--seconds=${Math.floor(limit/2)}`,...(smoke?['--smoke']:[])],{cwd:root,env:process.env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>resolve(code??1));});
  if(code)process.exitCode=1;
 }
}finally{await release();}
