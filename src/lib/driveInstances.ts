import { components } from '../facilityData';
import activeFacilityPackage from '../facility/activeFacility';
import { capturedPlantFacts } from './walkdown';
import type { DriveInstance } from '../types/facility';

export const LINE2_VFD_COUNT = activeFacilityPackage.featureConfig.driveSlots?.length ?? 0;

export function configuredDriveInstances(): DriveInstance[] {
  const slots = activeFacilityPackage.featureConfig.driveSlots ?? [];
  return slots.map((slot) => {
    const component = components.find((item) => item.id === slot.componentId);
    const facts = capturedPlantFacts(slot.componentId);
    return {
      index: slot.index,
      componentId: slot.componentId,
      cabinetDeviceId: slot.cabinetDeviceId,
      drawingLabel: component?.label ?? slot.drawingLabel,
      loadLabel: slot.loadLabel,
      motorHp: facts.motor,
      destId: facts.dest,
    };
  });
}

/** Backward-compatible name retained for existing views/tests; data now comes from the active facility package. */
export function line2DriveInstances(): DriveInstance[] {
  return configuredDriveInstances();
}

export function driveInstanceFor(componentId: string): DriveInstance | null {
  return configuredDriveInstances().find((item) => item.componentId === componentId) ?? null;
}
