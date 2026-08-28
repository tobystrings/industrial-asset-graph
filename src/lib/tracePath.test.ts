import { describe, expect, it } from 'vitest';
import activeFacilityPackage from '../facility/activeFacility';
const { areas, components, facility, assets: machines, relationships } = activeFacilityPackage;
import { containedComponentIds, relationshipIdsFor, traceHeadingFor, traceNodesFor } from './tracePath';

describe('tracePath', () => {
  it('builds a trace only from existing relationship and component ids', () => {
    const cabinet = machines.find((item) => item.id === 'L2-CC-001')!;
    const nodes = traceNodesFor(cabinet);
    const known = new Set<string>([cabinet.id, cabinet.areaId, ...containedComponentIds(cabinet.id), ...relationships.filter((item) => item.source === cabinet.id).map((item) => item.target)]);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    for (const node of nodes) expect(known.has(node.id)).toBe(true);
    for (const id of containedComponentIds(cabinet.id)) expect(components.some((item) => item.id === id)).toBe(true);
    for (const id of relationshipIdsFor(cabinet)) expect(relationships.some((item) => item.id === id)).toBe(true);
  });

  it('follows the selected area or asset instead of staying on Line 2', () => {
    const l4 = machines.find((item) => item.id === 'FG-L4-MTN-001')!;
    const l4Nodes = traceNodesFor(l4);
    expect(l4Nodes.some((node) => node.id === 'FG-L4-MTN-001')).toBe(true);
    expect(l4Nodes.some((node) => node.id === 'L2-CC-001')).toBe(false);
    expect(traceHeadingFor(l4)).toContain('FG-L4-MTN-001');
    const dock = areas.find((item) => item.id === 'area-warehouse-e')!;
    const dockNodes = traceNodesFor(null, { area: dock });
    expect(dockNodes.map((node) => node.id)).toEqual(['area-warehouse-e']);
    expect(dockNodes.some((node) => node.id === 'L2-CC-001')).toBe(false);
    expect(traceHeadingFor(null, { area: dock }).toLowerCase()).toContain('no assets');
    const warehouse = areas.find((item) => item.id === 'area-warehouse-f')!;
    const warehouseNodes = traceNodesFor(null, { area: warehouse });
    expect(warehouseNodes.some((node) => node.id === 'area-warehouse-f')).toBe(true);
    expect(warehouseNodes.some((node) => node.id === 'L2-CC-001')).toBe(true);
    expect(warehouseNodes.some((node) => node.id === 'FG-L4-MTN-001')).toBe(true);
    const idle = traceNodesFor(null);
    expect(idle.some((node) => node.id === facility.id)).toBe(true);
    expect(idle.some((node) => node.id === 'L2-CC-001')).toBe(false);
  });

  it('updates the component node when a different device on the asset is focused', () => {
    const cabinet = machines.find((item) => item.id === 'L2-CC-001')!;
    const plc = traceNodesFor(cabinet);
    expect(plc.some((node) => node.id === 'L2-CC-PLC-001')).toBe(true);
    const drive = traceNodesFor(cabinet, { componentId: 'vfd-03' });
    expect(drive.some((node) => node.id === 'L2-CC-VFD-003')).toBe(true);
    expect(drive.some((node) => node.id === 'L2-CC-PLC-001')).toBe(false);
    const l4 = machines.find((item) => item.id === 'FG-L4-MTN-001')!;
    const ignored = traceNodesFor(l4, { componentId: 'vfd-03' });
    expect(ignored.some((node) => node.id === 'L2-CC-VFD-003')).toBe(false);
    expect(ignored.some((node) => node.id === 'FG-L4-MTN-001')).toBe(true);
    expect(traceHeadingFor(cabinet, { componentId: 'vfd-01' })).toContain('DRIVE #1');
  });
});
