import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GuideController } from './GuideController';
import { guideDialogue } from './guideDialogue';
import { chooseGuideRule } from './guideRules';
import { loadGuidePreferences, saveGuidePreferences } from './guideStorage';
import type { GuideActionId, GuideContext, GuideMessage, GuidePreferences } from './guideTypes';

interface GuideApi {
  context: GuideContext; preferences: GuidePreferences; message: GuideMessage | null; open: boolean; settingsOpen: boolean;
  setContext: (context: GuideContext) => void; setPreferences: (next: GuidePreferences) => void; setOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void; show: (message: GuideMessage) => void; dismiss: (forever?: boolean) => void;
  dispatch: (action: GuideActionId) => void; reset: () => void;
}
export const FacilityGuideContext = createContext<GuideApi | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<GuideContext>({ page: 'map' });
  const [preferences, setPreferences] = useState(loadGuidePreferences);
  const [message, setMessage] = useState<GuideMessage | null>(() => preferences.tourComplete ? null : guideDialogue.welcome());
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controller = useRef(new GuideController());
  useEffect(() => saveGuidePreferences(preferences), [preferences]);
  useEffect(() => {
    if (!preferences.enabled || !preferences.automaticTips || open) return;
    const rule = chooseGuideRule(context, preferences.dismissed);
    if (rule && controller.current.mayAutoPrompt()) { setMessage(rule.message(context)); setOpen(true); controller.current.recordPrompt(); }
  }, [context, open, preferences]);
  const api = useMemo<GuideApi>(() => ({
    context, preferences, message, open, settingsOpen, setContext, setPreferences, setOpen, setSettingsOpen,
    show: (next) => { setMessage(next); setOpen(true); },
    dismiss: (forever = false) => { controller.current.recordPrompt(); if (forever && message) setPreferences((p) => ({ ...p, dismissed: [...new Set([...p.dismissed, message.id])] })); setOpen(false); },
    dispatch: (action) => {
      if (action === 'start-tour') { setMessage(guideDialogue.map()); setOpen(true); }
      else window.dispatchEvent(new CustomEvent('facility-guide-action', { detail: action }));
    },
    reset: () => { controller.current.reset(); setPreferences({ enabled: true, automaticTips: false, muted: true, animationMode: 'full', dismissed: [], tourComplete: false }); setMessage(guideDialogue.welcome()); setOpen(false); },
  }), [context, preferences, message, open, settingsOpen]);
  return <FacilityGuideContext.Provider value={api}>{children}</FacilityGuideContext.Provider>;
}
