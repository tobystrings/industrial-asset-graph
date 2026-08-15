import { documents } from '../facilityData';

const modules = import.meta.glob('../../docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export function documentSource(path: string): string | null {
  const key = Object.keys(modules).find((item) => item.replace(/\\/g, '/').endsWith(path) || item.replace(/\\/g, '/').endsWith(`/${path}`));
  return key ? modules[key] : null;
}

export function documentHasBody(path: string): boolean {
  const source = documentSource(path);
  if (!source) return false;
  const stripped = source.replace(/`[^`]+`/g, '').trim();
  return stripped.length > path.length && /[A-Za-z]{12,}/.test(stripped);
}

export function requiredDocumentPaths(): string[] {
  return documents.filter((item) => item.required).map((item) => item.path);
}
