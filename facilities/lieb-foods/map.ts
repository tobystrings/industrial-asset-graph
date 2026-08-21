import type { FacilityMapConfig } from '../../src/facility/types';

export const mapConfig: FacilityMapConfig = {
  drawingTitle: 'Building Layout',
  drawingDate: '08/20/2026',
  interactiveAreaNames: ['Warehouse A', 'Warehouse F', 'Freezers'],
  markers: [
    { id: 'MCH-001', label: 'Production Line 1', x: 394, y: 140, tone: 'machine', state: 'REFERENCE' },
    { id: 'MCH-002', label: 'Production Line 2', x: 510, y: 140, tone: 'machine', state: 'REFERENCE' },
    { id: 'MCH-003', label: 'Warehouse F Primary Equipment', x: 448, y: 438, tone: 'machine', state: 'FIELD_VERIFY', assetId: 'FG-L4-MTN-001' },
  ],
};

export default mapConfig;
