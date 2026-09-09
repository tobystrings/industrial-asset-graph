import { describe,it,expect,vi,afterEach } from 'vitest';
import { planMapEdit,validateAIPlan,validatePlanningInput } from './mapStudioAI';
const input={instruction:'flip this door',selection:[{kind:'symbol' as const,id:'door-1'}],objects:[{kind:'symbol' as const,id:'door-1',name:'Door'}]};
afterEach(()=>vi.unstubAllEnvs());
describe('map AI proposal boundary',()=>{
 it('rejects invented targets and malformed values',()=>{
  expect(()=>validateAIPlan({actions:[{op:'delete',targets:[{kind:'symbol',id:'other'}]}],clarification:''},input)).toThrow(/unknown/);
  expect(()=>validateAIPlan({actions:[{op:'move',targets:input.selection,dx:'ten',dy:0}],clarification:''},input)).toThrow(/movement/);
  expect(()=>validatePlanningInput({...input,selection:[{kind:'area',id:'other'}]})).toThrow();
  expect(validateAIPlan({actions:[{op:'delete',targets:input.selection}],clarification:'Which door?'},input).actions).toEqual([]);
 });
 it('uses a server key, requests a non-stored JSON plan, and returns validated actions',async()=>{
  vi.stubEnv('OPENAI_API_KEY','synthetic-server-key');vi.stubEnv('IAG_MAP_AI_MODEL','configured-test-model');
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({actions:[{op:'flip',targets:input.selection}],clarification:''})}]}]}),{status:200}));
  const result=await planMapEdit(input,fetcher);
  expect(result.actions[0].op).toBe('flip');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({store:false,text:{format:{type:'json_object'}}});
 });
 it('does not claim AI when the service is absent or incomplete',async()=>{
  vi.stubEnv('OPENAI_API_KEY','');await expect(planMapEdit(input)).rejects.toThrow(/not configured/);
  vi.stubEnv('OPENAI_API_KEY','test');vi.stubEnv('IAG_MAP_AI_MODEL','test');
  const f=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:'incomplete'}),{status:200}));
  await expect(planMapEdit(input,f)).rejects.toThrow(/incomplete/);
 });
});
