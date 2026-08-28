import type { IncomingHttpHeaders } from 'node:http';

export function isWriteAuthorized(headers: IncomingHttpHeaders, configuredToken: string | null): boolean {
  if (!configuredToken) return true;
  return headers.authorization === `Bearer ${configuredToken}`;
}
