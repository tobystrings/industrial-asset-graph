const CHANNEL_COUNTS: Record<string, number> = {
  '1762-IA8': 8,
  '1762-IB16': 16,
  '1762-OB16': 16,
  '1762-IF4': 4,
  '1762-OF4': 4,
  '1762-OW8': 8,
};

export type IoChannel = {
  index: number;
  address: null;
  label: string;
};

export function channelCountForModel(model: string): number {
  return CHANNEL_COUNTS[model] ?? 0;
}

export function ioChannelsFor(model: string): IoChannel[] {
  const count = channelCountForModel(model);
  return Array.from({ length: count }, (_, index) => ({
    index,
    address: null,
    label: `${model} ch ${index}`,
  }));
}

export function ioChannelSummary(model: string): string {
  const count = channelCountForModel(model);
  if (!count) return 'address not recorded';
  return `${count} channels · no addresses recorded`;
}
