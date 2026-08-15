import { components } from '../facilityData';
import { capturedPlantFacts } from './walkdown';
import type { DriveInstance } from '../types/facility';

export const LINE2_VFD_COUNT = 8;

export function line2DriveInstances(): DriveInstance[] {
  return Array.from({ length: LINE2_VFD_COUNT }, (_, index) => {
    const n = index + 1;
    const componentId = `L2-CC-VFD-${String(n).padStart(3, '0')}`;
    const component = components.find((item) => item.id === componentId);
    // dest/motor stay null unless a kept capture was explicitly applied.
    const facts = capturedPlantFacts(componentId);
    return {
      index: n,
      componentId,
      cabinetDeviceId: `vfd-0${n}`,
      drawingLabel: component?.label ?? `DRIVE #${n}`,
      loadLabel: n === 6 ? 'CONV #6' : n === 7 ? 'CONV #7' : null,
      motorHp: facts.motor,
      destId: facts.dest,
    };
  });
}

export function driveInstanceFor(componentId: string): DriveInstance | null {
  return line2DriveInstances().find((item) => item.componentId === componentId) ?? null;
}
