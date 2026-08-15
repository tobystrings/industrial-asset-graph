export type EvidenceFingerprint = {
  filename: string;
  sha256: string;
  bundled: false;
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function evidenceFingerprint(filename: string, content = ''): Promise<EvidenceFingerprint> {
  const name = filename.trim();
  const data = new TextEncoder().encode(`${name}\n${content}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return { filename: name, sha256: toHex(digest), bundled: false };
}

export async function evidenceFingerprintBytes(filename: string, bytes: ArrayBuffer): Promise<EvidenceFingerprint> {
  const name = filename.trim();
  const prefix = new TextEncoder().encode(`${name}\n`);
  const data = new Uint8Array(prefix.length + bytes.byteLength);
  data.set(prefix, 0);
  data.set(new Uint8Array(bytes), prefix.length);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return { filename: name, sha256: toHex(digest), bundled: false };
}
