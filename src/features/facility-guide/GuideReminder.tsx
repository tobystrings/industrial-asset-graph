import { navigate } from '../../navigation/pages';
import { useFacilityGuide } from './useFacilityGuide';
export function GuideReminder() {
  const guide = useFacilityGuide(); const c = guide.reminder;
  if (!c || !guide.preferences.enabled || guide.preferences.muted) return null;
  return <section className="genie-reminder" aria-label="Documentation reminder"><div><strong>Before that detail disappears…</strong><p>{c.assetId} still has recorded documentation gaps. Capture a finding when convenient; nothing has been marked complete.</p></div><button onClick={() => { guide.clearReminder(); navigate('help', { asset: c.assetId ?? '', from: c.page }); }}>Review with Genie</button><button onClick={guide.clearReminder}>Not now · 8h quiet</button></section>;
}
