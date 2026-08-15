import { guideRules } from './guideRules';
import { useFacilityGuide } from './useFacilityGuide';
export function GuideDebugPanel() { const guide = useFacilityGuide(); if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('guideDebug')) return null; return <aside className="guide-debug"><b>Guide debug</b><code>{JSON.stringify(guide.context)}</code><span>Rules: {guideRules.map((r) => r.id).join(', ')}</span></aside>; }

