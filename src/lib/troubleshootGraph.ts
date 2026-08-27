import type { ComponentRecord, FacilityAsset, RelationshipRecord, VerificationState } from '../types/facility';
import { domainLabels, semanticsFor, type RelationshipDomain } from './relationshipSemantics';

export type TroubleshootMode = 'direct' | 'upstream' | 'downstream' | 'impact' | 'full';
export type GraphEntity = { id: string; label: string; kind: 'asset' | 'component' | 'missing'; verificationStatus?: VerificationState };
export type TraceStep = { relationship: RelationshipRecord; from: string; to: string; domain: RelationshipDomain; label: string; reversed: boolean };
export type TraceResult = { entity: GraphEntity; path: TraceStep[]; confidence: VerificationState; domain: RelationshipDomain };
export type DocumentationGap = { at: string; domain: RelationshipDomain; message: string };
export type TroubleshootReport = { selected: GraphEntity | null; results: TraceResult[]; groups: { domain: RelationshipDomain; label: string; results: TraceResult[] }[]; gaps: DocumentationGap[]; highlightedEntityIds: Set<string>; highlightedRelationshipIds: Set<string> };

type Dataset = { assets: FacilityAsset[]; components: ComponentRecord[]; relationships: RelationshipRecord[] };
type IndexedEdge = { relationship: RelationshipRecord; from: string; to: string; reversed: boolean };
const confidenceRank: Record<VerificationState, number> = { VERIFIED: 0, FIELD_VERIFY: 1, INFERRED: 2, DISPUTED: 3, RETIRED: 4 };

export function buildTroubleshootIndex(data: Dataset) {
  const entities = new Map<string, GraphEntity>();
  data.assets.forEach((item) => entities.set(item.id, { id: item.id, label: item.name || item.id, kind: 'asset', verificationStatus: item.verificationStatus }));
  data.components.forEach((item) => entities.set(item.id, { id: item.id, label: item.label || item.id, kind: 'component', verificationStatus: item.verificationStatus }));
  const outgoing = new Map<string, IndexedEdge[]>();
  const incoming = new Map<string, IndexedEdge[]>();
  const add = (map: Map<string, IndexedEdge[]>, key: string, edge: IndexedEdge) => map.set(key, [...(map.get(key) ?? []), edge]);
  for (const relationship of data.relationships) {
    const semantics = semanticsFor(relationship.type);
    let from = relationship.source;
    let to = relationship.target;
    let reversed = false;
    if (semantics.direction === 'target-to-source') { from = relationship.target; to = relationship.source; reversed = true; }
    add(outgoing, from, { relationship, from, to, reversed });
    add(incoming, to, { relationship, from, to, reversed });
    if (semantics.direction === 'bidirectional') {
      add(outgoing, to, { relationship, from: to, to: from, reversed: !reversed });
      add(incoming, from, { relationship, from: to, to: from, reversed: !reversed });
    }
  }
  const sort = (map: Map<string, IndexedEdge[]>) => map.forEach((edges) => edges.sort((a, b) => a.relationship.id.localeCompare(b.relationship.id) || a.to.localeCompare(b.to)));
  sort(outgoing); sort(incoming);
  return { entities, outgoing, incoming };
}

function weakest(path: TraceStep[]): VerificationState {
  return path.reduce<VerificationState>((state, step) => confidenceRank[step.relationship.verificationStatus] > confidenceRank[state] ? step.relationship.verificationStatus : state, 'VERIFIED');
}

export function troubleshoot(data: Dataset, selectedId: string, mode: TroubleshootMode, options: { domain?: RelationshipDomain; maxDepth?: number } = {}): TroubleshootReport {
  const index = buildTroubleshootIndex(data);
  const selected = index.entities.get(selectedId) ?? null;
  if (!selected) return { selected: null, results: [], groups: [], gaps: [], highlightedEntityIds: new Set(), highlightedRelationshipIds: new Set() };
  const maxDepth = Math.max(1, Math.min(options.maxDepth ?? 8, 24));
  const queue: { id: string; path: TraceStep[]; visited: Set<string> }[] = [{ id: selectedId, path: [], visited: new Set([selectedId]) }];
  const best = new Map<string, TraceResult>();
  const terminal = new Map<string, RelationshipDomain>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current.path.length >= maxDepth) continue;
    const source = mode === 'upstream' ? index.incoming : index.outgoing;
    let edges = source.get(current.id) ?? [];
    if (mode === 'direct') edges = [...(index.outgoing.get(current.id) ?? []), ...(index.incoming.get(current.id) ?? [])];
    if (mode === 'full') edges = [...(index.outgoing.get(current.id) ?? []), ...(index.incoming.get(current.id) ?? [])];
    edges = edges.filter((edge) => {
      const semantics = semanticsFor(edge.relationship.type);
      if (options.domain && semantics.domain !== options.domain) return false;
      if (semantics.domain === 'structure' || semantics.domain === 'evidence') return false;
      if (mode === 'impact' && !semantics.failureImpact) return false;
      if (mode === 'upstream' && !semantics.upstream) return false;
      if (mode === 'downstream' && !semantics.downstream) return false;
      return true;
    });
    if (!edges.length && current.path.length) terminal.set(current.id, current.path.at(-1)!.domain);
    for (const edge of edges) {
      const nextId = edge.to === current.id ? edge.from : edge.to;
      if (current.visited.has(nextId)) continue;
      const semantics = semanticsFor(edge.relationship.type);
      const step: TraceStep = { relationship: edge.relationship, from: current.id, to: nextId, domain: semantics.domain, label: semantics.label, reversed: edge.to === current.id ? !edge.reversed : edge.reversed };
      const path = [...current.path, step];
      const entity = index.entities.get(nextId) ?? { id: nextId, label: nextId, kind: 'missing' as const };
      const result = { entity, path, confidence: weakest(path), domain: semantics.domain };
      const existing = best.get(nextId);
      if (!existing || path.length < existing.path.length || (path.length === existing.path.length && path.map((item) => item.relationship.id).join('|') < existing.path.map((item) => item.relationship.id).join('|'))) best.set(nextId, result);
      if (mode !== 'direct') queue.push({ id: nextId, path, visited: new Set([...current.visited, nextId]) });
    }
  }
  const results = [...best.values()].sort((a, b) => a.domain.localeCompare(b.domain) || a.path.length - b.path.length || a.entity.id.localeCompare(b.entity.id));
  const groups = [...new Set(results.map((item) => item.domain))].map((domain) => ({ domain, label: domainLabels[domain], results: results.filter((item) => item.domain === domain) }));
  const knownDomains = new Set(results.map((item) => item.domain));
  const gaps: DocumentationGap[] = [];
  if (!knownDomains.has('power')) gaps.push({ at: selectedId, domain: 'power', message: `No upstream power source documented for ${selectedId}.` });
  if (!knownDomains.has('control')) gaps.push({ at: selectedId, domain: 'control', message: `PLC or control relationship not documented for ${selectedId}.` });
  if (!knownDomains.has('safety')) gaps.push({ at: selectedId, domain: 'safety', message: `No safety dependencies documented for ${selectedId}.` });
  terminal.forEach((domain, at) => gaps.push({ at, domain, message: `Known ${domainLabels[domain].toLowerCase()} chain ends at ${at}; no further documented relationship was found.` }));
  results.filter((item) => item.entity.kind === 'missing').forEach((item) => gaps.push({ at: item.entity.id, domain: item.domain, message: `Relationship references missing asset or component ${item.entity.id}.` }));
  return { selected, results, groups, gaps: gaps.filter((gap, i, all) => all.findIndex((item) => item.message === gap.message) === i), highlightedEntityIds: new Set([selectedId, ...results.map((item) => item.entity.id)]), highlightedRelationshipIds: new Set(results.flatMap((item) => item.path.map((step) => step.relationship.id))) };
}
