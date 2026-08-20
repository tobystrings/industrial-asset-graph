import type { FacilityFeatureConfig } from '../../src/facility/types';

export const featureConfig: FacilityFeatureConfig = {
  defaultAreaId: 'area-warehouse-f',
  featuredCabinetAssetId: 'L2-CC-001',
  featuredMachineAssetId: 'FG-L4-MTN-001',
  brandMark: 'JL',
  cabinetPackage: {
    id: 'pkg-l2-cc',
    assetId: 'L2-CC-001',
    drawing: 'assets/line2/control-cabinet/cabinet.svg',
    raster: 'assets/line2/control-cabinet/cabinet.png',
    pdf: 'assets/line2/control-cabinet/cabinet.pdf',
    metadata: 'assets/line2/control-cabinet/metadata.json',
    destUnknown: true,
  },
  driveSlots: Array.from({ length: 8 }, (_, index) => {
    const n = index + 1;
    return {
      index: n,
      componentId: `L2-CC-VFD-${String(n).padStart(3, '0')}`,
      cabinetDeviceId: `vfd-0${n}`,
      drawingLabel: `DRIVE #${n}`,
      loadLabel: n === 6 ? 'CONV #6' : n === 7 ? 'CONV #7' : null,
    };
  }),
};
