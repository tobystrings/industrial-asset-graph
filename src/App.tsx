import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import Dashboard, { type AppView } from './Dashboard';
import { useFacility, useFacilityEditor } from './facility';
import { ManagerPage } from './editor/PlantManager';
import './editor/plantManagerCrud.css';
import { subscribeViewport } from './lib/viewport';
import { FacilityGuide, useFacilityGuide, type GuideActionId } from './features/facility-guide';
import AppShell, { HomePage, MorePage, PageLink } from './navigation/AppShell';
import { navigate, readPage, type PageId } from './navigation/pages';
import AccountSecurity from './auth/AccountSecurity';
const ControlCabinetView = lazy(() => import('./ControlCabinetView'));
const WulftecViewer = lazy(() => import('./machines/WulftecViewer'));
const ProductionWorkspace = lazy(() => import('./production/ProductionWorkspace'));

export default function App() {
  const [route, setRoute] = useState(() => ({ page: readPage(location.search), key: 0 }));
  const [mapPoint, setMapPoint] = useState<{x:number;y:number} | null>(null);
  const { ready, currentUser } = useFacilityEditor();
  const { featureConfig } = useFacility();
  const guide = useFacilityGuide();
  const page = route.page;
  useLayoutEffect(() => subscribeViewport(() => undefined), []);
  useEffect(() => {
    const pop = () => setRoute(old => ({ page: readPage(location.search), key: old.key + 1 }));
    const account = () => navigate('account'); const settings = () => navigate('settings');
    const mapEdit = () => { if (currentUser?.role !== 'admin') { navigate('account'); return; } navigate('map', { edit: '1' }); };
    const addAsset = (event: Event) => { setMapPoint((event as CustomEvent<{x:number;y:number}>).detail); navigate('assetAdd'); };
    const action = (event: Event) => { const id = (event as CustomEvent<GuideActionId>).detail; const target = ({'open-cabinet':'cabinet','show-map':'map','show-assets':'assets','show-relationships':'relationships','show-documents':'documents'} as Record<string,PageId>)[id]; if (target) navigate(target); };
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); navigate('more'); } };
    const entries: [string, EventListener][] = [['popstate',pop],['iag-open-users',account],['iag-open-settings',settings],['iag-open-map-editor',mapEdit],['iag-map-add-asset',addAsset],['facility-guide-action',action],['keydown',shortcut as EventListener]];
    entries.forEach(([event,fn]) => addEventListener(event,fn));
    return () => entries.forEach(([event,fn]) => removeEventListener(event,fn));
  }, [currentUser?.role]);
  useEffect(() => { guide.setContext({ page: page === 'cabinet' ? 'cabinet' : page === 'assets' || page === 'documents' || page === 'relationships' ? page : 'map', assetId: page === 'cabinet' ? featureConfig.featuredCabinetAssetId : undefined }); }, [page, featureConfig.featuredCabinetAssetId]);
  const view: AppView = page === 'assets' || page === 'documents' ? page : 'dashboard';
  const dashboardPage = ['map','assets','asset','area','documents','field','relationships'].includes(page);
  const changeView = (next: AppView) => navigate(next === 'dashboard' ? 'map' : next);
  return <AppShell page={page} navigationKey={route.key}>
    {!ready ? <main className="workspace-loading" role="status">Loading local facility records…</main> :
    <Suspense fallback={<main className="workspace-loading" role="status">Opening page…</main>}>
      {['lines','documentation','maintenance','dependencies'].includes(page) ? <ProductionWorkspace key={route.key} page={page}/> : page === 'wulftec' ? <WulftecViewer/> : <>
      {page === 'home' ? <HomePage/> : page === 'more' ? <MorePage/> : page === 'account' ? <main className="account-page"><AccountSecurity/></main> : page === 'help' ? <main className="help-page"><section className="destination-card"><h2>Project tour</h2><p>Watch the existing narrated facility tour at your own pace.</p><a className="page-primary" href={`${import.meta.env.BASE_URL}presentation/`} target="_blank" rel="noreferrer">Open project tour ↗</a></section><section className="destination-card"><h2>Facility guide</h2><p>Open the guide for help finding your next task.</p><FacilityGuide/></section><PageLink page="field">Open field documentation →</PageLink></main> : page === 'cabinet' ? <ControlCabinetView key={route.key} onBack={() => navigate('assets')}/> : dashboardPage ? <Dashboard key={`${page}-${route.key}`} pageMode={page} view={view} onView={changeView} onOpenCabinet={() => navigate('cabinet',{device:new URLSearchParams(location.search).get('device') ?? ''})} onRecord={id => navigate('asset',{asset:id,tab:'record'})}/> : <ManagerPage key={page} page={page} point={mapPoint} onDone={() => { setMapPoint(null); navigate('more'); }}/>}
      </>}
    </Suspense>}
  </AppShell>;
}
