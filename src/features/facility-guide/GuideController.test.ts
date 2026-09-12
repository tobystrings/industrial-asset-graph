import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuideController } from './GuideController';
import { defaultGuidePreferences } from './guideStorage';
const p = { ...defaultGuidePreferences, automaticTips: true };
afterEach(() => vi.unstubAllGlobals());
describe('Genie reminders', () => {
  it('allows at most three distinct reminders and never repeats an asset in a session', () => {
    const c = new GuideController();
    expect(c.mayAutoPrompt(1_000_000,false,p,'A')).toBe(true);
    c.recordPrompt(1_000_000,'A');
    expect(c.mayAutoPrompt(2_000_000,false,p,'A')).toBe(false);
    expect(c.mayAutoPrompt(1_100_000,false,p,'B')).toBe(false);
    expect(c.mayAutoPrompt(2_000_000,false,p,'B')).toBe(true);
    c.recordPrompt(2_000_000,'B'); c.recordPrompt(3_000_000,'C');
    expect(c.mayAutoPrompt(4_000_000,false,p,'D')).toBe(false);
  });
  it('honors persisted cooldown, rare frequency, mute, hide, completed hints and snooze', () => {
    const c = new GuideController();
    const now = 5_000_000;
    for (const override of [{ muted: true }, { enabled: false }, { automaticTips: false }, { snoozedUntil: now + 1 }, { lastReminderAt: now - 1 }, { dismissed: ['A'] }]) expect(c.mayAutoPrompt(now,false,{...p,...override},'A')).toBe(false);
    expect(c.mayAutoPrompt(now,false,{...p,lastReminderAt:now-700_000},'A')).toBe(true);
    expect(c.mayAutoPrompt(now,false,{...p,lastReminderAt:now-700_000,reminderFrequency:'rare'},'A')).toBe(false);
    expect(c.mayAutoPrompt(now,false,{...p,snoozedUntil:now-1},'A')).toBe(true);
  });
  it('keeps the session cap across reloads and isolates scope', () => {
    const values = new Map<string,string>();
    vi.stubGlobal('sessionStorage',{getItem:(key:string)=>values.get(key) ?? null,setItem:(key:string,value:string)=>values.set(key,value)});
    const c = new GuideController('plant:user');
    c.recordPrompt(1_000_000,'A'); c.recordPrompt(2_000_000,'B'); c.recordPrompt(3_000_000,'C');
    expect(new GuideController('plant:user').mayAutoPrompt(5_000_000,false,p,'D')).toBe(false);
    expect(new GuideController('other:user').mayAutoPrompt(5_000_000,false,p,'D')).toBe(true);
  });
});
