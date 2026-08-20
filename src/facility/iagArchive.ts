const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type ArchiveValue = string | Uint8Array | Blob;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function put16(view: DataView, offset: number, value: number) { view.setUint16(offset, value, true); }
function put32(view: DataView, offset: number, value: number) { view.setUint32(offset, value >>> 0, true); }

function arrayBufferCopy(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function bytesOf(value: ArchiveValue): Promise<Uint8Array> {
  if (typeof value === 'string') return textEncoder.encode(value);
  if (value instanceof Uint8Array) return value;
  return new Uint8Array(await value.arrayBuffer());
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  return { time, day };
}

export async function createStoredZip(entries: Array<{ name: string; data: ArchiveValue }>): Promise<Blob> {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosTimestamp();

  for (const entry of entries) {
    const name = textEncoder.encode(entry.name.replace(/^\/+/, ''));
    const data = await bytesOf(entry.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    put32(localView, 0, 0x04034b50);
    put16(localView, 4, 20);
    put16(localView, 6, 0x0800);
    put16(localView, 8, 0);
    put16(localView, 10, stamp.time);
    put16(localView, 12, stamp.day);
    put32(localView, 14, crc);
    put32(localView, 18, data.length);
    put32(localView, 22, data.length);
    put16(localView, 26, name.length);
    put16(localView, 28, 0);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    put32(centralView, 0, 0x02014b50);
    put16(centralView, 4, 20);
    put16(centralView, 6, 20);
    put16(centralView, 8, 0x0800);
    put16(centralView, 10, 0);
    put16(centralView, 12, stamp.time);
    put16(centralView, 14, stamp.day);
    put32(centralView, 16, crc);
    put32(centralView, 20, data.length);
    put32(centralView, 24, data.length);
    put16(centralView, 28, name.length);
    put16(centralView, 30, 0);
    put16(centralView, 32, 0);
    put16(centralView, 34, 0);
    put16(centralView, 36, 0);
    put32(centralView, 38, 0);
    put32(centralView, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  put32(endView, 0, 0x06054b50);
  put16(endView, 4, 0);
  put16(endView, 6, 0);
  put16(endView, 8, entries.length);
  put16(endView, 10, entries.length);
  put32(endView, 12, centralSize);
  put32(endView, 16, centralOffset);
  put16(endView, 20, 0);
  const parts: BlobPart[] = [...locals, ...centrals, end].map(arrayBufferCopy);
  return new Blob(parts, { type: 'application/vnd.industrial-asset-graph+zip' });
}

export async function readStoredZip(file: Blob): Promise<Map<string, Blob>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, Blob>();
  let offset = 0;

  while (offset + 4 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    if (signature !== 0x04034b50) throw new Error('Invalid IAG archive: malformed ZIP entry');
    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    if (flags & 0x0008) throw new Error('Unsupported IAG archive: streamed ZIP entries are not supported');
    if (method !== 0) throw new Error('Unsupported IAG archive: compressed entries are not supported');
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error('Invalid IAG archive: truncated entry');
    const name = textDecoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    files.set(name, new Blob([arrayBufferCopy(bytes.subarray(dataStart, dataEnd))]));
    offset = dataEnd;
  }

  if (!files.size) throw new Error('Invalid IAG archive: no files found');
  return files;
}
