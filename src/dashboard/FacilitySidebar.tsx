import { markerClass } from '../lib/statusMark';
import type { FacilityArea, SystemKind, VerificationState } from '../types/facility';
import type { WorkspaceTab } from './TopNav';

type AppView = 'dashboard' | 'assets' | 'documents' | 'cabinet';

type Props = {
  drawerOpen: boolean;
  workspaceTab: WorkspaceTab;
  view: AppView;
  systemKind: SystemKind;
  areas: FacilityArea[];
  equipmentCount: number;
  selectedArea: FacilityArea | null;
  filters: Set<VerificationState>;
  onWorkspace: (tab: WorkspaceTab) => void;
  onArea: (area: FacilityArea) => void;
  onOpenCabinet: () => void;
  onSystems: () => void;
  onUsers: () => void;
  onToggleFilter: (state: VerificationState) => void;
};

const group = (label: string, items: { icon: string; label: string; action?: () => void; active?: boolean }[]) => (
  <section className="reference-nav-group" key={label}>
    <p className="reference-nav-heading">{label}</p>
    {items.map((item) => (
      <button key={item.label} type="button" className={item.active ? 'side-active' : ''} onClick={item.action} aria-disabled={!item.action || undefined}>
        <span className="reference-nav-icon" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    ))}
  </section>
);

export default function FacilitySidebar({
  drawerOpen,
  workspaceTab,
  onWorkspace,
  onOpenCabinet,
  onSystems,
  onUsers,
}: Props) {
  return (
    <aside className={`facility-sidebar reference-sidebar ${drawerOpen ? 'open' : ''}`}>
      <div className="reference-sidebar-brand" aria-label="Industrial Asset Graph">
        <span className="reference-network-mark" aria-hidden="true">⌁</span>
        <strong>INDUSTRIAL<br />ASSET GRAPH</strong>
      </div>

      {group('OVERVIEW', [
        { icon: '⌂', label: 'Dashboard', action: () => onWorkspace('map') },
        { icon: '◫', label: 'Map', action: () => onWorkspace('map'), active: workspaceTab === 'map' },
      ])}
      {group('ASSETS', [
        { icon: '⌘', label: 'Equipment', action: () => onWorkspace('assets') },
        { icon: '▣', label: 'Control Cabinets', action: onOpenCabinet },
        { icon: '▤', label: 'Panels', action: onSystems },
        { icon: '◉', label: 'Components', action: onSystems },
      ])}
      {group('DOCUMENTS', [
        { icon: '▧', label: 'Procedures', action: () => onWorkspace('documents') },
        { icon: '▱', label: 'Drawings', action: () => onWorkspace('documents') },
        { icon: '▥', label: 'Files', action: () => onWorkspace('documents') },
      ])}
      {group('OPERATIONS', [
        { icon: '◇', label: 'Work Orders' },
        { icon: '◷', label: 'Downtime' },
        { icon: '◇', label: 'Training' },
      ])}
      {group('ADMIN', [
        { icon: '⌂', label: 'Facilities' },
        { icon: '♙', label: 'Users', action: onUsers },
        { icon: '⚙', label: 'Settings' },
      ])}

      <button className="reference-collapse" type="button" aria-label="Collapse sidebar"><span aria-hidden="true">‹</span> Collapse</button>
    </aside>
  );
}
