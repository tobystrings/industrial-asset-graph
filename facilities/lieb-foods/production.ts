import { emptyProduction, type ProductionConfig } from '../../src/facility/production';
import { liebCopacking } from './copacking';

/** User-confirmed line identities; taxonomy entries are investigation categories, never inventory. */
export function liebProduction(): ProductionConfig {
  return {
    ...emptyProduction(),
    copacking: liebCopacking(),
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
      { id: 'survey-wulftec', category: 'Stretch wrapper', action: 'Confirm Wulftec floor location and production-line membership', lineId: '', state: 'RECORDED', notes: 'Canonical asset LIEB-WULFTEC-A6882 and its master evidence packet are deployed. Source reports Line 4, but assignment remains unconfirmed.' },
      { id: 'survey-kosme', category: 'Labeler', action: 'Confirm Kosme floor location and production-line membership', lineId: '', state: 'RECORDED', notes: 'Canonical asset LIEB-KOSME-TOPIIAD-L05358, OEM evidence, CR30 procedures, CR22 dossier, and photo archive are deployed. Line assignment remains unconfirmed.' },
    ],
  };
}
