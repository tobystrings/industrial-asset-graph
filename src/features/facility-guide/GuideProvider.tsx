import { createContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { useFacility, useFacilityEditor } from '../../facility';
import { GuideController } from './GuideController';
import { nextGuideMessage } from './guideRules';
import { defaultGuidePreferences, guideStorageKey, loadGuidePreferences, saveGuidePreferences } from './guideStorage';
import type { GuideActionId, GuideContext, GuideMessage, GuidePreferences } from './guideTypes';
interface GuideApi {
  context: GuideContext; preferences: GuidePreferences; message: GuideMessage | null; open: boolean; settingsOpen: boolean;
  reminder: GuideContext | null;
  setContext: (context: GuideContext) => void; setPreferences: (next: GuidePreferences) => void; setOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void; show: (message: GuideMessage) => void; dismiss: (forever?: boolean) => void;
  dispatch: (action: GuideActionId) => void; reset: () => void; clearReminder: () => void;
}
export const FacilityGuideContext = createContext<GuideApi | null>(null);
export function GuideProvider({ children }: { children: ReactNode }) {
  const pkg = useFacility(); const editor = useFacilityEditor();
  const key = guideStorageKey(pkg.facility.id, editor.currentUser?.id ?? 'anonymous');
  return <ScopedGuideProvider key={key} storageKey={key}>{children}</ScopedGuideProvider>;
}
function ScopedGuideProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const [context, setRawContext] = useState<GuideContext>({ page: 'home' });
  const [preferences, setPreferences] = useState(() => loadGuidePreferences(storageKey));
  const [message, setMessage] = useState<GuideMessage | null>(null);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminder, setReminder] = useState<GuideContext | null>(null);
  const [controllerInstance] = useState(() => new GuideController(storageKey));
  const controller = useRef(controllerInstance);
  const previous = useRef(context);
  useEffect(() => saveGuidePreferences(preferences, storageKey), [preferences, storageKey]);
  const api = useMemo<GuideApi>(() => ({
    context, preferences, message, open, settingsOpen, reminder, setPreferences, setSettingsOpen,
    setContext: next => {
      const old = previous.current;
      if (((old.routePage ?? old.page) !== (next.routePage ?? next.page) || old.assetId !== next.assetId) && next.routePage !== 'help') {
        const key = old.assetId + ':unfinished';
        if (old.assetId && ['field', 'maintenance', 'asset', 'cabinet'].includes(old.routePage ?? old.page) && old.missingFields?.length && controller.current.mayAutoPrompt(Date.now(), false, preferences, key)) {
          controller.current.recordPrompt(Date.now(), key); setReminder(old);
          setPreferences(p => ({ ...p, lastReminderAt: Date.now() }));
        } else setReminder(null);
      }
      previous.current = next; setRawContext(next);
    },
    setOpen: value => { if (value) { setMessage(nextGuideMessage(context, preferences.personality)); setPreferences(p => ({ ...p, enabled: true, tourComplete: true })); } setOpen(value); },
    show: next => { setMessage(next); setOpen(true); },
    dismiss: (forever = false) => {
      setPreferences(p => ({ ...p, snoozedUntil: Date.now() + 8 * 60 * 60_000,
        dismissed: forever && message ? [...new Set([...p.dismissed, context.assetId + ':' + message.id])] : p.dismissed }));
      setOpen(false); setSettingsOpen(false); setReminder(null);
    },
    dispatch: action => {
      if (action === 'start-tour' || action === 'next-tour') { setMessage(nextGuideMessage(context, preferences.personality)); setOpen(true); }
      else window.dispatchEvent(new CustomEvent('facility-guide-action', { detail: action }));
    },
    clearReminder: () => { setReminder(null); setPreferences(p => ({ ...p, snoozedUntil: Date.now() + 8 * 60 * 60_000 })); },
    reset: () => { controller.current.reset(); setPreferences({ ...defaultGuidePreferences }); setMessage(null); setOpen(false); setReminder(null); },
  }), [context, preferences, message, open, settingsOpen, reminder]);
  return <FacilityGuideContext.Provider value={api}>{children}</FacilityGuideContext.Provider>;
}
