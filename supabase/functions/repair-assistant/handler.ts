import {assistRepair} from '../_shared/repairAssistant.ts';
import {PlannerError} from '../_shared/mapPlanner.ts';
export function createRepairHandler(env:(name:string)=>string|undefined,fetcher:typeof fetch=fetch){
 return async(request:Request)=>{
  const origin=request.headers.get('origin')??'';
  const allowed=(env('IAG_ALLOWED_ORIGINS')??'https://tobystrings.github.io').split(',').map(v=>v.trim());
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowed.includes(origin))return reply(403,{error:'Origin is not allowed.'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'Use a repair request.'});
  const authorization=request.headers.get('authorization');
  if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sign in to use connected Genie.'});
  try{
   const auth=await fetcher(`${env('SUPABASE_URL')}/auth/v1/user`,{headers:{Authorization:authorization,apikey:env('SUPABASE_ANON_KEY')??''},signal:AbortSignal.timeout(10000)});
   if(!auth.ok||!(await auth.json()).id)return reply(401,{error:'Your session expired. Your work remains saved.'});
   const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Missing repair request.'});
   const chunks:Uint8Array[]=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>110000){await reader.cancel();return reply(413,{error:'Repair request is too large.'});}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const input=JSON.parse(new TextDecoder().decode(bytes));
   return reply(200,await assistRepair(input,env('GEMINI_API_KEY')??'',fetcher));
  }catch(e){return reply(e instanceof PlannerError?e.status:400,{error:e instanceof PlannerError?e.message:'Genie could not interpret this material. Your original work is retained.'});}
 };
}
