import { Asset, Dependency, Relation, VerificationStatus } from './graph';
import { ComponentRecord, DocumentRecord, EvidenceRecord, FacilityArea, FacilityAsset, RelationshipRecord, RevisionRecord, VerificationState } from './types/facility';

export const facility = { id: 'facility-j-lieb', name: 'J. Lieb Foods', status: 'Normal', location: 'Facility layout — field documentation workspace' } as const;

export const areas: FacilityArea[] = [
  { id: 'area-b3', name: 'Building 3', shortName: 'B 3', status: 'IN_PROGRESS', overlay: { x: 15.2, y: 14.2, width: 22.1, height: 10.8 }, assetIds: [] },
  { id: 'area-b2', name: 'Building 2', shortName: 'B 2', status: 'COMPLETE', overlay: { x: 15.2, y: 25, width: 22.1, height: 9.7 }, assetIds: [] },
  { id: 'area-b1', name: 'Building 1', shortName: 'B 1', status: 'COMPLETE', overlay: { x: 15.2, y: 34.7, width: 22.1, height: 15.7 }, assetIds: [] },
  { id: 'area-warehouse-a', name: 'Warehouse A', shortName: 'Warehouse A', status: 'IN_PROGRESS', overlay: { x: 6.6, y: 50.1, width: 30.1, height: 29.3 }, assetIds: [] },
  { id: 'area-boiler-room', name: 'Boiler Room', shortName: 'Boiler Room', status: 'IN_PROGRESS', overlay: { x: 37.2, y: 50.5, width: 23.2, height: 7 }, assetIds: [] },
  { id: 'area-warehouse-f', name: 'Warehouse F', shortName: 'Warehouse F', status: 'IN_PROGRESS', overlay: { x: 40.8, y: 57.5, width: 15.3, height: 18.6 }, assetIds: ['FG-L4-MTN-001'] },
  { id: 'area-freezers', name: 'Freezers', shortName: 'Freezers', status: 'IN_PROGRESS', overlay: { x: 69, y: 14.6, width: 27.2, height: 36.2 }, assetIds: [] },
  { id: 'area-dock-1', name: 'Dock 1', shortName: 'Dock 1', status: 'NOT_STARTED', overlay: { x: 37.2, y: 58, width: 3.7, height: 15 }, assetIds: [] },
  { id: 'area-dock-6', name: 'Dock 6', shortName: 'Dock 6', status: 'IN_PROGRESS', overlay: { x: 73.1, y: 51, width: 4.3, height: 11 }, assetIds: [] },
  { id: 'area-dock-7', name: 'Dock 7', shortName: 'Dock 7', status: 'COMPLETE', overlay: { x: 77.5, y: 51, width: 7.5, height: 11 }, assetIds: [] },
  { id: 'area-dock-8', name: 'Dock 8', shortName: 'Dock 8', status: 'COMPLETE', overlay: { x: 85.1, y: 51, width: 11, height: 11 }, assetIds: [] },
];

const fact = <T,>(value: T, evidenceIds: string[], unit?: string): { value: T; verificationStatus: 'VERIFIED'; evidenceIds: string[]; unit?: string } => ({ value, verificationStatus: 'VERIFIED', evidenceIds, unit });
export const machines: FacilityAsset[] = [{
  id: 'FG-L4-MTN-001', name: 'L4 Meta Case Former', description: 'L4 Meta (New)', type: 'Packaging Machine', facilityId: facility.id, areaId: 'area-warehouse-f', line: 'Line 4', verificationStatus: 'FIELD_VERIFY',
  manufacturer: fact('Smurfit-Stone Packaging Systems', ['ev-machine-nameplate-001']), model: fact('META 150 HS', ['ev-machine-nameplate-001', 'ev-asset-tag-001']),
  serialNumber: { value: 'MT081619A / tag 1619A', verificationStatus: 'DISPUTED', evidenceIds: ['ev-machine-nameplate-001', 'ev-asset-tag-001'], note: 'Reconcile the nameplate and equipment-tag identifiers in the field.' },
  facts: [
    { label: 'Supply', value: fact('480 VAC · 3 phase · 60 Hz', ['ev-electrical-nameplate-001']) },
    { label: 'Full-load current', value: fact(34.2, ['ev-electrical-nameplate-001'], 'A') },
    { label: 'SCCR', value: fact('10 kA RMS symmetrical @ 480 V max', ['ev-electrical-nameplate-001']) },
    { label: 'Control circuit', value: fact(24, ['ev-electrical-nameplate-001'], 'VDC') },
    { label: 'Compressed air', value: fact('30 CFM @ 80 PSI', ['ev-electrical-nameplate-001']) },
    { label: 'Overcurrent protection', value: fact(40, ['ev-electrical-nameplate-001'], 'A') },
  ], componentIds: ['FG-L4-VFD-001', 'FG-L4-SD13041', 'FG-L4-SD13042', 'FG-L4-SD13043', 'FG-L4-RIO-001'],
  unknowns: ['PLC CPU model and location', 'VFD motor/load assignment', 'Servo-axis assignments', 'Complete I/O mapping', 'Network topology and protocol', 'Safety circuit architecture', 'Machine LOTO points'],
}];

export const components: ComponentRecord[] = [
  { id: 'FG-L4-VFD-001', label: 'VFD1 · PowerFlex 70', type: 'VFD', parentId: 'FG-L4-MTN-001', manufacturer: 'Allen-Bradley', model: 'PowerFlex 70', verificationStatus: 'VERIFIED', evidenceIds: ['ev-panel-vfd-001'] },
  ...['SD13041', 'SD13042', 'SD13043'].map((label) => ({ id: `FG-L4-${label}`, label, type: 'SERVO_DRIVE', parentId: 'FG-L4-MTN-001', verificationStatus: 'VERIFIED' as const, evidenceIds: ['ev-panel-servo-001'] })),
  { id: 'FG-L4-RIO-001', label: 'Rexroth Inline I/O', type: 'REMOTE_IO', parentId: 'FG-L4-MTN-001', manufacturer: 'Bosch Rexroth', verificationStatus: 'VERIFIED', evidenceIds: ['ev-panel-io-001'] },
];
export const evidence: EvidenceRecord[] = [
  { id: 'ev-machine-nameplate-001', type: 'NAMEPLATE', title: 'Machine nameplate', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-asset-tag-001', type: 'PHOTO', title: 'Equipment asset tag', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-electrical-nameplate-001', type: 'NAMEPLATE', title: 'Electrical nameplate', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-vfd-001', type: 'PHOTO', title: 'PowerFlex 70 and panel', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-servo-001', type: 'PHOTO', title: 'Three labeled servo drives', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-io-001', type: 'PHOTO', title: 'Bosch Rexroth Inline I/O', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
];
const documentStates: Record<string, DocumentRecord['state']> = { Overview: 'REVIEW', Electrical: 'IN_PROGRESS', Controls: 'IN_PROGRESS', Pneumatics: 'NOT_STARTED', Mechanical: 'NOT_STARTED', Troubleshooting: 'DRAFT', PM: 'DRAFT', LOTO: 'NOT_STARTED', Parts: 'NOT_STARTED', Photos: 'IN_PROGRESS' };
export const documents: DocumentRecord[] = Object.entries(documentStates).map(([category, state]) => ({ id: `doc-fg-${category.toLowerCase()}`, assetId: 'FG-L4-MTN-001', category, title: `${category} documentation`, path: `docs/machines/FG-L4-MTN-001/${category.toLowerCase()}.md`, state, required: true, verificationStatus: state === 'NOT_STARTED' ? 'FIELD_VERIFY' : 'INFERRED', evidenceIds: category === 'Photos' ? evidence.map((item) => item.id) : [] }));
export const relationships: RelationshipRecord[] = [
  { id: 'rel-machine-area', source: 'FG-L4-MTN-001', target: 'area-warehouse-f', type: 'LOCATED_IN', verificationStatus: 'VERIFIED', evidenceIds: ['ev-asset-tag-001'] },
  ...components.map((item) => ({ id: `rel-${item.id}`, source: 'FG-L4-MTN-001', target: item.id, type: 'CONTAINS' as const, verificationStatus: item.verificationStatus, evidenceIds: item.evidenceIds })),
  ...evidence.map((item) => ({ id: `rel-${item.id}`, source: 'FG-L4-MTN-001', target: item.id, type: 'SUPPORTED_BY_EVIDENCE' as const, verificationStatus: 'VERIFIED' as const, evidenceIds: [item.id] })),
];
export const revisions: RevisionRecord[] = [{ id: 'rev-fg-seed', entityId: 'FG-L4-MTN-001', fieldPath: 'identity', changedAt: '2026-07-31T00:00:00Z', changedBy: 'Build package import', reason: 'Created initial evidence-aware machine package', evidenceIds: ['ev-machine-nameplate-001'], reviewState: 'DRAFT' }];

export const documentationPercent = (assetId: string) => { const required = documents.filter((item) => item.assetId === assetId && item.required); return Math.round(required.reduce((sum, item) => sum + ({ COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 }[item.state]), 0) / required.length * 100); };
const legacyState: Record<VerificationState, VerificationStatus> = { VERIFIED: 'verified', FIELD_VERIFY: 'field-verify', INFERRED: 'inferred', DISPUTED: 'disputed', RETIRED: 'retired' };
const relationAdapter: Partial<Record<RelationshipRecord['type'], Relation>> = { CONTAINS: 'CONTAINS', FEEDS: 'FEEDS_POWER_TO', CONTROLS: 'CONTROLS', SUPPLIES: 'SUPPLIES_AIR_TO' };
export const facilityAssetsFor3D: Asset[] = [machines[0], ...components].map((item, index) => ({ id: item.id, label: 'name' in item ? item.name : item.label, kind: item.id.includes('VFD') ? 'ELECTRICAL' : item.id.includes('RIO') || item.id.includes('SD') ? 'CONTROL' : 'ZONE', position: index ? [Math.cos(index) * 2.5, .5, Math.sin(index) * 2.5] : [0, .2, 0], status: 'attention', details: 'description' in item ? item.description : `${item.type} visible in the machine control system.`, source: 'Structured facility package', confidence: 'documented', sourceLocation: 'src/facilityData.ts', capturedAt: null, reviewedBy: null, reviewState: 'unreviewed', verificationStatus: legacyState[item.verificationStatus], evidenceGaps: [] }));
export const facilityDependenciesFor3D: Dependency[] = relationships.flatMap((item) => relationAdapter[item.type] ? [{ id: item.id, source: item.source, target: item.target, relation: relationAdapter[item.type]!, sourceLocation: 'src/facilityData.ts', capturedAt: null, reviewedBy: null, reviewState: 'unreviewed' as const, verificationStatus: legacyState[item.verificationStatus] }] : []);
