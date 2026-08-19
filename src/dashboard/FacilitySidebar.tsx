import { markerClass } from '../lib/statusMark';
import type { FacilityArea, SystemKind, VerificationState } from '../types/facility';
import type { WorkspaceTab } from './TopNav';

type AppView = 'dashboard' | 'assets' | 'documents' | 'cabinet';

const stateLabel: Record<VerificationState, string> = {
  VERIFIED: 'Verified',
  FIELD_VERIFY: 'Field verify',
  INFERRED: 'Inferred',
  DISPUTED: 'Disputed',
  RETIRED: 'Retired',
};

const filterStates: VerificationState[] = ['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED'];

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
  onToggleFilter: (state: VerificationState) => void;
};

export default function FacilitySidebar({
  drawerOpen,
  workspaceTab,
  view,
  systemKind,
  areas,
  equipmentCount,
  selectedArea,
  filters,
  onWorkspace,
  onArea,
  onOpenCabinet,
  onSystems,
  onToggleFilter,
}: Props) {
  return (
    <aside className={`facility-sidebar ${drawerOpen ? 'open' : ''} enter`} style={{ animationDelay: '40ms' }}>
      <section>
        <p className="panel-title">Facility navigation</p>
        <button className={workspaceTab === 'map' ? 'side-active' : ''} onClick={() => onWorkspace('map')}>Building layout</button>
        <button className={workspaceTab === 'assets' ? 'side-selected' : ''} onClick={() => onWorkspace('assets')}>Areas<b>{areas.length}</b></button>
        <button onClick={() => onWorkspace('assets')}>Equipment<b>{equipmentCount}</b></button>
        <button className={workspaceTab === 'documents' ? 'side-selected' : ''} onClick={() => onWorkspace('documents')}>Documents</button>
        <button onClick={onOpenCabinet}>Control cabinets</button>
        <button className={view === 'assets' && systemKind !== 'ALL' ? 'side-selected' : ''} onClick={onSystems}>Systems</button>
      </section>
      <section>
        <p className="panel-title">Areas</p>
        <div className="area-scroll scroll-pane">
          {areas.map((area) => (
            <button key={area.id} className={selectedArea?.id === area.id ? 'side-selected' : ''} onClick={() => onArea(area)}>
              <i className={markerClass(area.status)} aria-hidden="true" /><span>{area.shortName}</span><b>{area.assetIds.length || ''}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="legend">
        <p className="panel-title">Verification filters</p>
        {filterStates.map((item) => (
          <label key={item} className={filters.has(item) ? '' : 'is-dimmed'}>
            <input type="checkbox" checked={filters.has(item)} onChange={() => onToggleFilter(item)} />
            <i className={markerClass(item)} aria-hidden="true" />{stateLabel[item]}
          </label>
        ))}
      </section>
    </aside>
  );
}
