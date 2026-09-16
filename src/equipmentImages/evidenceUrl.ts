export function publicEvidenceUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (/^[a-z]+:/i.test(path) || path.startsWith('//')) return null;
  return import.meta.env.BASE_URL + path.replace(/^\//, '').replace(/^industrial-asset-graph\//, '');
}
