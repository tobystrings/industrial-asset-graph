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

const workspaceLabel: Record<WorkspaceTab, string> = {
  map: 'Map',
  assets: 'Assets',
  relationships: 'Relationships',
  documents: 'Documents',
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
      <button
        className="nav-toggle"
        type="button"
        aria-label={drawerOpen ? 'Close facility menu' : 'Open facility menu'}
        aria-expanded={drawerOpen}
        onClick={onToggleDrawer}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <div className="brand">
        <span className="brand-mark">{brandMark}</span>
        <div className="brand-copy">
          <strong>{facilityName}</strong>
          <em>Industrial Asset Graph</em>
          <small className="mobile-workspace-label">{workspaceLabel[workspaceTab]}</small>
        </div>
      </div>
      <nav className={navOpen ? 'open' : ''} aria-label="Primary workspace">
        <button aria-current={workspaceTab === 'map' ? 'page' : undefined} className={workspaceTab === 'map' ? 'nav-active' : ''} onClick={() => onWorkspace('map')}>Map</button>
        <button aria-current={workspaceTab === 'assets' ? 'page' : undefined} className={workspaceTab === 'assets' ? 'nav-active' : ''} onClick={() => onWorkspace('assets')}>Assets</button>
        <button aria-current={workspaceTab === 'relationships' ? 'page' : undefined} className={workspaceTab === 'relationships' ? 'nav-active' : ''} onClick={() => onWorkspace('relationships')}>Relationships</button>
        <button aria-current={workspaceTab === 'documents' ? 'page' : undefined} className={workspaceTab === 'documents' ? 'nav-active' : ''} onClick={() => onWorkspace('documents')}>Documents</button>
        <button onClick={onOpenCabinet}>Cabinet</button>
      </nav>
      <a className="film-link" href={standalonePresentationHref()} target="_blank" rel="noopener noreferrer" aria-label="Open standalone presentation">
        <span aria-hidden="true">▶</span><span className="film-link-label">Presentation ↗</span>
      </a>
      <label className="global-search">
        <span className="sr-only">Search assets</span>
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search assets…" onFocus={onOpenSearch} />
        <kbd>/</kbd>
      </label>
      <button className="mobile-search-button" type="button" onClick={onOpenSearch} aria-label="Search facility">
        <span aria-hidden="true">⌕</span>
      </button>
    </header>
  );
}
