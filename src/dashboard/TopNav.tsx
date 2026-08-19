export type WorkspaceTab = 'map' | 'assets' | 'relationships' | 'documents';

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
};

const workspaceLabel: Record<WorkspaceTab, string> = {
  map: 'Maps / Building Layout',
  assets: 'Assets',
  relationships: 'Relationships',
  documents: 'Documents',
};

export default function TopNav({
  brandMark,
  facilityName,
  workspaceTab,
  drawerOpen,
  query,
  onToggleDrawer,
  onQuery,
  onOpenSearch,
}: Props) {
  return (
    <header className="top-nav reference-topbar">
      <button className="nav-toggle reference-menu-button" type="button" aria-label={drawerOpen ? 'Close facility menu' : 'Open facility menu'} aria-expanded={drawerOpen} onClick={onToggleDrawer}>☰</button>
      <div className="reference-breadcrumbs">
        <strong>{facilityName.toUpperCase()}</strong>
        <small className="mobile-workspace-label">{workspaceLabel[workspaceTab]}</small>
        <span>/</span>
        <span className="reference-breadcrumb-map" aria-current={workspaceTab === 'map' ? 'page' : undefined}>{workspaceLabel[workspaceTab].split(' / ')[0]}</span>
        {workspaceTab === 'map' && <><span>/</span><b>Building Layout</b></>}
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
    </header>
  );
}
