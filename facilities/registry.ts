import { createFacilityRegistry } from '../src/facility/registry';
import { demoFacilityPackage } from './demo-plant';
import { buildLiebFoodsPackage } from './lieb-foods';
import { buildTestFacilityPackage } from './test-facility';

export const facilityRegistry = createFacilityRegistry({
  'lieb-foods': buildLiebFoodsPackage,
  'demo-plant': () => demoFacilityPackage,
  'test-facility': buildTestFacilityPackage,
}, 'lieb-foods');
