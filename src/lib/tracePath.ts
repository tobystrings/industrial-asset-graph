import { areas, components, evidence, facility, machines, relationships } from '../facilityData';
import { parseDeviceQuery } from './deviceQuery';
import type { FacilityArea, FacilityAsset } from '../types/facility';

export type TraceNode = { id: string; label: string; kind: 'area' | 'asset' | 'component' | 'evidence'; status?: string };

export type TraceFocus = {
  area?: FacilityArea | null;
  componentId?: string | null;
};

function uniqueNodes(nodes: TraceNode[]): TraceNode[] {
  return nodes.filter((node, index, list) => list.findIndex((item) => item.id === node.id) === index);
}

export function resolveTraceComponentId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return parseDeviceQuery(raw)?.componentId ?? null;
}

export function componentBelongsToAsset(componentId: string, assetId: string): boolean {
  return components.some((item) => item.id === componentId && item.parentId === assetId);
}

function componentOnAsset(asset: FacilityAsset, focusedId?: string | null) {
  const resolved = resolveTraceComponentId(focusedId);
  if (resolved && componentBelongsToAsset(resolved, asset.id)) {
    return components.find((item) => item.id === resolved) ?? null;
  }
  const contained = relationships.filter((item) => item.source === asset.id && item.type === 'CONTAINS');
  return contained
    .map((rel) => components.find((item) => item.id === rel.target))
    .find((item) => item && item.verificationStatus === 'VERIFIED') ?? null;
}

/** Trace follows the current area / asset / device. Does not invent FEEDS or stay pinned on Line 2. */
export function traceNodesFor(asset: FacilityAsset | null, focus: TraceFocus = {}): TraceNode[] {
  if (!asset) {
    const area = focus.area ?? null;
    if (!area) {
      return [{ id: facility.id, label: facility.name, kind: 'area', status: 'IN_PROGRESS' }];
    }
    const nodes: TraceNode[] = [{ id: area.id, label: area.shortName, kind: 'area', status: area.status }];
    for (const assetId of area.assetIds) {
      const machine = machines.find((item) => item.id === assetId);
      if (machine) nodes.push({ id: machine.id, label: machine.id, kind: 'asset', status: machine.verificationStatus });
    }
    return uniqueNodes(nodes);
  }
  const nodes: TraceNode[] = [];
  const located = relationships.find((item) => item.source === asset.id && item.type === 'LOCATED_IN');
  const area = focus.area?.id === asset.areaId
    ? focus.area
    : areas.find((item) => item.id === (located?.target ?? asset.areaId));
  if (area) nodes.push({ id: area.id, label: area.shortName, kind: 'area', status: area.status });
  nodes.push({ id: asset.id, label: asset.id, kind: 'asset', status: asset.verificationStatus });
  const focused = componentOnAsset(asset, focus.componentId);
  if (focused) nodes.push({ id: focused.id, label: focused.label, kind: 'component', status: focused.verificationStatus });
  const evidenceRel = relationships.find((item) => item.source === asset.id && item.type === 'SUPPORTED_BY_EVIDENCE');
  const ev = evidence.find((item) => item.id === evidenceRel?.target);
  if (ev) nodes.push({ id: ev.id, label: ev.title, kind: 'evidence' });
  return uniqueNodes(nodes);
}

export function traceHeadingFor(asset: FacilityAsset | null, focus: TraceFocus = {}): string {
  if (asset) {
    const component = componentOnAsset(asset, focus.componentId);
    const contained = containedComponentIds(asset.id).length;
    return component
      ? `${asset.id} · ${component.label}`
      : `${contained} indexed components`;
  }
  if (focus.area) {
    return focus.area.assetIds.length
      ? `${focus.area.shortName} · ${focus.area.assetIds.length} assets`
      : `${focus.area.shortName} · no assets in the graph`;
  }
  return 'Select an area or asset';
}

export function relationshipIdsFor(asset: FacilityAsset): string[] {
  return relationships.filter((item) => item.source === asset.id || item.target === asset.id).map((item) => item.id);
}

export function containedComponentIds(assetId: string): string[] {
  return relationships.filter((item) => item.source === assetId && item.type === 'CONTAINS').map((item) => item.target);
}
