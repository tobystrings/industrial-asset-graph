import activeFacilityPackage from '../facility/activeFacility';
const { components } = activeFacilityPackage;

export type VisiblePart = {
  id: string;
  label: string;
  source: 'drawing';
};

export function visiblePartsFor(assetId: string): VisiblePart[] {
  return components
    .filter((item) => item.parentId === assetId)
    .map((item) => ({ id: item.id, label: item.label, source: 'drawing' as const }));
}
