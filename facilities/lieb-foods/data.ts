import { ComponentRecord, DocumentRecord, EvidenceRecord, FacilityArea, FacilityAsset, RelationshipRecord, RevisionRecord, VerificationState } from '../../src/types/facility';

export const facility = { id: 'facility-j-lieb', name: 'J. Lieb Foods', status: 'Normal', location: 'Facility layout — field documentation workspace' } as const;

export const areas: FacilityArea[] = [
  { id: 'area-warehouse-b', name: 'Warehouse B', shortName: 'Warehouse B', status: 'IN_PROGRESS', overlay: { x: 7, y: 13.5, width: 20.5, height: 36 }, assetIds: [] },
  { id: 'area-building-c', name: 'Building C (Production)', shortName: 'Building C', status: 'IN_PROGRESS', overlay: { x: 27.5, y: 16, width: 28.2, height: 33.5 }, assetIds: [] },
  { id: 'area-maintenance', name: 'Maintenance', shortName: 'Maintenance', status: 'IN_PROGRESS', overlay: { x: 36.8, y: 16, width: 8.9, height: 6.5 }, assetIds: [] },
  { id: 'area-engine-room', name: 'Engine Room', shortName: 'Engine Room', status: 'IN_PROGRESS', overlay: { x: 45.8, y: 16, width: 8.4, height: 6.5 }, assetIds: [] },
  { id: 'area-cook-rooms', name: 'Cook Rooms', shortName: 'Cook Rooms', status: 'IN_PROGRESS', overlay: { x: 35.5, y: 31.5, width: 12.5, height: 7 }, assetIds: [] },
  { id: 'area-cooler-2', name: 'Cooler 2', shortName: 'Cooler 2', status: 'IN_PROGRESS', overlay: { x: 55.7, y: 24, width: 10.8, height: 9 }, assetIds: [] },
  { id: 'area-cooler-3', name: 'Cooler 3', shortName: 'Cooler 3', status: 'IN_PROGRESS', overlay: { x: 55.7, y: 33, width: 10.8, height: 8 }, assetIds: [] },
  { id: 'area-cooler-4', name: 'Cooler 4', shortName: 'Cooler 4', status: 'IN_PROGRESS', overlay: { x: 55.7, y: 41, width: 10.8, height: 9 }, assetIds: [] },
  { id: 'area-warehouse-5', name: 'Warehouse 5', shortName: 'Warehouse 5', status: 'IN_PROGRESS', overlay: { x: 66.6, y: 16, width: 8.7, height: 34 }, assetIds: [] },
  { id: 'area-freezer-7', name: 'Freezer 7', shortName: 'Freezer 7', status: 'IN_PROGRESS', overlay: { x: 75.3, y: 16, width: 10.1, height: 34 }, assetIds: [] },
  { id: 'area-freezer-8', name: 'Freezer 8', shortName: 'Freezer 8', status: 'IN_PROGRESS', overlay: { x: 86.5, y: 16, width: 10.5, height: 34 }, assetIds: [] },
  { id: 'area-warehouse-a', name: 'Warehouse A', shortName: 'Warehouse A', status: 'IN_PROGRESS', overlay: { x: 4, y: 49.5, width: 22.5, height: 27.5 }, assetIds: [] },
  { id: 'area-warehouse-f', name: 'Warehouse F', shortName: 'Warehouse F', status: 'IN_PROGRESS', overlay: { x: 32.5, y: 53, width: 16.5, height: 22 }, assetIds: ['FG-L4-MTN-001', 'L2-CC-001'] },
  { id: 'area-warehouse-e', name: 'Warehouse E', shortName: 'Warehouse E', status: 'NOT_STARTED', overlay: { x: 55.7, y: 53, width: 11, height: 22 }, assetIds: [] },
  { id: 'area-main-offices', name: 'Main Offices', shortName: 'Main Offices', status: 'IN_PROGRESS', overlay: { x: 66.7, y: 53, width: 8.5, height: 25 }, assetIds: [] },
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
}, {
  id: 'L2-CC-001', name: 'Line 2 Conveyor Control Cabinet', description: 'Interactive reference package for the Line 2 conveyor control cabinet', type: 'Control Cabinet', facilityId: facility.id, areaId: 'area-warehouse-f', line: 'Line 2', verificationStatus: 'FIELD_VERIFY',
  manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [], note: 'Cabinet manufacturer is not established by the approved reference drawing.' },
  model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [], note: 'Cabinet model is not established by the approved reference drawing.' },
  serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [], note: 'Cabinet asset ID and serial information require field verification.' },
  facts: [
    { label: 'Reference drawing', value: fact('L2-CC-INT-001 · Rev A', ['ev-line2-reference-drawing']) },
    { label: 'Power shown', value: fact('480 VAC · 3 phase', ['ev-line2-reference-drawing']) },
    { label: 'Control power shown', value: fact(24, ['ev-line2-reference-drawing'], 'VDC') },
    { label: 'Documented devices', value: fact(50, ['ev-line2-reference-drawing']) },
  ],
  componentIds: ['L2-CC-PLC-001', 'L2-CC-DI-001', 'L2-CC-DI-002', 'L2-CC-DO-001', 'L2-CC-AI-001', 'L2-CC-AO-001', 'L2-CC-RO-001', ...Array.from({ length: 8 }, (_, index) => `L2-CC-VFD-${String(index + 1).padStart(3, '0')}`), 'L2-CC-PS-001', 'L2-CC-DS-001'],
  unknowns: ['Confirm cabinet asset ID', 'Confirm physical location in the field', 'Confirm upstream panel source', 'Verify device field identifiers and load assignments', 'Capture VFD parameters and motor assignments', 'Verify wiring and network topology', 'Document Line 2 recovery and troubleshooting procedures'],
}];

export const components: ComponentRecord[] = [
  { id: 'FG-L4-VFD-001', label: 'VFD1 · PowerFlex 70', type: 'VFD', parentId: 'FG-L4-MTN-001', manufacturer: 'Allen-Bradley', model: 'PowerFlex 70', productFamilyId: 'family-powerflex-70', verificationStatus: 'VERIFIED', evidenceIds: ['ev-panel-vfd-001'] },
  ...['SD13041', 'SD13042', 'SD13043'].map((label) => ({ id: `FG-L4-${label}`, label, type: 'SERVO_DRIVE', parentId: 'FG-L4-MTN-001', productFamilyId: 'family-l4-servo', verificationStatus: 'VERIFIED' as const, evidenceIds: ['ev-panel-servo-001'] })),
  { id: 'FG-L4-RIO-001', label: 'Rexroth Inline I/O', type: 'REMOTE_IO', parentId: 'FG-L4-MTN-001', manufacturer: 'Bosch Rexroth', verificationStatus: 'VERIFIED', evidenceIds: ['ev-panel-io-001'] },
  { id: 'L2-CC-PLC-001', label: 'MicroLogix 1400', type: 'PLC', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: 'MicroLogix 1400', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-DI-001', label: '1762-IA8', type: 'DIGITAL_INPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-IA8', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-DI-002', label: '1762-IB16', type: 'DIGITAL_INPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-IB16', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-DO-001', label: '1762-OB16', type: 'DIGITAL_OUTPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-OB16', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-AI-001', label: '1762-IF4', type: 'ANALOG_INPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-IF4', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-AO-001', label: '1762-OF4', type: 'ANALOG_OUTPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-OF4', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-RO-001', label: '1762-OW8', type: 'RELAY_OUTPUT', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: '1762-OW8', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  ...Array.from({ length: 8 }, (_, index): ComponentRecord => ({ id: `L2-CC-VFD-${String(index + 1).padStart(3, '0')}`, label: index === 5 ? 'CONV #6' : index === 6 ? 'CONV #7' : `DRIVE #${index + 1}`, type: 'VFD', parentId: 'L2-CC-001', manufacturer: 'Allen-Bradley', model: 'PowerFlex 4', productFamilyId: 'family-powerflex-4', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] })),
  { id: 'L2-CC-PS-001', label: '120W 24VDC power supply', type: 'POWER_SUPPLY', parentId: 'L2-CC-001', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'L2-CC-DS-001', label: 'Door disconnect', type: 'DISCONNECT', parentId: 'L2-CC-001', verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
];
export const evidence: EvidenceRecord[] = [
  { id: 'ev-machine-nameplate-001', type: 'NAMEPLATE', title: 'Machine nameplate', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-asset-tag-001', type: 'PHOTO', title: 'Equipment asset tag', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-electrical-nameplate-001', type: 'NAMEPLATE', title: 'Electrical nameplate', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-vfd-001', type: 'PHOTO', title: 'PowerFlex 70 and panel', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-servo-001', type: 'PHOTO', title: 'Three labeled servo drives', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-panel-io-001', type: 'PHOTO', title: 'Bosch Rexroth Inline I/O', pathOrUrl: 'local evidence package', access: 'LOCAL_ONLY' },
  { id: 'ev-line2-reference-drawing', type: 'DRAWING', title: 'Line 2 cabinet interior layout · L2-CC-INT-001 Rev A', pathOrUrl: 'assets/line2/control-cabinet/cabinet.svg', access: 'PUBLIC_APP' },
  { id: 'ev-line2-reference-render', type: 'PHOTO', title: 'Line 2 cabinet approved reference render', pathOrUrl: 'assets/line2/control-cabinet/photos/cabinet_reference_render.png', access: 'PUBLIC_APP' },
];
const documentStates: Record<string, DocumentRecord['state']> = { Overview: 'REVIEW', Electrical: 'IN_PROGRESS', Controls: 'IN_PROGRESS', Pneumatics: 'NOT_STARTED', Mechanical: 'NOT_STARTED', Troubleshooting: 'DRAFT', PM: 'DRAFT', LOTO: 'NOT_STARTED', Parts: 'NOT_STARTED', Photos: 'IN_PROGRESS' };
export const documents: DocumentRecord[] = Object.entries(documentStates).map(([category, state]) => ({ id: `doc-fg-${category.toLowerCase()}`, assetId: 'FG-L4-MTN-001', category, title: `${category} documentation`, path: `docs/machines/FG-L4-MTN-001/${category.toLowerCase()}.md`, state, required: true, verificationStatus: state === 'NOT_STARTED' ? 'FIELD_VERIFY' : 'INFERRED', evidenceIds: category === 'Photos' ? evidence.map((item) => item.id) : [] }));
documents.push(
  { id: 'doc-l2-overview', assetId: 'L2-CC-001', category: 'Overview', title: 'Line 2 cabinet overview', path: 'docs/control-cabinets/line2/overview.md', state: 'REVIEW', required: true, verificationStatus: 'INFERRED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'doc-l2-electrical', assetId: 'L2-CC-001', category: 'Electrical', title: 'Interior reference drawing', path: 'docs/control-cabinets/line2/electrical.md', state: 'COMPLETE', required: true, verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'doc-l2-controls', assetId: 'L2-CC-001', category: 'Controls', title: 'PLC and I/O device inventory', path: 'docs/control-cabinets/line2/controls.md', state: 'IN_PROGRESS', required: true, verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'doc-l2-parts', assetId: 'L2-CC-001', category: 'Parts', title: 'Visible cabinet device list', path: 'docs/control-cabinets/line2/parts.md', state: 'DRAFT', required: true, verificationStatus: 'INFERRED', evidenceIds: ['ev-line2-reference-drawing'] },
  { id: 'doc-l2-photos', assetId: 'L2-CC-001', category: 'Photos', title: 'Approved cabinet reference render', path: 'docs/control-cabinets/line2/photos.md', state: 'COMPLETE', required: true, verificationStatus: 'VERIFIED', evidenceIds: ['ev-line2-reference-render'] },
  { id: 'doc-l2-troubleshooting', assetId: 'L2-CC-001', category: 'Troubleshooting', title: 'Line 2 troubleshooting knowledge', path: 'docs/control-cabinets/line2/troubleshooting.md', state: 'NOT_STARTED', required: true, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
  { id: 'doc-l2-loto', assetId: 'L2-CC-001', category: 'LOTO', title: 'Line 2 cabinet isolation procedure', path: 'docs/control-cabinets/line2/loto.md', state: 'NOT_STARTED', required: true, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
  { id: 'doc-manual-pf4', assetId: 'L2-CC-001', category: 'Manual', title: 'PowerFlex 4 terminal legend', path: 'docs/manuals/powerflex-4-terminals.md', state: 'COMPLETE', required: false, verificationStatus: 'INFERRED', evidenceIds: [] },
  { id: 'doc-manual-d700', assetId: 'L2-CC-001', category: 'Manual', title: 'Mitsubishi FR-D700 terminal legend (catalog example)', path: 'docs/manuals/mitsubishi-fr-d700-terminals.md', state: 'REVIEW', required: false, verificationStatus: 'INFERRED', evidenceIds: [] },
  { id: 'doc-manual-pf70', assetId: 'FG-L4-MTN-001', category: 'Manual', title: 'PowerFlex 70 terminal legend', path: 'docs/manuals/powerflex-70-terminals.md', state: 'COMPLETE', required: false, verificationStatus: 'INFERRED', evidenceIds: [] },
  { id: 'doc-manual-l4-servo', assetId: 'FG-L4-MTN-001', category: 'Manual', title: 'L4 servo terminal legend (not in this build)', path: 'docs/manuals/l4-servo-terminals.md', state: 'NOT_STARTED', required: false, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] },
);
export const relationships: RelationshipRecord[] = [
  { id: 'rel-machine-area', source: 'FG-L4-MTN-001', target: 'area-warehouse-f', type: 'LOCATED_IN', verificationStatus: 'VERIFIED', evidenceIds: ['ev-asset-tag-001'] },
  ...components.filter((item) => item.parentId === 'FG-L4-MTN-001').map((item) => ({ id: `rel-${item.id}`, source: 'FG-L4-MTN-001', target: item.id, type: 'CONTAINS' as const, verificationStatus: item.verificationStatus, evidenceIds: item.evidenceIds })),
  ...evidence.filter((item) => !item.id.startsWith('ev-line2-')).map((item) => ({ id: `rel-${item.id}`, source: 'FG-L4-MTN-001', target: item.id, type: 'SUPPORTED_BY_EVIDENCE' as const, verificationStatus: 'VERIFIED' as const, evidenceIds: [item.id] })),
  { id: 'rel-line2-area', source: 'L2-CC-001', target: 'area-warehouse-f', type: 'LOCATED_IN', verificationStatus: 'INFERRED', evidenceIds: [] },
  ...components.filter((item) => item.parentId === 'L2-CC-001').map((item) => ({ id: `rel-line2-component-${item.id}`, source: 'L2-CC-001', target: item.id, type: 'CONTAINS' as const, verificationStatus: item.verificationStatus, evidenceIds: item.evidenceIds })),
  ...['ev-line2-reference-drawing', 'ev-line2-reference-render'].map((id) => ({ id: `rel-line2-${id}`, source: 'L2-CC-001', target: id, type: 'SUPPORTED_BY_EVIDENCE' as const, verificationStatus: 'VERIFIED' as const, evidenceIds: [id] })),
];
export const revisions: RevisionRecord[] = [{ id: 'rev-fg-seed', entityId: 'FG-L4-MTN-001', fieldPath: 'identity', changedAt: '2026-07-31T00:00:00Z', changedBy: 'Build package import', reason: 'Created initial evidence-aware machine package', evidenceIds: ['ev-machine-nameplate-001'], reviewState: 'DRAFT' }, { id: 'rev-line2-seed', entityId: 'L2-CC-001', fieldPath: 'cabinet.referencePackage', changedAt: '2026-08-11T00:00:00Z', changedBy: 'Approved reference package import', reason: 'Promoted Line 2 cabinet and key devices into the facility graph', evidenceIds: ['ev-line2-reference-drawing', 'ev-line2-reference-render'], reviewState: 'REVIEWED' }];

export const documentationPercent = (assetId: string) => { const required = documents.filter((item) => item.assetId === assetId && item.required); return Math.round(required.reduce((sum, item) => sum + ({ COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 }[item.state]), 0) / required.length * 100); };

export const assetSerialSources = [
  { id: 'serial-l4-nameplate', assetId: 'FG-L4-MTN-001', label: 'Machine nameplate', value: 'MT081619A', evidenceId: 'ev-machine-nameplate-001', verificationStatus: 'DISPUTED' as const },
  { id: 'serial-l4-tag', assetId: 'FG-L4-MTN-001', label: 'Equipment asset tag', value: '1619A', evidenceId: 'ev-asset-tag-001', verificationStatus: 'DISPUTED' as const },
];
