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
  return (
    <section className="relationship-panel panel enter" data-guide-target="relationships" style={{ animationDelay: '120ms' }}>
      <div className="panel-heading">
        <b>Asset relationships</b>
        <small data-testid="trace-heading">{traceHeading}</small>
        <button className="relationship-more" type="button" onClick={onTrace}>Trace</button>
      </div>
      <p className="unused-rels" data-testid="unused-rels">
        {Object.entries(unusedRelationshipCounts()).map(([type, count]) => <span key={type}>{type} {count}</span>)}
        <span>{suppliesHonesty().note}</span>
      </p>
      <div
        className={`relationship-flow scroll-pane${traceOn ? ' is-live' : ''}`}
        data-testid="relationship-flow"
        data-trace={selectedAsset?.id ?? selectedArea?.id ?? 'facility'}
        key={`${selectedAsset?.id ?? selectedArea?.id ?? 'facility'}:${focusDevice ?? ''}`}
      >
        {nodes.map((node, index) => (
          <span key={node.id} style={{ display: 'contents' }}>
            {index > 0 && (
              <svg className="trace-connector" viewBox="0 0 28 8" aria-hidden="true">
                <line className="trace-line" x1="1" y1="4" x2="27" y2="4" />
              </svg>
            )}
            <button
              type="button"
              className={`trace-node${node.id === selectedAsset?.id || node.id === selectedArea?.id || resolveTraceComponentId(focusDevice) === node.id ? ' is-current' : ''}`}
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
        ))}
        {selectedAsset?.id === featuredCabinetAssetId && containedComponentIds(selectedAsset.id).length > 4 && (
          <button className="relationship-more" onClick={onOpenCabinet}>+ more devices →</button>
        )}
      </div>
    </section>
  );
}
