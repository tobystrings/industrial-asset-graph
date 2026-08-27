import type { RelationshipType } from '../types/facility';

export type RelationshipDomain = 'power' | 'control' | 'instrumentation' | 'safety' | 'mechanical' | 'process' | 'utility' | 'network' | 'structure' | 'evidence';
export type DependencyDirection = 'source-to-target' | 'target-to-source' | 'bidirectional';

export type RelationshipSemantics = {
  type: RelationshipType;
  domain: RelationshipDomain;
  label: string;
  direction: DependencyDirection;
  upstream: boolean;
  downstream: boolean;
  failureImpact: boolean;
};

export const relationshipSemantics: Record<RelationshipType, RelationshipSemantics> = {
  LOCATED_IN: { type: 'LOCATED_IN', domain: 'structure', label: 'located in', direction: 'source-to-target', upstream: false, downstream: false, failureImpact: false },
  CONTAINS: { type: 'CONTAINS', domain: 'structure', label: 'contains', direction: 'source-to-target', upstream: false, downstream: false, failureImpact: false },
  FEEDS: { type: 'FEEDS', domain: 'power', label: 'feeds', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  CONTROLS: { type: 'CONTROLS', domain: 'control', label: 'controls', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  SENSES: { type: 'SENSES', domain: 'instrumentation', label: 'senses', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  SUPPLIES: { type: 'SUPPLIES', domain: 'utility', label: 'supplies', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  ISOLATES: { type: 'ISOLATES', domain: 'power', label: 'isolates', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  INTERLOCKS_WITH: { type: 'INTERLOCKS_WITH', domain: 'safety', label: 'interlocks with', direction: 'bidirectional', upstream: true, downstream: true, failureImpact: true },
  UPSTREAM_OF: { type: 'UPSTREAM_OF', domain: 'process', label: 'upstream of', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  DOWNSTREAM_OF: { type: 'DOWNSTREAM_OF', domain: 'process', label: 'downstream of', direction: 'target-to-source', upstream: true, downstream: true, failureImpact: true },
  SENDS_DATA_TO: { type: 'SENDS_DATA_TO', domain: 'network', label: 'sends data to', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  MECHANICALLY_DRIVES: { type: 'MECHANICALLY_DRIVES', domain: 'mechanical', label: 'mechanically drives', direction: 'source-to-target', upstream: true, downstream: true, failureImpact: true },
  HAS_DOCUMENT: { type: 'HAS_DOCUMENT', domain: 'evidence', label: 'has document', direction: 'source-to-target', upstream: false, downstream: false, failureImpact: false },
  SUPPORTED_BY_EVIDENCE: { type: 'SUPPORTED_BY_EVIDENCE', domain: 'evidence', label: 'supported by evidence', direction: 'source-to-target', upstream: false, downstream: false, failureImpact: false },
};

export const domainLabels: Record<RelationshipDomain, string> = {
  power: 'Power', control: 'Control', instrumentation: 'Inputs / Permissives', safety: 'Safety',
  mechanical: 'Mechanical', process: 'Process / Production', utility: 'Utilities', network: 'Network / Communications',
  structure: 'Structure', evidence: 'Evidence',
};

export function semanticsFor(type: RelationshipType): RelationshipSemantics {
  return relationshipSemantics[type];
}
