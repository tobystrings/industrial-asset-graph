import { expect,it } from 'vitest';
import activeFacilityPackage from '../facility/activeFacility';
import { loadWalkdownCaptures,recordWalkdownCapture,resetWalkdownStore } from './walkdown';
it('keeps field captures isolated when changing facilities',()=>{
  const original=activeFacilityPackage.facility.id;
  try {
    activeFacilityPackage.facility.id='test-walkdown-a';resetWalkdownStore();
    recordWalkdownCapture({targetId:'asset',field:'note',value:'A only',capturedBy:'test'});
    activeFacilityPackage.facility.id='test-walkdown-b';resetWalkdownStore();expect(loadWalkdownCaptures()).toEqual([]);
    activeFacilityPackage.facility.id='test-walkdown-a';expect(loadWalkdownCaptures()[0].value).toBe('A only');resetWalkdownStore();
  }finally{activeFacilityPackage.facility.id=original;}
});
