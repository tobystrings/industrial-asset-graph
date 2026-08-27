import { describe, expect, it } from 'vitest';
import type { FacilityAsset, WalkdownCapture } from '../types/facility';
import { fieldDocumentationProgress, fieldDocumentationTasks } from './fieldDocumentation';

const asset = (overrides: Partial<FacilityAsset> = {}): FacilityAsset => ({ id: 'M-1', name: 'Machine', description: '', type: 'Machine', facilityId: 'F', areaId: 'A', line: '', verificationStatus: 'FIELD_VERIFY', manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, model: { value: 'X', verificationStatus: 'VERIFIED', evidenceIds: [] }, serialNumber: { value: null, verificationStatus: 'DISPUTED', evidenceIds: [] }, facts: [], componentIds: [], unknowns: ['Upstream power feed unknown', 'Safety interlock not documented'], ...overrides });

describe('field documentation planning', () => {
  it('derives tasks from record gaps and unknowns without inventing values', () => {
    const tasks = fieldDocumentationTasks(asset());
    expect(tasks.map((task) => task.title)).toContain('Manufacturer nameplate');
    expect(tasks.map((task) => task.title)).not.toContain('Model number');
    expect(tasks.find((task) => task.title.includes('power'))?.category).toBe('electrical');
    expect(tasks.find((task) => task.title.includes('Safety'))?.category).toBe('safety');
    expect(tasks.every((task) => task.verificationStatus !== 'VERIFIED')).toBe(true);
  });
  it('reports deterministic captured and reviewed progress', () => {
    const tasks = fieldDocumentationTasks(asset({ unknowns: [] }));
    const captures = [{ id: 'C', targetId: tasks[0].id, field: 'note', value: 'observed', capturedBy: 'tech', capturedAt: '2026-01-01', review: 'keep', applied: false }] as WalkdownCapture[];
    expect(fieldDocumentationProgress(tasks, captures)).toMatchObject({ total: 5, captured: 1, reviewed: 1, open: 4, percent: 20 });
  });
  it('is facility agnostic', () => expect(fieldDocumentationTasks(asset({ id: 'OTHER', unknowns: [] })).every((task) => task.assetId === 'OTHER')).toBe(true));
});
