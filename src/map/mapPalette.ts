// Visual identity only: these colors never imply verification or operating state.
export const mapPalette = ['#35d5ff', '#ff62bf', '#ffc247', '#9c88ff', '#47e6b1', '#ff875c', '#74a5ff', '#e4e75a'];
export function areaColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return mapPalette[(hash >>> 0) % mapPalette.length];
}
