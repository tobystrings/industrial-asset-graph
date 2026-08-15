import { components } from '../facilityData';

const RACK_TYPES = new Set(['PLC', 'DIGITAL_INPUT', 'DIGITAL_OUTPUT', 'ANALOG_INPUT', 'ANALOG_OUTPUT', 'RELAY_OUTPUT']);

export type PlcRackSlot = {
  slot: number;
  componentId: string;
  label: string;
  type: string;
  address: null;
};

export function line2PlcRack(): PlcRackSlot[] {
  return components
    .filter((item) => item.parentId === 'L2-CC-001' && RACK_TYPES.has(item.type))
    .map((item, index) => ({
      slot: index,
      componentId: item.id,
      label: item.label,
      type: item.type,
      address: null,
    }));
}
