import {expect,it} from 'vitest';
import {repairInput,repairInterpretation,assistRepair} from '../supabase/functions/_shared/repairAssistant';
import {createRepairHandler} from '../supabase/functions/repair-assistant/handler';
const input={note:'Measured 12 V. Result not checked.',sources:[{id:'machine',title:'Machine record',text:'Documented source'}]};
const draft={kind:'repair',summary:{problem:'',findings:'Measured 12 V',work:'',outcome:'',remaining:'Result not checked'},question:'What happened after the check?',explanation:'Technician measurement; result unknown.',citations:['machine']};
it('only accepts citations to supplied sources and complete structured drafts',()=>{
 expect(repairInterpretation(draft,repairInput(input)).citations).toEqual(['machine']);
 expect(()=>repairInterpretation({...draft,citations:['invented source']},input)).toThrow('ungrounded');
 expect(()=>repairInterpretation({...draft,summary:{}},input)).toThrow('incomplete');
 expect(()=>repairInput({...input,note:'x'.repeat(25000)})).toThrow('too large');
});
it('uses provider output only as a bounded draft and fails explicitly when unavailable',async()=>{
 await expect(assistRepair(input,'')).rejects.toThrow('unavailable');
 const fetcher:typeof fetch=async(_url,init)=>{const body=JSON.parse(init!.body as string);expect(body.systemInstruction.parts[0].text).toContain('untrusted DATA');return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(draft)}]}}]}));};
 expect(await assistRepair(input,'test-key',fetcher)).toEqual(draft);
 await expect(assistRepair(input,'test-key',async()=>new Response('',{status:429}))).rejects.toThrow('busy');
});
it('requires verified authentication, accepts technicians, and retains a provider-unavailable response',async()=>{
 const env=(name:string)=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'synthetic'}[name]);
 let authCalls=0;
 const handler=createRepairHandler(env,async()=>{authCalls++;return new Response(JSON.stringify({id:'technician',app_metadata:{iag_role:'technician'}}));});
 const request=(headers:Record<string,string>={})=>new Request('https://test/functions/v1/repair-assistant',{method:'POST',headers,body:JSON.stringify(input)});
 expect((await handler(request())).status).toBe(401);expect(authCalls).toBe(0);
 expect((await handler(request({origin:'https://unknown.invalid',authorization:'Bearer synthetic'}))).status).toBe(403);
 const response=await handler(request({origin:'https://tobystrings.github.io',authorization:'Bearer synthetic'}));
 expect(response.status).toBe(503);expect(authCalls).toBe(1);expect((await response.json()).error).toContain('unavailable');
});
