import { useEffect, useState } from 'react';

export type WorkspaceTab = 'map' | 'assets' | 'relationships' | 'documents' | 'field';
type RecentWorkspace = { tab: WorkspaceTab; label: string; href: string; pinned?: boolean };

type Props = {
  brandMark: string;
  facilityName: string;
  workspaceTab: WorkspaceTab;
  navOpen: boolean;
  drawerOpen: boolean;
  query: string;
  onToggleDrawer: () => void;
  onWorkspace: (tab: WorkspaceTab) => void;
  onOpenCabinet: () => void;
  onQuery: (value: string) => void;
  onOpenSearch: () => void;
  breadcrumb?: string;
  attention?: { field: number; relationships: number };
};

const workspaceLabel: Record<WorkspaceTab, string> = {
  map: 'Maps / Building Layout',
  assets: 'Assets',
  relationships: 'Relationships',
  documents: 'Documents',
  field: 'Field Documentation',
};

export default function TopNav({
  brandMark,
  facilityName,
  workspaceTab,
  drawerOpen,
  query,
  onToggleDrawer,
  onWorkspace,
  onOpenCabinet,
  onQuery,
  onOpenSearch,
  breadcrumb,
  attention,
}: Props) {
  const [recentTabs, setRecentTabs] = useState<RecentWorkspace[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('iag-recent-workspaces') ?? '[]') as unknown;
      return Array.isArray(saved) ? saved.filter((item): item is RecentWorkspace => Boolean(item && typeof item === 'object' && ['map', 'assets', 'relationships', 'documents', 'field'].includes(String((item as RecentWorkspace).tab)) && typeof (item as RecentWorkspace).href === 'string')).slice(0, 6) : [];
    } catch { return []; }
  });
  const removeRecent = (href: string) => setRecentTabs((current) => {
    const next = current.filter((item) => item.href !== href);
    try { localStorage.setItem('iag-recent-workspaces', JSON.stringify(next)); } catch { /* storage is optional */ }
    return next;
  });
  const togglePinned = (href: string) => setRecentTabs((current) => {
    const next = current.map((item) => item.href === href ? { ...item, pinned: !item.pinned } : item).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    try { localStorage.setItem('iag-recent-workspaces', JSON.stringify(next)); } catch { /* storage is optional */ }
    return next;
  });
  const clearRecent = () => { setRecentTabs([]); try { localStorage.removeItem('iag-recent-workspaces'); } catch { /* storage is optional */ } };
  useEffect(() => {
    setRecentTabs((current) => {
      const entry: RecentWorkspace = { tab: workspaceTab, label: `${workspaceLabel[workspaceTab].split(' / ')[0]}${breadcrumb ? ` · ${breadcrumb}` : ''}`, href: window.location.href };
      const next = [entry, ...current.filter((item) => item.href !== entry.href)].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).slice(0, 8);
      try { localStorage.setItem('iag-recent-workspaces', JSON.stringify(next)); } catch { /* storage is optional */ }
      return next;
    });
  }, [workspaceTab, breadcrumb]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string | undefined>).detail;
      if (!detail) return;
      setRecentTabs((current) => {
        const entry: RecentWorkspace = { tab: workspaceTab, label: `${workspaceLabel[workspaceTab].split(' / ')[0]} · ${detail}`, href: window.location.href };
        const next = [entry, ...current.filter((item) => item.href !== entry.href)].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).slice(0, 8);
        try { localStorage.setItem('iag-recent-workspaces', JSON.stringify(next)); } catch { /* storage is optional */ }
        return next;
      });
    };
    addEventListener('iag-recent-location', handler);
    return () => removeEventListener('iag-recent-location', handler);
  }, [workspaceTab]);
  return (
    <header className="top-nav reference-topbar">
      <button className="nav-toggle reference-menu-button" type="button" aria-label={drawerOpen ? 'Close facility menu' : 'Open facility menu'} aria-expanded={drawerOpen} onClick={onToggleDrawer}>☰</button>
      <button className="reference-back-button" type="button" aria-label="Go back to previous workspace" onClick={() => window.history.length > 1 ? window.history.back() : onWorkspace('map')}>‹</button>
      <div className="reference-breadcrumbs">
        <strong>{facilityName.toUpperCase()}</strong>
        <small className="mobile-workspace-label">{workspaceLabel[workspaceTab]}</small>
        <span>/</span>
        <span className="reference-breadcrumb-map" aria-current={workspaceTab === 'map' ? 'page' : undefined}>{workspaceLabel[workspaceTab].split(' / ')[0]}</span>
        {workspaceTab === 'map' && <><span>/</span><b>Building Layout</b></>}
        {breadcrumb && <><span>/</span><b className="reference-breadcrumb-detail">{breadcrumb}</b></>}
      </div>
      <label className="global-search reference-search">
        <span className="reference-search-icon" aria-hidden="true">⌕</span>
        <span className="sr-only">Search assets, areas, documents</span>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search assets, areas, docs..." onFocus={onOpenSearch} />
      </label>
      <button className="reference-icon-button" type="button" aria-label="Notifications">♧</button>
      <button className="reference-icon-button" type="button" aria-label="Help">?</button>
      <button className="reference-user-button" type="button" aria-label="User profile">{brandMark || 'TS'}</button>
      <button className="mobile-search-button" type="button" onClick={onOpenSearch} aria-label="Search facility">⌕</button>
      <nav className="workspace-tab-strip" aria-label="Open workspaces">
        {(['map', 'assets', 'relationships', 'documents', 'field'] as WorkspaceTab[]).map((tab) => <button key={tab} type="button" className={workspaceTab === tab ? 'active' : ''} aria-current={workspaceTab === tab ? 'page' : undefined} onClick={() => onWorkspace(tab)}>{workspaceLabel[tab].split(' / ')[0]}{tab === 'field' && attention?.field ? <em aria-label={`${attention.field} open field items`}>{attention.field}</em> : null}{tab === 'relationships' && attention?.relationships ? <em aria-label={`${attention.relationships} relationships needing review`}>{attention.relationships}</em> : null}</button>)}
        <button type="button" onClick={onOpenCabinet} className="cabinet-tab">Cabinet</button>
      </nav>
      <nav className="recent-workspace-trail" aria-label="Recent workspaces">
        <span>Recent</span>
        {recentTabs.map((item) => <span className={`recent-workspace-tab ${workspaceTab === item.tab ? 'active' : ''} ${item.pinned ? 'pinned' : ''}`} key={`${item.tab}-${item.href}`}><button type="button" title={item.href} aria-current={item.href === window.location.href ? 'page' : undefined} onClick={() => { window.history.pushState(null, '', item.href); window.dispatchEvent(new PopStateEvent('popstate')); }}>{item.pinned ? '★ ' : ''}{item.label}</button><button type="button" className="recent-workspace-pin" aria-label={`${item.pinned ? 'Unpin' : 'Pin'} ${item.label}`} onClick={() => togglePinned(item.href)}>{item.pinned ? '★' : '☆'}</button><button type="button" className="recent-workspace-close" aria-label={`Close ${item.label}`} onClick={() => removeRecent(item.href)}>×</button></span>)}
        {recentTabs.length > 0 && <button className="recent-workspace-clear" type="button" onClick={clearRecent}>Clear</button>}
      </nav>
    </header>
  );
}
