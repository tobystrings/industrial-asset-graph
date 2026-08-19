import { useEffect, useMemo, useRef, useState } from 'react';
import { areas, components, documentationPercent, documents, evidence, facility, machines, revisions } from './facilityData';
import { activeFacilityPackage } from './facility';
import DeviceIntel from './DeviceIntel';
import AssetDirectory from './AssetDirectory';
import FloorPacket from './FloorPacket';
import PlcRackView from './PlcRackView';
import WalkdownForm from './WalkdownForm';
import TopNav, { type WorkspaceTab } from './dashboard/TopNav';
import FacilitySidebar from './dashboard/FacilitySidebar';
import KpiStrip from './dashboard/KpiStrip';
import { captureKitForArea } from './lib/areaKit';
import { INSPECTOR_TABS, cycleInspectorTab, parseInspectorTab, type InspectorTab } from './lib/boardChrome';
import { documentSource } from './lib/documentCatalog';
import { parseDeviceQuery, writeDeviceQuery } from './lib/deviceQuery';
import { assetDocumentationCompleteness, documentedAssetCount, documentationCoveragePercent, openFieldItemCount, recordCount, totalTrackedFacts, verificationCounts } from './lib/facilityMetrics';
import { filmHonestyForAsset, type FilmCommand } from './lib/filmBridge';
import { standalonePresentationHref } from './lib/filmGenie';
import { renderMarkdown } from './lib/markdown';
import { countAt } from './lib/motion';
import { doorSheetCards, doorSheetText } from './lib/doorSheet';
import { doorCodeCaption, hrefMatrixSvg } from './lib/hrefMatrix';
import { unusedRelationshipCounts, suppliesHonesty } from './lib/relationshipHonesty';
import { exportAreaWalkPack } from './lib/plantPacks';
import { applyKeepDecision, decideReview, filterReviewCaptures, graphPatchPreview, graphPatchText, importReviewPackResult, keepPatchSummary, keepPatchText, parseReviewPack, reviewPackJson } from './lib/reviewPack';
import { applyConfirmText, coverageSubtitle, importSkipSummary, queueCountLabel, todayItemState, todayProgress } from './lib/floorPass';
import { visiblePartsFor } from './lib/visibleParts';
import { todayChipTarget, todayWalkdownItems } from './lib/walkdownPrompts';
import { searchCatalog, type SearchHit } from './lib/searchIndex';
import { serialSourcesDisagree, serialSourcesFor } from './lib/serialSources';
import { markerClass } from './lib/statusMark';
import { componentBelongsToAsset, containedComponentIds, resolveTraceComponentId, traceHeadingFor, traceNodesFor } from './lib/tracePath';
import { prefersReducedMotion, scrollPaneToTop } from './lib/scrollChrome';
import { dashboardSearch, genieQueryFromSearch, phoneTabFromQuery, subscribeViewport } from './lib/viewport';
import { applyKeptCapture, localActivityCaptures, markUnknownCaptured, unknownQueueState } from './lib/walkdown';
import MapStage, { mapModeFromQuery, type MapMode } from './map/MapStage';
import type { DocumentationState, FacilityArea, FacilityAsset, ReviewDecision, SystemKind, VerificationState } from './types/facility';

const stateLabel: Record<string, string> = {
  COMPLETE: 'Complete', REVIEW: 'Review', IN_PROGRESS: 'In progress', DRAFT: 'Draft', NOT_STARTED: 'Not started',
  VERIFIED: 'Verified', FIELD_VERIFY: 'Field verify', INFERRED: 'Inferred', DISPUTED: 'Disputed', RETIRED: 'Retired',
};

const featureConfig = activeFacilityPackage.featureConfig;
const featuredCabinetAssetId = featureConfig.featuredCabinetAssetId;
const featuredMachineAssetId = featureConfig.featuredMachineAssetId;
const defaultAreaId = featureConfig.defaultAreaId;
const brandMark = featureConfig.brandMark ?? activeFacilityPackage.facility.name.slice(0, 2).toUpperCase();

export type AppView = 'dashboard' | 'assets' | 'documents' | 'cabinet';

function useCount(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setValue(target); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setValue(countAt(progress, target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function StatusI({ status }: { status: string }) {
  return <i className={markerClass(status as VerificationState)} aria-hidden="true" />;
}

export default function Dashboard({
  view, onView, onOpenCabinet, pendingCommand, onPendingCommand,
}: {
  view: AppView;
  onView: (view: AppView) => void;
  onOpenCabinet: () => void;
  pendingCommand?: FilmCommand | null;
  onPendingCommand?: (command: FilmCommand | null) => void;
}) {
  const params = new URLSearchParams(location.search);
  const initialAsset = machines.find((item) => item.id === params.get('asset')) ?? null;
  const initialArea = areas.find((item) => item.id === params.get('area')) ?? (initialAsset ? areas.find((item) => item.id === initialAsset.areaId) : null) ?? null;
  const [selectedArea, setSelectedArea] = useState<FacilityArea | null>(initialArea);
  const [selectedAsset, setSelectedAsset] = useState<FacilityAsset | null>(initialAsset);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(new Set<VerificationState>(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED']));
  const [activeDocument, setActiveDocument] = useState<string | null>(params.get('doc'));
  const [paletteOpen, setPaletteOpen] = useState(Boolean(params.get('q')));
  const [paletteQuery, setPaletteQuery] = useState(params.get('q') ?? '');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>(
    params.get('tab') ? parseInspectorTab(params.get('tab')) : (initialAsset?.id === featuredCabinetAssetId ? 'intel' : parseInspectorTab(params.get('tab'))),
  );
  const [phoneTab, setPhoneTab] = useState<'map' | 'find' | 'queue' | 'cabinet' | 'docs' | 'more'>(() => {
    const tab = phoneTabFromQuery(params.get('tab'), params.get('command'));
    return tab === 'map' && initialAsset ? 'find' : tab;
  });
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() => (
    view === 'assets' ? 'assets' : view === 'documents' ? 'documents' : params.get('command') === 'trace' ? 'relationships' : 'map'
  ));
  const [traceOn, setTraceOn] = useState(params.get('command') === 'trace');
  const [mapMode, setMapMode] = useState<MapMode>(mapModeFromQuery(location.search));
  const [systemKind, setSystemKind] = useState<SystemKind>('ALL');
  const [docStateFilter, setDocStateFilter] = useState<DocumentationState | 'ALL'>('ALL');
  const [packetOpen, setPacketOpen] = useState(false);
  const [packetAsset, setPacketAsset] = useState(featuredCabinetAssetId);
  const [focusCabinet, setFocusCabinet] = useState(params.get('focus') === 'cabinet');
  const [doorOpen, setDoorOpen] = useState(params.get('door') === '1');
  const [openUnknown, setOpenUnknown] = useState<string | null>(null);
  const [captureTick, setCaptureTick] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const [lastKeepPatch, setLastKeepPatch] = useState<string | null>(null);
  const [lastKeepSummary, setLastKeepSummary] = useState<string | null>(null);
  const [lastPreviewPatch, setLastPreviewPatch] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | ReviewDecision>('all');
  const [focusDevice, setFocusDevice] = useState<string | null>(params.get('device'));
  const [todayIndex, setTodayIndex] = useState(0);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [applyWarning, setApplyWarning] = useState<string | null>(null);

  useEffect(() => {
    const search = dashboardSearch({
      view,
      area: selectedArea?.id,
      asset: selectedAsset?.id,
      doc: activeDocument,
      map: mapMode,
      tab: inspectorTab,
      focus: focusCabinet,
      q: paletteOpen ? paletteQuery : null,
      device: view === 'cabinet' ? null : focusDevice,
      door: doorOpen,
      ...genieQueryFromSearch(location.search),
    });
    history.replaceState(null, '', `${location.pathname}${search}`);
    localStorage.setItem('industrial-asset-selection', JSON.stringify({ area: selectedArea?.id, asset: selectedAsset?.id }));
  }, [selectedArea, selectedAsset, view, activeDocument, mapMode, inspectorTab, focusCabinet, paletteOpen, paletteQuery, focusDevice, doorOpen]);

  useEffect(() => subscribeViewport((snap) => {
    if (snap.desktop) {
      setDrawerOpen(false);
      setNavOpen(false);
    }
  }), []);

  useEffect(() => {
    if (view === 'assets') setWorkspaceTab('assets');
    if (view === 'documents') setWorkspaceTab('documents');
  }, [view]);

  useEffect(() => {
    const handler = (event: Event) => {
      const tab = (event as CustomEvent<WorkspaceTab>).detail;
      if (tab === 'relationships') { setWorkspaceTab('relationships'); setTraceOn(true); }
    };
    addEventListener('facility-guide-workspace', handler);
    return () => removeEventListener('facility-guide-workspace', handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery('');
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setNavOpen(false);
        setDrawerOpen(false);
      }
      if (event.key === '?' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery('help');
      }
      const typing = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT';
      if (!typing && event.key === 't') {
        event.preventDefault();
        setTraceOn(true);
        setWorkspaceTab('relationships');
        onView('dashboard');
      }
      if (!typing && event.key === 'q') {
        event.preventDefault();
        setInspectorTab('capture');
        setPhoneTab('queue');
      }
      if (!typing && event.key === 'c') {
        event.preventDefault();
        onOpenCabinet();
      }
      if (!typing && event.key === 'n') {
        event.preventDefault();
        setInspectorTab((current) => cycleInspectorTab(current, 1));
      }
      if (!typing && event.key === 'p') {
        event.preventDefault();
        setInspectorTab((current) => cycleInspectorTab(current, -1));
      }
      if (!typing && (event.key === 'j' || event.key === 'k')) {
        const items = todayWalkdownItems();
        if (!items.length) return;
        event.preventDefault();
        setTodayIndex((current) => {
          const next = event.key === 'j' ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
          return next;
        });
        setInspectorTab('capture');
      }
    };
    addEventListener('keydown', handler);
    return () => removeEventListener('keydown', handler);
  }, [onOpenCabinet, onView]);

  useEffect(() => {
    if (params.get('command') === 'trace') setTraceOn(true);
    if (params.get('command') === 'verify') setInspectorTab('capture');
  }, []);

  useEffect(() => {
    scrollPaneToTop(railRef.current, prefersReducedMotion());
  }, [inspectorTab]);

  useEffect(() => {
    if (!pendingCommand) return;
    const defaultArea = areas.find((area) => area.id === defaultAreaId) ?? null;
    const cabinet = machines.find((item) => item.id === featuredCabinetAssetId) ?? null;
    if (pendingCommand === 'map') {
      setSelectedArea(defaultArea);
      setSelectedAsset(null);
      setMapMode('2d');
      setWorkspaceTab('map');
      onView('dashboard');
    }
    if (pendingCommand === '3d') {
      setSelectedArea(defaultArea);
      setMapMode('2d');
      setWorkspaceTab('map');
      onView('dashboard');
    }
    if (pendingCommand === 'trace' && cabinet) {
      setSelectedAsset(cabinet);
      setSelectedArea(defaultArea);
      setTraceOn(true);
      setWorkspaceTab('relationships');
      onView('dashboard');
    }
    if (pendingCommand === 'verify' && cabinet) {
      setSelectedAsset(cabinet);
      setSelectedArea(defaultArea);
      setInspectorTab('capture');
      onView('dashboard');
    }
    if (pendingCommand === 'cabinet') onOpenCabinet();
    onPendingCommand?.(null);
  }, [pendingCommand]);

  const hits = useMemo(() => searchCatalog(paletteQuery), [paletteQuery]);
  const coverage = documentationCoveragePercent();
  const fieldItems = openFieldItemCount(null);
  const coverageN = useCount(coverage);
  const fieldN = useCount(fieldItems);
  const assetN = useCount(documentedAssetCount());
  const counts = verificationCounts(selectedAsset);
  const facilityCounts = verificationCounts(null);
  const shownCounts = selectedAsset ? counts : facilityCounts;
  const nodes = useMemo(
    () => traceNodesFor(selectedAsset, { area: selectedArea, componentId: focusDevice }),
    [selectedAsset, selectedArea, focusDevice],
  );
  const traceHeading = useMemo(
    () => traceHeadingFor(selectedAsset, { area: selectedArea, componentId: focusDevice }),
    [selectedAsset, selectedArea, focusDevice],
  );
  const selectArea = (area: FacilityArea) => {
    setSelectedArea(area);
    setActiveDocument(null);
    if (!area.assetIds.includes(selectedAsset?.id ?? '')) {
      setSelectedAsset(null);
      setFocusDevice(null);
    }
    setTraceOn(true);
    setDrawerOpen(false);
    if (matchMedia('(max-width: 619px)').matches) setPhoneTab('find');
  };
  const selectAsset = (asset: FacilityAsset) => {
    setSelectedAsset(asset);
    setSelectedArea(areas.find((area) => area.id === asset.areaId) ?? null);
    setTraceOn(true);
    setFocusDevice((current) => {
      const resolved = resolveTraceComponentId(current);
      return resolved && componentBelongsToAsset(resolved, asset.id) ? current : null;
    });
    if (asset.id === featuredCabinetAssetId) setInspectorTab('intel');
    if (asset.id === featuredMachineAssetId) setInspectorTab('record');
    if (matchMedia('(max-width: 619px)').matches) setPhoneTab('find');
  };

  const openWorkspace = (tab: WorkspaceTab) => {
    setWorkspaceTab(tab);
    setNavOpen(false);
    setDrawerOpen(false);
    if (tab === 'assets') onView('assets');
    else if (tab === 'documents') onView('documents');
    else {
      if (tab === 'relationships') setTraceOn(true);
      onView('dashboard');
    }
  };
  const applyHit = (hit: SearchHit) => {
    if (hit.areaId) setSelectedArea(areas.find((area) => area.id === hit.areaId) ?? null);
    if (hit.assetId) setSelectedAsset(machines.find((item) => item.id === hit.assetId) ?? null);
    if (hit.kind === 'component') setFocusDevice(hit.id);
    if (hit.kind === 'capture') {
      setInspectorTab('activity');
      setPhoneTab('queue');
    }
    if (hit.kind === 'manual' && hit.documentId) {
      setActiveDocument(hit.documentId);
      onView('documents');
      setPaletteOpen(false);
      return;
    }
    if (hit.kind === 'film') {
      window.open(standalonePresentationHref(), '_blank', 'noopener,noreferrer');
      setPaletteOpen(false);
      return;
    }
    if (hit.documentId) {
      setActiveDocument(hit.documentId);
      onView('documents');
    } else if (hit.kind === 'component' && hit.assetId === featuredCabinetAssetId) {
      onOpenCabinet();
    } else if (hit.kind === 'asset' || hit.kind === 'area') {
      onView('dashboard');
    }
    setPaletteOpen(false);
    if (hit.kind === 'component' || hit.kind === 'asset') setTraceOn(true);
  };

  const breadcrumb = [selectedArea?.name, selectedAsset?.id].filter(Boolean).join(' / ') || 'All documented areas';

  return (
    <main className={`dashboard workspace-${workspaceTab} phone-${phoneTab} view-${view}${focusCabinet ? ' focus-cabinet' : ''}`}>
      <TopNav
        brandMark={brandMark}
        facilityName={facility.name}
        workspaceTab={workspaceTab}
        navOpen={navOpen}
        drawerOpen={drawerOpen}
        query={query}
        onToggleDrawer={() => setDrawerOpen((value) => !value)}
        onWorkspace={openWorkspace}
        onOpenCabinet={onOpenCabinet}
        onQuery={setQuery}
        onOpenSearch={() => setPaletteOpen(true)}
      />

      <FacilitySidebar
        drawerOpen={drawerOpen}
        workspaceTab={workspaceTab}
        view={view}
        systemKind={systemKind}
        areas={areas}
        equipmentCount={recordCount()}
        selectedArea={selectedArea}
        filters={filters}
        onWorkspace={openWorkspace}
        onArea={selectArea}
        onOpenCabinet={() => { onOpenCabinet(); setDrawerOpen(false); }}
        onSystems={() => { setSystemKind('VFD'); onView('assets'); setDrawerOpen(false); }}
        onToggleFilter={(item) => {
          const next = new Set(filters);
          next.has(item) ? next.delete(item) : next.add(item);
          setFilters(next);
        }}
      />
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      {view === 'dashboard' && (
        <>
          <KpiStrip
            coverage={coverage}
            coverageDisplay={coverageN}
            coverageSubtitle={`${coverageSubtitle()} · ${assetDocumentationCompleteness().map((item) => `${item.assetId} ${item.percent}%`).join(' · ')}`}
            fieldItems={fieldItems}
            fieldDisplay={fieldN}
            fieldSubtitle={queueCountLabel(null)}
            documentedAssets={documentedAssetCount()}
            documentedDisplay={assetN}
            recordCount={recordCount()}
          />

          {workspaceTab === 'map' && <section className="map-panel panel enter" data-guide-target="facility-map" style={{ animationDelay: '80ms' }}>
            <div className="panel-heading">
              <b>Building layout</b>
              <small className="crumb">{breadcrumb}{selectedArea && <button type="button" onClick={() => { setSelectedArea(null); setSelectedAsset(null); setFocusDevice(null); }}> · All areas</button>}</small>
              <span className="kpi-compact" data-testid="kpi-compact">
                <span>{coverage}%</span>
                <span>{fieldItems} field</span>
                <span>{documentedAssetCount()} assets</span>
              </span>
            </div>
            <MapStage selectedArea={selectedArea} selectedAsset={selectedAsset} filters={filters} onArea={selectArea} onAsset={selectAsset} />
          </section>}

          {workspaceTab === 'relationships' && <section className="relationship-panel panel enter" data-guide-target="relationships" style={{ animationDelay: '120ms' }}>
            <div className="panel-heading">
              <b>Asset relationships</b>
              <small data-testid="trace-heading">{traceHeading}</small>
              <button className="relationship-more" type="button" onClick={() => setTraceOn(true)}>Trace</button>
            </div>
            <p className="unused-rels" data-testid="unused-rels">
              {Object.entries(unusedRelationshipCounts()).map(([type, count]) => (
                <span key={type}>{type} {count}</span>
              ))}
              <span>{suppliesHonesty().note}</span>
            </p>
            <div className={`relationship-flow scroll-pane${traceOn ? ' is-live' : ''}`} data-testid="relationship-flow" data-trace={selectedAsset?.id ?? selectedArea?.id ?? 'facility'} key={`${selectedAsset?.id ?? selectedArea?.id ?? 'facility'}:${focusDevice ?? ''}`}>
              {nodes.map((node, index) => (
                <span key={node.id} style={{ display: 'contents' }}>
                  {index > 0 && (
                    <svg className="trace-connector" viewBox="0 0 28 8" aria-hidden="true">
                      <line className="trace-line" x1="1" y1="4" x2="27" y2="4" />
                    </svg>
                  )}
                  <button type="button" className={`trace-node${node.id === selectedAsset?.id || node.id === selectedArea?.id || resolveTraceComponentId(focusDevice) === node.id ? ' is-current' : ''}`} style={{ animationDelay: `${index * 70}ms` }} onClick={() => {
                    if (node.kind === 'area') {
                      const area = areas.find((item) => item.id === node.id);
                      if (area) selectArea(area);
                      return;
                    }
                    const machine = machines.find((item) => item.id === node.id);
                    if (machine) {
                      selectAsset(machine);
                      return;
                    }
                    if (node.kind === 'component') {
                      setFocusDevice(node.id);
                      const parsed = parseDeviceQuery(node.id);
                      if (parsed) writeDeviceQuery(parsed.deviceId, { cabinet: false });
                    }
                  }}>
                    <small>{node.kind}</small>{node.label}
                  </button>
                </span>
              ))}
              {selectedAsset?.id === featuredCabinetAssetId && containedComponentIds(selectedAsset.id).length > 4 && (
                <button className="relationship-more" onClick={onOpenCabinet}>+ more devices →</button>
              )}
            </div>
          </section>}
        </>
      )}

      {view === 'assets' && (
        <AssetDirectory systemKind={systemKind} onSystemKind={setSystemKind} query={query} onQuery={setQuery} onAsset={(asset) => { selectAsset(asset); onView('dashboard'); }} onDevice={(item, parent) => {
          selectAsset(parent);
          setFocusDevice(item.id);
          const parsed = parseDeviceQuery(item.id);
          if (parent.id === featuredCabinetAssetId) { if (parsed) writeDeviceQuery(parsed.deviceId); onOpenCabinet(); }
          else onView('dashboard');
        }} />
      )}

      {view === 'documents' && (
        <section className={`document-directory enter ${activeDocument ? 'has-preview' : ''}`} data-testid="documents-grouped" data-guide-target="documents">
          <div className="document-browser scroll-pane">
          <header className="document-directory-head"><div><p className="panel-title">Knowledge library</p><h1>Documents</h1><p>Grouped by the equipment they explain—not dumped into one flat list.</p></div><strong>{documents.length}<small>records</small></strong></header>
          <div className="document-state-filters">
            {(['ALL', 'COMPLETE', 'REVIEW', 'IN_PROGRESS', 'DRAFT', 'NOT_STARTED'] as const).map((state) => (
              <button key={state} type="button" className={docStateFilter === state ? 'selected' : ''} onClick={() => setDocStateFilter(state)}>{stateLabel[state] ?? state}</button>
            ))}
          </div>
          <div className="document-groups">
          {machines.map((asset) => {
            const rows = documents.filter((item) => item.assetId === asset.id && (docStateFilter === 'ALL' || item.state === docStateFilter));
            if (!rows.length) return null;
            return (
              <section key={asset.id} className="doc-group">
                <header><div><small>{asset.line}</small><h2>{asset.name}</h2><code>{asset.id}</code></div><span>{rows.length} {rows.length === 1 ? 'document' : 'documents'}</span></header>
                <div className="doc-cards">{rows.slice().sort((left, right) => left.title.localeCompare(right.title)).map((item) => (
                  <button key={item.id} type="button" className={activeDocument === item.id ? 'selected' : ''} onClick={() => setActiveDocument(item.id)}><span><small>{item.category}</small><b>{item.title}</b></span><em>{stateLabel[item.state]}</em></button>
                ))}</div>
              </section>
            );
          })}
          </div></div>
          {activeDocument && <aside className="document-preview scroll-pane"><DocumentBody documentId={activeDocument} onClose={() => setActiveDocument(null)} /></aside>}
        </section>
      )}

      <div className={`rail tab-${inspectorTab}`} data-testid="inspector-rail">
        <div className="rail-chrome">
          <div className="phone-trace" data-testid="phone-trace">
            {nodes.map((node) => <span key={node.id}>{node.label}</span>)}
          </div>
          <div className="inspector-tabs" data-testid="inspector-tabs">
            {INSPECTOR_TABS.map((tab) => (
              <button key={tab} type="button" className={inspectorTab === tab ? 'active' : ''} onClick={() => setInspectorTab(tab)}>
                {tab === 'overview' ? 'Overview' : tab === 'capture' ? 'Capture' : tab === 'intel' ? 'Intel' : tab === 'record' ? 'Record' : tab === 'docs' ? 'Docs' : 'Activity'}
              </button>
            ))}
          </div>
        </div>
        <div className="rail-body scroll-pane" ref={railRef}>
        {inspectorTab === 'overview' && (
          <section className="verification-panel panel enter">
            <p className="panel-title">Verification status</p>
            {(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED'] as VerificationState[]).map((state) => (
              <div key={state} className={filters.has(state) ? '' : 'is-dimmed'}>
                <StatusI status={state} />
                <span>{stateLabel[state]}</span>
                <b>{shownCounts[state]}</b>
                <i className="verify-meter" style={{ width: `${totalTrackedFacts(selectedAsset) ? Math.round((shownCounts[state] / totalTrackedFacts(selectedAsset)) * 100) : 0}%` }} />
              </div>
            ))}
            <footer>Total tracked facts <strong>{totalTrackedFacts(selectedAsset)}</strong></footer>
          </section>
        )}
        {(inspectorTab !== 'overview' || selectedAsset || selectedArea) && (
        <SelectedAssetPanel
          asset={selectedAsset}
          area={selectedArea}
          activeDocument={activeDocument}
          onDocument={setActiveDocument}
          onOpenCabinet={onOpenCabinet}
          onPacket={(assetId) => { setPacketAsset(assetId); setPacketOpen(true); }}
          onFocusCabinet={() => setFocusCabinet((value) => !value)}
          onDoorSheet={() => setDoorOpen(true)}
          focusCabinet={focusCabinet}
          tab={inspectorTab === 'overview' ? 'record' : inspectorTab}
          onCapture={() => setCaptureTick((value) => value + 1)}
          onTrace={() => { setTraceOn(true); setInspectorTab('intel'); }}
          openUnknown={openUnknown}
          onOpenUnknown={setOpenUnknown}
          focusDevice={focusDevice}
          todayIndex={todayIndex}
          onTodayIndex={setTodayIndex}
          onTodayJump={(jump) => {
            if (jump.areaId) {
              const area = areas.find((item) => item.id === jump.areaId);
              if (area) selectArea(area);
            }
            if (jump.assetId) {
              const asset = machines.find((item) => item.id === jump.assetId);
              if (asset) selectAsset(asset);
            }
            setInspectorTab(jump.tab);
            if (jump.unknown) setOpenUnknown(jump.unknown);
            if (jump.device) {
              setFocusDevice(jump.device);
              writeDeviceQuery(jump.device, { cabinet: jump.openCabinet });
              if (jump.openCabinet) onOpenCabinet();
            }
          }}
        />
        )}
        {packetOpen && <FloorPacket assetId={packetAsset} onClose={() => setPacketOpen(false)} />}
        {inspectorTab === 'activity' && (
          <section className="activity-panel panel enter">
            <p className="panel-title">This browser · {captureTick ? `${captureTick} review action${captureTick === 1 ? '' : 's'}` : 'local only'}</p>
            <div className="review-filters" data-testid="review-filters">
              {(['all', 'pending', 'keep', 'reject'] as const).map((filter) => (
                <button key={filter} type="button" className={reviewFilter === filter ? 'selected' : ''} onClick={() => setReviewFilter(filter)}>{filter}</button>
              ))}
            </div>
            {filterReviewCaptures(localActivityCaptures(), reviewFilter).length === 0 && (
              <p className="walkdown-hint" data-testid="log-empty">Nothing captured on this phone. Use Capture to add a local note.</p>
            )}
            {filterReviewCaptures(localActivityCaptures(), reviewFilter).map((item) => (
              <div key={item.id} className="log-row">
                <StatusI status="FIELD_VERIFY" />
                <span>
                  <b>{item.capturedBy} · {item.targetId} · {item.field}</b>
                  <small>Not in the graph · {item.review ?? 'pending'}{item.applied ? ' · applied overlay' : ''} · {new Date(item.capturedAt).toLocaleString()}</small>
                </span>
                <div className="log-row-actions">
                <button type="button" data-testid="preview-patch" onClick={() => {
                  const text = graphPatchText(graphPatchPreview(item));
                  setLastPreviewPatch(text);
                  void navigator.clipboard?.writeText(text);
                }}>Preview patch</button>
                <button type="button" onClick={() => {
                  const { patch } = applyKeepDecision(item.id);
                  if (patch) {
                    const text = keepPatchText(patch);
                    setLastKeepPatch(text);
                    setLastKeepSummary(keepPatchSummary(patch));
                    void navigator.clipboard?.writeText(text);
                  }
                  setCaptureTick((value) => value + 1);
                }}>Keep (review)</button>
                <button type="button" onClick={() => {
                  if (item.review !== 'keep') applyKeepDecision(item.id);
                  const warning = applyConfirmText(item);
                  setApplyWarning(warning);
                  applyKeptCapture(item.id);
                  setCaptureTick((value) => value + 1);
                }}>Apply overlay</button>
                <button type="button" onClick={() => { decideReview(item.id, 'reject'); setCaptureTick((value) => value + 1); }}>reject</button>
                {item.review === 'reject' && (
                  <button type="button" onClick={() => { decideReview(item.id, 'pending'); setCaptureTick((value) => value + 1); }}>undo</button>
                )}
                </div>
              </div>
            ))}
            {applyWarning && <p className="apply-warning" data-testid="apply-warning">{applyWarning}</p>}
            {lastPreviewPatch && <pre className="keep-patch" data-testid="graph-patch-preview">{lastPreviewPatch}</pre>}
            {lastKeepSummary && <p className="keep-summary" data-testid="keep-summary">{lastKeepSummary}</p>}
            {lastKeepPatch && <pre className="keep-patch" data-testid="keep-patch">{lastKeepPatch}</pre>}
            {lastKeepPatch && (
              <details className="keep-json">
                <summary>Copy keep patch</summary>
                <button type="button" className="copy-patch" onClick={() => { void navigator.clipboard?.writeText(lastKeepPatch); }}>Copy</button>
              </details>
            )}
            {importNote && <p className="keep-summary">{importNote}</p>}
            <div className="review-actions">
              <button type="button" onClick={() => {
                const blob = new Blob([reviewPackJson()], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = 'iag-review-pack.json';
                link.click();
                URL.revokeObjectURL(href);
              }}>Export review pack</button>
              <label className="import-pack">
                Import JSON
                <input type="file" accept="application/json" className="sr-only" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const pack = parseReviewPack(await file.text());
                  if (pack) {
                    const result = importReviewPackResult(pack);
                    setImportNote(importSkipSummary(result.added, result.skipped));
                  }
                  setCaptureTick((value) => value + 1);
                }} />
              </label>
            </div>
            <p className="panel-title">Graph</p>
            {revisions.map((item) => (
              <div key={item.id}><StatusI status="IN_PROGRESS" /><span><b>{item.reason}</b><small>{item.changedBy} · {new Date(item.changedAt).toLocaleDateString()}</small></span></div>
            ))}
            <div><StatusI status="FIELD_VERIFY" /><span><b>{evidence.length} local evidence records indexed</b><small>Files remain outside the frontend bundle</small></span></div>
            <div><StatusI status="COMPLETE" /><span><b>Evidence-aware structured data</b><small>LOCAL_ONLY evidence is not bundled</small></span></div>
          </section>
        )}
        </div>
      </div>

      <footer className="facility-status">
        <span><i className={markerClass('COMPLETE')} /> Facility status · {facility.status}</span>
        <span>Documented assets <b>{machines.length}</b></span>
        <span>{queueCountLabel(selectedAsset)}</span>
        <span style={{ marginLeft: 'auto' }}>Evidence policy · Local-only protected</span>
      </footer>

      <nav className="bottom-nav" aria-label="Phone">
        <button className={phoneTab === 'map' ? 'active' : ''} onClick={() => { setPhoneTab('map'); openWorkspace('map'); }}><i aria-hidden="true">▣</i>Map</button>
        <button className={phoneTab === 'find' ? 'active' : ''} onClick={() => { setPhoneTab('find'); selectedArea || selectedAsset ? onView('dashboard') : openWorkspace('assets'); }}><i aria-hidden="true">◎</i>Asset</button>
        <button className={phoneTab === 'queue' ? 'active' : ''} onClick={() => { setPhoneTab('queue'); setInspectorTab('capture'); }}><i aria-hidden="true">☰</i>Queue</button>
        <button className={phoneTab === 'docs' ? 'active' : ''} onClick={() => { setPhoneTab('docs'); openWorkspace('documents'); }}><i aria-hidden="true">▤</i>Docs</button>
        <button className={phoneTab === 'more' ? 'active' : ''} onClick={() => { setPhoneTab('more'); setDrawerOpen(true); }}><i aria-hidden="true">•••</i>More</button>
      </nav>

      {doorOpen && <DoorSheet onClose={() => setDoorOpen(false)} />}
      {paletteOpen && (
        <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="palette scroll-pane enter" role="dialog" aria-label="Find" onClick={(event) => event.stopPropagation()}>
            <input autoFocus value={paletteQuery} placeholder="Find assets, areas, documents, devices…" onChange={(event) => { setPaletteQuery(event.target.value); setPaletteIndex(0); }} onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setPaletteIndex((value) => Math.min(hits.length - 1, value + 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setPaletteIndex((value) => Math.max(0, value - 1)); }
              if (event.key === 'Enter' && hits[paletteIndex]) applyHit(hits[paletteIndex]);
            }} />
            {hits.map((hit, index) => (
              <button key={`${hit.kind}-${hit.id}`} type="button" aria-current={index === paletteIndex} onClick={() => applyHit(hit)}>
                <span>{hit.title}</span><small>{hit.kind} · {hit.subtitle}</small>
              </button>
            ))}
            {paletteQuery.toLowerCase() === 'help' && <p style={{ padding: '12px 16px', color: '#cbd5e1' }}>/ search · t trace · q queue · c cabinet · n/p tabs · ↑↓ move · Enter open · Esc close</p>}
          </div>
        </div>
      )}
    </main>
  );
}

function DoorSheet({ onClose }: { onClose: () => void }) {
  const cards = doorSheetCards(typeof location === 'undefined' ? '' : location.origin + location.pathname.replace(/\/$/, ''));
  return (
    <section className="door-sheet" data-testid="door-sheet">
      <div className="panel-heading">
        <b>Control cabinet door sheet</b>
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(doorSheetText(cards)); }}>Copy links</button>
        <button type="button" onClick={() => window.print()}>Print</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      <p className="walkdown-hint">{doorCodeCaption()}</p>
      <ul className="door-cards">
        {cards.map((card) => (
          <li key={card.deviceId}>
            <div dangerouslySetInnerHTML={{ __html: hrefMatrixSvg(card.href) }} />
            <div>
              <b>{card.label}</b>
              <code>{card.href}</code>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocumentBody({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const record = documents.find((item) => item.id === documentId);
  if (!record) return null;
  const source = documentSource(record.path) ?? `# ${record.title}\n\nDocument file is not in this build.`;
  return (
    <section className="document-detail">
      <button type="button" onClick={onClose} aria-label="Close documentation detail">×</button>
      <p className="panel-title">{record.category}</p>
      <h3>{record.title}</h3>
      <p>Status: <strong>{stateLabel[record.state]}</strong> · <span className={markerClass(record.verificationStatus)} /> {stateLabel[record.verificationStatus]}</p>
      <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />
    </section>
  );
}

function SelectedAssetPanel({
  asset, area, activeDocument, onDocument, onOpenCabinet, onPacket, onFocusCabinet, onDoorSheet, focusCabinet, tab, onCapture, onTrace, openUnknown, onOpenUnknown, onTodayJump, focusDevice, todayIndex, onTodayIndex,
}: {
  asset: FacilityAsset | null;
  area: FacilityArea | null;
  activeDocument: string | null;
  onDocument: (id: string | null) => void;
  onOpenCabinet: () => void;
  onPacket: (assetId: string) => void;
  onFocusCabinet: () => void;
  onDoorSheet: () => void;
  focusCabinet: boolean;
  tab: InspectorTab;
  onCapture: () => void;
  onTrace: () => void;
  openUnknown: string | null;
  onOpenUnknown: (id: string | null) => void;
  onTodayJump: (jump: ReturnType<typeof todayChipTarget>) => void;
  focusDevice: string | null;
  todayIndex: number;
  onTodayIndex: (index: number) => void;
}) {
  if (!asset) {
    const kit = area ? captureKitForArea(area.id) : null;
    return (
      <aside className="asset-panel panel empty-state">
        <p className="panel-title">Asset record</p>
        {kit?.kind === 'empty' && (tab === 'capture' || tab === 'record') ? (
          <div data-testid="area-kit">
            <h2>{kit.areaName} · not started</h2>
            <p>No assets in the graph. Capture kit only — this does not create a machine.</p>
            <button type="button" data-testid="export-area-pack" onClick={() => {
              const pack = exportAreaWalkPack(kit.areaId);
              if (!pack || pack.createsMachine !== false) return;
              const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
              const href = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = href;
              link.download = `iag-area-walk-${kit.areaId}.json`;
              link.click();
              URL.revokeObjectURL(href);
            }}>Export area walk pack</button>
            {tab === 'capture' && (
              <>
                <ol className="area-kit-list">
                  {kit.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
                </ol>
                <WalkdownForm targetId={kit.areaId} defaultField="note" onSaved={onCapture} />
                <section className="today-sheet" data-testid="today-sheet">
                  <p className="panel-title">Today’s walkdown · {todayProgress().open} open</p>
                  <div className="today-chips">
                    {todayWalkdownItems().map((item, index) => (
                      <button key={item.id} type="button" data-state={todayItemState(item)} className={todayIndex === index ? 'is-current' : ''} onClick={() => { onTodayIndex(index); onTodayJump(todayChipTarget(item)); }}>
                        {item.label}<small>{todayItemState(item)}</small>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        ) : (
          <>
            <h2>{area ? `Select a machine in ${area.shortName}` : 'Select an asset'}</h2>
            <p>{area ? 'Choose an asset marker on the map to open its evidence-aware documentation package.' : 'Choose an area, then select an asset marker to open its evidence-aware documentation package.'}</p>
            <div className="empty-chips"><span>Nameplate</span><span>Documents</span><span>Spare parts</span><span>Evidence</span></div>
          </>
        )}
      </aside>
    );
  }
  const assetDocs = documents.filter((item) => item.assetId === asset.id);
  const active = assetDocs.find((item) => item.id === activeDocument);
  const film = filmHonestyForAsset(asset.id);
  const parts = visiblePartsFor(asset.id);
  const isFeaturedCabinet = asset.id === featuredCabinetAssetId;
  return (
    <aside className="asset-panel panel">
      <div className="asset-banner">
        <div>
          <p>Selected asset</p>
          <h2>{asset.id}</h2>
          <span>{asset.name}</span>
        </div>
        <span className="verification-badge"><StatusI status={asset.verificationStatus} /> {stateLabel[asset.verificationStatus]}</span>
      </div>
      <div className="asset-actions">
        {isFeaturedCabinet && <button className="open-cabinet-cta" type="button" onClick={onOpenCabinet}>Cabinet</button>}
        {isFeaturedCabinet && <button className="packet-btn" type="button" onClick={onFocusCabinet}>{focusCabinet ? 'Board' : 'At panel'}</button>}
        <a className="film-chapter is-ghost" href={standalonePresentationHref()} target="_blank" rel="noopener noreferrer">
          {film.kind === 'chapter' ? 'Presentation ↗' : 'Presentation ↗'}
        </a>
        <button className="packet-btn" type="button" onClick={() => onPacket(asset.id)}>Packet</button>
        {isFeaturedCabinet && <button className="packet-btn" type="button" onClick={onDoorSheet}>Door</button>}
      </div>
      {tab === 'capture' && (
        <>
          <WalkdownForm targetId={asset.id} defaultField="unknown" onSaved={onCapture} />
          <section className="today-sheet" data-testid="today-sheet">
            <p className="panel-title">Today’s walkdown · {todayProgress().open} open</p>
            <div className="today-chips" data-testid="today-chips">
              {todayWalkdownItems().map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-state={todayItemState(item)}
                  className={todayIndex === index ? 'is-current' : ''}
                  onClick={() => { onTodayIndex(index); onTodayJump(todayChipTarget(item)); }}
                >
                  {item.label}<small>{todayItemState(item)}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="unknowns">
            <p className="panel-title">Field verification queue</p>
            {asset.unknowns.map((item) => {
              const state = unknownQueueState(asset.id, item);
              const open = openUnknown === item;
              return (
                <div key={item} className={open ? 'unknown-open' : ''}>
                  <p>
                    <StatusI status="FIELD_VERIFY" />
                    <span>{item}</span>
                    <button type="button" onClick={() => onOpenUnknown(open ? null : item)}>{open ? 'hide' : 'capture'}</button>
                    <button type="button" onClick={() => { if (state === 'open') markUnknownCaptured(asset.id, item); onCapture(); }}>{state === 'captured' ? 'captured' : 'mark'}</button>
                  </p>
                  {open && <WalkdownForm targetId={`${asset.id}:${item}`} promptSource={item} onSaved={onCapture} />}
                </div>
              );
            })}
          </section>
        </>
      )}
      {tab === 'intel' && (
        <>
          <button className="ghost-trace" type="button" onClick={onTrace}>Trace path</button>
          {isFeaturedCabinet && <PlcRackView />}
          {asset.componentIds.some((id) => id.includes('VFD') || id.includes('SD')) && (
            <DeviceIntel
              deviceOrComponentId={focusDevice ?? asset.componentIds.find((id) => id.includes('VFD')) ?? asset.id}
              onSelectDrive={(_, cabinetDeviceId) => { writeDeviceQuery(cabinetDeviceId); onOpenCabinet(); }}
            />
          )}
        </>
      )}
      {tab === 'record' && (
        <>
          {serialSourcesDisagree(asset.id) && (
            <section className="serial-dispute" data-testid="serial-dispute">
              <p className="panel-title">Conflicting identifiers</p>
              {serialSourcesFor(asset.id).map((source) => (
                <p key={source.id}><b>{source.label}</b> · {source.value} · {source.verificationStatus}</p>
              ))}
              <small>Both sources are DISPUTED. The graph does not pick a winner.</small>
            </section>
          )}
          <dl className="identity-grid">
            <FactRow label="Location" value={`${areas.find((item) => item.id === asset.areaId)?.name} / ${asset.line}`} status={isFeaturedCabinet ? 'INFERRED' : 'VERIFIED'} note={isFeaturedCabinet ? 'Area association is provisional.' : undefined} />
            <FactRow label="Asset type" value={asset.type} status="VERIFIED" />
            <FactRow label="Manufacturer" value={asset.manufacturer.value} status={asset.manufacturer.verificationStatus} note={asset.manufacturer.note} />
            <FactRow label="Model" value={asset.model.value} status={asset.model.verificationStatus} note={asset.model.note} />
            <FactRow label="Serial" value={asset.serialNumber.value} status={asset.serialNumber.verificationStatus} note={asset.serialNumber.note} />
            {asset.facts.map((item) => <FactRow key={item.label} label={item.label} value={item.value.value} status={item.value.verificationStatus} note={item.value.note} unit={item.value.unit} />)}
          </dl>
          <div className="progress-header"><span>Documentation progress</span><b>{documentationPercent(asset.id)}%</b></div>
          <progress value={documentationPercent(asset.id)} max="100" />
          {parts.length > 0 && (
            <section className="visible-parts" data-testid="visible-parts">
              <p className="panel-title">Visible on drawing</p>
              <ul>{parts.map((part) => <li key={part.id}>{part.label} · {part.id}</li>)}</ul>
            </section>
          )}
        </>
      )}
      {tab === 'docs' && (active ? (
        <DocumentBody documentId={active.id} onClose={() => onDocument(null)} />
      ) : (
        <div className="document-grid">
          {assetDocs.map((item) => (
            <button key={item.id} onClick={() => onDocument(item.id)}>
              <b>{item.category}</b>
              <small>{stateLabel[item.state]}</small>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function FactRow({ label, value, status, note, unit }: { label: string; value: string | number | null | undefined; status: VerificationState; note?: string; unit?: string }) {
  return (
    <div className="fact-row">
      <dt>{label}</dt>
      <dd>{value ?? 'Unknown'}{unit ? ` ${unit}` : ''}<span className="fact-state">{stateLabel[status]}</span>{note && <span className="fact-state">{note}</span>}</dd>
    </div>
  );
}
