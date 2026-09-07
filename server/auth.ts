import type { IncomingHttpHeaders } from 'node:http';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export function isWriteAuthorized(headers: IncomingHttpHeaders, configuredToken: string | null): boolean {
  if (!configuredToken) return true;
  return headers.authorization === `Bearer ${configuredToken}`;
}

export type SupabasePrincipal = { id: string; email?: string; role: 'technician' | 'admin' };

export function canWriteCanonical(principal: SupabasePrincipal, reviewState: unknown): boolean {
  return principal.role === 'admin' && (reviewState === 'APPROVED' || reviewState === 'CONFLICT');
}

/** Verify a Supabase access token with the configured legacy secret or public JWKS. */
export async function authenticateRequest(headers: IncomingHttpHeaders, configuredToken: string | null, jwtSecret: string | null, supabaseUrl: string | null): Promise<SupabasePrincipal | null> {
  const value = headers.authorization;
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  if (configuredToken && token === configuredToken) return { id: 'development-token', role: 'admin' };
  if (!jwtSecret && !supabaseUrl) return null;
  try {
    const key = jwtSecret
      ? new TextEncoder().encode(jwtSecret)
      : createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, key, { algorithms: jwtSecret ? ['HS256'] : ['RS256', 'ES256'], issuer: `${supabaseUrl}/auth/v1`, audience: 'authenticated' });
    return principalFromClaims(payload);
  } catch { return null; }
}

export function principalFromClaims(payload: JWTPayload): SupabasePrincipal | null {
  if (typeof payload.sub !== 'string' || payload.aud !== 'authenticated') return null;
  const appMetadata = payload.app_metadata && typeof payload.app_metadata === 'object' ? payload.app_metadata as Record<string, unknown> : {};
  const role = appMetadata.iag_role === 'admin' || appMetadata.iag_role === 'technician' ? appMetadata.iag_role : 'technician';
  return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined, role };
}
