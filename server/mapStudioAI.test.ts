import { describe,it,expect,vi,afterEach } from 'vitest';
import { mapAIStatus,planMapEdit,validateAIPlan } from './mapStudioAI';
import { createHandler } from '../supabase/functions/map-studio/handler';
const input={instruction:'flip this door',selection:[{kind:'symbol' as const,id:'door-1'}],objects:[{kind:'symbol' as const,id:'door-1',name:'Door'}]};
const plan={actions:[{op:'flip',targets:input.selection}],clarification:''};
const answer=()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(plan)}]}}]}));
afterEach(()=>vi.unstubAllEnvs());
describe('Gemini map boundary',()=>{
 it('requires a server key and never exposes it',()=>{vi.stubEnv('GEMINI_API_KEY','');expect(mapAIStatus()).toEqual({configured:false});vi.stubEnv('GEMINI_API_KEY','secret');expect(mapAIStatus()).toEqual({configured:true});});
 it('uses Gemini JSON generation and validates returned actions',async()=>{vi.stubEnv('GEMINI_API_KEY','secret');const f=vi.fn().mockResolvedValue(answer());expect(await planMapEdit(input,f)).toEqual(plan);expect(f.mock.calls[0][0]).toContain('gemini-2.5-flash:generateContent');expect(JSON.parse(f.mock.calls[0][1].body).generationConfig.responseMimeType).toBe('application/json');});
 it('stops on quota without retry or fallback',async()=>{vi.stubEnv('GEMINI_API_KEY','secret');const f=vi.fn().mockResolvedValue(new Response('',{status:429}));await expect(planMapEdit(input,f)).rejects.toThrow(/quota/);expect(f).toHaveBeenCalledTimes(1);});
 it('rejects unknown targets and incomplete responses',async()=>{expect(()=>validateAIPlan({actions:[{op:'delete',targets:[{kind:'symbol',id:'other'}]}],clarification:''},input)).toThrow(/unknown/);vi.stubEnv('GEMINI_API_KEY','secret');await expect(planMapEdit(input,vi.fn().mockResolvedValue(new Response('{"candidates":[]}')))).rejects.toThrow(/incomplete/);});
 const env=(name:string)=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',GEMINI_API_KEY:'secret'}[name]);
 const request=(method='POST',token=true,origin='https://tobystrings.github.io')=>new Request('https://example.supabase.co/functions/v1/map-studio/'+(method==='GET'?'status':'plan'),{method,headers:{origin,...(token?{authorization:'Bearer test'}:{})},...(method==='POST'?{body:JSON.stringify(input)}:{})});
 it('rejects anonymous, disallowed origins, and user-editable admin claims before Gemini',async()=>{const f=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'user',user_metadata:{iag_role:'admin'}})));const h=createHandler(env,f);expect((await h(request('POST',false))).status).toBe(401);expect((await h(request('POST',true,'https://evil.example'))).status).toBe(403);expect(f).not.toHaveBeenCalled();expect((await h(request())).status).toBe(403);expect(f).toHaveBeenCalledTimes(1);});
 it('checks admin status without a provider call and returns no key',async()=>{const f=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'admin',app_metadata:{iag_role:'admin'}})));const r=await createHandler(env,f)(request('GET'));expect(await r.json()).toEqual({configured:true,provider:'gemini'});expect(f).toHaveBeenCalledTimes(1);});
 it('allows an authenticated admin preview and preserves provider quota errors',async()=>{const f=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id:'admin',app_metadata:{iag_role:'admin'}}))).mockResolvedValueOnce(new Response('',{status:429}));const r=await createHandler(env,f)(request());expect(r.status).toBe(429);expect((await r.json()).error).toContain('quota');expect(f).toHaveBeenCalledTimes(2);});
});
