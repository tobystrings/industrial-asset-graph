import { containedComponentIds, resolveTraceComponentId, traceNodesFor } from '../lib/tracePath';
import { parseDeviceQuery, writeDeviceQuery } from '../lib/deviceQuery';
import { unusedRelationshipCounts, suppliesHonesty } from '../lib/relationshipHonesty';
import type { FacilityArea, FacilityAsset } from '../types/facility';

export default function RelationshipsWorkspace({
  nodes,
  traceHeading,
  traceOn,
  selectedAsset,
  selectedArea,
  focusDevice,
  featuredCabinetAssetId,
  onTrace,
  onArea,
  onAsset,
  onComponent,
  onOpenCabinet,
}: {
  nodes: ReturnType<typeof traceNodesFor>;
  traceHeading: string;
  traceOn: boolean;
  selectedAsset: FacilityAsset | null;
  selectedArea: FacilityArea | null;
  focusDevice: string | null;
  featuredCabinetAssetId: string;
  onTrace: () => void;
  onArea: (areaId: string) => void;
  onAsset: (assetId: string) => void;
  onComponent: (componentId: string) => void;
  onOpenCabinet: () => void;
}) {
  const currentId = selectedAsset?.id ?? selectedArea?.id ?? 'facility';
  const relationshipCounts = unusedRelationshipCounts();

  return (
    <section className="relationship-panel panel enter" data-guide-target="relationships" style={{ animationDelay: '120ms' }}>
      <div className="panel-heading relationship-heading">
        <div><b>Asset relationships</b><small data-testid="trace-heading">{traceHeading}</small></div>
        <span className={`trace-state ${traceOn ? 'active' : ''}`}>{traceOn ? 'Trace active' : 'Trace ready'}</span>
        <button className="relationship-more" type="button" onClick={onTrace} aria-pressed={traceOn}>{traceOn ? 'Refresh trace' : 'Trace'}</button>
      </div>
      <div className="relationship-summary" aria-label="Relationship summary">
        <span><b>{nodes.length}</b> nodes in current path</span>
        {Object.entries(relationshipCounts).map(([type, count]) => <span key={type}>{type} <b>{count}</b></span>)}
        <span className="relationship-honesty">{suppliesHonesty().note}</span>
      </div>
      <div
        className={`relationship-flow scroll-pane${traceOn ? ' is-live' : ''}`}
        data-testid="relationship-flow"
        data-trace={currentId}
        key={`${currentId}:${focusDevice ?? ''}`}
        aria-label={`Relationship path for ${currentId}`}
      >
        {nodes.map((node, index) => {
          const current = node.id === selectedAsset?.id || node.id === selectedArea?.id || resolveTraceComponentId(focusDevice) === node.id;
          return (
            <span key={node.id} style={{ display: 'contents' }}>
              {index > 0 && (
                <svg className="trace-connector" viewBox="0 0 28 8" aria-hidden="true">
                  <line className="trace-line" x1="1" y1="4" x2="27" y2="4" />
                </svg>
              )}
              <button
                type="button"
                className={`trace-node${current ? ' is-current' : ''}`}
                aria-current={current ? 'true' : undefined}
                aria-label={`${node.kind}: ${node.label}${current ? ', current selection' : ''}`}
                style={{ animationDelay: `${index * 70}ms` }}
                onClick={() => {
                  if (node.kind === 'area') return onArea(node.id);
                  if (node.kind === 'asset') return onAsset(node.id);
                  if (node.kind === 'component') {
                    onComponent(node.id);
                    const parsed = parseDeviceQuery(node.id);
                    if (parsed) writeDeviceQuery(parsed.deviceId, { cabinet: false });
                  }
                }}
              >
                <small>{node.kind}</small>{node.label}
              </button>
            </span>
          );
        })}
        {!nodes.length && (
          <div className="relationship-empty" role="status">
            <b>No relationship path is available for this selection.</b>
            <span>Select an area, asset, or device with graph relationships and trace again.</span>
          </div>
        )}
        {selectedAsset?.id === featuredCabinetAssetId && containedComponentIds(selectedAsset.id).length > 4 && (
          <button className="relationship-more relationship-more-devices" type="button" onClick={onOpenCabinet}>Open full cabinet device list →</button>
        )}
      </div>
    </section>
  );
}
