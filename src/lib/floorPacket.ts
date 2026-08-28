import activeFacilityPackage from '../facility/activeFacility';
const { components, documents, assets: machines } = activeFacilityPackage;
import { ioSignals } from '../productCatalog';
import { line2DriveInstances } from './driveInstances';

export type FloorPacket = {
  title: string;
  assetId: string;
  deviceIds: string[];
  fieldVerify: string[];
  destUnknown: Array<{ sourceId: string; sourceTerminal: string; purpose: string }>;
  text: string;
  html: string;
};

export function line2FloorPacket(): FloorPacket {
  const asset = machines.find((item) => item.id === 'L2-CC-001');
  const devices = components.filter((item) => item.parentId === 'L2-CC-001');
  const deviceIds = devices.map((item) => item.id);
  const fieldVerify = [
    ...(asset?.unknowns ?? []),
    ...documents.filter((item) => item.assetId === 'L2-CC-001' && (item.verificationStatus === 'FIELD_VERIFY' || item.state === 'NOT_STARTED')).map((item) => `${item.title} · FIELD_VERIFY`),
    ...line2DriveInstances().filter((item) => !item.destId).map((item) => `${item.componentId} destination unknown`),
  ];
  const destUnknown = ioSignals
    .filter((item) => item.sourceId.startsWith('L2-CC') && !item.destId)
    .map((item) => ({ sourceId: item.sourceId, sourceTerminal: item.sourceTerminal, purpose: item.purpose }));
  const title = 'Line 2 Conveyor Control Cabinet · field packet';
  const destLines = destUnknown.map((item) => `${item.sourceId} ${item.sourceTerminal} · ${item.purpose} → dest-unknown`);
  const text = [
    title,
    `Asset ${asset?.id ?? 'L2-CC-001'}`,
    '',
    'Indexed devices',
    ...deviceIds,
    '',
    'FIELD_VERIFY',
    ...fieldVerify,
    '',
    'Destinations unknown',
    ...destLines,
    '',
    'This packet does not invent motors, wiring, or recovery steps.',
  ].join('\n');
  const html = [
    `<article class="floor-packet" data-testid="floor-packet">`,
    `<h1>${title}</h1>`,
    `<p>Asset <code>L2-CC-001</code></p>`,
    `<h2>Indexed devices</h2>`,
    `<ul>${deviceIds.map((id) => `<li>${id}</li>`).join('')}</ul>`,
    `<h2>FIELD_VERIFY</h2>`,
    `<ul>${fieldVerify.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    `<h2>dest-unknown</h2>`,
    `<ul>${destLines.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    `</article>`,
  ].join('');
  return { title, assetId: 'L2-CC-001', deviceIds, fieldVerify, destUnknown, text, html };
}

export function l4FloorPacket(): FloorPacket {
  const asset = machines.find((item) => item.id === 'FG-L4-MTN-001');
  const deviceIds = components.filter((item) => item.parentId === 'FG-L4-MTN-001').map((item) => item.id);
  const fieldVerify = [
    ...(asset?.unknowns ?? []),
    ...documents.filter((item) => item.assetId === 'FG-L4-MTN-001' && (item.verificationStatus === 'FIELD_VERIFY' || item.state === 'NOT_STARTED')).map((item) => `${item.title} · FIELD_VERIFY`),
    'Serial nameplate MT081619A vs tag 1619A · DISPUTED',
  ];
  const destUnknown = ioSignals
    .filter((item) => item.sourceId.startsWith('FG-L4') && !item.destId)
    .map((item) => ({ sourceId: item.sourceId, sourceTerminal: item.sourceTerminal, purpose: item.purpose }));
  const title = 'L4 Meta Case Former · field packet';
  const destLines = destUnknown.map((item) => `${item.sourceId} ${item.sourceTerminal} · ${item.purpose} → dest-unknown`);
  const text = [
    title,
    'Asset FG-L4-MTN-001',
    '',
    'Indexed components',
    ...deviceIds,
    '',
    'FIELD_VERIFY',
    ...fieldVerify,
    '',
    'Destinations unknown',
    ...destLines,
    '',
    'This packet does not invent motors, wiring, or recovery steps.',
  ].join('\n');
  const html = [
    `<article class="floor-packet" data-testid="floor-packet-l4">`,
    `<h1>${title}</h1>`,
    `<p>Asset <code>FG-L4-MTN-001</code></p>`,
    `<h2>Indexed components</h2>`,
    `<ul>${deviceIds.map((id) => `<li>${id}</li>`).join('')}</ul>`,
    `<h2>FIELD_VERIFY</h2>`,
    `<ul>${fieldVerify.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    `<h2>dest-unknown</h2>`,
    `<ul>${destLines.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    `</article>`,
  ].join('');
  return { title, assetId: 'FG-L4-MTN-001', deviceIds, fieldVerify, destUnknown, text, html };
}

export function floorPacketFor(assetId: string): FloorPacket {
  return assetId === 'FG-L4-MTN-001' ? l4FloorPacket() : line2FloorPacket();
}
