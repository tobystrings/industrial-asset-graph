import { afterEach, describe, expect, it, vi } from 'vitest';
import { guideStorageKey, loadGuidePreferences, saveGuidePreferences, defaultGuidePreferences } from './guideStorage';
afterEach(() => vi.unstubAllGlobals());
describe('Genie preference isolation', () => {
  it('isolates users and facilities and validates corrupt values', () => {
    const values = new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key) ?? null,setItem:(key:string,value:string)=>values.set(key,value)});
    const a = guideStorageKey('plant-a','user-a'); const b = guideStorageKey('plant-b','user-a'); const c = guideStorageKey('plant-a','user-b');
    saveGuidePreferences({...defaultGuidePreferences,enabled:false,personality:'full'},a);
    expect(loadGuidePreferences(a).enabled).toBe(false);
    expect(loadGuidePreferences(b).enabled).toBe(true); expect(loadGuidePreferences(c).personality).toBe('crew');
    values.set(b,JSON.stringify({enabled:'false',personality:'unsafe',dismissed:['ok',5],animationMode:'bad'}));
    expect(loadGuidePreferences(b)).toMatchObject({enabled:true,personality:'crew',dismissed:['ok'],animationMode:'full'});
    values.set(b,'null'); expect(loadGuidePreferences(b)).toEqual(defaultGuidePreferences);
  });
  it('survives unavailable storage', () => {
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('full')}});
    expect(loadGuidePreferences()).toEqual(defaultGuidePreferences);
    expect(()=>saveGuidePreferences(defaultGuidePreferences)).not.toThrow();
  });
});
