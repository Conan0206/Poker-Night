import {createDatabase} from '../database.js';
const db=createDatabase();try{const connected=await db.init();console.log(JSON.stringify(db.status()));if(!connected)process.exitCode=1;}finally{await db.close();}
