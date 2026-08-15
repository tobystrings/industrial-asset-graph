import { cabinetHref } from './deviceQuery';
import { line2DriveInstances } from './driveInstances';

export type DoorCard = {
  deviceId: string;
  label: string;
  href: string;
};

export function doorSheetCards(origin = ''): DoorCard[] {
  const drives = line2DriveInstances().map((slot) => ({
    deviceId: slot.cabinetDeviceId,
    label: slot.loadLabel ?? slot.drawingLabel,
    href: `${origin}${cabinetHref(slot.cabinetDeviceId)}`,
  }));
  return [
    ...drives,
    { deviceId: 'plc-micrologix-1400', label: 'MicroLogix 1400', href: `${origin}${cabinetHref('plc-micrologix-1400')}` },
  ];
}

export function doorSheetText(cards: DoorCard[] = doorSheetCards()): string {
  return [
    'Line 2 door sheet · print the URL',
    'Tape the URL on the door. Destinations stay unknown. Visual codes are not camera QR.',
    '',
    ...cards.map((card) => `${card.label}\n${card.href}`),
  ].join('\n');
}
