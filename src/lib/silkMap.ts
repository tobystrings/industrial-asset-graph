import type { SilkMap } from '../types/facility';

const DISCLAIMER = 'Catalog silk equivalents only. This is not a wiring instruction.';

const PF4_TO_D700: SilkMap['pairs'] = [
  { fromSilk: 'A1', toSilk: '1', note: 'catalog silk equivalent · analog frequency reference' },
  { fromSilk: 'AC', toSilk: '2', note: 'catalog silk equivalent · analog common' },
];

const D700_TO_PF4: SilkMap['pairs'] = [
  { fromSilk: '1', toSilk: 'A1', note: 'catalog silk equivalent · analog positive' },
  { fromSilk: '2', toSilk: 'AC', note: 'catalog silk equivalent · analog common' },
];

export function silkEquivalents(fromFamilyId: string, toFamilyId: string): SilkMap {
  let pairs: SilkMap['pairs'] = [];
  if (fromFamilyId === 'family-powerflex-4' && toFamilyId === 'family-mitsubishi-d700') pairs = PF4_TO_D700;
  else if (fromFamilyId === 'family-mitsubishi-d700' && toFamilyId === 'family-powerflex-4') pairs = D700_TO_PF4;
  else if (fromFamilyId === toFamilyId) {
    pairs = [];
  } else if (fromFamilyId === 'family-powerflex-70' && toFamilyId === 'family-mitsubishi-d700') {
    pairs = PF4_TO_D700;
  }
  return { fromFamilyId, toFamilyId, pairs, disclaimer: DISCLAIMER };
}

export function silkMapText(map: SilkMap): string {
  const pairs = map.pairs.map((item) => `${item.fromSilk} ≈ ${item.toSilk}`).join(' · ');
  return `${pairs ? `${pairs}. ` : ''}${map.disclaimer}`;
}

export function isWireInstruction(text: string): boolean {
  return /\bwire\s+\S+\s+to\s+\S+/i.test(text) || /\bconnect\s+\S+\s+to\s+\S+/i.test(text);
}
