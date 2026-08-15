import { areas } from '../facilityData';

export type AreaCaptureKit = {
  areaId: string;
  areaName: string;
  kind: 'empty' | 'has-assets';
  prompts: string[];
};

const EMPTY_PROMPTS = [
  'Photograph the area from the aisle',
  'Count visible panels or cabinets — do not invent asset ids',
  'Photograph any nameplate if one exists',
];

export function captureKitForArea(areaId: string): AreaCaptureKit | null {
  const area = areas.find((item) => item.id === areaId);
  if (!area) return null;
  if (area.assetIds.length > 0) {
    return { areaId: area.id, areaName: area.name, kind: 'has-assets', prompts: [] };
  }
  return { areaId: area.id, areaName: area.name, kind: 'empty', prompts: EMPTY_PROMPTS.slice() };
}
