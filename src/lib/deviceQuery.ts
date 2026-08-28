import activeFacilityPackage from '../facility/activeFacility';
const { components } = activeFacilityPackage;
import { cabinetDeviceToComponent } from '../productCatalog';

export type DeviceQuery = {
  deviceId: string;
  componentId: string;
};

export function parseDeviceQuery(value: string | null | undefined): DeviceQuery | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const fromCabinet = cabinetDeviceToComponent[raw];
  if (fromCabinet) return { deviceId: raw, componentId: fromCabinet };
  const component = components.find((item) => item.id === raw);
  if (!component) return null;
  const deviceId = Object.entries(cabinetDeviceToComponent).find(([, id]) => id === component.id)?.[0] ?? component.id;
  return { deviceId, componentId: component.id };
}

export function cabinetHref(deviceId: string): string {
  const params = new URLSearchParams({ view: 'cabinet', device: deviceId });
  return `?${params.toString()}`;
}

export function writeDeviceQuery(deviceId: string, options?: { cabinet?: boolean }): void {
  const next = new URLSearchParams(location.search);
  if (options?.cabinet === false) {
    if (next.get('view') === 'cabinet') next.delete('view');
  } else {
    next.set('view', 'cabinet');
  }
  next.set('device', deviceId);
  history.replaceState(null, '', `${location.pathname}?${next}`);
}
