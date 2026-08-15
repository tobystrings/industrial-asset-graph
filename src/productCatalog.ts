import type { IoSignalRecord, ManualRecord, ProductFamily } from './types/facility';

const pf4Params: ProductFamily['params'] = [
  { code: 'A051', name: 'Accel time 1', catalogDefault: 10, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY', note: 'Catalog default. Not captured on this cabinet.' },
  { code: 'A052', name: 'Decel time 1', catalogDefault: 10, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY' },
  { code: 'P031', name: 'Motor nameplate volts', catalogDefault: 480, fieldValue: null, unit: 'VAC', verificationStatus: 'FIELD_VERIFY' },
  { code: 'P032', name: 'Motor nameplate hertz', catalogDefault: 60, fieldValue: null, unit: 'Hz', verificationStatus: 'FIELD_VERIFY' },
];

const pf70Params: ProductFamily['params'] = [
  { code: '140', name: 'Accel time 1', catalogDefault: 10, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY', note: 'PowerFlex 70 numbering — not A051.' },
  { code: '141', name: 'Decel time 1', catalogDefault: 10, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY' },
  { code: '061', name: 'Motor NP volts', catalogDefault: 480, fieldValue: null, unit: 'VAC', verificationStatus: 'FIELD_VERIFY' },
];

const d700Params: ProductFamily['params'] = [
  { code: 'Pr.7', name: 'Acceleration time', catalogDefault: 5, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY', note: 'Catalog example family. Not a J. Lieb install.' },
  { code: 'Pr.8', name: 'Deceleration time', catalogDefault: 5, fieldValue: null, unit: 's', verificationStatus: 'FIELD_VERIFY' },
  { code: 'Pr.1', name: 'Maximum frequency', catalogDefault: 120, fieldValue: null, unit: 'Hz', verificationStatus: 'FIELD_VERIFY' },
];

export const productFamilies: ProductFamily[] = [
  {
    id: 'family-powerflex-4',
    brand: 'Allen-Bradley',
    model: 'PowerFlex 4',
    kind: 'VFD',
    installStatus: 'INSTALLED',
    params: pf4Params,
    terminals: [
      { silk: 'A1', meaning: 'Analog input 1 · typical 0–10 V frequency reference' },
      { silk: 'AC', meaning: 'Analog common for A1' },
      { silk: 'A2', meaning: 'Analog input 2 · 0–20 mA when used' },
    ],
    manualId: 'manual-pf4-terminals',
  },
  {
    id: 'family-powerflex-70',
    brand: 'Allen-Bradley',
    model: 'PowerFlex 70',
    kind: 'VFD',
    installStatus: 'INSTALLED',
    params: pf70Params,
    terminals: [
      { silk: 'A1', meaning: 'Analog input 1' },
      { silk: 'AC', meaning: 'Analog common' },
    ],
    manualId: 'manual-pf70-terminals',
  },
  {
    id: 'family-l4-servo',
    brand: 'Unverified',
    model: 'L4 servo drive',
    kind: 'SERVO',
    installStatus: 'INSTALLED',
    params: [
      { code: 'AXIS', name: 'Servo axis assignment', catalogDefault: null, fieldValue: null, verificationStatus: 'FIELD_VERIFY', note: 'Axis assignment is not in the evidence package.' },
    ],
    terminals: [],
    manualId: 'manual-l4-servo',
  },
  {
    id: 'family-mitsubishi-d700',
    brand: 'Mitsubishi',
    model: 'FR-D700',
    kind: 'VFD',
    installStatus: 'CATALOG_EXAMPLE',
    params: d700Params,
    terminals: [
      { silk: '1', meaning: 'Analog positive — frequency setting input' },
      { silk: '2', meaning: 'Analog common for terminal 1' },
      { silk: '3', meaning: 'Analog negative / shield return when the book calls it out' },
    ],
    manualId: 'manual-d700-terminals',
  },
];

export const productManuals: ManualRecord[] = [
  {
    id: 'manual-pf4-terminals',
    familyId: 'family-powerflex-4',
    title: 'PowerFlex 4 terminal legend',
    path: 'docs/manuals/powerflex-4-terminals.md',
    excerpt: 'A1 analog input 1. AC analog common. Terminal A1 is not the same silk as numbered terminal 1.',
    access: 'PUBLIC_APP',
  },
  {
    id: 'manual-d700-terminals',
    familyId: 'family-mitsubishi-d700',
    title: 'Mitsubishi FR-D700 terminal legend (catalog example)',
    path: 'docs/manuals/mitsubishi-fr-d700-terminals.md',
    excerpt: '1 is analog positive. 2 is analog common. Numbered silks 1 2 3 do not match PowerFlex A1 AC.',
    access: 'PUBLIC_APP',
  },
  {
    id: 'manual-pf70-terminals',
    familyId: 'family-powerflex-70',
    title: 'PowerFlex 70 terminal legend',
    path: 'docs/manuals/powerflex-70-terminals.md',
    excerpt: 'PowerFlex 70 parameter numbers are 140 / 141, not A051. This is not the PowerFlex 4 booklet.',
    access: 'PUBLIC_APP',
  },
  {
    id: 'manual-l4-servo',
    familyId: 'family-l4-servo',
    title: 'L4 servo terminal legend',
    path: 'docs/manuals/l4-servo-terminals.md',
    excerpt: 'Manual not in this build. FIELD_VERIFY. Do not invent terminals.',
    access: 'PUBLIC_APP',
  },
];

/** Instance I/O only. Destinations stay null unless a field record exists. No safety/interlock. */
export const ioSignals: IoSignalRecord[] = [
  {
    id: 'sig-l2-vfd001-a1',
    sourceId: 'L2-CC-VFD-001',
    sourceTerminal: 'A1',
    destId: null,
    destTerminal: null,
    purpose: 'Analog speed reference',
    kind: 'ANALOG',
    verificationStatus: 'FIELD_VERIFY',
    evidenceIds: [],
    note: 'Drive exists on the Line 2 drawing. Where A1 is sent is not recorded — Don still knows.',
  },
  {
    id: 'sig-fg-vfd001-a1',
    sourceId: 'FG-L4-VFD-001',
    sourceTerminal: 'A1',
    destId: null,
    destTerminal: null,
    purpose: 'Analog speed reference',
    kind: 'ANALOG',
    verificationStatus: 'FIELD_VERIFY',
    evidenceIds: [],
    note: 'PowerFlex 70 is on the machine. Destination requires field walkdown.',
  },
];

export const cabinetDeviceToComponent: Record<string, string> = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => [`vfd-0${index + 1}`, `L2-CC-VFD-${String(index + 1).padStart(3, '0')}`]),
);
cabinetDeviceToComponent['plc-micrologix-1400'] = 'L2-CC-PLC-001';
