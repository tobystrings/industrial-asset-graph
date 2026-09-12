import type { GuidePreferences } from './guideTypes';
import { GUIDE_AUTO_COOLDOWN_MS, GUIDE_MAX_AUTO_PROMPTS } from './guideConfig';
export class GuideController {
  private count = 0;
  private lastPrompt = 0;
  private seen = new Set<string>();
  constructor(private storageKey?: string) {
    if (!storageKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey + ':session') ?? '{}');
      if (Number.isInteger(saved.count) && saved.count >= 0) this.count = saved.count;
      if (Number.isFinite(saved.lastPrompt) && saved.lastPrompt >= 0) this.lastPrompt = saved.lastPrompt;
      if (Array.isArray(saved.seen)) this.seen = new Set(saved.seen.filter((key: unknown) => typeof key === 'string'));
    } catch { /* Reminder limits still apply in memory. */ }
  }
  private persist() {
    if (!this.storageKey) return;
    try { sessionStorage.setItem(this.storageKey + ':session', JSON.stringify({ count: this.count, lastPrompt: this.lastPrompt, seen: [...this.seen] })); } catch { /* Optional session cache. */ }
  }
  mayAutoPrompt(now = Date.now(), firstRun = false, preferences?: GuidePreferences, key = '') {
    const cooldown = preferences?.reminderFrequency === 'rare' ? 30 * 60_000 : GUIDE_AUTO_COOLDOWN_MS;
    if (preferences && (!preferences.enabled || !preferences.automaticTips || preferences.muted || now < preferences.snoozedUntil || preferences.dismissed.includes(key))) return false;
    return this.count < GUIDE_MAX_AUTO_PROMPTS && !this.seen.has(key) && (firstRun || now - Math.max(this.lastPrompt, preferences?.lastReminderAt ?? 0) >= cooldown);
  }
  recordPrompt(now = Date.now(), key = '') { this.count += 1; this.lastPrompt = now; this.seen.add(key); this.persist(); }
  reset() { this.count = 0; this.lastPrompt = 0; this.seen.clear(); this.persist(); }
}
