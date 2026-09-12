import { GUIDE_STORAGE_KEY } from './guideConfig';
import type { GuidePreferences } from './guideTypes';
export const defaultGuidePreferences: GuidePreferences = {
  enabled: true, automaticTips: false, muted: false, animationMode: 'full', personality: 'crew',
  reminderFrequency: 'occasional', snoozedUntil: 0, lastReminderAt: 0, dismissed: [], tourComplete: false,
};
export const guideStorageKey = (facilityId: string, userId: string) => GUIDE_STORAGE_KEY + ':' + encodeURIComponent(facilityId) + ':' + encodeURIComponent(userId);
export function loadGuidePreferences(key = GUIDE_STORAGE_KEY): GuidePreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
    const p = { ...defaultGuidePreferences };
    for (const name of ['enabled', 'automaticTips', 'muted', 'tourComplete'] as const) if (typeof stored[name] === 'boolean') p[name] = stored[name];
    if (['full', 'reduced', 'off'].includes(stored.animationMode)) p.animationMode = stored.animationMode;
    if (['professional', 'crew', 'full'].includes(stored.personality)) p.personality = stored.personality;
    if (['occasional', 'rare'].includes(stored.reminderFrequency)) p.reminderFrequency = stored.reminderFrequency;
    for (const name of ['snoozedUntil', 'lastReminderAt'] as const) if (Number.isFinite(stored[name]) && stored[name] >= 0) p[name] = stored[name];
    p.dismissed = Array.isArray(stored.dismissed) ? stored.dismissed.filter((id: unknown) => typeof id === 'string').slice(-100) : [];
    return p;
  } catch { return { ...defaultGuidePreferences }; }
}
export function saveGuidePreferences(value: GuidePreferences, key = GUIDE_STORAGE_KEY) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Usable without storage. */ }
}
