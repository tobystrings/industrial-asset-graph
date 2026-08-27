import { useEffect, useMemo, useRef, useState } from 'react';
import { areas, components, evidence, facility, machines, relationships, revisions } from './facilityData';
import { activeFacilityPackage } from './facility';
import AssetDirectory from './AssetDirectory';
import TopNav, { type WorkspaceTab } from './dashboard/TopNav';
import FacilitySidebar from './dashboard/FacilitySidebar';
import KpiStrip from './dashboard/KpiStrip';
import InspectorRail from './dashboard/InspectorRail';
import RelationshipsWorkspace from './dashboard/RelationshipsWorkspace';
import DocumentsWorkspace from './dashboard/DocumentsWorkspace';
import FieldDocumentationWorkspace from './dashboard/FieldDocumentationWorkspace';
import { cycleInspectorTab, parseInspectorTab, type InspectorTab } from './lib/boardChrome';
import { parseDeviceQuery, writeDeviceQuery } from './lib/deviceQuery';
import { assetDocumentationCompleteness, documentedAssetCount, documentationCoveragePercent, openFieldItemCount, recordCount, verificationCounts } from './lib/facilityMetrics';
import type { FilmCommand } from './lib/filmBridge';
import { standalonePresentationHref } from './lib/filmGenie';
import { countAt } from './lib/motion';
import { doorSheetCards, doorSheetText } from './lib/doorSheet';
import { doorCodeCaption, hrefMatrixSvg } from './lib/hrefMatrix';
import { coverageSubtitle, queueCountLabel } from './lib/floorPass';
import { todayWalkdownItems } from './lib/walkdownPrompts';
import { searchCatalog, type SearchHit } from './lib/searchIndex';
import { markerClass } from './lib/statusMark';
import { componentBelongsToAsset, resolveTraceComponentId, traceNodesFor } from './lib/tracePath';
import { troubleshoot, type TroubleshootMode } from './lib/troubleshootGraph';
import { prefersReducedMotion, scrollPaneToTop } from './lib/scrollChrome';
import { dashboardSearch, genieQueryFromSearch, phoneTabFromQuery, subscribeViewport } from './lib/viewport';
import MapStage, { mapModeFromQuery, type MapMode } from './map/MapStage';
import type { DocumentationState, FacilityArea, FacilityAsset, ReviewDecision, SystemKind, VerificationState } from './types/facility';

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
  const requestedAssetId = params.get('asset');
  const initialAsset = machines.find((item) => item.id === requestedAssetId) ?? null;
  const [unresolvedAssetId] = useState(() => requestedAssetId && !initialAsset ? requestedAssetId : null);
  const initialArea = areas.find((item) => item.id === params.get('area')) ?? (initialAsset ? areas.find((item) => item.id === initialAsset.areaId) : null) ?? null;
  const [selectedArea, setSelectedArea] = useState<FacilityArea | null>(initialArea);
  const [selectedAsset, setSelectedAsset] = useState<FacilityAsset | null>(initialAsset ?? (params.get('field') === '1' ? machines[0] ?? null : null));
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
    params.get('field') === '1' ? 'field' : view === 'assets' ? 'assets' : view === 'documents' ? 'documents' : (params.get('command') === 'trace' || params.get('trace')) ? 'relationships' : 'map'
  ));
  const [traceOn, setTraceOn] = useState(params.get('command') === 'trace' || Boolean(params.get('trace')));
  const [traceMode, setTraceMode] = useState<TroubleshootMode>(() => {
    const value = params.get('trace');
    return value === 'direct' || value === 'upstream' || value === 'downstream' || value === 'impact' || value === 'full' ? value : 'direct';
  });
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
      trace: traceOn ? traceMode : null,
      ...genieQueryFromSearch(location.search),
    });
    history.replaceState(null, '', `${location.pathname}${search}`);
    if (workspaceTab === 'field') {
      const fieldParams = new URLSearchParams(location.search);
      fieldParams.set('field', '1');
      history.replaceState(null, '', `${location.pathname}?${fieldParams.toString()}${location.hash}`);
    }
    localStorage.setItem('industrial-asset-selection', JSON.stringify({ area: selectedArea?.id, asset: selectedAsset?.id }));
  }, [selectedArea, selectedAsset, view, activeDocument, mapMode, inspectorTab, focusCabinet, paletteOpen, paletteQuery, focusDevice, doorOpen, workspaceTab, traceMode, traceOn]);

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
    if (workspaceTab === 'field' && !selectedAsset && machines[0]) setSelectedAsset(machines[0]);
  }, [workspaceTab, selectedAsset]);

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
        setTodayIndex((current) => event.key === 'j' ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1));
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
  const troubleshootReport = useMemo(
    () => troubleshoot({ assets: machines, components, relationships }, selectedAsset?.id ?? '', traceMode),
    [selectedAsset, traceMode],
  );

  const changeTraceMode = (mode: TroubleshootMode) => {
    setTraceMode(mode);
    setTraceOn(true);
    const next = new URLSearchParams(location.search);
    if (selectedAsset) next.set('asset', selectedAsset.id);
    next.set('trace', mode);
    next.delete('command');
    history.replaceState(null, '', `${location.pathname}?${next.toString()}${location.hash}`);
  };

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
    if (tab === 'field') { onView('dashboard'); setSelectedAsset((current) => current ?? machines[0] ?? null); }
    else if (tab === 'assets') onView('assets');
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
    <main className={`dashboard workspace-${workspaceTab} phone-${phoneTab} view-${view}${drawerOpen ? ' drawer-open' : ''}${focusCabinet ? ' focus-cabinet' : ''}`}>
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
        onUsers={() => { window.dispatchEvent(new CustomEvent('iag-open-users')); setDrawerOpen(false); }}
        onSettings={() => { window.dispatchEvent(new CustomEvent('iag-open-settings')); setDrawerOpen(false); }}
        onToggleFilter={(item) => {
          const next = new Set(filters);
          next.has(item) ? next.delete(item) : next.add(item);
          setFilters(next);
        }}
      />
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
      {unresolvedAssetId && <div className="deep-link-warning" role="alert">Asset “{unresolvedAssetId}” was not found. Showing the facility board instead.</div>}

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

          {workspaceTab === 'map' && (
            <section className="map-panel panel enter" data-guide-target="facility-map" style={{ animationDelay: '80ms' }}>
              <div className="panel-heading">
                <b>Building layout</b>
                <small className="crumb">{breadcrumb}{selectedArea && <button type="button" onClick={() => { setSelectedArea(null); setSelectedAsset(null); setFocusDevice(null); }}> · All areas</button>}</small>
                <span className="kpi-compact" data-testid="kpi-compact"><span>{coverage}%</span><span>{fieldItems} field</span><span>{documentedAssetCount()} assets</span></span>
              </div>
              <MapStage selectedArea={selectedArea} selectedAsset={selectedAsset} filters={filters} traceAssetIds={traceOn ? troubleshootReport.highlightedEntityIds : undefined} onArea={selectArea} onAsset={selectAsset} />
            </section>
          )}

          {workspaceTab === 'relationships' && (
            <RelationshipsWorkspace
              report={troubleshootReport}
              mode={traceMode}
              selectedAsset={selectedAsset}
              onMode={changeTraceMode}
              onAsset={(assetId) => {
                const asset = machines.find((item) => item.id === assetId);
                if (asset) selectAsset(asset);
              }}
              onMap={() => setWorkspaceTab('map')}
              onExit={() => {
                setTraceOn(false);
                setWorkspaceTab('map');
                const next = new URLSearchParams(location.search);
                next.delete('trace'); next.delete('command');
                history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}${location.hash}`);
              }}
            />
          )}
          {workspaceTab === 'field' && <FieldDocumentationWorkspace selectedAsset={selectedAsset} onAsset={selectAsset} onChanged={() => setCaptureTick((value) => value + 1)} onExit={() => setWorkspaceTab('map')} />}
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
        <DocumentsWorkspace
          activeDocument={activeDocument}
          docStateFilter={docStateFilter}
          onDocument={setActiveDocument}
          onDocStateFilter={setDocStateFilter}
        />
      )}

      <InspectorRail
        ref={railRef}
        inspectorTab={inspectorTab}
        onInspectorTab={setInspectorTab}
        nodes={nodes}
        filters={filters}
        shownCounts={shownCounts}
        selectedAsset={selectedAsset}
        selectedArea={selectedArea}
        activeDocument={activeDocument}
        onDocument={setActiveDocument}
        onOpenCabinet={onOpenCabinet}
        packetOpen={packetOpen}
        packetAsset={packetAsset}
        onPacket={(assetId) => { setPacketAsset(assetId); setPacketOpen(true); }}
        onClosePacket={() => setPacketOpen(false)}
        focusCabinet={focusCabinet}
        onFocusCabinet={() => setFocusCabinet((value) => !value)}
        onDoorSheet={() => setDoorOpen(true)}
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
        captureTick={captureTick}
        reviewFilter={reviewFilter}
        onReviewFilter={setReviewFilter}
        lastKeepPatch={lastKeepPatch}
        onLastKeepPatch={setLastKeepPatch}
        lastKeepSummary={lastKeepSummary}
        onLastKeepSummary={setLastKeepSummary}
        lastPreviewPatch={lastPreviewPatch}
        onLastPreviewPatch={setLastPreviewPatch}
        importNote={importNote}
        onImportNote={setImportNote}
        applyWarning={applyWarning}
        onApplyWarning={setApplyWarning}
        revisions={revisions}
        evidence={evidence}
      />

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
            {hits.map((hit, index) => <button key={`${hit.kind}-${hit.id}`} type="button" aria-current={index === paletteIndex} onClick={() => applyHit(hit)}><span>{hit.title}</span><small>{hit.kind} · {hit.subtitle}</small></button>)}
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
      <div className="panel-heading"><b>Control cabinet door sheet</b><button type="button" onClick={async () => { await navigator.clipboard.writeText(doorSheetText(cards)); }}>Copy links</button><button type="button" onClick={() => window.print()}>Print</button><button type="button" onClick={onClose}>Close</button></div>
      <p className="walkdown-hint">{doorCodeCaption()}</p>
      <ul className="door-cards">{cards.map((card) => <li key={card.deviceId}><div dangerouslySetInnerHTML={{ __html: hrefMatrixSvg(card.href) }} /><div><b>{card.label}</b><code>{card.href}</code></div></li>)}</ul>
    </section>
  );
}
