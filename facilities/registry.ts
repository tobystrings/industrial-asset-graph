import { createFacilityRegistry } from '../src/facility/registry';
import { demoFacilityPackage } from './demo-plant';
import { buildLiebFoodsPackage } from './lieb-foods';
import { buildTestFacilityPackage } from './test-facility';

export const facilityRegistry = createFacilityRegistry({
  'lieb-foods': { facilityId: 'facility-j-lieb', load: buildLiebFoodsPackage },
  'demo-plant': { facilityId: 'facility-demo', load: () => demoFacilityPackage },
  'test-facility': { facilityId: 'facility-synthetic-test', load: buildTestFacilityPackage },
}, 'lieb-foods');
