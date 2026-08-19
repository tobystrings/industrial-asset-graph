import { standalonePresentationHref } from '../lib/filmGenie';

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

export default function TopNav({
  brandMark,
  facilityName,
  workspaceTab,
  navOpen,
  drawerOpen,
  query,
  onToggleDrawer,
  onWorkspace,
  onOpenCabinet,
  onQuery,
  onOpenSearch,
}: Props) {
  return (
    <header className="top-nav">
      <button className="nav-toggle" type="button" aria-label="Open menu" aria-expanded={drawerOpen} onClick={onToggleDrawer}>☰</button>
      <div className="brand">
        <span className="brand-mark">{brandMark}</span>
        <div><strong>{facilityName}</strong><em>Industrial Asset Graph</em></div>
      </div>
      <nav className={navOpen ? 'open' : ''} aria-label="Primary">
        <button className={workspaceTab === 'map' ? 'nav-active' : ''} onClick={() => onWorkspace('map')}>Map</button>
        <button className={workspaceTab === 'assets' ? 'nav-active' : ''} onClick={() => onWorkspace('assets')}>Assets</button>
        <button className={workspaceTab === 'relationships' ? 'nav-active' : ''} onClick={() => onWorkspace('relationships')}>Relationships</button>
        <button className={workspaceTab === 'documents' ? 'nav-active' : ''} onClick={() => onWorkspace('documents')}>Documents</button>
        <button onClick={onOpenCabinet}>Cabinet</button>
      </nav>
      <a className="film-link" href={standalonePresentationHref()} target="_blank" rel="noopener noreferrer" aria-label="Open standalone presentation">▶ <span>Presentation ↗</span></a>
      <label className="global-search" onClick={onOpenSearch}>
        <span className="sr-only">Search assets</span>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search assets…" onFocus={onOpenSearch} />
        <kbd>/</kbd>
      </label>
    </header>
  );
}
