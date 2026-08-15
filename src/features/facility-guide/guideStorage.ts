import { GUIDE_STORAGE_KEY } from './guideConfig';
import type { GuidePreferences } from './guideTypes';

export const defaultGuidePreferences: GuidePreferences = {
  enabled: true, automaticTips: true, muted: true, animationMode: 'full', dismissed: [], tourComplete: false,
};

export function loadGuidePreferences(): GuidePreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) ?? '{}');
    return { ...defaultGuidePreferences, ...stored, dismissed: Array.isArray(stored.dismissed) ? stored.dismissed : [] };
  } catch { return defaultGuidePreferences; }
}

export function saveGuidePreferences(value: GuidePreferences) {
  localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(value));
}

