import { emptyProduction, type ProductionConfig } from '../../src/facility/production';

/** User-confirmed line identities; taxonomy entries are investigation categories, never inventory. */
export function liebProduction(): ProductionConfig {
  return {
    ...emptyProduction(),
    lines: [1, 2, 4].map(n => ({ id: `line-${n}`, name: `Line ${n}`, importance: n === 1 ? 1 : 2, rationale: n === 1 ? 'Accessible supporting documentation priority' : 'Primary revenue-producing line; equal initial priority with the other primary line (owner report)' })),
    taxonomy: [
      'Container receiving', 'Depalletizer', 'Unscrambler', 'Conveyor', 'Accumulation', 'Air rinser',
      'Product receiving', 'Storage tank', 'Blending', 'Mixing', 'Pump', 'Filtration', 'Product transfer',
      'Filler', 'Cap feeder', 'Cap elevator', 'Capper', 'Closure inspection', 'Heating tunnel', 'Cooling tunnel', 'Pasteurization',
      'Labeler', 'Date/lot coder', 'Inspection camera', 'Reject station', 'Checkweigher',
      'Case erector', 'Packer', 'Sealer', 'Shrink equipment', 'Palletizer', 'Stretch wrapper', 'Finished-goods handling',
      'Electrical distribution', 'Transformer', 'Disconnect', 'Compressed air', 'Steam', 'Condensate', 'Water', 'Chilling', 'Refrigeration', 'Drainage', 'Ventilation', 'Clean-in-place',
      'PLC', 'HMI', 'I/O', 'Network', 'Control cabinet', 'VFD', 'Motor', 'Sensor', 'Valve', 'Safety device',
    ],
    survey: [
      { id: 'survey-wulftec', category: 'Stretch wrapper', action: 'Reconcile existing Wulftec private package and confirm line membership', lineId: '', state: 'OPEN', notes: 'Canonical private-package asset LIEB-WULFTEC-A6882, WCRT-200. Source reports Line 4 but explicitly leaves assignment unconfirmed. Reuse this ID; do not create a duplicate.' },
      { id: 'survey-kosme', category: 'Labeler', action: 'Locate Kosme labeler documentation and reconcile its existing asset ID', lineId: '', state: 'OPEN', notes: 'Owner reports existing documentation; not located in this checkout. Request the existing package or document location and reconcile its ID before adding an asset. Line assignment not established.' },
    ],
  };
}
