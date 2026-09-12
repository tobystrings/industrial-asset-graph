import { useFacilityGuide } from './useFacilityGuide';
export function GuideSettings() {
  const guide = useFacilityGuide(); const p = guide.preferences;
  return <section className="genie-settings" aria-label="Genie preferences">
    <div><h3>Your shift. Your Genie.</h3><p>Saved for your account and this facility on this browser.</p></div>
    <label>Personality<select aria-label="Personality" value={p.personality} onChange={e => guide.setPreferences({ ...p, personality: e.target.value as typeof p.personality })}><option value="professional">Professional</option><option value="crew">Crew</option><option value="full">Full Genie</option></select></label>
    <label>Motion<select aria-label="Motion" value={p.animationMode} onChange={e => guide.setPreferences({ ...p, animationMode: e.target.value as typeof p.animationMode })}><option value="full">Full · respects system setting</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
    <label>Reminder frequency<select aria-label="Reminder frequency" value={p.reminderFrequency} onChange={e => guide.setPreferences({ ...p, reminderFrequency: e.target.value as typeof p.reminderFrequency })}><option value="occasional">Occasional · at least 10 min apart</option><option value="rare">Rare · at least 30 min apart</option></select></label>
    <label className="genie-check"><input type="checkbox" checked={p.automaticTips} onChange={e => guide.setPreferences({ ...p, automaticTips: e.target.checked })}/> Remind me when leaving a record with gaps</label>
    <label className="genie-check"><input type="checkbox" checked={p.muted} onChange={e => { guide.clearReminder(); guide.setPreferences({ ...p, muted: e.target.checked }); }}/> Mute reminders · Genie has no audio</label>
    <p>At most 3 reminders per session, once per asset. “Not now” pauses them for 8 hours. System reduced motion always wins.</p>
    <button onClick={() => guide.setSettingsOpen(false)}>Done</button>
    <button onClick={guide.reset}>Reset Genie preferences</button>
  </section>;
}
