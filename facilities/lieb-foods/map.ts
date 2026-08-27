import type { FacilityMapConfig } from '../../src/facility/types';

export const mapConfig: FacilityMapConfig = {
  drawingTitle: 'Building Layout',
  drawingDate: '08/20/2026',
  drawingWidth: 1536,
  drawingHeight: 1024,
  contentBounds: { x: 0, y: 80, width: 1536, height: 800 },
  geometrySource: 'User-supplied J. Lieb Foods facility layout, 2026-08-27',
  interactiveAreaNames: ['Warehouse F', 'Building C (Production)', 'Warehouse E'],
  markers: [
    { id: 'CAB-001', label: 'Warehouse B Panel', x: 15.5, y: 26, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-002A', label: 'Building C — Left Panel', x: 29.6, y: 27.2, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-002B', label: 'Building C — Right Panel', x: 50.4, y: 27, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-003', label: 'Cooler 2 Panel', x: 59, y: 25, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-004', label: 'Warehouse 5 Panel', x: 68, y: 29, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-005', label: 'Freezer 7 Panel', x: 77.5, y: 29, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-006', label: 'Freezer 8 Panel', x: 87.7, y: 29, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-007', label: 'Warehouse A Panel', x: 15.5, y: 57.5, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-009', label: 'Warehouse E Panel', x: 58, y: 57.5, tone: 'cabinet', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'CAB-010', label: 'Main Power / Office Panel', x: 65.3, y: 59, tone: 'power', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'MCH-001', label: 'Production Line 1', x: 33.5, y: 23.5, tone: 'machine', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'MCH-002', label: 'Production Line 2', x: 42, y: 23.5, tone: 'machine', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
    { id: 'MCH-003', label: 'Warehouse F Primary Equipment', x: 36.7, y: 57.5, tone: 'machine', state: 'REFERENCE', placementSource: 'REFERENCE_DRAWING' },
  ],
};

export default mapConfig;
