import type { FacilityMapConfig } from '../../src/facility/types';

export const mapConfig: FacilityMapConfig = {
  drawingTitle: 'Building Layout',
  drawingDate: '08/19/2026',
  interactiveAreaNames: ['Warehouse A', 'Warehouse F', 'Freezers'],
  markers: [
    { id: 'CAB-001', label: 'Warehouse B Panel', x: 153, y: 166, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'MCH-001', label: 'Production Line 1', x: 394, y: 140, tone: 'machine', state: 'REFERENCE' },
    { id: 'MCH-002', label: 'Production Line 2', x: 510, y: 140, tone: 'machine', state: 'REFERENCE' },
    { id: 'CAB-002A', label: 'Building C · Left Panel', x: 359, y: 177, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-002B', label: 'Building C · Right Panel', x: 637, y: 177, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-003', label: 'Cooler 2 Panel', x: 759, y: 152, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-004', label: 'Warehouse 5 Panel', x: 878, y: 190, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-005', label: 'Freezer 7 Panel', x: 1002, y: 190, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-006', label: 'Freezer 8 Panel', x: 1122, y: 190, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-007', label: 'Warehouse A Panel', x: 154, y: 424, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'MCH-003', label: 'Warehouse F Primary Equipment', x: 448, y: 438, tone: 'machine', state: 'FIELD_VERIFY', assetId: 'FG-L4-MTN-001' },
    { id: 'CAB-009', label: 'Warehouse E Panel', x: 754, y: 438, tone: 'cabinet', state: 'REFERENCE' },
    { id: 'CAB-010', label: 'Main Power / Office Panel', x: 832, y: 470, tone: 'power', state: 'FIELD_VERIFY', assetId: 'L2-CC-001' },
  ],
};

export default mapConfig;
