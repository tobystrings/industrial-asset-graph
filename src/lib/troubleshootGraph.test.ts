import { describe, expect, it } from 'vitest';
import type { ComponentRecord, FacilityAsset, RelationshipRecord, RelationshipType, VerificationState } from '../types/facility';
import { semanticsFor } from './relationshipSemantics';
import { troubleshoot } from './troubleshootGraph';

const asset = (id: string): FacilityAsset => ({ id, name: id, description: '', type: 'Machine', facilityId: 'F', areaId: 'A', line: '', verificationStatus: 'VERIFIED', manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, facts: [], componentIds: [], unknowns: [] });
const rel = (source: string, target: string, type: RelationshipType = 'FEEDS', verificationStatus: VerificationState = 'VERIFIED'): RelationshipRecord => ({ id: `${source}-${type}-${target}`, source, target, type, verificationStatus, evidenceIds: [] });
const data = (ids: string[], relationships: RelationshipRecord[]) => ({ assets: ids.map(asset), components: [] as ComponentRecord[], relationships });

describe('industrial troubleshooting graph', () => {
  it('finds a simple direct relationship', () => expect(troubleshoot(data(['A','B'], [rel('A','B')]), 'A', 'direct').results.map((r) => r.entity.id)).toEqual(['B']));
  it('traverses multi-step upstream and downstream', () => {
    const graph = data(['A','B','C','D'], [rel('A','B'), rel('B','C'), rel('C','D')]);
    expect(troubleshoot(graph, 'A', 'downstream').results.map((r) => r.entity.id)).toEqual(['B','C','D']);
    expect(troubleshoot(graph, 'D', 'upstream').results.map((r) => r.entity.id)).toEqual(['C','B','A']);
  });
  it('handles branches and duplicate destinations deterministically', () => {
    const graph = data(['A','B','C','D'], [rel('A','C'), rel('C','D'), rel('A','B'), rel('B','D')]);
    const report = troubleshoot(graph, 'A', 'downstream');
    expect(report.results.map((r) => r.entity.id)).toEqual(['B','C','D']);
    expect(report.results.find((r) => r.entity.id === 'D')?.path[0].to).toBe('B');
  });
  it('stays finite through cycles and self references', () => {
    const graph = data(['A','B','C'], [rel('A','B'), rel('B','C'), rel('C','A'), rel('A','A')]);
    expect(troubleshoot(graph, 'A', 'downstream').results.map((r) => r.entity.id)).toEqual(['B','C']);
  });
  it('reports missing references and sparse documentation gaps', () => {
    const report = troubleshoot(data(['A'], [rel('A','MISSING')]), 'A', 'downstream');
    expect(report.results[0].entity.kind).toBe('missing');
    expect(report.gaps.some((gap) => gap.message.includes('missing asset'))).toBe(true);
    expect(troubleshoot(data(['A'], []), 'A', 'upstream').gaps.map((gap) => gap.domain)).toEqual(['power','control','safety']);
  });
  it('classifies relationship domains centrally', () => {
    expect(semanticsFor('CONTROLS').domain).toBe('control');
    expect(semanticsFor('INTERLOCKS_WITH').domain).toBe('safety');
    expect(semanticsFor('UPSTREAM_OF').domain).toBe('process');
  });
  it('preserves inferred confidence across a path', () => {
    const report = troubleshoot(data(['A','B','C'], [rel('A','B','CONTROLS'), rel('B','C','CONTROLS','INFERRED')]), 'A', 'impact');
    expect(report.results.find((r) => r.entity.id === 'C')?.confidence).toBe('INFERRED');
  });
  it('uses relationship semantics for failure and process impact', () => {
    const graph = data(['A','B','C'], [rel('A','B','CONTROLS'), rel('B','C','UPSTREAM_OF')]);
    expect(troubleshoot(graph, 'A', 'impact').results.map((r) => r.entity.id)).toEqual(['B','C']);
    expect(troubleshoot(graph, 'B', 'downstream', { domain: 'process' }).results.map((r) => r.entity.id)).toEqual(['C']);
  });
});
