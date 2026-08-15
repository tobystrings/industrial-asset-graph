/** Deterministic visual matrix tied to a door-sheet href. Not a camera-scannable QR. */

export function hrefSeed(href: string): number {
  return [...href].reduce((sum, char, index) => (sum + char.charCodeAt(0) * (index + 1)) % 2147483647, 7) || 1;
}

export function hrefMatrix(href: string, size = 21): boolean[][] {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  let state = hrefSeed(href);
  const bit = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % 2 === 0;
  };
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[oy + y][ox + x] = edge || core;
      }
    }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);
  const payload = [...href].map((char) => char.charCodeAt(0) & 1);
  let cursor = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const reserved = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
      if (reserved) continue;
      grid[y][x] = cursor < payload.length ? payload[cursor] === 1 : bit();
      cursor += 1;
    }
  }
  return grid;
}

export function hrefMatrixSvg(href: string, size = 21): string {
  const grid = hrefMatrix(href, size);
  const cells = grid.flatMap((row, y) => row.flatMap((on, x) => (on ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : [])));
  const safe = href.replace(/"/g, '');
  return `<svg class="door-qr" data-href="${safe}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visual door code for ${safe}">${cells.join('')}</svg>`;
}

export function doorCodeCaption(): string {
  return 'Visual door code · paste the URL (not a camera QR). Destinations stay unknown.';
}

export function chipCountLabel(index: number, total: number): string {
  return `${index} / ${total}`;
}

export function chipPeekMinVisible(): number {
  return 3;
}

export function intelSectionsDefaultOpen(): { rack: true; manual: true; params: true; silk: true } {
  return { rack: true, manual: true, params: true, silk: true };
}

export function intelSectionsCollapsed(): { rack: boolean; manual: boolean; params: boolean; silk: boolean } {
  const open = intelSectionsDefaultOpen();
  return { rack: !open.rack, manual: !open.manual, params: !open.params, silk: !open.silk };
}

export function walkdownMoreDefaultOpen(): boolean {
  return true;
}
