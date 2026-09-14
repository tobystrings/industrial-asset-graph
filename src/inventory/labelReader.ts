import type { InventoryPart } from '../facility/inventory';
import { partCategories } from '../facility/inventory';

/** Read locally. No photograph is sent to an OCR service. */
export async function readLabel(blob: Blob, progress: (message: string) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const root = `${import.meta.env.BASE_URL}inventory-ocr`;
  const worker = await createWorker('eng', 1, {
    workerPath: `${root}/worker.min.js`, corePath: root, langPath: root,
    logger: event => progress(`Reading label: ${event.status} ${Math.round(event.progress * 100)}%`),
  });
  try { return (await worker.recognize(blob)).data.text.trim(); }
  finally { await worker.terminate(); }
}

/** Only explicit label keys become suggestions; identifiers are never invented. */
export function labelSuggestions(text: string): Partial<InventoryPart> {
  const suggestions: Partial<InventoryPart> = {};
  const keys: Array<[keyof InventoryPart, string]> = [
    ['manufacturer', 'manufacturer|mfr|brand'], ['partNumber', 'part(?: number| no\\.?| #)?|p/?n'],
    ['model', 'model'], ['description', 'description'], ['serialLot', 'serial(?: number| no\\.?)?|lot'],
    ['specifications', 'ratings?|specifications?'],
  ];
  for (const [key, pattern] of keys) {
    const value = text.match(new RegExp(`^(?:${pattern})\\s*[:=]\\s*(.+)$`, 'im'))?.[1]?.trim();
    if (value) Object.assign(suggestions, { [key]: value });
  }
  const category = text.match(/^category\s*[:=]\s*(.+)$/im)?.[1]?.trim();
  const knownCategory = partCategories.find(item => item.toLowerCase() === category?.toLowerCase());
  if (knownCategory) suggestions.category = knownCategory;
  return suggestions;
}
