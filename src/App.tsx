import { useEffect, useLayoutEffect, useState } from 'react';
import ControlCabinetView from './ControlCabinetView';
import Dashboard, { type AppView } from './Dashboard';
import { useFacility } from './facility';
import type { FilmCommand } from './lib/filmBridge';
import { subscribeViewport } from './lib/viewport';
import { FacilityGuide, guideDialogue, useFacilityGuide, type GuideActionId, type GuidePage } from './features/facility-guide';

function initialView(): AppView {
  const value = new URLSearchParams(location.search).get('view');
  if (value === 'cabinet' || value === 'assets' || value === 'documents') return value;
  return 'dashboard';
}

export default function App() {
  const guide = useFacilityGuide();
  const { featureConfig } = useFacility();
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<AppView>(initialView);
  const [pendingCommand, setPendingCommand] = useState<FilmCommand | null>(
    params.get('command') === 'verify' || params.get('command') === 'trace' || params.get('command') === '3d' || params.get('command') === 'map'
      ? params.get('command') as FilmCommand
      : null,
  );
  useLayoutEffect(() => subscribeViewport(() => undefined), []);
  useEffect(() => {
    const page: GuidePage = view === 'dashboard' ? 'map' : view;
    guide.setContext({ page, assetId: view === 'cabinet' ? featureConfig.featuredCabinetAssetId : undefined });
  }, [view, featureConfig.featuredCabinetAssetId]);
  const changeView = (next: AppView) => {
    setView(next);
    const nextParams = new URLSearchParams(location.search);
    if (next === 'dashboard') nextParams.delete('view');
    else nextParams.set('view', next);
    history.replaceState(null, '', `${location.pathname}${nextParams.size ? `?${nextParams}` : ''}`);
  };
  useEffect(() => {
    const handler = (event: Event) => {
      const action = (event as CustomEvent<GuideActionId>).detail;
      if (action === 'open-cabinet') { changeView('cabinet'); guide.show(guideDialogue.cabinet()); return; }
      if (action === 'show-map') { changeView('dashboard'); guide.show(guideDialogue.map()); return; }
      if (action === 'show-assets') { changeView('assets'); guide.show(guideDialogue.assets({ page: 'assets' })); return; }
      if (action === 'show-relationships') { changeView('dashboard'); window.dispatchEvent(new CustomEvent('facility-guide-workspace', { detail: 'relationships' })); guide.show(guideDialogue.relationships({ page: 'relationships', assetId: view === 'cabinet' ? featureConfig.featuredCabinetAssetId : undefined })); return; }
      if (action === 'show-documents') { changeView('documents'); guide.show(guideDialogue.documents()); }
    };
    addEventListener('facility-guide-action', handler);
    return () => removeEventListener('facility-guide-action', handler);
  }, [view, guide, featureConfig.featuredCabinetAssetId]);
  return (
    <div className="app-shell">
      <div className="backdrop" aria-hidden="true" />
      {view === 'cabinet'
        ? <ControlCabinetView onBack={() => changeView('dashboard')} />
        : (
          <Dashboard
            view={view}
            onView={changeView}
            onOpenCabinet={() => {
              changeView('cabinet');
            }}
            pendingCommand={pendingCommand}
            onPendingCommand={setPendingCommand}
          />
        )}
      <FacilityGuide />
    </div>
  );
}
