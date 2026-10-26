const recipient='conantai2006@gmail.com';
const site='https://poker-night-udj6.onrender.com/';

export async function sendFeedbackEmail(feedback,{fetchImpl=fetch,enabled=process.env.FEEDBACK_EMAIL_ENABLED!=='false'}={}){
 if(!enabled)return {ok:true,loggedOnly:true};
 try{
  const response=await fetchImpl('https://formsubmit.co/ajax/'+recipient,{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Referer:site,Origin:site},
   signal:AbortSignal.timeout(12000),
   body:JSON.stringify({_subject:'Poker Night feedback · '+feedback.category,_template:'table',_url:site,
    player:feedback.name,table:feedback.table,category:feedback.category,submitted_at:feedback.createdAt,message:feedback.message})
  });
  const result=await response.json();
  if(response.ok&&(result.success===true||result.success==='true'))return {ok:true};
  return {ok:false,status:response.status,activationRequired:/activat/i.test(String(result.message||'')),reason:String(result.message||'Email service rejected the request').slice(0,300)};
 }catch(error){return {ok:false,reason:error.name||'Network error'};}
}
