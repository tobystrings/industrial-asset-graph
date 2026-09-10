import { planWithGemini, PlannerError } from '../_shared/mapPlanner.ts';
export function createHandler(env: (name:string)=>string|undefined, fetcher: typeof fetch = fetch) {
  return async (request: Request) => {
    const origin=request.headers.get('origin')??'';
    const allowed=(env('IAG_ALLOWED_ORIGINS')??'https://tobystrings.github.io').split(',').map(x=>x.trim());
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
    const reply=(status:number,value:object)=>new Response(JSON.stringify(value),{status,headers});
    if(origin&&!allowed.includes(origin)) return reply(403,{error:'Origin is not allowed.'});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
    const path=new URL(request.url).pathname;
    const statusRequest=request.method==='GET'&&path.endsWith('/map-studio/status');
    if(!statusRequest&&!(request.method==='POST'&&path.endsWith('/map-studio/plan'))) return reply(404,{error:'Not found.'});
    const authorization=request.headers.get('authorization');
    if(!authorization?.startsWith('Bearer ')) return reply(401,{error:'Sign in to use Gemini map editing.'});
    try {
      // Validate with Supabase Auth; never trust decoded browser claims or user_metadata.
      const auth=await fetcher(`${env('SUPABASE_URL')}/auth/v1/user`,{headers:{Authorization:authorization,apikey:env('SUPABASE_ANON_KEY')??''},signal:AbortSignal.timeout(10000)});
      if(!auth.ok) return reply(401,{error:'Your session expired. Sign in again.'});
      const user=await auth.json();
      if(!user.id||user.app_metadata?.iag_role!=='admin') return reply(403,{error:'Administrator access is required for map planning.'});
      const key=env('GEMINI_API_KEY')??'';
      if(statusRequest) return reply(200,{configured:Boolean(key.trim()),provider:'gemini'});
      if(Number(request.headers.get('content-length')??0)>1000000) return reply(413,{error:'Request is too large.'});
      const reader=request.body?.getReader();
      if(!reader) return reply(400,{error:'Missing request.'});
      let size=0;const chunks:Uint8Array[]=[];
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();return reply(413,{error:'Request is too large.'});}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let input:unknown;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,{error:'Invalid JSON request.'});}
      return reply(200,await planWithGemini(input,key,fetcher));
    } catch(error) {
      if(error instanceof PlannerError) return reply(error.status,{error:error.message});
      return reply(400,{error:'Unable to prepare this edit. Check the request and connection. No changes were applied.'});
    }
  };
}
